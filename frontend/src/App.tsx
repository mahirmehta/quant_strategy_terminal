import { useEffect, useMemo, useState } from 'react'
import TerminalHeader from './components/TerminalHeader'
import ChartPanel from './components/ChartPanel'
import AnalyticsRail from './components/AnalyticsRail'
import TradeLog from './components/TradeLog'
import { loadAnalytics, loadHistory } from './api'
import type { Bar, Metrics, Trade } from './types'

function money(x:number) {
  return `${x >= 0 ? '+' : '-'}$${Math.abs(x).toLocaleString(undefined,{maximumFractionDigits:0})}`
}

export default function App() {
  const [symbol,setSymbol] = useState('CL=F')
  const [timeframe,setTimeframe] = useState('5m')
  const [bars,setBars] = useState<Bar[]>([])
  const [trades,setTrades] = useState<Trade[]>([])
  const [metrics,setMetrics] = useState<Metrics>({trades:0,win_rate:0,total_pnl:0,sharpe:0,max_drawdown:0})
  const [analytics,setAnalytics] = useState<any>(null)
  const [status,setStatus] = useState('CONNECTING')
  const [error,setError] = useState('')

  const refresh = async () => {
    try {
      const [h,a] = await Promise.all([loadHistory(symbol,timeframe),loadAnalytics()])
      setBars(h.bars); setTrades(h.trades); setMetrics(h.metrics); setAnalytics(a); setStatus(h.status); setError(h.error || '')
    } catch(e:any) {
      setStatus('OFFLINE'); setError(e.message)
    }
  }

  useEffect(() => { refresh() }, [symbol,timeframe])

  useEffect(() => {
    let ws: WebSocket | null = null
    let timer: number | undefined

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${location.host}/ws`)
      ws.onopen = () => setStatus('LIVE')
      ws.onmessage = ev => {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'snapshot') {
          setBars(msg.bars || [])
          setTrades(msg.trades || [])
          setMetrics(msg.metrics || {})
        }
        if (msg.type === 'market') {
          setBars(prev => {
            const b = msg.bar as Bar
            if (prev.length && prev[prev.length-1].time === b.time) return [...prev.slice(0,-1),b]
            return [...prev.slice(-899),b]
          })
          setTrades(msg.trades || [])
          setMetrics(msg.metrics || {})
          setStatus(msg.status || 'LIVE')
        }
      }
      ws.onclose = () => { setStatus('RECONNECTING'); timer = window.setTimeout(connect,2000) }
      ws.onerror = () => setStatus('DEGRADED')
    }
    connect()
    return () => { if(timer) clearTimeout(timer); ws?.close() }
  }, [])

  useEffect(() => {
    const i = window.setInterval(()=>loadAnalytics().then(setAnalytics).catch(()=>{}),15000)
    return ()=>clearInterval(i)
  }, [])

  const last = bars.at(-1)?.close ?? 0
  const prev = bars.at(-2)?.close ?? last
  const change = last-prev
  const changePct = prev ? change/prev*100 : 0

  useEffect(() => {
    document.getElementById('header-price')!.textContent = last ? last.toFixed(2) : '—'
    document.getElementById('header-trades')!.textContent = String(metrics.trades)
    document.getElementById('header-win')!.textContent = `${metrics.win_rate.toFixed(2)}%`
    document.getElementById('header-pnl')!.textContent = money(metrics.total_pnl)
    document.getElementById('header-sharpe')!.textContent = metrics.sharpe.toFixed(3)
  }, [last,metrics])

  const footer = useMemo(() => {
    if (!bars.length) return 'Awaiting market data…'
    return `Last ${last.toFixed(2)} · ${change>=0?'+':''}${change.toFixed(2)} (${changePct.toFixed(2)}%) · ${bars.length.toLocaleString()} bars`
  },[bars,last,change,changePct])

  return <div className="terminal">
    <TerminalHeader symbol={symbol} setSymbol={setSymbol} timeframe={timeframe} setTimeframe={setTimeframe} onRefresh={refresh} status={status}/>
    <div className="body">
      <main className="workspace">
        <div className="workspace-meta">
          <div><b>{symbol}</b><span>MCX / FUTCOM · {timeframe.toUpperCase()} BARS</span></div>
          <div className={change>=0?'pos':'neg'}>{last.toFixed(2)} <small>{change>=0?'+':''}{change.toFixed(2)} ({changePct.toFixed(2)}%)</small></div>
        </div>
        <ChartPanel bars={bars} trades={trades}/>
        <div className="chart-status">
          <span>O {bars.at(-1)?.open?.toFixed(2) ?? '—'}</span>
          <span>H {bars.at(-1)?.high?.toFixed(2) ?? '—'}</span>
          <span>L {bars.at(-1)?.low?.toFixed(2) ?? '—'}</span>
          <span>C {last.toFixed(2)}</span>
          <span>VOL {Math.round(bars.at(-1)?.volume ?? 0).toLocaleString()}</span>
          <span>{footer}</span>
        </div>
      </main>
      <AnalyticsRail a={analytics}/>
    </div>
    <TradeLog trades={trades}/>
    <footer className="footer">
      <span className="footer-live">● {status}</span>
      <span>STRAT ENGINE · EMA/ATR · SIMULATION</span>
      <span>DATA: YAHOO FINANCE PUBLIC ENDPOINT</span>
      <span>{error ? `ERR: ${error.slice(0,90)}` : 'READY'}</span>
      <span>Generated {new Date().toLocaleTimeString()}</span>
    </footer>
  </div>
}
