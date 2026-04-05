import React, { useState, useEffect, useCallback } from 'react'
import { operatorAPI, jobsAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLOR  = { Running:'success', Assigned:'info', Pending:'warning', Paused:'secondary', Completed:'dark' }
const STATUS_ICON   = { Running:'bi-play-circle-fill', Assigned:'bi-person-check', Pending:'bi-hourglass-split', Paused:'bi-pause-circle', Completed:'bi-check-circle-fill' }

function ElapsedBadge({ startTime }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    const calc = () => {
      if (!startTime) return setLabel('')
      const mins = Math.floor((Date.now() - new Date(startTime)) / 60000)
      setLabel(mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`)
    }
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [startTime])
  return label ? <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 ms-1"><i className="bi bi-clock me-1"/>{label}</span> : null
}

export default function OperatorDashboard() {
  const { user } = useAuth()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('active')   // active | completed | all
  const [logModal, setLogModal] = useState(null)
  const [stopModal, setStopModal] = useState(null)
  const [reqModal, setReqModal] = useState(false)
  const [logForm, setLogForm]   = useState({ qty: '', remarks: '' })
  const [stopForm, setStopForm] = useState({ qty: '', remarks: '', markComplete: false })
  const [reqForm, setReqForm]   = useState({ Description: '', Request_Type: 'Job' })
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)
  const [logHistory, setLogHistory] = useState({})   // { [Job_ID]: { loading, entries } }
  const [expandedLogs, setExpandedLogs] = useState({})

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(() => {
    operatorAPI.dashboard()
      .then(r => setData(r.data.data))
      .catch(() => showToast('Failed to load data', 'danger'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  const handleStart = async (job) => {
    if (!job.Assigned_Machine_ID) return showToast('No machine assigned to this job', 'warning')
    try {
      await jobsAPI.start({ job_id: job.Job_ID, machine_id: job.Assigned_Machine_ID, operator_id: user.id })
      showToast(`Job ${job.Job_Number} started!`)
      load()
    } catch { showToast('Failed to start job', 'danger') }
  }

  const openStopModal = (job) => {
    setStopForm({ qty: job.Produced_Qty || '', remarks: '', markComplete: false })
    setStopModal(job)
  }

  const handleStop = async (e) => {
    e.preventDefault()
    setSaving(true)
    const qty = parseInt(stopForm.qty) || 0
    const status = stopForm.markComplete ? 'Completed' : (qty >= stopModal.Required_Qty ? 'Completed' : 'Paused')
    try {
      await jobsAPI.stop({ job_id: stopModal.Job_ID, machine_id: stopModal.Assigned_Machine_ID, produced_qty: qty, status })
      showToast(status === 'Completed' ? `Job ${stopModal.Job_Number} marked Completed!` : 'Job paused')
      setStopModal(null)
      load()
    } catch { showToast('Failed to stop job', 'danger') }
    finally { setSaving(false) }
  }

  const handleMarkComplete = async (job) => {
    if (!confirm(`Mark job ${job.Job_Number} as Completed?`)) return
    try {
      await jobsAPI.stop({ job_id: job.Job_ID, machine_id: job.Assigned_Machine_ID || 0, produced_qty: job.Produced_Qty || 0, status: 'Completed' })
      showToast(`Job ${job.Job_Number} completed!`)
      load()
    } catch { showToast('Failed to complete job', 'danger') }
  }

  const handleLog = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await jobsAPI.log({ job_id: logModal.Job_ID, machine_id: logModal.Assigned_Machine_ID, qty: parseInt(logForm.qty), remarks: logForm.remarks })
      showToast('Production logged')
      setLogModal(null)
      setLogForm({ qty: '', remarks: '' })
      load()
    } catch { showToast('Failed to log production', 'danger') }
    finally { setSaving(false) }
  }

  const toggleLogHistory = async (job) => {
    const id = job.Job_ID
    if (expandedLogs[id]) {
      setExpandedLogs(p => ({ ...p, [id]: false }))
      return
    }
    setExpandedLogs(p => ({ ...p, [id]: true }))
    if (logHistory[id]?.entries) return  // already loaded
    setLogHistory(p => ({ ...p, [id]: { loading: true, entries: [] } }))
    try {
      const res = await jobsAPI.get(id)
      const entries = res.data.data?.production_log || []
      setLogHistory(p => ({ ...p, [id]: { loading: false, entries } }))
    } catch {
      setLogHistory(p => ({ ...p, [id]: { loading: false, entries: [] } }))
    }
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await operatorAPI.requestJob(reqForm)
      showToast('Request sent to owner')
      setReqModal(false)
      setReqForm({ Description: '', Request_Type: 'Job' })
    } catch { showToast('Failed to send request', 'danger') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className="spinner-border text-primary me-2"/>
      <span className="text-muted">Loading your jobs…</span>
    </div>
  )

  const { jobs = [], machine, my_requests = [] } = data || {}

  const activeJobs    = jobs.filter(j => !['Completed','Cancelled'].includes(j.Status))
  const completedJobs = jobs.filter(j => j.Status === 'Completed')
  const displayJobs   = filter === 'active' ? activeJobs : filter === 'completed' ? completedJobs : jobs

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 960 }}>

      {/* Toast */}
      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible position-fixed top-0 end-0 m-3 shadow`}
             style={{ zIndex: 9999, minWidth: 280 }}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle' : toast.type === 'warning' ? 'bi-exclamation-triangle' : 'bi-x-circle'} me-2`}/>
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}/>
        </div>
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold">
            <i className="bi bi-person-badge-fill me-2 text-primary"/>Operator Panel
          </h4>
          <small className="text-muted">Welcome, <strong>{user?.name}</strong> · Auto-refreshes every 15s</small>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh">
            <i className="bi bi-arrow-clockwise"/>
          </button>
          <button className="btn btn-warning btn-sm fw-semibold" onClick={() => setReqModal(true)}>
            <i className="bi bi-bell-fill me-1"/>Request Job
          </button>
        </div>
      </div>

      {/* Current Machine Card */}
      {machine && (
        <div className={`card border-0 shadow-sm mb-4 border-start border-4 border-${machine.Status === 'Running' ? 'success' : 'secondary'}`}>
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <div className="text-muted small text-uppercase fw-semibold mb-1">
                <i className="bi bi-gear me-1"/>My Machine
              </div>
              <div className="fw-bold fs-5">{machine.Machine_Name}</div>
              <div className="text-muted small">{machine.Machine_Type} {machine.Location && `· ${machine.Location}`}</div>
            </div>
            <span className={`badge bg-${machine.Status === 'Running' ? 'success' : machine.Status === 'Idle' ? 'secondary' : 'danger'} fs-6 px-3 py-2`}>
              <i className={`bi ${machine.Status === 'Running' ? 'bi-play-circle-fill' : 'bi-pause-circle'} me-1`}/>
              {machine.Status}
            </span>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Active Jobs',    value: activeJobs.length,    color: 'primary',  icon: 'bi-clipboard2-pulse' },
          { label: 'Running Now',    value: jobs.filter(j=>j.Status==='Running').length, color: 'success', icon: 'bi-play-circle-fill' },
          { label: 'Pending',        value: jobs.filter(j=>j.Status==='Pending').length, color: 'warning', icon: 'bi-hourglass-split' },
          { label: 'Completed',      value: completedJobs.length, color: 'dark',     icon: 'bi-check-circle-fill' },
        ].map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className={`card border-0 bg-${s.color} bg-opacity-10 border-start border-3 border-${s.color}`}>
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${s.icon} text-${s.color} fs-4`}/>
                  <div>
                    <div className={`fw-bold fs-5 text-${s.color}`}>{s.value}</div>
                    <div className="small text-muted">{s.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="btn-group btn-group-sm" role="group">
          {[
            { key: 'active',    label: 'Active',    count: activeJobs.length },
            { key: 'completed', label: 'Completed', count: completedJobs.length },
            { key: 'all',       label: 'All Jobs',  count: jobs.length },
          ].map(tab => (
            <button
              key={tab.key}
              className={`btn btn-${filter === tab.key ? 'primary' : 'outline-secondary'}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span className={`badge ms-1 ${filter === tab.key ? 'bg-white text-primary' : 'bg-secondary'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <small className="text-muted">{displayJobs.length} job{displayJobs.length !== 1 ? 's' : ''}</small>
      </div>

      {/* Jobs Grid */}
      {displayJobs.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-clipboard2 display-4 d-block mb-3 opacity-25"/>
            {filter === 'completed'
              ? 'No completed jobs yet.'
              : 'No active jobs. Use "Request Job" to ask for an assignment.'}
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {displayJobs.map(j => {
            const progress  = j.Required_Qty > 0 ? Math.min(j.Produced_Qty / j.Required_Qty * 100, 100) : 0
            const color     = STATUS_COLOR[j.Status]  || 'secondary'
            const icon      = STATUS_ICON[j.Status]   || 'bi-circle'
            const isDone    = j.Status === 'Completed'

            return (
              <div key={j.Job_ID} className="col-12 col-md-6">
                <div className={`card h-100 border-0 shadow-sm border-start border-4 border-${color}${isDone ? ' opacity-75' : ''}`}>
                  <div className="card-body">

                    {/* Title row */}
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bold text-primary">{j.Job_Number}</div>
                        <div className="fw-semibold">{j.Customer_Name}</div>
                      </div>
                      <div className="text-end">
                        <span className={`badge bg-${color}${color === 'warning' ? ' text-dark' : ''}`}>
                          <i className={`bi ${icon} me-1`}/>{j.Status}
                        </span>
                        {j.Status === 'Running' && <ElapsedBadge startTime={j.Start_Time}/>}
                      </div>
                    </div>

                    {/* Job details */}
                    {(j.Label_Type || j.Size || j.Label) && (
                      <div className="small text-muted mb-2">
                        <i className="bi bi-tag me-1"/>
                        {[j.Label_Type, j.Size, j.Label].filter(Boolean).join(' · ')}
                      </div>
                    )}

                    {/* Progress */}
                    <div className="mb-1">
                      <div className="d-flex justify-content-between small mb-1">
                        <span><i className="bi bi-box-seam me-1 text-muted"/>
                          <strong>{parseInt(j.Produced_Qty || 0).toLocaleString()}</strong>
                          <span className="text-muted"> / {parseInt(j.Required_Qty || 0).toLocaleString()} pcs</span>
                        </span>
                        <span className={`fw-semibold text-${progress >= 100 ? 'success' : 'primary'}`}>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="progress" style={{ height: 6 }}>
                        <div
                          className={`progress-bar bg-${progress >= 100 ? 'success' : isDone ? 'dark' : 'primary'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Machine & Delivery */}
                    <div className="small text-muted mb-3">
                      {j.Machine_Name && <span className="me-3"><i className="bi bi-gear me-1"/>{j.Machine_Name}</span>}
                      {j.Delivery_Date && <span><i className="bi bi-calendar3 me-1"/>Due: {j.Delivery_Date}</span>}
                      {j.Start_Time && isDone && <span><i className="bi bi-check2 me-1 text-success"/>Completed</span>}
                    </div>

                    {/* Actions */}
                    {!isDone && (
                      <div className="d-flex gap-2 flex-wrap">
                        {j.Status !== 'Running' && (
                          <button className="btn btn-success btn-sm fw-semibold" onClick={() => handleStart(j)}>
                            <i className="bi bi-play-fill me-1"/>Start
                          </button>
                        )}
                        {j.Status === 'Running' && (
                          <button className="btn btn-outline-primary btn-sm" onClick={() => setLogModal(j)}>
                            <i className="bi bi-plus-circle me-1"/>Log Qty
                          </button>
                        )}
                        {j.Status === 'Running' && (
                          <button className="btn btn-warning btn-sm fw-semibold" onClick={() => openStopModal(j)}>
                            <i className="bi bi-stop-fill me-1"/>Stop / Complete
                          </button>
                        )}
                        {j.Status !== 'Running' && (
                          <button className="btn btn-outline-success btn-sm" onClick={() => handleMarkComplete(j)}>
                            <i className="bi bi-check-circle me-1"/>Mark Complete
                          </button>
                        )}
                        <button
                          className={`btn btn-sm ms-auto ${expandedLogs[j.Job_ID] ? 'btn-light' : 'btn-outline-secondary'}`}
                          onClick={() => toggleLogHistory(j)}
                          title="View production log history"
                        >
                          <i className={`bi bi-clock-history me-1`}/>History
                        </button>
                      </div>
                    )}

                    {/* Production Log History */}
                    {expandedLogs[j.Job_ID] && (
                      <div className="mt-3 border-top pt-3">
                        <div className="small fw-semibold text-muted mb-2">
                          <i className="bi bi-journal-text me-1"/>Production Log History
                        </div>
                        {logHistory[j.Job_ID]?.loading ? (
                          <div className="text-center py-2 text-muted small">
                            <span className="spinner-border spinner-border-sm me-1"/>Loading…
                          </div>
                        ) : logHistory[j.Job_ID]?.entries?.length === 0 ? (
                          <div className="text-muted small text-center py-2">No log entries yet.</div>
                        ) : (
                          <div className="list-group list-group-flush rounded border">
                            {(logHistory[j.Job_ID]?.entries || []).map((entry, idx) => (
                              <div key={idx} className="list-group-item list-group-item-action py-2 px-3">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 me-2">
                                      +{parseInt(entry.Qty_Produced || 0).toLocaleString()} pcs
                                    </span>
                                    {entry.Remarks && <span className="small text-muted">{entry.Remarks}</span>}
                                  </div>
                                  <div className="small text-muted text-nowrap ms-2">
                                    {entry.Log_Time ? new Date(entry.Log_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </div>
                                {entry.Log_Time && (
                                  <div className="small text-muted mt-1">
                                    <i className="bi bi-calendar3 me-1"/>{entry.Log_Time?.split(' ')[0]}
                                    {entry.Operator_Name && <span className="ms-2"><i className="bi bi-person me-1"/>{entry.Operator_Name}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {isDone && (
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="text-success small fw-semibold">
                          <i className="bi bi-check-circle-fill me-1"/>Job completed — {parseInt(j.Produced_Qty||0).toLocaleString()} pcs produced
                        </div>
                        <button
                          className={`btn btn-sm ${expandedLogs[j.Job_ID] ? 'btn-light' : 'btn-outline-secondary'}`}
                          onClick={() => toggleLogHistory(j)}
                          title="View production log history"
                        >
                          <i className="bi bi-clock-history me-1"/>History
                        </button>
                      </div>
                    )}

                    {/* Production Log History (completed jobs) */}
                    {isDone && expandedLogs[j.Job_ID] && (
                      <div className="mt-3 border-top pt-3">
                        <div className="small fw-semibold text-muted mb-2">
                          <i className="bi bi-journal-text me-1"/>Production Log History
                        </div>
                        {logHistory[j.Job_ID]?.loading ? (
                          <div className="text-center py-2 text-muted small">
                            <span className="spinner-border spinner-border-sm me-1"/>Loading…
                          </div>
                        ) : logHistory[j.Job_ID]?.entries?.length === 0 ? (
                          <div className="text-muted small text-center py-2">No log entries.</div>
                        ) : (
                          <div className="list-group list-group-flush rounded border">
                            {(logHistory[j.Job_ID]?.entries || []).map((entry, idx) => (
                              <div key={idx} className="list-group-item py-2 px-3">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 me-2">
                                      +{parseInt(entry.Qty_Produced || 0).toLocaleString()} pcs
                                    </span>
                                    {entry.Remarks && <span className="small text-muted">{entry.Remarks}</span>}
                                  </div>
                                  <div className="small text-muted text-nowrap ms-2">
                                    {entry.Log_Time ? new Date(entry.Log_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </div>
                                {entry.Log_Time && (
                                  <div className="small text-muted mt-1">
                                    <i className="bi bi-calendar3 me-1"/>{entry.Log_Time?.split(' ')[0]}
                                    {entry.Operator_Name && <span className="ms-2"><i className="bi bi-person me-1"/>{entry.Operator_Name}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
          <div className="fw-semibold mb-2">
            <i className="bi bi-send me-1 text-muted"/>My Requests
          </div>
          <div className="card border-0 shadow-sm">
            <div className="list-group list-group-flush">
              {my_requests.slice(0, 10).map(r => (
                <div key={r.Request_ID} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted text-uppercase fw-semibold">{r.Request_Type}</div>
                    <div className="small">{r.Description || '—'}</div>
                  </div>
                  <span className={`badge bg-${r.Status === 'Acknowledged' ? 'success' : r.Status === 'Pending' ? 'warning text-dark' : 'secondary'}`}>
                    {r.Status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Log Production Modal ── */}
      {logModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => e.target === e.currentTarget && setLogModal(null)}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold"><i className="bi bi-plus-circle me-2"/>Log Production</h5>
                <button className="btn-close btn-close-white" onClick={() => setLogModal(null)}/>
              </div>
              <form onSubmit={handleLog}>
                <div className="modal-body">
                  <div className="alert alert-light border mb-3">
                    <div className="fw-semibold">{logModal.Job_Number} — {logModal.Customer_Name}</div>
                    <div className="small text-muted">Produced so far: <strong>{parseInt(logModal.Produced_Qty||0).toLocaleString()}</strong> / {parseInt(logModal.Required_Qty||0).toLocaleString()}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Quantity Produced *</label>
                    <input type="number" className="form-control form-control-lg" required min="1"
                      value={logForm.qty} onChange={e => setLogForm(p => ({ ...p, qty: e.target.value }))} autoFocus/>
                  </div>
                  <div>
                    <label className="form-label">Remarks</label>
                    <input className="form-control" value={logForm.remarks}
                      placeholder="Optional notes…"
                      onChange={e => setLogForm(p => ({ ...p, remarks: e.target.value }))}/>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setLogModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary fw-semibold" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="bi bi-check-lg me-1"/>}
                    Log Production
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Stop / Complete Modal ── */}
      {stopModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => e.target === e.currentTarget && setStopModal(null)}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-warning">
                <h5 className="modal-title fw-bold"><i className="bi bi-stop-circle me-2"/>Stop Job — {stopModal.Job_Number}</h5>
                <button className="btn-close" onClick={() => setStopModal(null)}/>
              </div>
              <form onSubmit={handleStop}>
                <div className="modal-body">
                  <div className="alert alert-light border mb-3">
                    <strong>{stopModal.Customer_Name}</strong>
                    <div className="small text-muted">Target: {parseInt(stopModal.Required_Qty||0).toLocaleString()} pcs</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Total Quantity Produced *</label>
                    <input type="number" className="form-control form-control-lg" required min="0"
                      value={stopForm.qty} onChange={e => setStopForm(p => ({ ...p, qty: e.target.value }))} autoFocus/>
                    <div className="form-text">Enter the total qty produced including previous logs</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    <input className="form-control" value={stopForm.remarks}
                      placeholder="Reason for stopping…"
                      onChange={e => setStopForm(p => ({ ...p, remarks: e.target.value }))}/>
                  </div>
                  <div className="form-check form-switch p-3 bg-success bg-opacity-10 rounded border border-success border-opacity-25">
                    <input className="form-check-input" type="checkbox" id="markComplete"
                      checked={stopForm.markComplete}
                      onChange={e => setStopForm(p => ({ ...p, markComplete: e.target.checked }))}/>
                    <label className="form-check-label fw-semibold text-success" htmlFor="markComplete">
                      <i className="bi bi-check-circle-fill me-1"/>Mark as Completed (job is fully done)
                    </label>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setStopModal(null)}>Cancel</button>
                  <button type="submit" className={`btn btn-${stopForm.markComplete ? 'success' : 'warning'} fw-semibold`} disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1"/> : <i className={`bi bi-${stopForm.markComplete ? 'check-circle' : 'stop-circle'} me-1`}/>}
                    {stopForm.markComplete ? 'Complete Job' : 'Pause Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Modal ── */}
      {reqModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => e.target === e.currentTarget && setReqModal(false)}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-warning">
                <h5 className="modal-title fw-bold"><i className="bi bi-bell-fill me-2"/>Send Request to Owner</h5>
                <button className="btn-close" onClick={() => setReqModal(false)}/>
              </div>
              <form onSubmit={handleRequest}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Request Type</label>
                    <div className="d-flex gap-2">
                      {[['Job', 'bi-clipboard2', 'Job Assignment'], ['Advance', 'bi-cash-coin', 'Advance Request']].map(([val, ico, lbl]) => (
                        <label key={val} className={`flex-fill text-center p-3 rounded border cursor-pointer ${reqForm.Request_Type === val ? 'border-warning bg-warning bg-opacity-10 fw-semibold' : 'border-secondary bg-light'}`}
                          style={{ cursor: 'pointer' }}>
                          <input type="radio" className="visually-hidden" value={val} checked={reqForm.Request_Type === val}
                            onChange={() => setReqForm(p => ({ ...p, Request_Type: val }))}/>
                          <i className={`bi ${ico} d-block fs-4 mb-1`}/>
                          {lbl}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label fw-semibold">Description *</label>
                    <textarea className="form-control" rows={3} required
                      value={reqForm.Description}
                      onChange={e => setReqForm(p => ({ ...p, Description: e.target.value }))}
                      placeholder="Describe what you need…"/>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setReqModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning fw-semibold" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="bi bi-send me-1"/>}
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
