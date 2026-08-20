import { useEffect, useRef } from 'react'
import { CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries, type IChartApi, type UTCTimestamp } from 'lightweight-charts'
import type { Bar, Trade } from '../types'

type Props = { bars: Bar[], trades: Trade[] }

export default function ChartPanel({bars,trades}: Props) {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!el.current) return
    const c = createChart(el.current, {
      layout: { background: { type: ColorType.Solid, color: '#081018' }, textColor: '#b8c0c7' },
      grid: { vertLines: { color: '#17232d' }, horzLines: { color: '#17232d' } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#26333d', scaleMargins: { top: 0.08, bottom: 0.18 } },
      timeScale: { borderColor: '#26333d', timeVisible: true, secondsVisible: false },
      width: el.current.clientWidth,
      height: el.current.clientHeight,
    })
    chart.current = c
    const candles = c.addSeries(CandlestickSeries, {
      upColor: '#35e08d', downColor: '#ff6b63',
      borderUpColor: '#35e08d', borderDownColor: '#ff6b63',
      wickUpColor: '#35e08d', wickDownColor: '#ff6b63',
      priceLineColor: '#49d78e',
    })
    const volume = c.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      base: 0,
      color: '#2d7c5a',
    })
    c.priceScale('').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

    ;(el.current as any).__candle = candles
    ;(el.current as any).__volume = volume

    const ro = new ResizeObserver(() => {
      if (el.current) c.applyOptions({width:el.current.clientWidth,height:el.current.clientHeight})
    })
    ro.observe(el.current)
    return () => { ro.disconnect(); c.remove(); chart.current = null }
  }, [])

  useEffect(() => {
    if (!el.current || !bars.length) return
    const candles = (el.current as any).__candle
    const volume = (el.current as any).__volume
    if (!candles) return

    candles.setData(bars.map(b=>({
      time: b.time as UTCTimestamp, open:b.open,high:b.high,low:b.low,close:b.close
    })))
    volume.setData(bars.map(b=>({
      time: b.time as UTCTimestamp,
      value: b.volume,
      color: b.close >= b.open ? '#255f47' : '#713c3a'
    })))

    const markers = trades
      .filter(t=>t.entry_time)
      .flatMap(t => {
        const entry = {
          time: t.entry_time as UTCTimestamp,
          position: t.direction === 'LONG' ? 'belowBar' : 'aboveBar',
          color: t.direction === 'LONG' ? '#35e08d' : '#ff6b63',
          shape: t.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
          text: `${t.direction} ${t.entry.toFixed(2)}`
        } as any
        const exit = t.exit_time ? [{
          time: t.exit_time as UTCTimestamp,
          position: 'aboveBar',
          color: t.pnl >= 0 ? '#36df8e' : '#ff6b63',
          shape: 'circle',
          text: `${t.reason} ${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(0)}`
        } as any] : []
        return [entry, ...exit]
      })
      .sort((a,b)=>Number(a.time)-Number(b.time))
    candles.setMarkers(markers)
    chart.current?.timeScale().fitContent()
  }, [bars,trades])

  return <div className="chart-wrap">
    <div className="chart-legend">
      <span>CL=F</span><span className="muted">5m · OHLCV</span><span>EMA 12</span><span>EMA 34</span><span>ATR 14</span>
    </div>
    <div ref={el} className="chart"/>
  </div>
}
