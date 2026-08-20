# STRAT Terminal — Bloomberg-style Strategy Backtesting + Live Market Dashboard

A production-shaped starter codebase inspired by the supplied STRAT ATR / Bloomberg-style terminal screenshots.

## What is included

- React + TypeScript + Vite frontend
- TradingView Lightweight Charts v5 for high-performance candlestick plotting
- FastAPI backend
- WebSocket market stream
- Yahoo Finance public chart endpoint adapter (default: `CL=F`, Crude Oil futures)
- Background strategy simulation using EMA crossover + ATR risk management
- Live trade markers on the chart
- KPI strip: price, period, trades, win rate, total P&L, Sharpe, max drawdown
- Right analytics rail: session, weekday, monthly P&L heatmap, hourly entry breakdown
- Bottom trade log
- Symbol / timeframe / data-source controls
- Clean separation between market data, strategy, simulation, and API layers

> Data note: the default Yahoo Finance feed is an open, no-key source but is not an exchange-grade real-time MCX feed. Yahoo currently labels its crude futures quote as delayed. For actual MCX trading/research, plug in a licensed/broker feed using the `MarketDataProvider` interface in `backend/app/market_data.py`.

## Stack

- Frontend: React 19, TypeScript, Vite, Lightweight Charts 5
- Backend: Python 3.11+, FastAPI, Uvicorn, httpx, pandas, numpy
- Transport: REST + WebSocket
- Persistence: in-memory for the starter; easy to swap for PostgreSQL/TimescaleDB

## Run

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, normally:

http://localhost:5173

The Vite dev server proxies `/api` and `/ws` to FastAPI.

## Default market feed

The app starts with:

- Symbol: `CL=F`
- Display: Crude Oil Futures
- Timeframe: `5m`

The backend fetches OHLCV bars from Yahoo Finance's public chart endpoint. The frontend receives periodic tick/bar updates over WebSocket.

You can enter another Yahoo Finance symbol in the top-left symbol control, e.g.:

- `CL=F` — WTI crude futures
- `GC=F` — Gold futures
- `ES=F` — S&P 500 futures
- `NQ=F` — Nasdaq futures
- `BTC-USD` — Bitcoin

## Strategy

The sample strategy is intentionally deterministic and easy to replace:

1. Fast EMA / slow EMA crossover
2. ATR-based stop
3. ATR multiple target
4. Position sizing by fixed risk budget
5. One position at a time

Edit:

`backend/app/strategy.py`

The simulator calls `Strategy.on_bar()` for every historical bar and can be replaced with your own strategy engine.

## Moving from Yahoo to true MCX live data

Implement a new class in `backend/app/market_data.py`:

```python
class McxBrokerFeed(MarketDataProvider):
    async def history(self, symbol, timeframe, limit):
        ...

    async def stream(self, symbol, timeframe):
        ...
```

Then wire it into `create_provider()`.

Recommended production architecture:

`Broker/WebSocket -> Market Data Normalizer -> Redis/NATS -> Strategy Engine -> PostgreSQL/TimescaleDB -> FastAPI WS -> React`

Keep the Yahoo provider for development / demo fallback.

## Design

The interface is deliberately modeled after the supplied screenshots:

- orange active workspace tab
- compact terminal header
- dark navy/charcoal canvas
- green/red market semantics
- yellow terminal labels
- dense information hierarchy
- main chart + analytics rail
- trade log bottom panel
- keyboard-friendly controls
- live connection indicator

The chart uses TradingView Lightweight Charts rather than the proprietary Advanced Charts / Trading Platform libraries. Lightweight Charts is open source and intended for streaming custom data, while TradingView's Advanced Charts / Trading Platform packages require access and have redistribution restrictions.

## Production hardening

Before using this for live trading:

- add authentication and RBAC
- use Redis/NATS/Kafka for market events
- persist bars/trades to PostgreSQL/TimescaleDB
- add exchange-session calendars
- add idempotent order/trade IDs
- add strategy versioning
- add replayable event logs
- add monitoring and alerting
- add broker/exchange adapters
- never treat a delayed public feed as an execution feed
