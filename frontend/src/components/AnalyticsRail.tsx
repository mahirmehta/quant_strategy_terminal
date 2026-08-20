type A = {
  weekday: Record<string,{trades:number,wins:number,pnl:number}>
  session: Record<string,{trades:number,wins:number,pnl:number}>
  hourly: Record<string,{trades:number,wins:number,pnl:number}>
  monthly: Record<string,number>
}

const money = (x:number) => `${x>=0?'+':''}$${Math.round(x).toLocaleString()}`
const pct = (wins:number,trades:number) => trades ? `${(wins/trades*100).toFixed(1)}%` : '—'

export default function AnalyticsRail({a}:{a:A|null}) {
  const weekday = a ? Object.entries(a.weekday) : []
  const session = a ? Object.entries(a.session) : []
  const hours = a ? Object.entries(a.hourly).filter(([,v])=>v.trades>0) : []
  const months = a ? Object.entries(a.monthly).slice(-12) : []

  return <aside className="rail">
    <section><div className="section-title">SESSION PERFORMANCE <span>↕</span></div>
      {session.map(([k,v])=><div className="analytic-row" key={k}><div><b>{k}</b><small>{v.trades} trades</small></div><span>{pct(v.wins,v.trades)}</span><strong className={v.pnl>=0?'pos':'neg'}>{money(v.pnl)}</strong></div>)}
    </section>

    <section><div className="section-title">WEEKDAY PERFORMANCE</div>
      <div className="thead"><span>DAY</span><span>TRADES</span><span>WIN</span><span>P&L</span></div>
      {weekday.map(([k,v])=><div className="weekday" key={k}><b>{k}</b><span>{v.trades}</span><i>{pct(v.wins,v.trades)}</i><strong className={v.pnl>=0?'pos':'neg'}>{money(v.pnl)}</strong></div>)}
    </section>

    <section><div className="section-title">MONTHLY P&L HEATMAP</div>
      <div className="heatmap">{months.map(([m,v])=><div key={m} className={v>=0?'heat posbg':'heat negbg'}><small>{m}</small><b>{v>=0?'+':''}{Math.round(v/1000)}k</b></div>)}</div>
    </section>

    <section><div className="section-title">HOURLY ENTRY BREAKDOWN</div>
      {hours.map(([h,v])=><div className="hour-row" key={h}><b>{h}:00</b><span>{v.trades}</span><i>{pct(v.wins,v.trades)}</i><strong className={v.pnl>=0?'pos':'neg'}>{money(v.pnl)}</strong></div>)}
    </section>
  </aside>
}
