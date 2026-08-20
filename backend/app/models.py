from pydantic import BaseModel, Field
from typing import Literal

class Bar(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float = 0

class Trade(BaseModel):
    id: int
    entry_time: int
    exit_time: int | None = None
    direction: Literal["LONG", "SHORT"]
    entry: float
    exit: float | None = None
    stop: float
    target: float
    qty: int
    pnl: float = 0
    pnl_pct: float = 0
    reason: str = "OPEN"
    regime: str = "NORMAL"

class Snapshot(BaseModel):
    symbol: str
    display_name: str
    last: float
    change: float
    change_pct: float
    bars: int
    trades: int
    win_rate: float
    total_pnl: float
    sharpe: float
    max_drawdown: float
    data_status: str
    data_source: str
