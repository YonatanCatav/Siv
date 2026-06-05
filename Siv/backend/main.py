import asyncio
import json
import random
import string
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ROOMS: dict[str, "Room"] = {}
CONNECTIONS: dict[str, WebSocket] = {}

AVATARS = ["🦊","🐼","🦄","🐸","🦁","🐯","🦋","🐬","🦝","🐺",
           "🦔","🐙","🦀","🦜","🐻","🦑","🐲","🦩","🦉","🐨",
           "🐶","🐱","🐭","🐹","🐰","🐻","🐼","🐨","🐯","🦁"]


def gen_code() -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if code not in ROOMS:
            return code


def gen_id() -> str:
    return uuid.uuid4().hex[:10]


# ─── Models ────────────────────────────────────────────────────────────────────

@dataclass
class Question:
    id: str
    sentence: str
    answer: str
    time_limit: int = 60
    vote_time: Optional[int] = None  # None = use global setting
    is_warmup: bool = False
    player_answer_id: Optional[str] = None  # designated player writes the real answer

    def to_dict(self, reveal: bool = False) -> dict:
        d = {"id": self.id, "sentence": self.sentence, "time_limit": self.time_limit,
             "vote_time": self.vote_time, "is_warmup": self.is_warmup,
             "player_answer_id": self.player_answer_id}
        if reveal:
            d["answer"] = self.answer
        return d


@dataclass
class RoundAnswer:
    id: str
    player_id: Optional[str]
    text: str
    is_real: bool = False
    voters: list = field(default_factory=list)
    funny_voters: list = field(default_factory=list)

    def to_dict(self, players: dict = None, reveal_voters: bool = False, hide_real: bool = False) -> dict:
        d = {
            "id": self.id,
            "text": self.text,
            "is_real": False if hide_real else self.is_real,
            "vote_count": len(self.voters),
            "funny_count": len(self.funny_voters),
        }
        if reveal_voters and players:
            d["voters"] = [
                {"id": v, "name": players[v].name, "avatar": players[v].avatar}
                for v in self.voters if v in players
            ]
            d["funny_voters"] = [
                {"id": v, "name": players[v].name, "avatar": players[v].avatar}
                for v in self.funny_voters if v in players
            ]
            if self.player_id and self.player_id in players:
                d["author"] = players[self.player_id].name
        return d


@dataclass
class Player:
    id: str
    name: str
    avatar: str
    score: int = 0
    streak: int = 0
    is_host: bool = False
    is_display: bool = False
    has_answered: bool = False
    has_voted: bool = False
    prev_rank: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "avatar": self.avatar,
            "score": self.score,
            "streak": self.streak,
            "is_host": self.is_host,
            "is_display": self.is_display,
        }


@dataclass
class Room:
    code: str
    host_id: str
    players: dict = field(default_factory=dict)
    questions: list = field(default_factory=list)
    current_q: int = -1
    phase: str = "LOBBY"
    round_answers: list = field(default_factory=list)
    is_public: bool = False
    settings: dict = field(default_factory=lambda: {
        "answer_time": 60,
        "vote_time": 30,
        "funny_enabled": True,
        "streak_bonus": True,
        "show_intro": True,
    })
    _timer_task: Optional[asyncio.Task] = field(default=None, repr=False)

    def active_players(self) -> dict:
        return {pid: p for pid, p in self.players.items()
                if not p.is_display and pid in CONNECTIONS}

    async def broadcast(self, msg: dict, exclude: str = None):
        text = json.dumps(msg)
        for pid in list(self.players):
            if pid == exclude:
                continue
            ws = CONNECTIONS.get(pid)
            if ws:
                try:
                    await ws.send_text(text)
                except Exception:
                    CONNECTIONS.pop(pid, None)

    async def send(self, pid: str, msg: dict):
        ws = CONNECTIONS.get(pid)
        if ws:
            try:
                await ws.send_text(json.dumps(msg))
            except Exception:
                CONNECTIONS.pop(pid, None)

    def q(self) -> Optional[Question]:
        if 0 <= self.current_q < len(self.questions):
            return self.questions[self.current_q]
        return None

    def cancel_timer(self):
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()

    async def start_timer(self, duration: int, callback):
        self.cancel_timer()
        self._timer_task = asyncio.create_task(self._run_timer(duration, callback))

    async def _run_timer(self, duration: int, callback):
        try:
            for remaining in range(duration, -1, -1):
                await self.broadcast({"type": "timer", "n": remaining, "total": duration})
                if remaining == 0:
                    await callback()
                    return
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass

    async def start_game(self):
        self.current_q = 0
        if self.settings.get("show_intro", True):
            self.phase = "INTRO"
            await self.broadcast_room_state()
            await self.start_timer(18, self._end_intro)
        else:
            await self.begin_question()

    async def _end_intro(self):
        if self.phase != "INTRO":
            return
        self.cancel_timer()
        await self.begin_question()

    async def begin_question(self):
        question = self.q()
        if not question:
            return
        self.phase = "ANSWERING"
        self.round_answers = []
        for p in self.players.values():
            p.has_answered = False
            p.has_voted = False

        player_answer_name = None
        player_answer_avatar = None
        if question.player_answer_id and question.player_answer_id in self.players:
            pa = self.players[question.player_answer_id]
            player_answer_name = pa.name
            player_answer_avatar = pa.avatar

        await self.broadcast({
            "type": "question_start",
            "question": question.to_dict(),
            "num": self.current_q + 1,
            "total": len(self.questions),
            "is_warmup": question.is_warmup,
            "player_answer_name": player_answer_name,
            "player_answer_avatar": player_answer_avatar,
        })
        await self.start_timer(question.time_limit, self._end_answering)

    async def _end_answering(self):
        if self.phase != "ANSWERING":
            return  # guard against double-call
        self.cancel_timer()
        self.phase = "VOTING"
        question = self.q()

        if question.player_answer_id:
            # Designated player's submission becomes the real answer
            pa_answer = next(
                (a for a in self.round_answers if a.player_id == question.player_answer_id),
                None
            )
            if pa_answer:
                pa_answer.is_real = True
            else:
                # Player didn't submit — fall back to stored answer
                self.round_answers.append(RoundAnswer(
                    id=gen_id(), player_id=None, text=question.answer, is_real=True
                ))
        elif not any(a.is_real for a in self.round_answers):
            self.round_answers.append(RoundAnswer(
                id=gen_id(), player_id=None, text=question.answer, is_real=True
            ))

        shuffled = self.round_answers.copy()
        random.shuffle(shuffled)

        eff_vote_time = question.vote_time if question.vote_time is not None else self.settings["vote_time"]

        for pid, player in self.players.items():
            if player.is_display:
                answers = [a.to_dict(hide_real=True) for a in shuffled]
            else:
                answers = [a.to_dict(hide_real=True) for a in shuffled if a.player_id != pid]
            await self.send(pid, {
                "type": "voting_start",
                "sentence": question.sentence,
                "answers": answers,
                "time": eff_vote_time,
                "is_warmup": question.is_warmup,
            })

        await self.start_timer(eff_vote_time, self._end_voting)

    async def _end_voting(self):
        if self.phase != "VOTING":
            return  # guard against double-call
        self.cancel_timer()
        self.phase = "REVEAL"
        await self._send_reveal_all()
        await self.broadcast_room_state()

    async def host_advance(self):
        if self.phase == "INTRO":
            await self._end_intro()
        elif self.phase == "REVEAL":
            self.phase = "SCOREBOARD"
            await self._send_scoreboard()
            await self.broadcast_room_state()
        elif self.phase == "SCOREBOARD":
            self.current_q += 1
            if self.current_q >= len(self.questions):
                self.phase = "GAME_OVER"
                await self._send_game_over()
                await self.broadcast_room_state()
            else:
                await self.begin_question()

    async def _send_reveal_all(self):
        question = self.q()
        events = self._calc_scores()

        answer_data = []
        for a in self.round_answers:
            author = None
            if a.player_id and a.player_id in self.players:
                p = self.players[a.player_id]
                author = {"name": p.name, "avatar": p.avatar}
            answer_data.append({
                "id": a.id,
                "text": a.text,
                "is_real": a.is_real,
                "author": author,
                "vote_count": len(a.voters),
                "funny_count": len(a.funny_voters),
                "voters": [
                    {"name": self.players[v].name, "avatar": self.players[v].avatar}
                    for v in a.voters if v in self.players
                ],
                "funny_voters": [
                    {"name": self.players[v].name, "avatar": self.players[v].avatar}
                    for v in a.funny_voters if v in self.players
                ],
            })

        player_points: dict = {}
        for ev in events:
            pid = ev["player_id"]
            player_points[pid] = player_points.get(pid, 0) + ev["points"]

        real_answer_text = next((a.text for a in self.round_answers if a.is_real), question.answer)
        await self.broadcast({
            "type": "reveal_all",
            "sentence": question.sentence,
            "real_answer": real_answer_text,
            "is_warmup": question.is_warmup,
            "answers": answer_data,
            "player_points": player_points,
        })

    def _calc_scores(self) -> list:
        if self.q() and self.q().is_warmup:
            return []
        events = []
        real = next((a for a in self.round_answers if a.is_real), None)

        if real:
            for voter_id in real.voters:
                if voter_id not in self.players:
                    continue
                p = self.players[voter_id]
                p.streak += 1
                pts = 500
                if p.streak >= 3 and self.settings["streak_bonus"]:
                    pts += 100
                    events.append({"player_id": voter_id, "points": 100, "reason": "streak"})
                p.score += pts
                events.append({"player_id": voter_id, "points": pts, "reason": "correct"})

        for ans in self.round_answers:
            if ans.is_real or ans.player_id is None:
                continue
            author_id = ans.player_id
            if author_id not in self.players:
                continue
            for _ in ans.voters:
                self.players[author_id].score += 150
                events.append({"player_id": author_id, "points": 150, "reason": "fooled"})
            if self.settings["funny_enabled"]:
                for _ in ans.funny_voters:
                    self.players[author_id].score += 100
                    events.append({"player_id": author_id, "points": 100, "reason": "funny"})

        right_voters = set(real.voters) if real else set()
        for pid, p in self.players.items():
            if not p.is_display and pid not in right_voters:
                p.streak = 0

        return events

    async def _send_reveal_scoring(self):
        question = self.q()
        events = self._calc_scores()

        real = next((a for a in self.round_answers if a.is_real), None)
        non_real = [a for a in self.round_answers if not a.is_real]
        non_real.sort(key=lambda a: len(a.voters))

        answer_data = []
        for a in non_real + ([real] if real else []):
            author = None
            if a.player_id and a.player_id in self.players:
                author = self.players[a.player_id].name
            answer_data.append({
                "id": a.id,
                "text": a.text,
                "is_real": a.is_real,
                "author": author,
                "voters": [
                    {"name": self.players[v].name, "avatar": self.players[v].avatar}
                    for v in a.voters if v in self.players
                ],
                "funny_voters": [
                    {"name": self.players[v].name, "avatar": self.players[v].avatar}
                    for v in a.funny_voters if v in self.players
                ],
                "vote_count": len(a.voters),
            })

        player_points: dict = {}
        for ev in events:
            pid = ev["player_id"]
            player_points[pid] = player_points.get(pid, 0) + ev["points"]

        await self.broadcast({
            "type": "reveal_scoring",
            "sentence": question.sentence,
            "real_answer": question.answer,
            "answers": answer_data,
            "player_points": player_points,
            "is_warmup": question.is_warmup,
        })

    async def _send_scoreboard(self):
        ranked = sorted(
            [p for p in self.players.values() if not p.is_display],
            key=lambda p: p.score, reverse=True
        )
        scores = []
        for i, p in enumerate(ranked):
            scores.append({
                "rank": i + 1,
                "id": p.id,
                "name": p.name,
                "avatar": p.avatar,
                "score": p.score,
                "prev_rank": p.prev_rank,
            })
            p.prev_rank = i + 1

        await self.broadcast({
            "type": "scoreboard",
            "scores": scores,
            "q_left": len(self.questions) - self.current_q - 1,
        })

    async def _send_game_over(self):
        ranked = sorted(
            [p for p in self.players.values() if not p.is_display],
            key=lambda p: p.score, reverse=True
        )
        await self.broadcast({
            "type": "game_over",
            "scores": [
                {"rank": i + 1, "id": p.id, "name": p.name, "avatar": p.avatar, "score": p.score}
                for i, p in enumerate(ranked)
            ],
        })

    async def broadcast_room_state(self):
        await self.broadcast({
            "type": "room_state",
            "code": self.code,
            "phase": self.phase,
            "host_id": self.host_id,
            "players": [p.to_dict() for p in self.players.values()],
            "questions": [q.to_dict(reveal=True) for q in self.questions],
            "settings": self.settings,
            "current_q": self.current_q,
            "is_public": self.is_public,
        })


# ─── WebSocket endpoint ────────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    pid = gen_id()
    CONNECTIONS[pid] = websocket

    try:
        await websocket.send_text(json.dumps({"type": "connected", "id": pid}))

        async for raw in websocket.iter_text():
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            t = data.get("type")

            if t == "create_room":
                custom = data.get("code", "").upper().strip()[:8]
                code = custom if (custom and len(custom) >= 2 and custom not in ROOMS) else gen_code()
                room = Room(code=code, host_id=pid, is_public=bool(data.get("is_public", False)))
                ROOMS[code] = room
                name = data.get("name", "Host")[:20]
                avatar = random.choice(AVATARS)
                player = Player(id=pid, name=name, avatar=avatar, is_host=True, is_display=True)
                room.players[pid] = player
                await websocket.send_text(json.dumps({
                    "type": "room_created",
                    "code": code,
                    "player": player.to_dict(),
                }))
                await room.broadcast_room_state()

            elif t == "join_room":
                code = data.get("code", "").upper().strip()
                name = data.get("name", "Player")[:20]

                if code not in ROOMS:
                    await websocket.send_text(json.dumps({"type": "error", "msg": "Room not found"}))
                    continue

                room = ROOMS[code]

                if room.phase != "LOBBY" and not room.is_public:
                    await websocket.send_text(json.dumps({"type": "error", "msg": "Game already started"}))
                    continue

                # Reconnect attempt
                existing_pid = data.get("player_id")
                if existing_pid and existing_pid in room.players:
                    CONNECTIONS.pop(pid, None)
                    pid = existing_pid
                    CONNECTIONS[pid] = websocket
                    await websocket.send_text(json.dumps({
                        "type": "reconnected",
                        "player": room.players[pid].to_dict(),
                    }))
                    await room.broadcast_room_state()
                    continue

                # Unique name
                taken = {p.name.lower() for p in room.players.values()}
                base, suffix = name, 2
                while name.lower() in taken:
                    name = f"{base}{suffix}"
                    suffix += 1

                avatar = random.choice(AVATARS)
                is_spectator = room.phase != "LOBBY"
                player = Player(id=pid, name=name, avatar=avatar, is_display=is_spectator)
                room.players[pid] = player

                await websocket.send_text(json.dumps({
                    "type": "joined",
                    "code": code,
                    "player": player.to_dict(),
                }))
                await room.broadcast_room_state()

            else:
                room = next((r for r in ROOMS.values() if pid in r.players), None)
                if not room:
                    continue
                player = room.players.get(pid)
                if not player:
                    continue

                if t == "add_question":
                    if not player.is_host:
                        continue
                    sentence = data.get("sentence", "").strip()
                    answer = data.get("answer", "").strip()
                    if not sentence or not answer:
                        continue
                    if "___" not in sentence:
                        sentence += " ___"
                    vt = data.get("vote_time")
                    q = Question(
                        id=gen_id(),
                        sentence=sentence,
                        answer=answer,
                        time_limit=int(data.get("time_limit", room.settings["answer_time"])),
                        vote_time=int(vt) if vt is not None else None,
                        is_warmup=bool(data.get("is_warmup", False)),
                        player_answer_id=data.get("player_answer_id") or None,
                    )
                    room.questions.append(q)
                    await room.broadcast_room_state()

                elif t == "remove_question":
                    if not player.is_host:
                        continue
                    qid = data.get("id")
                    room.questions = [q for q in room.questions if q.id != qid]
                    await room.broadcast_room_state()

                elif t == "update_question":
                    if not player.is_host:
                        continue
                    qid = data.get("id")
                    for q in room.questions:
                        if q.id == qid:
                            if "sentence" in data:
                                q.sentence = data["sentence"].strip()
                                if "___" not in q.sentence:
                                    q.sentence += " ___"
                            if "answer" in data:
                                q.answer = data["answer"].strip()
                            if "time_limit" in data:
                                q.time_limit = max(10, min(120, int(data["time_limit"])))
                            if "vote_time" in data:
                                vt = data["vote_time"]
                                q.vote_time = max(10, min(120, int(vt))) if vt is not None else None
                            if "is_warmup" in data:
                                q.is_warmup = bool(data["is_warmup"])
                            if "player_answer_id" in data:
                                q.player_answer_id = data["player_answer_id"] or None
                            break
                    await room.broadcast_room_state()

                elif t == "reorder_questions":
                    if not player.is_host:
                        continue
                    order = data.get("order", [])
                    qmap = {q.id: q for q in room.questions}
                    room.questions = [qmap[qid] for qid in order if qid in qmap]
                    await room.broadcast_room_state()

                elif t == "update_settings":
                    if not player.is_host:
                        continue
                    for k, v in data.get("settings", {}).items():
                        if k in room.settings:
                            room.settings[k] = v
                    await room.broadcast_room_state()

                elif t == "set_display":
                    player.is_display = bool(data.get("display", True))
                    await room.broadcast_room_state()

                elif t == "toggle_public":
                    if player.is_host:
                        room.is_public = not room.is_public
                        await room.broadcast_room_state()

                elif t == "start_game":
                    if not player.is_host:
                        continue
                    if len(room.questions) == 0:
                        await room.send(pid, {"type": "error", "msg": "Add at least one question first"})
                        continue
                    await room.start_game()

                elif t == "submit_answer":
                    if room.phase != "ANSWERING" or player.has_answered or player.is_display:
                        continue
                    text = data.get("text", "").strip()[:200]
                    if not text:
                        continue
                    player.has_answered = True
                    room.round_answers.append(RoundAnswer(id=gen_id(), player_id=pid, text=text))

                    active = room.active_players()
                    answered = sum(1 for ap in active.values() if ap.has_answered)
                    await room.broadcast({"type": "answer_progress", "answered": answered, "total": len(active)})

                    if answered >= len(active) and len(active) > 0:
                        await room._end_answering()

                elif t == "submit_vote":
                    if room.phase != "VOTING" or player.has_voted or player.is_display:
                        continue
                    answer_id = data.get("answer_id")
                    funny_ids = data.get("funny_ids") or []

                    for ans in room.round_answers:
                        if ans.id == answer_id and ans.player_id != pid:
                            if pid not in ans.voters:
                                ans.voters.append(pid)

                    if funny_ids and room.settings["funny_enabled"]:
                        for ans in room.round_answers:
                            if ans.id in funny_ids and ans.player_id != pid:
                                if pid not in ans.funny_voters:
                                    ans.funny_voters.append(pid)

                    player.has_voted = True
                    active = room.active_players()
                    voted = sum(1 for ap in active.values() if ap.has_voted)
                    await room.broadcast({"type": "vote_progress", "voted": voted, "total": len(active)})
                    funny_counts = {ans.id: len(ans.funny_voters) for ans in room.round_answers}
                    await room.broadcast({"type": "funny_update", "counts": funny_counts})

                    if voted >= len(active) and len(active) > 0:
                        await room._end_voting()

                elif t == "host_advance":
                    if player.is_host:
                        await room.host_advance()

                elif t == "restart_game":
                    if player.is_host and room.phase == "GAME_OVER":
                        room.cancel_timer()
                        room.phase = "LOBBY"
                        room.current_q = -1
                        room.round_answers = []
                        for p in room.players.values():
                            p.score = 0
                            p.streak = 0
                            p.has_answered = False
                            p.has_voted = False
                            p.prev_rank = 0
                            if not p.is_host:
                                p.is_display = False
                        await room.broadcast({"type": "game_restart"})
                        await room.broadcast_room_state()

                elif t == "kick_player":
                    if not player.is_host:
                        continue
                    target = data.get("player_id")
                    if target and target in room.players and target != pid:
                        await room.send(target, {"type": "kicked"})
                        del room.players[target]
                        CONNECTIONS.pop(target, None)
                        await room.broadcast_room_state()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS error [{pid}]: {e}")
    finally:
        CONNECTIONS.pop(pid, None)
        for room in ROOMS.values():
            if pid in room.players:
                await room.broadcast({
                    "type": "player_left",
                    "player_id": pid,
                    "name": room.players[pid].name,
                }, exclude=pid)
                break


@app.get("/rooms")
async def list_rooms():
    result = []
    for r in ROOMS.values():
        if r.phase == "LOBBY" or r.is_public:
            result.append({
                "code": r.code,
                "player_count": len(r.active_players()),
                "phase": r.phase,
                "is_public": r.is_public,
            })
    return result


# ─── Static files ──────────────────────────────────────────────────────────────

_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(_dist):
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
