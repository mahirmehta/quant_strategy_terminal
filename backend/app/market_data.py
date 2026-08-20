from __future__ import annotations

import asyncio
import math
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import AsyncIterator

import httpx
import pandas as pd

from .models import Bar

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

class MarketDataProvider(ABC):
    @abstractmethod
    async def history(self, symbol: str, timeframe: str, limit: int) -> list[Bar]:
        ...

    @abstractmethod
    async def stream(self, symbol: str, timeframe: str) -> AsyncIterator[Bar]:
        ...

def _period_for(timeframe: str) -> tuple[str, str]:
    if timeframe in {"1m", "2m", "5m", "15m", "30m"}:
        return "1d", timeframe
    if timeframe in {"1h", "60m"}:
        return "5d", "60m"
    return "1mo", "1d"

class YahooChartProvider(MarketDataProvider):
    name = "Yahoo Finance public chart endpoint"

    async def _fetch(self, symbol: str, timeframe: str) -> list[Bar]:
        period, interval = _period_for(timeframe)
        url = YAHOO_URL.format(symbol=symbol)
        params = {
            "range": period,
            "interval": interval,
            "events": "history",
            "includePrePost": "true",
        }
        headers = {"User-Agent": "Mozilla/5.0 STRAT-Terminal/1.0"}
        async with httpx.AsyncClient(timeout=15, headers=headers) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            payload = r.json()

        result = payload["chart"]["result"][0]
        timestamps = result.get("timestamp", [])
        q = result["indicators"]["quote"][0]

        bars: list[Bar] = []
        for i, ts in enumerate(timestamps):
            try:
                o = q["open"][i]
                h = q["high"][i]
                l = q["low"][i]
                c = q["close"][i]
                v = q.get("volume", [0] * len(timestamps))[i] or 0
                if any(x is None or not math.isfinite(float(x)) for x in [o, h, l, c]):
                    continue
                bars.append(Bar(
                    time=int(ts),
                    open=float(o),
                    high=float(h),
                    low=float(l),
                    close=float(c),
                    volume=float(v),
                ))
            except (IndexError, TypeError, ValueError):
                continue
        return bars

    async def history(self, symbol: str, timeframe: str, limit: int) -> list[Bar]:
        bars = await self._fetch(symbol, timeframe)
        return bars[-limit:]

    async def stream(self, symbol: str, timeframe: str) -> AsyncIterator[Bar]:
        last_key = None
        while True:
            try:
                bars = await self._fetch(symbol, timeframe)
                if bars:
                    current = bars[-1]
                    key = (current.time, current.close)
                    if key != last_key:
                        last_key = key
                        yield current
            except Exception:
                # Keep the websocket alive; the API reports stale/offline status separately.
                pass
            await asyncio.sleep(10)

def create_provider() -> MarketDataProvider:
    return YahooChartProvider()
