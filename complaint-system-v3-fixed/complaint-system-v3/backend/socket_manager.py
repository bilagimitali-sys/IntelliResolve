"""Socket.IO ASGI server instance and room management."""

from __future__ import annotations

import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


@sio.event
async def connect(sid: str, environ: dict) -> None:
    pass


@sio.event
async def join(sid: str, user_id: int | str | None) -> None:
    if user_id:
        await sio.enter_room(sid, f"user_{user_id}")


@sio.event
async def joinRole(sid: str, role: str | None) -> None:
    if role:
        await sio.enter_room(sid, f"role_{role}")


@sio.event
async def joinDept(sid: str, dept_id: int | str | None) -> None:
    if dept_id:
        await sio.enter_room(sid, f"dept_{dept_id}")


@sio.event
async def disconnect(sid: str) -> None:
    pass


async def emit_to_rooms(event: str, data: dict, rooms: list[str]) -> None:
    """Emit a Socket.IO event to one or more rooms safely."""
    for room in rooms:
        try:
            await sio.emit(event, data, room=room)
        except Exception as exc:
            print(f"Socket emit warning ({event} -> {room}): {exc}")
