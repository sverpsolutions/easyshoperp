import React, { useState, useEffect } from 'react'
import { advancesAPI } from '../../api/api'

const STATUS_COLOR = { Pending:'warning', Approved:'info', Rejected:'danger', Paid:'success' }

export default function AdvancesPage() {
  const [advances, setAdvances] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filterStatus, setFilter] = useState('Pending')
  const [actionModal, setActionModal] = useState(null)  // { type, advance }
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)

  const load = () => {
    const params = filterStatus ? { status: filterStatus } : {}
    advancesAPI.list(params).then(r=>setAdvances(r.data.data)).finally(()=>setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus])

  const openAction = (type, adv) => {
    setActionModal({ type, adv })
    setForm(type === 'approve' ? { Amount_Approved: adv.Amount_Requested } :
            type === 'pay'     ? { Amount_Paid: adv.Amount_Approved || adv.Amount_Requested, Payment_Mode:'Cash' } :
                                 { Reject_Reason: '' })
  }

  const handleAction = async e => {
    e.preventDefault(); setSaving(true)
    const { type, adv } = actionModal
    try {
      if (type === 'approve') await advancesAPI.approve(adv.Advance_ID, form)
      else if (type === 'reject') await advancesAPI.reject(adv.Advance_ID, form)
      else if (type === 'pay')    await advancesAPI.pay(adv.Advance_ID, form)
      setActionModal(null); load()
    } finally { setSaving(false) }
  }

  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-cash-coin me-2 text-primary"></i>Employee Advances</h4>
        <div className="btn-group btn-group-sm">
          {['','Pending','Approved','Rejected','Paid'].map(s=>(
            <button key={s} className={`btn ${filterStatus===s?'btn-primary':'btn-outline-secondary'}`}
              onClick={()=>setFilter(s)}>{s||'All'}</button>
          ))}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr><th>Employee</th><th>Requested</th><th>Approved</th><th>Paid</th><th>Reason</th><th>Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm"/></td></tr>
              ) : advances.map(a=>(
                <tr key={a.Advance_ID}>
                  <td><div className="fw-semibold">{a.Employee_Name}</div><small className="text-muted">{a.Mobile}</small></td>
                  <td className="fw-bold">₹{parseFloat(a.Amount_Requested).toLocaleString()}</td>
                  <td>{a.Amount_Approved ? '₹'+parseFloat(a.Amount_Approved).toLocaleString() : '—'}</td>
                  <td>{a.Amount_Paid ? '₹'+parseFloat(a.Amount_Paid).toLocaleString() : '—'}</td>
                  <td><small>{a.Reason||'—'}</small></td>
                  <td><small>{new Date(a.Request_Date).toLocaleDateString('en-IN')}</small></td>
                  <td><span className={`badge bg-${STATUS_COLOR[a.Status]||'secondary'}`}>{a.Status}</span></td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      {a.Status === 'Pending' && <>
                        <button className="btn btn-outline-success" title="Approve" onClick={()=>openAction('approve',a)}>
                          <i className="bi bi-check-lg"></i>
                        </button>
                        <button className="btn btn-outline-danger" title="Reject" onClick={()=>openAction('reject',a)}>
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </>}
                      {a.Status === 'Approved' && (
                        <button className="btn btn-outline-primary" title="Mark Paid" onClick={()=>openAction('pay',a)}>
                          <i className="bi bi-cash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && advances.length === 0 && (
                <tr><td colSpan={8} className="text-center py-4 text-muted">No advances found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {actionModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold capitalize">
                  {actionModal.type === 'approve' ? 'Approve' : actionModal.type === 'reject' ? 'Reject' : 'Mark Paid'} Advance
                </h5>
                <button className="btn-close" onClick={()=>setActionModal(null)}/>
              </div>
              <form onSubmit={handleAction}>
                <div className="modal-body">
                  <div className="alert alert-light border">
                    <strong>{actionModal.adv.Employee_Name}</strong> — ₹{parseFloat(actionModal.adv.Amount_Requested).toLocaleString()}
                    <div className="small text-muted">{actionModal.adv.Reason}</div>
                  </div>
                  {actionModal.type === 'approve' && (
                    <div><label className="form-label">Approved Amount *</label>
                      <input type="number" className="form-control" required value={form.Amount_Approved||''} onChange={e=>f('Amount_Approved',e.target.value)}/></div>
                  )}
                  {actionModal.type === 'reject' && (
                    <div><label className="form-label">Reject Reason</label>
                      <textarea className="form-control" rows={3} value={form.Reject_Reason||''} onChange={e=>f('Reject_Reason',e.target.value)}/></div>
                  )}
                  {actionModal.type === 'pay' && (
                    <div className="row g-2">
                      <div className="col-7"><label className="form-label">Amount Paid *</label>
                        <input type="number" className="form-control" required value={form.Amount_Paid||''} onChange={e=>f('Amount_Paid',e.target.value)}/></div>
                      <div className="col-5"><label className="form-label">Payment Mode</label>
                        <select className="form-select" value={form.Payment_Mode||'Cash'} onChange={e=>f('Payment_Mode',e.target.value)}>
                          {['Cash','Bank Transfer','UPI'].map(m=><option key={m}>{m}</option>)}
                        </select></div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setActionModal(null)}>Cancel</button>
                  <button type="submit" className={`btn btn-${actionModal.type==='reject'?'danger':actionModal.type==='approve'?'success':'primary'}`} disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-1"/>}
                    Confirm
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
