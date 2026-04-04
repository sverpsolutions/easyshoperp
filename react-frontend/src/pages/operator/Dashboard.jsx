import React, { useState, useEffect } from 'react'
import { operatorAPI, jobsAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'

export default function OperatorDashboard() {
  const { user }          = useAuth()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [logModal, setLogModal] = useState(null)  // job to log production for
  const [reqModal, setReqModal] = useState(false)
  const [logForm, setLogForm]   = useState({ qty:'', remarks:'' })
  const [reqForm, setReqForm]   = useState({ Description:'', Request_Type:'Job' })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const load = () => {
    operatorAPI.dashboard().then(r => setData(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const handleStart = async job => {
    if (!job.Assigned_Machine_ID) return alert('No machine assigned to this job')
    await jobsAPI.start({ job_id: job.Job_ID, machine_id: job.Assigned_Machine_ID, operator_id: user.id })
    setMsg('Job started!'); load()
    setTimeout(() => setMsg(''), 3000)
  }

  const handleStop = async job => {
    const qty = parseInt(prompt(`Total qty produced for ${job.Job_Number}?`) || '0')
    if (!qty) return
    await jobsAPI.stop({ job_id: job.Job_ID, machine_id: job.Assigned_Machine_ID, produced_qty: qty, status: qty >= job.Required_Qty ? 'Completed' : 'Paused' })
    setMsg('Job stopped'); load()
    setTimeout(() => setMsg(''), 3000)
  }

  const handleLog = async e => {
    e.preventDefault(); setSaving(true)
    await jobsAPI.log({
      job_id:     logModal.Job_ID,
      machine_id: logModal.Assigned_Machine_ID,
      qty:        parseInt(logForm.qty),
      remarks:    logForm.remarks,
    })
    setLogModal(null); setLogForm({ qty:'', remarks:'' })
    setMsg('Production logged'); load()
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleRequest = async e => {
    e.preventDefault(); setSaving(true)
    await operatorAPI.requestJob(reqForm)
    setReqModal(false); setReqForm({ Description:'', Request_Type:'Job' })
    setMsg('Request sent to owner'); setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div>

  const { jobs=[], machine, my_requests=[] } = data || {}

  return (
    <div className="container py-4" style={{maxWidth:900}}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-person-badge me-2 text-primary"></i>Operator Panel</h4>
          <small className="text-muted">Welcome, {user?.name}</small>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={load}><i className="bi bi-arrow-clockwise"></i></button>
          <button className="btn btn-warning btn-sm" onClick={()=>setReqModal(true)}>
            <i className="bi bi-bell me-1"></i>Request Job
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-success py-2"><i className="bi bi-check-circle me-2"></i>{msg}</div>}

      {/* Current Machine */}
      {machine && (
        <div className={`card border-0 shadow-sm mb-4 border-start border-4 border-${machine.Status==='Running'?'success':'secondary'}`}>
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <div className="text-muted small">Current Machine</div>
                <div className="fw-bold fs-5">{machine.Machine_Name}</div>
                <div className="text-muted small">{machine.Location} · {machine.Machine_Type}</div>
              </div>
              <span className={`badge bg-${machine.Status==='Running'?'success':machine.Status==='Idle'?'secondary':'danger'} align-self-start`}>
                {machine.Status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Jobs */}
      <div className="mb-3 fw-semibold">My Jobs ({jobs.length})</div>
      {jobs.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-clipboard2 display-4 d-block mb-3"></i>
            No jobs assigned yet. Use "Request Job" to ask for assignment.
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {jobs.map(j => {
            const progress = j.Required_Qty > 0 ? Math.min(j.Produced_Qty / j.Required_Qty * 100, 100) : 0
            return (
              <div key={j.Job_ID} className="col-12 col-md-6">
                <div className={`card border-0 shadow-sm border-start border-4 border-${j.Status==='Running'?'success':j.Status==='Assigned'?'info':'warning'}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-2">
                      <div className="fw-bold text-primary">{j.Job_Number}</div>
                      <span className={`badge bg-${j.Status==='Running'?'success':j.Status==='Assigned'?'info':'warning text-dark'}`}>
                        {j.Status}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="fw-semibold">{j.Customer_Name}</div>
                      <small className="text-muted">{j.Label_Type} {j.Size && `· ${j.Size}`} {j.Label && `· ${j.Label}`}</small>
                    </div>
                    <div className="small mb-1">
                      <i className="bi bi-box-seam me-1"></i>
                      {j.Produced_Qty?.toLocaleString()} / {j.Required_Qty?.toLocaleString()} pcs
                    </div>
                    <div className="progress mb-2">
                      <div className="progress-bar bg-primary" style={{width:`${progress}%`}}/>
                    </div>
                    {j.Machine_Name && (
                      <div className="small text-muted mb-2">
                        <i className="bi bi-gear me-1"></i>{j.Machine_Name}
                        {j.Delivery_Date && ` · Delivery: ${j.Delivery_Date}`}
                      </div>
                    )}
                    <div className="d-flex gap-2 flex-wrap">
                      {j.Status !== 'Running' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleStart(j)}>
                          <i className="bi bi-play-fill me-1"></i>Start
                        </button>
                      )}
                      {j.Status === 'Running' && (
                        <>
                          <button className="btn btn-warning btn-sm" onClick={() => setLogModal(j)}>
                            <i className="bi bi-plus-circle me-1"></i>Log Qty
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleStop(j)}>
                            <i className="bi bi-stop-fill me-1"></i>Stop
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* My Requests */}
      {my_requests.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 fw-semibold">My Requests</div>
          <div className="list-group">
            {my_requests.map(r=>(
              <div key={r.Request_ID} className="list-group-item d-flex justify-content-between">
                <div>
                  <small className="text-muted">{r.Request_Type}</small>
                  <div>{r.Description}</div>
                </div>
                <span className={`badge align-self-center bg-${r.Status==='Acknowledged'?'success':r.Status==='Pending'?'warning text-dark':'secondary'}`}>
                  {r.Status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Production Modal */}
      {logModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Log Production — {logModal.Job_Number}</h5>
                <button className="btn-close" onClick={()=>setLogModal(null)}/>
              </div>
              <form onSubmit={handleLog}>
                <div className="modal-body">
                  <div className="alert alert-light border">
                    <strong>{logModal.Customer_Name}</strong>
                    <div className="small">Produced so far: {logModal.Produced_Qty?.toLocaleString()} / {logModal.Required_Qty?.toLocaleString()}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Quantity Produced *</label>
                    <input type="number" className="form-control form-control-lg" required min="1"
                      value={logForm.qty} onChange={e=>setLogForm(p=>({...p,qty:e.target.value}))} autoFocus/>
                  </div>
                  <div>
                    <label className="form-label">Remarks</label>
                    <input className="form-control" value={logForm.remarks}
                      onChange={e=>setLogForm(p=>({...p,remarks:e.target.value}))}/>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setLogModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-1"/>}
                    Log Production
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {reqModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Send Request to Owner</h5>
                <button className="btn-close" onClick={()=>setReqModal(false)}/>
              </div>
              <form onSubmit={handleRequest}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Request Type</label>
                    <select className="form-select" value={reqForm.Request_Type} onChange={e=>setReqForm(p=>({...p,Request_Type:e.target.value}))}>
                      <option value="Job">Job Assignment</option>
                      <option value="Advance">Advance Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={3} value={reqForm.Description} onChange={e=>setReqForm(p=>({...p,Description:e.target.value}))} placeholder="Describe what you need..."/>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setReqModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-1"/>}
                    Send Request
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
