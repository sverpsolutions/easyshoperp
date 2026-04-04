import React, { useState } from 'react'
import { reportsAPI } from '../../api/api'

const REPORT_TYPES = [
  { key:'daily',      label:'Daily Production', icon:'bi-calendar2-day' },
  { key:'operator',   label:'Operator Performance', icon:'bi-person-badge' },
  { key:'machine',    label:'Machine Utilization', icon:'bi-gear' },
  { key:'customer',   label:'Customer Wise', icon:'bi-person-lines-fill' },
  { key:'completion', label:'Job Completion', icon:'bi-clipboard2-check' },
  { key:'overdue',    label:'Overdue Jobs', icon:'bi-exclamation-triangle' },
]

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('daily')
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(false)
  const [from, setFrom]     = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
  const [to, setTo]         = useState(new Date().toISOString().slice(0,10))

  const load = async () => {
    setLoading(true)
    try {
      let res
      const params = { from, to }
      if (activeReport === 'daily')      res = await reportsAPI.daily(params)
      else if (activeReport === 'operator') res = await reportsAPI.operator(params)
      else if (activeReport === 'machine')  res = await reportsAPI.machine(params)
      else if (activeReport === 'customer') res = await reportsAPI.customer(params)
      else if (activeReport === 'completion') res = await reportsAPI.completion()
      else if (activeReport === 'overdue')    res = await reportsAPI.overdue()
      setData(res.data.data)
    } finally { setLoading(false) }
  }

  const renderTable = () => {
    if (!data.length) return <div className="text-center py-5 text-muted">No data found for selected range</div>

    if (activeReport === 'daily') return (
      <table className="table table-hover table-sm">
        <thead className="table-light"><tr><th>Date</th><th>Job #</th><th>Customer</th><th>Size</th><th>Type</th><th>UPS</th><th>Machine</th><th>Operator</th><th>Qty</th></tr></thead>
        <tbody>{data.map((r,i)=>(
          <tr key={i}><td>{r.Production_Date}</td><td>{r.Job_Number}</td><td>{r.Customer_Name}</td><td>{r.Size}</td>
            <td>{r.Label_Type}</td><td>{r.UPS}</td><td>{r.Machine_Name}</td><td>{r.Operator_Name}</td>
            <td className="fw-bold text-primary">{parseInt(r.Total_Qty).toLocaleString()}</td></tr>
        ))}</tbody>
      </table>
    )

    if (activeReport === 'operator') return (
      <table className="table table-hover">
        <thead className="table-light"><tr><th>Rank</th><th>Operator</th><th>Jobs</th><th>Total Qty</th><th>Hours</th></tr></thead>
        <tbody>{data.map((r,i)=>(
          <tr key={i}>
            <td><span className={`badge ${i===0?'bg-warning text-dark':i===1?'bg-secondary':i===2?'bg-danger':'bg-light text-muted border'}`}>{i+1}</span></td>
            <td className="fw-semibold">{r.Operator_Name}</td>
            <td>{r.Total_Jobs}</td>
            <td className="fw-bold text-primary">{parseInt(r.Total_Qty).toLocaleString()}</td>
            <td>{r.Total_Minutes ? Math.round(r.Total_Minutes/60)+'h' : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    )

    if (activeReport === 'machine') return (
      <table className="table table-hover">
        <thead className="table-light"><tr><th>Machine</th><th>Type</th><th>Jobs</th><th>Total Qty</th><th>Run Hours</th></tr></thead>
        <tbody>{data.map((r,i)=>(
          <tr key={i}>
            <td className="fw-semibold">{r.Machine_Name}</td>
            <td>{r.Machine_Type}</td>
            <td>{r.Total_Jobs||0}</td>
            <td className="fw-bold text-primary">{parseInt(r.Total_Qty||0).toLocaleString()}</td>
            <td>{r.Total_Minutes ? Math.round(r.Total_Minutes/60)+'h' : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    )

    if (activeReport === 'customer') return (
      <table className="table table-hover">
        <thead className="table-light"><tr><th>Customer</th><th>Jobs</th><th>Required Qty</th><th>Produced Qty</th><th>Completed</th></tr></thead>
        <tbody>{data.map((r,i)=>(
          <tr key={i}>
            <td className="fw-semibold">{r.Customer_Name}</td>
            <td>{r.Total_Jobs}</td>
            <td>{parseInt(r.Total_Required||0).toLocaleString()}</td>
            <td className="fw-bold text-primary">{parseInt(r.Total_Produced||0).toLocaleString()}</td>
            <td><span className="badge bg-success">{r.Completed}</span></td>
          </tr>
        ))}</tbody>
      </table>
    )

    if (activeReport === 'completion' || activeReport === 'overdue') return (
      <table className="table table-hover">
        <thead className="table-light"><tr>
          <th>Job #</th><th>Customer</th><th>Required</th><th>Produced</th><th>Progress</th>
          <th>Delivery</th>{activeReport==='overdue'&&<th>Days Overdue</th>}<th>Status</th>
        </tr></thead>
        <tbody>{data.map((r,i)=>(
          <tr key={i}>
            <td className="fw-semibold">{r.Job_Number}</td>
            <td>{r.Customer_Name}</td>
            <td>{parseInt(r.Required_Qty).toLocaleString()}</td>
            <td>{parseInt(r.Produced_Qty).toLocaleString()}</td>
            <td>
              <div className="progress" style={{width:80}}>
                <div className="progress-bar bg-primary" style={{width:`${r.Progress_Pct||0}%`}}/>
              </div>
              <small>{r.Progress_Pct||0}%</small>
            </td>
            <td><small>{r.Delivery_Date||'—'}</small></td>
            {activeReport==='overdue'&&<td className="text-danger fw-bold">{r.Days_Overdue}d</td>}
            <td><span className="badge bg-warning text-dark">{r.Status}</span></td>
          </tr>
        ))}</tbody>
      </table>
    )

    return null
  }

  return (
    <div>
      <h4 className="mb-4 fw-bold"><i className="bi bi-bar-chart-line me-2 text-primary"></i>Reports</h4>

      {/* Report type tabs */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {REPORT_TYPES.map(rt=>(
              <button key={rt.key}
                className={`btn btn-sm ${activeReport===rt.key?'btn-primary':'btn-outline-secondary'}`}
                onClick={()=>setActiveReport(rt.key)}>
                <i className={`bi ${rt.icon} me-1`}></i>{rt.label}
              </button>
            ))}
            <div className="ms-auto d-flex gap-2 align-items-center">
              {!['completion','overdue'].includes(activeReport) && <>
                <input type="date" className="form-control form-control-sm" value={from} onChange={e=>setFrom(e.target.value)} style={{width:140}}/>
                <span className="text-muted">to</span>
                <input type="date" className="form-control form-control-sm" value={to} onChange={e=>setTo(e.target.value)} style={{width:140}}/>
              </>}
              <button className="btn btn-primary btn-sm" onClick={load}>
                <i className="bi bi-play-fill me-1"></i>Run
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between">
          <strong>{REPORT_TYPES.find(r=>r.key===activeReport)?.label}</strong>
          {data.length > 0 && <small className="text-muted">{data.length} records</small>}
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"/></div>
          ) : (
            <div className="table-responsive">{renderTable()}</div>
          )}
        </div>
      </div>
    </div>
  )
}
