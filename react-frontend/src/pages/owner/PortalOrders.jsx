import React, { useState, useEffect, useCallback } from 'react'
import { portalAPI } from '../../api/api'

const STATUS_COLOR = {
  Pending: 'warning', Approved: 'info', Processing: 'primary',
  Completed: 'success', Rejected: 'danger',
}

function ReviewModal({ order, onClose, onSave }) {
  const [form, setForm] = useState({ Status: order.Status, Owner_Notes: order.Owner_Notes || '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await portalAPI.adminReview(order.Request_ID, form)
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-pencil-square me-2"/>Review Order
            </h5>
            <button className="btn-close btn-close-white" onClick={onClose}/>
          </div>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div className="card bg-light border-0 mb-3 p-3">
                <div className="fw-semibold">{order.Label_Name}</div>
                <div className="small text-muted">
                  {order.Customer_Name} · {order.Label_Type} · {parseInt(order.Quantity).toLocaleString()} pcs
                  {order.Size && ` · ${order.Size}`}
                  {order.Required_By && ` · Due: ${order.Required_By}`}
                </div>
                {order.Notes && <div className="small mt-1 text-muted"><i className="bi bi-chat-left-text me-1"/>"{order.Notes}"</div>}
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Update Status</label>
                <div className="d-flex gap-2 flex-wrap">
                  {['Pending','Approved','Processing','Completed','Rejected'].map(s => (
                    <label key={s} className={`btn btn-sm btn-${form.Status === s ? STATUS_COLOR[s] : 'outline-' + STATUS_COLOR[s]}${STATUS_COLOR[s] === 'warning' && form.Status !== s ? '' : ''}`}
                           style={{ cursor: 'pointer' }}>
                      <input type="radio" className="visually-hidden" value={s} checked={form.Status === s}
                        onChange={() => setForm(p => ({ ...p, Status: s }))}/>
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label fw-semibold">Note to Customer</label>
                <textarea className="form-control" rows={3}
                  placeholder="e.g. Your order is approved, production starts Monday…"
                  value={form.Owner_Notes}
                  onChange={e => setForm(p => ({ ...p, Owner_Notes: e.target.value }))}/>
              </div>
            </div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary fw-semibold" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="bi bi-check-lg me-1"/>}
                Save Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function PortalOrders() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [reviewing, setReviewing] = useState(null)
  const [toast, setToast]       = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await portalAPI.adminOrders()
      setOrders(res.data.data || [])
    } catch { showToast('Failed to load orders', 'danger') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleReviewSave = () => {
    setReviewing(null)
    showToast('Order updated successfully')
    load()
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.Status === filter)

  const counts = orders.reduce((acc, o) => { acc[o.Status] = (acc[o.Status] || 0) + 1; return acc }, {})

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`alert alert-${toast.type} position-fixed top-0 end-0 m-3 shadow`} style={{ zIndex: 9999, minWidth: 280 }}>
          <i className={`bi bi-check-circle me-2`}/>{toast.msg}
          <button type="button" className="btn-close ms-2" onClick={() => setToast(null)}/>
        </div>
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-globe2 me-2 text-primary"/>Portal Orders</h4>
          <small className="text-muted">Customer self-service order requests</small>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1"/>Refresh
          </button>
          <a href="/portal/login" target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-box-arrow-up-right me-1"/>Open Portal
          </a>
        </div>
      </div>

      {/* Stat pills */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        {[
          { key: 'all', label: 'All', count: orders.length, color: 'secondary' },
          { key: 'Pending',    label: 'Pending',    color: 'warning' },
          { key: 'Approved',   label: 'Approved',   color: 'info' },
          { key: 'Processing', label: 'Processing', color: 'primary' },
          { key: 'Completed',  label: 'Completed',  color: 'success' },
          { key: 'Rejected',   label: 'Rejected',   color: 'danger' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`btn btn-sm btn-${filter === tab.key ? tab.color : 'outline-' + tab.color}${tab.color === 'warning' && filter !== tab.key ? '' : ''}`}
          >
            {tab.label}
            <span className={`badge ms-1 ${filter === tab.key ? 'bg-white text-dark' : 'bg-' + tab.color}`}>
              {tab.key === 'all' ? orders.length : (counts[tab.key] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        {loading ? (
          <div className="card-body py-5 text-center text-muted">
            <div className="spinner-border text-primary mb-2"/>
            <div>Loading orders…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-body py-5 text-center text-muted">
            <i className="bi bi-inbox display-4 d-block mb-3 opacity-25"/>
            No {filter === 'all' ? '' : filter.toLowerCase()} orders found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Label Name</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Required By</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.Request_ID}>
                    <td className="text-muted small">{i + 1}</td>
                    <td>
                      <div className="fw-semibold">{o.Customer_Name}</div>
                      <small className="text-muted">{o.Mobile}</small>
                    </td>
                    <td className="fw-semibold">{o.Label_Name}</td>
                    <td><span className="badge bg-light text-dark border">{o.Label_Type}</span></td>
                    <td>{parseInt(o.Quantity).toLocaleString()}</td>
                    <td className="small">{o.Required_By || '—'}</td>
                    <td className="small text-muted" style={{ maxWidth: 160 }}>
                      <span className="d-block text-truncate" title={o.Notes}>{o.Notes || '—'}</span>
                      {o.Owner_Notes && <span className="text-info"><i className="bi bi-chat-left me-1"/>{o.Owner_Notes}</span>}
                    </td>
                    <td>
                      <span className={`badge bg-${STATUS_COLOR[o.Status] || 'secondary'}${STATUS_COLOR[o.Status] === 'warning' ? ' text-dark' : ''}`}>
                        {o.Status}
                      </span>
                    </td>
                    <td className="small text-muted">{o.Request_Date?.split(' ')[0]}</td>
                    <td className="text-end">
                      <button className="btn btn-primary btn-sm" onClick={() => setReviewing(o)}>
                        <i className="bi bi-pencil me-1"/>Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal order={reviewing} onClose={() => setReviewing(null)} onSave={handleReviewSave}/>
      )}
    </div>
  )
}
