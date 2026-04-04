import React, { useState, useEffect, useCallback } from 'react'
import { dashboardAPI, machinesAPI } from '../../api/api'

const statusColor = { Running: 'success', Idle: 'secondary', Stopped: 'danger', Maintenance: 'warning' }
const statusIcon  = { Running: 'bi-play-circle-fill', Idle: 'bi-pause-circle', Stopped: 'bi-stop-circle', Maintenance: 'bi-tools' }

function MachineCard({ m, onClick }) {
  const color    = statusColor[m.Status] || 'secondary'
  const icon     = statusIcon[m.Status]  || 'bi-circle'
  const progress = parseFloat(m.Job_Progress) || 0
  const isRunning = m.Status === 'Running' && m.Job_Number

  return (
    <div
      className={`card machine-card ${m.Status.toLowerCase()} h-100${isRunning ? ' machine-card-clickable' : ''}`}
      onClick={isRunning ? () => onClick(m) : undefined}
      style={isRunning ? { cursor: 'pointer' } : {}}
      title={isRunning ? 'Click to view job details' : ''}
    >
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <div className="fw-bold">{m.Machine_Name}</div>
            <small className="text-muted">{m.Machine_Type} · {m.Location || '—'}</small>
          </div>
          <div className="d-flex align-items-center gap-1">
            {isRunning && <i className="bi bi-eye text-white opacity-75 small"></i>}
            <span className={`badge bg-${color}`}>
              <i className={`bi ${icon} me-1`}></i>{m.Status}
            </span>
          </div>
        </div>

        {isRunning && (
          <>
            <div className="small mb-1 text-truncate">
              <i className="bi bi-clipboard me-1 text-primary"></i>
              <strong>{m.Job_Number}</strong> — {m.Customer_Name}
            </div>
            <div className="small text-muted mb-1">
              <i className="bi bi-person me-1"></i>{m.Operator_Name}
            </div>
            <div className="d-flex justify-content-between small mb-1">
              <span>Qty: {m.Produced_Qty?.toLocaleString()} / {m.Required_Qty?.toLocaleString()}</span>
              <span>{progress}%</span>
            </div>
            <div className="progress">
              <div
                className={`progress-bar bg-${progress >= 100 ? 'success' : 'primary'}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="d-flex justify-content-between small text-muted mt-1">
              <span><i className="bi bi-clock me-1"></i>Running {Math.floor(m.Run_Minutes / 60)}h {m.Run_Minutes % 60}m</span>
              <span className="text-primary"><i className="bi bi-eye me-1"></i>Details</span>
            </div>
          </>
        )}

        {m.Status === 'Idle' && (
          <div className="small text-muted">
            <i className="bi bi-person me-1"></i>
            {m.Operator_Name !== '—' ? m.Operator_Name : 'No operator'}
          </div>
        )}
      </div>
    </div>
  )
}

function MachineJobModal({ machine, onClose }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    machinesAPI.get(machine.Machine_ID)
      .then(r => setDetail(r.data.data))
      .finally(() => setLoading(false))
  }, [machine.Machine_ID])

  const progress = detail
    ? (detail.Required_Qty > 0 ? Math.min(detail.Produced_Qty / detail.Required_Qty * 100, 100).toFixed(1) : 0)
    : parseFloat(machine.Job_Progress) || 0

  const remaining = detail
    ? Math.max(0, detail.Required_Qty - detail.Produced_Qty)
    : 0

  const runH = Math.floor((machine.Run_Minutes || 0) / 60)
  const runM = (machine.Run_Minutes || 0) % 60

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">

          {/* Header */}
          <div className="modal-header bg-success text-white py-3">
            <div>
              <h5 className="modal-title fw-bold mb-0">
                <i className="bi bi-play-circle-fill me-2"></i>
                {machine.Machine_Name} — Running
              </h5>
              <small className="opacity-75">{machine.Machine_Type} · {machine.Location}</small>
            </div>
            <button className="btn-close btn-close-white" onClick={onClose}/>
          </div>

          <div className="modal-body p-4">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-success"/>
                <div className="mt-2 text-muted small">Loading job details…</div>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold text-success">Job Progress</span>
                    <span className="fw-bold fs-5">{progress}%</span>
                  </div>
                  <div className="progress" style={{ height: 18 }}>
                    <div
                      className={`progress-bar bg-${progress >= 100 ? 'success' : 'primary'} progress-bar-striped progress-bar-animated`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="d-flex justify-content-between mt-1 small text-muted">
                    <span>Produced: <strong className="text-dark">{parseInt(detail?.Produced_Qty || 0).toLocaleString()}</strong></span>
                    <span>Target: <strong className="text-dark">{parseInt(detail?.Required_Qty || 0).toLocaleString()}</strong></span>
                    <span>Remaining: <strong className="text-danger">{remaining.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Job Details Grid */}
                <div className="row g-3">
                  {/* Left column */}
                  <div className="col-md-6">
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body">
                        <h6 className="fw-bold text-primary mb-3"><i className="bi bi-clipboard2-data me-2"></i>Job Info</h6>
                        <table className="table table-sm table-borderless mb-0">
                          <tbody>
                            <tr>
                              <td className="text-muted ps-0" style={{width:'45%'}}>Job Number</td>
                              <td className="fw-semibold">{detail?.Job_Number || machine.Job_Number}</td>
                            </tr>
                            <tr>
                              <td className="text-muted ps-0">Customer</td>
                              <td className="fw-semibold">{detail?.Customer_Name || machine.Customer_Name}</td>
                            </tr>
                            {detail?.Label_Type && (
                              <tr>
                                <td className="text-muted ps-0">Label Type</td>
                                <td>{detail.Label_Type}</td>
                              </tr>
                            )}
                            {detail?.Label && (
                              <tr>
                                <td className="text-muted ps-0">Label</td>
                                <td>{detail.Label}</td>
                              </tr>
                            )}
                            {detail?.Size && (
                              <tr>
                                <td className="text-muted ps-0">Size</td>
                                <td>{detail.Size}</td>
                              </tr>
                            )}
                            {detail?.UPS > 0 && (
                              <tr>
                                <td className="text-muted ps-0">UPS</td>
                                <td>{detail.UPS}</td>
                              </tr>
                            )}
                            {detail?.Gap_Type && (
                              <tr>
                                <td className="text-muted ps-0">Gap</td>
                                <td>{detail.Gap_Type}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="col-md-6">
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body">
                        <h6 className="fw-bold text-success mb-3"><i className="bi bi-cpu me-2"></i>Production Info</h6>
                        <table className="table table-sm table-borderless mb-0">
                          <tbody>
                            <tr>
                              <td className="text-muted ps-0" style={{width:'45%'}}>Operator</td>
                              <td className="fw-semibold">{detail?.Operator_Name || machine.Operator_Name}</td>
                            </tr>
                            <tr>
                              <td className="text-muted ps-0">Run Time</td>
                              <td><span className="badge bg-success">{runH}h {runM}m</span></td>
                            </tr>
                            {detail?.Paper && (
                              <tr>
                                <td className="text-muted ps-0">Paper</td>
                                <td>{detail.Paper}</td>
                              </tr>
                            )}
                            {detail?.Core && (
                              <tr>
                                <td className="text-muted ps-0">Core</td>
                                <td>{detail.Core}</td>
                              </tr>
                            )}
                            {detail?.Packing && (
                              <tr>
                                <td className="text-muted ps-0">Packing</td>
                                <td>{detail.Packing}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="text-muted ps-0">Category</td>
                              <td>{machine.Machine_Category || '—'}</td>
                            </tr>
                            {machine.Target_Impressions_Per_Hour > 0 && (
                              <tr>
                                <td className="text-muted ps-0">Target/Hr</td>
                                <td>{parseInt(machine.Target_Impressions_Per_Hour).toLocaleString()}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer border-0 pt-0">
            <small className="text-muted me-auto"><i className="bi bi-arrow-clockwise me-1"></i>Dashboard auto-refreshes every 10s</small>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OwnerDashboard() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selectedMachine, setSelectedMachine] = useState(null)

  const fetch = useCallback(() => {
    dashboardAPI.get()
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch()
    const timer = setInterval(fetch, 10000)   // poll every 10s
    return () => clearInterval(timer)
  }, [fetch])

  if (loading) return (
    <div className="d-flex justify-content-center py-5">
      <div className="spinner-border text-primary" />
    </div>
  )

  const { machines = [], summary = {}, today_production = 0, pending_jobs = 0,
          operators_online = 0, pending_advances = [], job_requests = [] } = data || {}

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold">Factory Dashboard</h4>
          <small className="text-muted">Live status — auto-refreshes every 10s</small>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={fetch}>
          <i className="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Machines Running', value: summary.Running || 0,  icon: 'bi-play-circle-fill', color: 'success' },
          { label: 'Idle Machines',    value: summary.Idle    || 0,  icon: 'bi-pause-circle',     color: 'secondary' },
          { label: 'Today Production', value: (today_production||0).toLocaleString(), icon: 'bi-box-seam', color: 'primary' },
          { label: 'Pending Jobs',     value: pending_jobs    || 0,  icon: 'bi-clipboard2-data',  color: 'warning' },
          { label: 'Operators Online', value: operators_online|| 0,  icon: 'bi-people-fill',      color: 'info' },
          { label: 'Utilization',      value: (summary.Utilization || 0) + '%', icon: 'bi-graph-up', color: 'dark' },
        ].map(s => (
          <div key={s.label} className="col-6 col-md-4 col-xl-2">
            <div className={`stat-card card bg-${s.color} bg-opacity-10 border-0`}>
              <div className="card-body py-3 px-3">
                <i className={`bi ${s.icon} text-${s.color} fs-4`}></i>
                <div className="fs-4 fw-bold mt-1">{s.value}</div>
                <div className="small text-muted">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Machines Grid */}
      <div className="row g-3 mb-4">
        {machines.map(m => (
          <div key={m.Machine_ID} className="col-12 col-md-6 col-lg-4 col-xl-3">
            <MachineCard m={m} onClick={setSelectedMachine} />
          </div>
        ))}
      </div>

      {/* Running Machine Job Detail Modal */}
      {selectedMachine && (
        <MachineJobModal
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
        />
      )}

      {/* Pending Advances & Job Requests */}
      <div className="row g-3">
        {pending_advances.length > 0 && (
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-cash-coin text-warning me-2"></i>
                Pending Advance Requests ({pending_advances.length})
              </div>
              <div className="list-group list-group-flush">
                {pending_advances.map(a => (
                  <div key={a.Advance_ID} className="list-group-item">
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold">{a.Employee_Name}</span>
                      <span className="text-danger fw-bold">₹{parseFloat(a.Amount_Requested).toLocaleString()}</span>
                    </div>
                    <small className="text-muted">{a.Reason || '—'}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {job_requests.length > 0 && (
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-bell text-primary me-2"></i>
                Pending Job Requests ({job_requests.length})
              </div>
              <div className="list-group list-group-flush">
                {job_requests.map(r => (
                  <div key={r.Request_ID} className="list-group-item">
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold">{r.Employee_Name}</span>
                      <small className="text-muted">{r.Machine_Name || '—'}</small>
                    </div>
                    <small className="text-muted">{r.Description || '—'}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
