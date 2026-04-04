import React, { useState, useEffect } from 'react'
import { attendanceAPI, employeesAPI } from '../../api/api'

const STATUS_OPTS = ['Present','Absent','Half Day','Off','Holiday','Late']
const STATUS_COLOR = { Present:'success', Absent:'danger', 'Half Day':'warning', Off:'secondary', Holiday:'info', Late:'warning' }

export default function AttendancePage() {
  const [list, setList]           = useState([])
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [date, setDate]           = useState(new Date().toISOString().slice(0,10))
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)

  const load = () => {
    attendanceAPI.list({ date }).then(r => {
      setList(r.data.data.attendance)
      setShifts(r.data.data.shifts)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    employeesAPI.operators().then(r => setEmployees(r.data.data))
  }, [date])

  const openMarkAll = () => {
    setShowModal(true)
    setForm({ Att_Date: date, Status: 'Present', In_Time: '', Out_Time: '', Shift_ID: '', Remarks: '' })
  }

  const markBulk = async e => {
    e.preventDefault(); setSaving(true)
    try {
      for (const emp of employees) {
        await attendanceAPI.mark({ ...form, Employee_ID: emp.Employee_ID })
      }
      setShowModal(false); load()
    } finally { setSaving(false) }
  }

  const quickMark = async (emp_id, status) => {
    await attendanceAPI.mark({ Employee_ID: emp_id, Att_Date: date, Status: status })
    load()
  }

  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  // Build a map of existing attendance by employee
  const attMap = Object.fromEntries(list.map(a => [a.Employee_ID, a]))

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-calendar-check me-2 text-primary"></i>Attendance</h4>
        <div className="d-flex gap-2 align-items-center">
          <input type="date" className="form-control form-control-sm" value={date} onChange={e=>setDate(e.target.value)} style={{width:150}}/>
          <button className="btn btn-success btn-sm" onClick={openMarkAll}>
            <i className="bi bi-check-all me-1"></i>Mark All
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="row g-3 mb-3">
        {STATUS_OPTS.map(s => {
          const count = list.filter(a=>a.Status===s).length
          return (
            <div key={s} className="col-6 col-md-2">
              <div className={`card border-0 bg-${STATUS_COLOR[s]} bg-opacity-15`}>
                <div className="card-body py-2 px-3">
                  <div className="fw-bold fs-5">{count}</div>
                  <small className="text-muted">{s}</small>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr><th>Employee</th><th>Shift</th><th>In Time</th><th>Out Time</th><th>Hours</th><th>Status</th><th>Quick Mark</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4"><div className="spinner-border spinner-border-sm"/></td></tr>
              ) : employees.map(emp => {
                const a = attMap[emp.Employee_ID]
                return (
                  <tr key={emp.Employee_ID}>
                    <td><div className="fw-semibold">{emp.Name}</div><small className="text-muted">{emp.Mobile}</small></td>
                    <td>{a?.Shift_Name || '—'}</td>
                    <td>{a?.In_Time ? new Date(a.In_Time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                    <td>{a?.Out_Time ? new Date(a.Out_Time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                    <td>{a?.Total_Hours ? parseFloat(a.Total_Hours).toFixed(1)+'h' : '—'}</td>
                    <td>
                      {a ? <span className={`badge bg-${STATUS_COLOR[a.Status]||'secondary'}`}>{a.Status}</span>
                         : <span className="badge bg-light text-muted border">Not Marked</span>}
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        {['Present','Absent','Half Day','Off'].map(s=>(
                          <button key={s} className={`btn btn-outline-${STATUS_COLOR[s]}`}
                            title={s} onClick={()=>quickMark(emp.Employee_ID,s)}
                            style={{fontSize:'0.7rem',padding:'2px 6px'}}>
                            {s[0]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Mark All Attendance — {date}</h5>
                <button className="btn-close" onClick={()=>setShowModal(false)}/>
              </div>
              <form onSubmit={markBulk}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-6"><label className="form-label">Status</label>
                      <select className="form-select" value={form.Status} onChange={e=>f('Status',e.target.value)}>
                        {STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
                      </select></div>
                    <div className="col-6"><label className="form-label">Shift</label>
                      <select className="form-select" value={form.Shift_ID||''} onChange={e=>f('Shift_ID',e.target.value)}>
                        <option value="">— Select Shift —</option>
                        {shifts.map(s=><option key={s.Shift_ID} value={s.Shift_ID}>{s.Shift_Name}</option>)}
                      </select></div>
                    <div className="col-6"><label className="form-label">In Time</label>
                      <input type="time" className="form-control" value={form.In_Time||''} onChange={e=>f('In_Time',e.target.value)}/></div>
                    <div className="col-6"><label className="form-label">Out Time</label>
                      <input type="time" className="form-control" value={form.Out_Time||''} onChange={e=>f('Out_Time',e.target.value)}/></div>
                  </div>
                  <div className="alert alert-info mt-3 small">
                    This will mark <strong>all {employees.length} operators</strong> as {form.Status}.
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-1"/>}
                    Mark All
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
