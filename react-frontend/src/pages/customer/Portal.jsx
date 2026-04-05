import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { portalAPI } from '../../api/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  Pending: 'warning', Approved: 'info', Processing: 'primary',
  Completed: 'success', Rejected: 'danger', Cancelled: 'secondary',
}
const JOB_COLOR = {
  Pending: 'warning', Assigned: 'info', Running: 'success',
  Paused: 'secondary', Completed: 'dark', Cancelled: 'danger',
}

function Badge({ status, map = STATUS_COLOR }) {
  const c = map[status] || 'secondary'
  return <span className={`badge bg-${c}${c === 'warning' ? ' text-dark' : ''}`}>{status}</span>
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`card border-0 bg-${color} bg-opacity-10 border-start border-3 border-${color}`}>
      <div className="card-body py-3 px-3 d-flex align-items-center gap-3">
        <i className={`bi ${icon} text-${color} fs-3`}/>
        <div>
          <div className={`fw-bold fs-4 text-${color}`}>{value}</div>
          <div className="small text-muted">{label}</div>
        </div>
      </div>
    </div>
  )
}

// ── Place Order Modal ─────────────────────────────────────────────────────────

const BLANK_ORDER = {
  Label_Name: '', Label_Type: 'Plain', Size: '', Quantity: '',
  Paper: '', Core: '1"', Packing: '', Notes: '', Required_By: '', Delivery_Address: '',
}

function PlaceOrderForm({ onCancel, onSuccess }) {
  const [form, setForm] = useState(BLANK_ORDER)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await portalAPI.orderStore({ ...form, Quantity: parseInt(form.Quantity) })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order')
    } finally { setSaving(false) }
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header d-flex justify-content-between align-items-center"
           style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>
        <h5 className="mb-0 fw-bold text-white">
          <i className="bi bi-plus-circle-fill me-2"/>Place New Order
        </h5>
        <button type="button" className="btn-close btn-close-white" onClick={onCancel}/>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card-body p-4">
          {error && <div className="alert alert-danger py-2 small mb-3"><i className="bi bi-exclamation-circle me-1"/>{error}</div>}
          <div className="row g-3">
            <div className="col-12 col-md-8">
              <label className="form-label fw-semibold">Label / Product Name *</label>
              <input className="form-control" required placeholder="e.g. ABC Barcode Label"
                value={form.Label_Name} onChange={e => set('Label_Name', e.target.value)}/>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold">Label Type *</label>
              <select className="form-select" required value={form.Label_Type} onChange={e => set('Label_Type', e.target.value)}>
                <option value="Plain">Plain</option>
                <option value="Printed">Printed</option>
                <option value="Thermal">Thermal</option>
                <option value="Barcode">Barcode</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Size (W × L)</label>
              <input className="form-control" placeholder="e.g. 100x150 mm"
                value={form.Size} onChange={e => set('Size', e.target.value)}/>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Quantity (pcs) *</label>
              <input type="number" className="form-control" required min="1" placeholder="10000"
                value={form.Quantity} onChange={e => set('Quantity', e.target.value)}/>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold">Paper Type</label>
              <select className="form-select" value={form.Paper} onChange={e => set('Paper', e.target.value)}>
                <option value="">Select…</option>
                {['Art Paper','Thermal','Synthetic','BOPP','Kraft','Other'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold">Core Size</label>
              <select className="form-select" value={form.Core} onChange={e => set('Core', e.target.value)}>
                <option value='1"'>1"</option>
                <option value='3"'>3"</option>
                <option value='Other'>Other</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold">Packing</label>
              <input className="form-control" placeholder="e.g. 1000 pcs/roll"
                value={form.Packing} onChange={e => set('Packing', e.target.value)}/>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Required By</label>
              <input type="date" className="form-control" min={new Date().toISOString().split('T')[0]}
                value={form.Required_By} onChange={e => set('Required_By', e.target.value)}/>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Delivery Address</label>
              <input className="form-control" placeholder="Delivery location (if different)"
                value={form.Delivery_Address} onChange={e => set('Delivery_Address', e.target.value)}/>
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Special Instructions / Notes</label>
              <textarea className="form-control" rows={3} placeholder="Any special requirements, colour details, artwork instructions…"
                value={form.Notes} onChange={e => set('Notes', e.target.value)}/>
            </div>
          </div>
        </div>
        <div className="card-footer bg-white border-0 d-flex justify-content-end gap-2 pb-4 px-4">
          <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary fw-semibold px-4" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-2"/>Placing Order…</> : <><i className="bi bi-send me-2"/>Place Order</>}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main Portal Component ─────────────────────────────────────────────────────

export default function CustomerPortal() {
  const navigate  = useNavigate()
  const [user]    = useState(() => { try { return JSON.parse(localStorage.getItem('portal_user')) } catch { return null } })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setTab]   = useState('overview')
  const [orderModal, setOrderModal] = useState(false)
  const [toast, setToast]     = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Redirect if not logged in
  useEffect(() => {
    if (!user) { navigate('/portal/login', { replace: true }); return }
    load()
  }, [user])

  const load = useCallback(async () => {
    try {
      const res = await portalAPI.dashboard()
      setData(res.data.data)
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('portal_user'); navigate('/portal/login', { replace: true }) }
      else showToast('Failed to load data', 'danger')
    } finally { setLoading(false) }
  }, [])

  const handleLogout = async () => {
    await portalAPI.logout().catch(() => {})
    localStorage.removeItem('portal_user')
    navigate('/portal/login', { replace: true })
  }

  const handleOrderSuccess = () => {
    setOrderModal(false)
    showToast('Order placed! We will review and contact you shortly.')
    load()
  }

  if (!user) return null
  if (loading) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="spinner-border text-primary me-2"/><span className="text-muted">Loading portal…</span>
    </div>
  )

  const { orders = [], jobs = [], bills = [], stats = {} } = data || {}

  return (
    <div className="min-vh-100" style={{ background: '#f1f5f9' }}>

      {/* Toast */}
      {toast && (
        <div className={`alert alert-${toast.type} position-fixed top-0 end-0 m-3 shadow`}
             style={{ zIndex: 9999, minWidth: 300 }}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}/>
          {toast.msg}
          <button type="button" className="btn-close ms-2" onClick={() => setToast(null)}/>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg shadow-sm sticky-top"
           style={{ background: 'linear-gradient(135deg,#1e3a5f,#0f172a)' }}>
        <div className="container-fluid px-4">
          <span className="navbar-brand text-white fw-bold d-flex align-items-center gap-2">
            <div className="rounded-2 d-flex align-items-center justify-content-center"
                 style={{ width: 32, height: 32, background: '#2563eb' }}>
              <i className="bi bi-upc-scan text-white" style={{ fontSize: '.9rem' }}/>
            </div>
            EasyShop Portal
          </span>
          <div className="d-flex align-items-center gap-3">
            <span className="text-white-50 small d-none d-md-block">
              <i className="bi bi-person-circle me-1 text-white"/>{user.name}
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"/>Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-4 py-4" style={{ maxWidth: 1100 }}>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="mb-0 fw-bold">Welcome, {user.name}</h4>
            <small className="text-muted">Customer Portal · View orders, jobs & bills</small>
          </div>
          {!orderModal && (
            <button className="btn btn-primary fw-semibold" onClick={() => setOrderModal(true)}>
              <i className="bi bi-plus-circle-fill me-2"/>Place New Order
            </button>
          )}
        </div>

        {/* Inline Order Form */}
        {orderModal && (
          <PlaceOrderForm
            onCancel={() => setOrderModal(false)}
            onSuccess={handleOrderSuccess}
          />
        )}

        {/* Stats */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3"><StatCard icon="bi-bag-check" label="Total Orders" value={stats.total_orders || 0} color="primary"/></div>
          <div className="col-6 col-md-3"><StatCard icon="bi-hourglass-split" label="Pending Review" value={stats.pending || 0} color="warning"/></div>
          <div className="col-6 col-md-3"><StatCard icon="bi-play-circle" label="Active Jobs" value={stats.active_jobs || 0} color="success"/></div>
          <div className="col-6 col-md-3"><StatCard icon="bi-receipt" label="Unpaid Bills" value={stats.unpaid_bills || 0} color="danger"/></div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4 border-0">
          {[
            { key: 'overview', icon: 'bi-grid', label: 'Overview' },
            { key: 'orders',   icon: 'bi-bag',  label: `Orders (${orders.length})` },
            { key: 'jobs',     icon: 'bi-clipboard2-data', label: `Jobs (${jobs.length})` },
            { key: 'bills',    icon: 'bi-receipt', label: `Bills (${bills.length})` },
          ].map(tab => (
            <li key={tab.key} className="nav-item">
              <button
                className={`nav-link fw-semibold ${activeTab === tab.key ? 'active' : 'text-muted'}`}
                onClick={() => setTab(tab.key)}
              >
                <i className={`bi ${tab.icon} me-1`}/>{tab.label}
              </button>
            </li>
          ))}
        </ul>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="row g-4">
            {/* Recent Orders */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-semibold"><i className="bi bi-bag me-2 text-primary"/>Recent Orders</span>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => setTab('orders')}>View All</button>
                </div>
                <div className="list-group list-group-flush">
                  {orders.slice(0, 5).length === 0 ? (
                    <div className="list-group-item text-center text-muted py-4">
                      <i className="bi bi-bag display-6 d-block mb-2 opacity-25"/>No orders yet
                    </div>
                  ) : orders.slice(0, 5).map(o => (
                    <div key={o.Request_ID} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-semibold">{o.Label_Name}</div>
                          <small className="text-muted">
                            {o.Label_Type} · {parseInt(o.Quantity).toLocaleString()} pcs
                            {o.Required_By && ` · Due: ${o.Required_By}`}
                          </small>
                        </div>
                        <Badge status={o.Status}/>
                      </div>
                      {o.Owner_Notes && (
                        <div className="mt-1 small text-info">
                          <i className="bi bi-chat-left-text me-1"/>Owner: {o.Owner_Notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Jobs */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-semibold"><i className="bi bi-clipboard2-data me-2 text-success"/>Active Jobs</span>
                  <button className="btn btn-outline-success btn-sm" onClick={() => setTab('jobs')}>View All</button>
                </div>
                <div className="list-group list-group-flush">
                  {jobs.filter(j => !['Completed','Cancelled'].includes(j.Status)).slice(0, 5).length === 0 ? (
                    <div className="list-group-item text-center text-muted py-4">
                      <i className="bi bi-clipboard2 display-6 d-block mb-2 opacity-25"/>No active jobs
                    </div>
                  ) : jobs.filter(j => !['Completed','Cancelled'].includes(j.Status)).slice(0, 5).map(j => {
                    const progress = j.Required_Qty > 0 ? Math.min(j.Produced_Qty / j.Required_Qty * 100, 100) : 0
                    return (
                      <div key={j.Job_ID} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div>
                            <div className="fw-semibold text-primary">{j.Job_Number}</div>
                            <small className="text-muted">{j.Label_Type} {j.Size && `· ${j.Size}`}</small>
                          </div>
                          <Badge status={j.Status} map={JOB_COLOR}/>
                        </div>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{parseInt(j.Produced_Qty||0).toLocaleString()} / {parseInt(j.Required_Qty||0).toLocaleString()} pcs</span>
                          <span className="fw-semibold">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="progress" style={{ height: 5 }}>
                          <div className={`progress-bar bg-${JOB_COLOR[j.Status]||'primary'}`} style={{ width: `${progress}%` }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === 'orders' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold"><i className="bi bi-bag me-2 text-primary"/>My Orders</span>
              {!orderModal && (
                <button className="btn btn-primary btn-sm" onClick={() => { setOrderModal(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                  <i className="bi bi-plus-lg me-1"/>New Order
                </button>
              )}
            </div>
            {orders.length === 0 ? (
              <div className="card-body text-center py-5 text-muted">
                <i className="bi bi-bag display-4 d-block mb-3 opacity-25"/>
                <div>No orders placed yet.</div>
                <button className="btn btn-primary btn-sm mt-3" onClick={() => { setOrderModal(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                  <i className="bi bi-plus-lg me-1"/>Place Your First Order
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th><th>Label Name</th><th>Type</th><th>Qty</th>
                      <th>Required By</th><th>Status</th><th>Owner Note</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr key={o.Request_ID}>
                        <td className="text-muted small">{i + 1}</td>
                        <td className="fw-semibold">{o.Label_Name}</td>
                        <td><span className="badge bg-light text-dark border">{o.Label_Type}</span></td>
                        <td>{parseInt(o.Quantity).toLocaleString()}</td>
                        <td className="small">{o.Required_By || '—'}</td>
                        <td><Badge status={o.Status}/></td>
                        <td className="small text-muted">{o.Owner_Notes || '—'}</td>
                        <td className="small text-muted">{o.Request_Date?.split(' ')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Jobs Tab ── */}
        {activeTab === 'jobs' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-clipboard2-data me-2 text-success"/>Production Jobs
            </div>
            {jobs.length === 0 ? (
              <div className="card-body text-center py-5 text-muted">
                <i className="bi bi-clipboard2 display-4 d-block mb-3 opacity-25"/>No jobs yet
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Job No.</th><th>Label Type</th><th>Size</th><th>Progress</th><th>Qty</th><th>Delivery</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => {
                      const prog = j.Required_Qty > 0 ? Math.min(j.Produced_Qty / j.Required_Qty * 100, 100) : 0
                      return (
                        <tr key={j.Job_ID}>
                          <td className="fw-semibold text-primary">{j.Job_Number}</td>
                          <td>{j.Label_Type || '—'}</td>
                          <td className="small">{j.Size || '—'}</td>
                          <td style={{ minWidth: 140 }}>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: 6 }}>
                                <div className={`progress-bar bg-${JOB_COLOR[j.Status]||'primary'}`} style={{ width: `${prog}%` }}/>
                              </div>
                              <small className="fw-semibold" style={{ width: 34 }}>{prog.toFixed(0)}%</small>
                            </div>
                          </td>
                          <td className="small">{parseInt(j.Produced_Qty||0).toLocaleString()} / {parseInt(j.Required_Qty||0).toLocaleString()}</td>
                          <td className="small">{j.Delivery_Date || '—'}</td>
                          <td><Badge status={j.Status} map={JOB_COLOR}/></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Bills Tab ── */}
        {activeTab === 'bills' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-receipt me-2 text-danger"/>Bills & Payments
            </div>
            {bills.length === 0 ? (
              <div className="card-body text-center py-5 text-muted">
                <i className="bi bi-receipt display-4 d-block mb-3 opacity-25"/>No bills yet
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Bill No.</th><th>Date</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {bills.map(b => (
                      <tr key={b.Bill_ID}>
                        <td className="fw-semibold">{b.Bill_Number}</td>
                        <td className="small">{b.Bill_Date}</td>
                        <td>₹{parseFloat(b.Net_Amount||0).toLocaleString()}</td>
                        <td className="text-success">₹{parseFloat(b.Amount_Paid||0).toLocaleString()}</td>
                        <td className={parseFloat(b.Balance_Due||0) > 0 ? 'text-danger fw-semibold' : 'text-muted'}>
                          ₹{parseFloat(b.Balance_Due||0).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge bg-${b.Payment_Status === 'Paid' ? 'success' : b.Payment_Status === 'Partial' ? 'warning text-dark' : 'danger'}`}>
                            {b.Payment_Status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
