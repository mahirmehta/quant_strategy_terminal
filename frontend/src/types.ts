export type Bar = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Trade = {
  id: number
  entry_time: number
  exit_time?: number | null
  direction: 'LONG' | 'SHORT'
  entry: number
  exit?: number | null
  stop: number
  target: number
  qty: number
  pnl: number
  pnl_pct: number
  reason: string
  regime: string
}

export type Metrics = {
  trades: number
  win_rate: number
  total_pnl: number
  sharpe: number
  max_drawdown: number
}
