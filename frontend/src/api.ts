import type { Bar, Metrics, Trade } from './types'

const json = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export const loadHistory = (symbol: string, timeframe: string) =>
  json<{symbol:string,timeframe:string,bars:Bar[],trades:Trade[],metrics:Metrics,status:string,error?:string}>(
    `/api/history?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`
  )

export const loadAnalytics = () => json<{
  weekday: Record<string,{trades:number,wins:number,pnl:number}>
  session: Record<string,{trades:number,wins:number,pnl:number}>
  hourly: Record<string,{trades:number,wins:number,pnl:number}>
  monthly: Record<string,number>
}>('/api/analytics')
