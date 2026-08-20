from __future__ import annotations
import math
from dataclasses import dataclass

import pandas as pd
import numpy as np

@dataclass
class Signal:
    direction: str
    stop: float
    target: float
    reason: str
    regime: str

class ATRCrossoverStrategy:
    """
    Reference strategy only.
    Replace this class with your own strategy logic.
    """

    def __init__(self, fast=12, slow=34, atr_period=14, stop_atr=1.7, target_atr=2.5):
        self.fast = fast
        self.slow = slow
        self.atr_period = atr_period
        self.stop_atr = stop_atr
        self.target_atr = target_atr

    def indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        x = df.copy()
        x["ema_fast"] = x["close"].ewm(span=self.fast, adjust=False).mean()
        x["ema_slow"] = x["close"].ewm(span=self.slow, adjust=False).mean()
        prev_close = x["close"].shift(1)
        tr = pd.concat([
            x["high"] - x["low"],
            (x["high"] - prev_close).abs(),
            (x["low"] - prev_close).abs(),
        ], axis=1).max(axis=1)
        x["atr"] = tr.rolling(self.atr_period).mean()
        x["atr_pct"] = x["atr"] / x["close"] * 100
        return x

    def signal(self, df: pd.DataFrame, i: int) -> Signal | None:
        if i < max(self.slow + 2, self.atr_period + 2):
            return None
        x = self.indicators(df.iloc[:i+1])
        row = x.iloc[-1]
        prev = x.iloc[-2]

        if not np.isfinite(row["atr"]):
            return None

        regime = "HIGH" if row["atr_pct"] > 0.7 else ("LOW" if row["atr_pct"] < 0.35 else "MEDIUM")
        long_cross = prev.ema_fast <= prev.ema_slow and row.ema_fast > row.ema_slow
        short_cross = prev.ema_fast >= prev.ema_slow and row.ema_fast < row.ema_slow

        if long_cross:
            return Signal(
                "LONG",
                float(row.close - self.stop_atr * row.atr),
                float(row.close + self.target_atr * row.atr),
                "EMA_CROSS_LONG",
                regime,
            )
        if short_cross:
            return Signal(
                "SHORT",
                float(row.close + self.stop_atr * row.atr),
                float(row.close - self.target_atr * row.atr),
                "EMA_CROSS_SHORT",
                regime,
            )
        return None
