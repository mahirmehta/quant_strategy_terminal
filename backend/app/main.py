from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import Snapshot
from .state import state, broadcaster, refresh

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(broadcaster())
    yield
    task.cancel()

app = FastAPI(title="STRAT Terminal API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"ok": True, "symbol": state.symbol, "bars": len(state.bars), "error": state.last_error}

@app.get("/api/history")
async def history(symbol: str | None = None, timeframe: str | None = None):
    if symbol and symbol != state.symbol:
        state.symbol = symbol
    if timeframe and timeframe != state.timeframe:
        state.timeframe = timeframe
    await refresh()
    return {
        "symbol": state.symbol,
        "timeframe": state.timeframe,
        "bars": [b.model_dump() for b in state.bars],
        "trades": [t.model_dump() for t in state.trades],
        "metrics": state.metrics,
        "source": "Yahoo Finance public chart endpoint",
        "status": "LIVE" if not state.last_error else "DEGRADED",
        "error": state.last_error,
    }

@app.get("/api/snapshot", response_model=Snapshot)
async def snapshot():
    last = state.bars[-1].close if state.bars else 0
    prev = state.bars[-2].close if len(state.bars) > 1 else last
    change = last - prev
    pct = change / prev * 100 if prev else 0
    m = state.metrics or {}
    return Snapshot(
        symbol=state.symbol,
        display_name="Crude Oil Futures" if state.symbol == "CL=F" else state.symbol,
        last=last,
        change=change,
        change_pct=pct,
        bars=len(state.bars),
        trades=m.get("trades", 0),
        win_rate=m.get("win_rate", 0),
        total_pnl=m.get("total_pnl", 0),
        sharpe=m.get("sharpe", 0),
        max_drawdown=m.get("max_drawdown", 0),
        data_status="LIVE" if not state.last_error else "DEGRADED",
        data_source="Yahoo Finance",
    )

@app.get("/api/analytics")
async def analytics():
    trades = state.trades
    weekday = {d: {"trades": 0, "wins": 0, "pnl": 0.0} for d in ["Mon","Tue","Wed","Thu","Fri"]}
    session = {
        "Core (15-21)": {"trades": 0, "wins": 0, "pnl": 0.0},
        "Early (17-19)": {"trades": 0, "wins": 0, "pnl": 0.0},
        "Late (21-23)": {"trades": 0, "wins": 0, "pnl": 0.0},
    }
    hourly = {str(h).zfill(2): {"trades": 0, "wins": 0, "pnl": 0.0} for h in range(24)}
    monthly = {}

    from datetime import datetime, timezone
    for t in trades:
        dt = datetime.fromtimestamp(t.entry_time, tz=timezone.utc)
        d = dt.strftime("%a")
        if d in weekday:
            weekday[d]["trades"] += 1
            weekday[d]["wins"] += int(t.pnl > 0)
            weekday[d]["pnl"] += t.pnl
        h = dt.hour
        hourly[str(h).zfill(2)]["trades"] += 1
        hourly[str(h).zfill(2)]["wins"] += int(t.pnl > 0)
        hourly[str(h).zfill(2)]["pnl"] += t.pnl

        month = dt.strftime("%Y-%m")
        monthly[month] = monthly.get(month, 0) + t.pnl

    for name, rng in [("Core (15-21)", range(15,22)), ("Early (17-19)", range(17,20)), ("Late (21-23)", range(21,24))]:
        selected = [t for t in trades if datetime.fromtimestamp(t.entry_time, tz=timezone.utc).hour in rng]
        session[name] = {
            "trades": len(selected),
            "wins": sum(t.pnl > 0 for t in selected),
            "pnl": sum(t.pnl for t in selected),
        }

    return {"weekday": weekday, "session": session, "hourly": hourly, "monthly": monthly}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    state.clients.add(websocket)
    try:
        await websocket.send_json({
            "type": "snapshot",
            "symbol": state.symbol,
            "timeframe": state.timeframe,
            "bars": [b.model_dump() for b in state.bars],
            "trades": [t.model_dump() for t in state.trades[-150:]],
            "metrics": state.metrics,
            "status": "LIVE" if not state.last_error else "DEGRADED",
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        state.clients.discard(websocket)
    except Exception:
        state.clients.discard(websocket)
