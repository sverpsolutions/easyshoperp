import React, { useState, useEffect } from 'react'
import { jobsAPI, employeesAPI, machinesAPI } from '../../api/api'

const STATUS_COLORS = { Pending:'warning', Assigned:'info', Running:'success', Completed:'secondary', Cancelled:'danger' }

export default function JobsPage() {
  const [jobs, setJobs]           = useState([])
  const [operators, setOperators] = useState([])
  const [machines, setMachines]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [filters, setFilters]     = useState({ status: '', customer: '', from: '', to: '' })
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const defaultForm = {
    Customer_Name:'', Mobile_No:'', Order_Date: new Date().toISOString().slice(0,10),
    Delivery_Date:'', Size:'', Label:'', UPS:1, Gap_Type:'With Gap', Paper:'',
    Core:'', Packing:'', Label_Type:'Plain', Required_Qty:'', Priority:5,
    Notes:'', Assigned_Machine_ID:'', Assigned_Operator_ID:''
  }

  const load = () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
    jobsAPI.list(params).then(r => setJobs(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    employeesAPI.operators().then(r => setOperators(r.data.data))
    machinesAPI.list().then(r => setMachines(r.data.data))
  }, [])

  const openNew = async () => {
    const numR = await jobsAPI.nextNumber()
    setForm({ ...defaultForm, Job_Number: numR.data.data.job_number })
    setEditing(null)
    setShowModal(true)
  }

  const openEdit = job => {
    setForm({ ...job })
    setEditing(job.Job_ID)
    setShowModal(true)
  }

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (editing) {
        await jobsAPI.update(editing, form)
      } else {
        await jobsAPI.store(form)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving job')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this job?')) return
    await jobsAPI.delete(id)
    load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-clipboard2-data me-2 text-primary"></i>Jobs</h4>
        <button className="btn btn-primary" onClick={openNew}>
          <i className="bi bi-plus-lg me-1"></i>New Job
        </button>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-auto">
              <select className="form-select form-select-sm" value={filters.status} onChange={e => setFilters(p=>({...p,status:e.target.value}))}>
                <option value="">All Status</option>
                {['Pending','Assigned','Running','Completed','Cancelled'].map(s=>(
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <input className="form-control form-control-sm" placeholder="Customer..." value={filters.customer}
                onChange={e=>setFilters(p=>({...p,customer:e.target.value}))} />
            </div>
            <div className="col-auto">
              <input type="date" className="form-control form-control-sm" value={filters.from}
                onChange={e=>setFilters(p=>({...p,from:e.target.value}))} />
            </div>
            <div className="col-auto">
              <input type="date" className="form-control form-control-sm" value={filters.to}
                onChange={e=>setFilters(p=>({...p,to:e.target.value}))} />
            </div>
            <div className="col-auto">
              <button className="btn btn-outline-primary btn-sm" onClick={load}>
                <i className="bi bi-search me-1"></i>Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Job #</th><th>Customer</th><th>Label</th><th>Qty</th>
                <th>Delivery</th><th>Machine</th><th>Operator</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-4"><div className="spinner-border spinner-border-sm"/></td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-4 text-muted">No jobs found</td></tr>
              ) : jobs.map(j => (
                <tr key={j.Job_ID}>
                  <td className="fw-semibold text-primary">{j.Job_Number}</td>
                  <td>{j.Customer_Name}</td>
                  <td><small>{j.Label_Type} {j.Size && `· ${j.Size}`}</small></td>
                  <td>
                    <div>{j.Produced_Qty?.toLocaleString()} / {j.Required_Qty?.toLocaleString()}</div>
                    <div className="progress mt-1" style={{height:4}}>
                      <div className="progress-bar bg-primary"
                        style={{width:`${j.Required_Qty>0?Math.min(j.Produced_Qty/j.Required_Qty*100,100):0}%`}}/>
                    </div>
                  </td>
                  <td><small>{j.Delivery_Date || '—'}</small></td>
                  <td><small>{j.Machine_Name || '—'}</small></td>
                  <td><small>{j.Operator_Name || '—'}</small></td>
                  <td><span className={`badge bg-${STATUS_COLORS[j.Status]||'secondary'}`}>{j.Status}</span></td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-primary" onClick={()=>openEdit(j)} title="Edit">
                        <i className="bi bi-pencil"></i>
                      </button>
                      {j.Status === 'Pending' && (
                        <button className="btn btn-outline-danger" onClick={()=>handleDelete(j.Job_ID)} title="Delete">
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editing ? 'Edit Job' : 'New Job'} — {form.Job_Number}
                </h5>
                <button className="btn-close" onClick={()=>setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Customer Name *</label>
                      <input className="form-control" required value={form.Customer_Name||''} onChange={e=>f('Customer_Name',e.target.value)}/>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Mobile</label>
                      <input className="form-control" value={form.Mobile_No||''} onChange={e=>f('Mobile_No',e.target.value)}/>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Order Date</label>
                      <input type="date" className="form-control" value={form.Order_Date||''} onChange={e=>f('Order_Date',e.target.value)}/>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Delivery Date</label>
                      <input type="date" className="form-control" value={form.Delivery_Date||''} onChange={e=>f('Delivery_Date',e.target.value)}/>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Label Type *</label>
                      <select className="form-select" required value={form.Label_Type||'Plain'} onChange={e=>f('Label_Type',e.target.value)}>
                        {['Plain','Printed','Thermal','Barcode','QR Code','Custom'].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Size</label>
                      <input className="form-control" placeholder="e.g. 38x25" value={form.Size||''} onChange={e=>f('Size',e.target.value)}/>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Label Name</label>
                      <input className="form-control" value={form.Label||''} onChange={e=>f('Label',e.target.value)}/>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">UPS</label>
                      <input type="number" className="form-control" min="1" value={form.UPS||1} onChange={e=>f('UPS',e.target.value)}/>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Gap Type</label>
                      <select className="form-select" value={form.Gap_Type||'With Gap'} onChange={e=>f('Gap_Type',e.target.value)}>
                        {['With Gap','No Gap','Custom Gap'].map(g=><option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Paper</label>
                      <input className="form-control" value={form.Paper||''} onChange={e=>f('Paper',e.target.value)}/>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Core</label>
                      <input className="form-control" placeholder='1"/out' value={form.Core||''} onChange={e=>f('Core',e.target.value)}/>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Packing</label>
                      <input className="form-control" placeholder="4 BOX" value={form.Packing||''} onChange={e=>f('Packing',e.target.value)}/>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Required Qty *</label>
                      <input type="number" className="form-control" required min="1" value={form.Required_Qty||''} onChange={e=>f('Required_Qty',e.target.value)}/>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Priority (1=High)</label>
                      <input type="number" className="form-control" min="1" max="10" value={form.Priority||5} onChange={e=>f('Priority',e.target.value)}/>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Assign Machine</label>
                      <select className="form-select" value={form.Assigned_Machine_ID||''} onChange={e=>f('Assigned_Machine_ID',e.target.value)}>
                        <option value="">— Not Assigned —</option>
                        {machines.map(m=><option key={m.Machine_ID} value={m.Machine_ID}>{m.Machine_Name} ({m.Status})</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Assign Operator</label>
                      <select className="form-select" value={form.Assigned_Operator_ID||''} onChange={e=>f('Assigned_Operator_ID',e.target.value)}>
                        <option value="">— Not Assigned —</option>
                        {operators.map(o=><option key={o.Employee_ID} value={o.Employee_ID}>{o.Name}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" rows={2} value={form.Notes||''} onChange={e=>f('Notes',e.target.value)}/>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1"/> : null}
                    {editing ? 'Update Job' : 'Create Job'}
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
