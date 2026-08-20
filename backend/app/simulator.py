from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from .models import Bar, Trade
from .strategy import ATRCrossoverStrategy

class Simulator:
    def __init__(self, strategy: ATRCrossoverStrategy | None = None, risk_budget=1000.0):
        self.strategy = strategy or ATRCrossoverStrategy()
        self.risk_budget = risk_budget

    def run(self, bars: list[Bar]) -> tuple[list[Trade], dict, pd.DataFrame]:
        if len(bars) < 80:
            return [], self._empty_metrics(), pd.DataFrame()

        df = pd.DataFrame([b.model_dump() for b in bars])
        trades: list[Trade] = []
        position = None
        next_id = 1

        for i in range(len(df)):
            row = df.iloc[i]

            # Manage existing position first.
            if position:
                hit_stop = row.low <= position["stop"] if position["direction"] == "LONG" else row.high >= position["stop"]
                hit_target = row.high >= position["target"] if position["direction"] == "LONG" else row.low <= position["target"]

                exit_price = None
                reason = None
                if hit_stop:
                    exit_price, reason = position["stop"], "STOP"
                elif hit_target:
                    exit_price, reason = position["target"], "TARGET"

                if exit_price is not None:
                    mult = 1 if position["direction"] == "LONG" else -1
                    pnl = (exit_price - position["entry"]) * position["qty"] * mult
                    t = Trade(
                        id=position["id"],
                        entry_time=position["entry_time"],
                        exit_time=int(row.time),
                        direction=position["direction"],
                        entry=position["entry"],
                        exit=float(exit_price),
                        stop=position["stop"],
                        target=position["target"],
                        qty=position["qty"],
                        pnl=float(pnl),
                        pnl_pct=float((pnl / max(abs(position["entry"] * position["qty"]), 1)) * 100),
                        reason=reason,
                        regime=position["regime"],
                    )
                    trades.append(t)
                    position = None

            if position is None:
                sig = self.strategy.signal(df, i)
                if sig:
                    risk_per_unit = max(abs(float(row.close) - sig.stop), 0.01)
                    qty = max(1, int(self.risk_budget / risk_per_unit))
                    position = {
                        "id": next_id,
                        "entry_time": int(row.time),
                        "direction": sig.direction,
                        "entry": float(row.close),
                        "stop": sig.stop,
                        "target": sig.target,
                        "qty": qty,
                        "regime": sig.regime,
                    }
                    next_id += 1

        # Mark-to-market any open position.
        if position:
            last = float(df.iloc[-1].close)
            mult = 1 if position["direction"] == "LONG" else -1
            pnl = (last - position["entry"]) * position["qty"] * mult
            trades.append(Trade(
                id=position["id"],
                entry_time=position["entry_time"],
                exit_time=None,
                direction=position["direction"],
                entry=position["entry"],
                exit=None,
                stop=position["stop"],
                target=position["target"],
                qty=position["qty"],
                pnl=float(pnl),
                pnl_pct=float((pnl / max(abs(position["entry"] * position["qty"]), 1)) * 100),
                reason="OPEN",
                regime=position["regime"],
            ))

        metrics = self._metrics(trades)
        enriched = self.strategy.indicators(df)
        return trades, metrics, enriched

    def _empty_metrics(self):
        return {"trades": 0, "win_rate": 0, "total_pnl": 0, "sharpe": 0, "max_drawdown": 0}

    def _metrics(self, trades: list[Trade]):
        closed = [t for t in trades if t.exit is not None]
        if not closed:
            return self._empty_metrics()
        pnls = np.array([t.pnl for t in closed], dtype=float)
        equity = pnls.cumsum()
        peak = np.maximum.accumulate(equity)
        dd = equity - peak
        sharpe = (pnls.mean() / pnls.std(ddof=1) * np.sqrt(len(pnls))) if len(pnls) > 1 and pnls.std(ddof=1) else 0
        return {
            "trades": len(closed),
            "win_rate": float((pnls > 0).mean() * 100),
            "total_pnl": float(pnls.sum()),
            "sharpe": float(sharpe),
            "max_drawdown": float(abs(dd.min())),
        }
