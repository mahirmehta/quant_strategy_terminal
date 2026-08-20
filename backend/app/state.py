from __future__ import annotations
import asyncio
from dataclasses import dataclass, field

from .config import settings
from .market_data import create_provider
from .models import Bar
from .simulator import Simulator

@dataclass
class TerminalState:
    symbol: str = settings.default_symbol
    timeframe: str = settings.default_timeframe
    bars: list[Bar] = field(default_factory=list)
    trades: list = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    enriched: object | None = None
    last_error: str | None = None
    clients: set = field(default_factory=set)

state = TerminalState()
provider = create_provider()
simulator = Simulator()

async def refresh():
    try:
        state.bars = await provider.history(state.symbol, state.timeframe, settings.history_limit)
        state.trades, state.metrics, state.enriched = simulator.run(state.bars)
        state.last_error = None
    except Exception as e:
        state.last_error = str(e)

async def broadcaster():
    await refresh()
    last_key = None

    while True:
        try:
            bars = await provider.history(state.symbol, state.timeframe, settings.history_limit)
            if bars:
                current = bars[-1]
                key = (state.symbol, state.timeframe, current.time, current.close)

                # Send when the latest bar changes or the user changes instrument/timeframe.
                if key != last_key:
                    last_key = key
                    state.bars = bars
                    state.trades, state.metrics, state.enriched = simulator.run(state.bars)

                    payload = {
                        "type": "market",
                        "bar": current.model_dump(),
                        "bars": [b.model_dump() for b in state.bars],
                        "metrics": state.metrics,
                        "trades": [t.model_dump() for t in state.trades[-150:]],
                        "symbol": state.symbol,
                        "timeframe": state.timeframe,
                        "status": "LIVE" if not state.last_error else "DEGRADED",
                    }
                    dead = []
                    for ws in state.clients:
                        try:
                            await ws.send_json(payload)
                        except Exception:
                            dead.append(ws)
                    for ws in dead:
                        state.clients.discard(ws)
        except Exception as e:
            state.last_error = str(e)

        await asyncio.sleep(settings.poll_seconds)
