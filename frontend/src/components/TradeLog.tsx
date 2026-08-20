import type { Trade } from '../types'

const fmtTime = (ts:number|null|undefined) => ts ? new Date(ts*1000).toISOString().replace('T',' ').slice(0,19) : 'OPEN'

export default function TradeLog({trades}:{trades:Trade[]}) {
  return <section className="trade-log">
    <div className="log-head"><b>TRADE LOG</b><span>{trades.length.toLocaleString()} trades</span></div>
    <div className="log-tools"><input placeholder="Search..." /><select><option>ALL DIR</option></select><select><option>ALL RES</option></select><select><option>ALL REGIMES</option></select></div>
    <div className="table-scroll">
      <table><thead><tr>
        <th>ID</th><th>ENTRY</th><th>EXIT</th><th>DIR</th><th>SIG</th><th>REGIME</th><th>ENTRY ₹</th><th>EXIT ₹</th><th>STOP ₹</th><th>QTY</th><th>P&L/U</th><th>P&L</th><th>REASON</th><th>RES</th>
      </tr></thead>
      <tbody>{trades.slice().reverse().map(t=><tr key={t.id}>
        <td>{t.id}</td><td>{fmtTime(t.entry_time)}</td><td>{fmtTime(t.exit_time)}</td>
        <td className={t.direction==='LONG'?'pos':'neg'}>{t.direction}</td><td className="sig">{t.direction==='LONG'?'EMA':'EMA'}</td>
        <td><span className={`regime ${t.regime.toLowerCase()}`}>{t.regime}</span></td>
        <td>{t.entry.toFixed(2)}</td><td>{t.exit?.toFixed(2) ?? '—'}</td><td>{t.stop.toFixed(2)}</td>
        <td>{t.qty}</td><td>{(t.pnl/t.qty).toFixed(2)}</td><td className={t.pnl>=0?'pos':'neg'}>{t.pnl>=0?'+':''}{t.pnl.toFixed(2)}</td>
        <td>{t.reason}</td><td><span className={t.pnl>=0?'res-win':'res-loss'}>{t.exit ? (t.pnl>=0?'WIN':'LOSS'):'OPEN'}</span></td>
      </tr>)}</tbody></table>
    </div>
  </section>
}
