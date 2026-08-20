import { Play, RefreshCw, Search, Settings2, Wifi, Zap } from 'lucide-react'

type Props = {
  symbol: string
  setSymbol: (v: string) => void
  timeframe: string
  setTimeframe: (v: string) => void
  onRefresh: () => void
  status: string
}

export default function TerminalHeader({symbol,setSymbol,timeframe,setTimeframe,onRefresh,status}: Props) {
  return <header className="top">
    <div className="brand-tab">STRAT ATR</div>
    <div className="symbol-box">
      <input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} aria-label="Ticker"/>
      <span>YF · FUTURES</span>
    </div>
    <div className="price-chip">
      <span className="micro">LAST</span>
      <strong id="header-price">—</strong>
      <em>LIVE</em>
    </div>
    <div className="period-chip"><span>PERIOD</span><b>LIVE / REPLAY</b></div>
    <div className="kpi-mini"><span>TRADES</span><b id="header-trades">—</b></div>
    <div className="kpi-mini"><span>WIN RATE</span><b id="header-win">—</b></div>
    <div className="kpi-mini"><span>TOTAL P&L</span><b id="header-pnl">—</b></div>
    <div className="kpi-mini"><span>SHARPE</span><b id="header-sharpe">—</b></div>
    <div className="header-actions">
      <button onClick={onRefresh}><RefreshCw size={13}/> FETCH DATA</button>
      <button className="accent"><Play size={13}/> BACKTEST</button>
      <button><Zap size={13}/> ANALYZE</button>
      <div className={status === 'LIVE' ? 'live-dot' : 'live-dot offline'}><Wifi size={13}/> {status}</div>
      <Settings2 size={16} />
      <Search size={16} />
    </div>
    <div className="toolbar">
      {['1m','5m','15m','1h','1D'].map(tf=><button key={tf} className={timeframe===tf?'active':''} onClick={()=>setTimeframe(tf)}>{tf}</button>)}
      <span className="divider"/>
      {['OVERLAY','TRADES','VOL','EQUITY','FILTER','LONG','SHORT','WIN','LOSS'].map((x,i)=><button key={x} className={i<3?'toggle active':''}>{x}</button>)}
    </div>
  </header>
}
