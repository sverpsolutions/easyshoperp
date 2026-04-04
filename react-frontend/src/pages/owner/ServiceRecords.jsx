import React, { useState, useEffect, useCallback } from 'react'
import { servicesAPI, serialsAPI, customersAPI } from '../../api/api'
import '../../styles/erp-theme.css'

const STATUS_COLORS = {
  'Open':           'erp-badge-red',
  'In Progress':    'erp-badge-yellow',
  'Waiting Parts':  'erp-badge-orange',
  'Resolved':       'erp-badge-green',
  'Closed':         'erp-badge-gray',
  'Cancelled':      'erp-badge-gray',
}

const SERVICE_STATUSES = ['Open','In Progress','Waiting Parts','Resolved','Closed','Cancelled']

function Toast({ toasts }) {
  return (
    <div className="erp-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`erp-toast ${t.type}`}>
          <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}/>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

function ServiceModal({ record, serials, customers, onClose, onSaved }) {
  const isEdit = !!record
  const [form, setForm] = useState(isEdit ? {
    Status:          record.Status,
    Engineer_Name:   record.Engineer_Name || '',
    Diagnosed_Issue: record.Diagnosed_Issue || '',
    Parts_Used:      record.Parts_Used || '',
    Parts_Cost:      record.Parts_Cost || 0,
    Labour_Charges:  record.Labour_Charges || 0,
    Total_Charges:   record.Total_Charges || 0,
    Resolution_Notes:record.Resolution_Notes || '',
    Closed_Date:     record.Closed_Date || '',
    Next_Service_Due:record.Next_Service_Due || '',
  } : {
    Serial_ID:        '',
    Customer_ID:      '',
    Complaint_Date:   new Date().toISOString().split('T')[0],
    Issue_Description:'',
    Engineer_Name:    '',
    Parts_Cost:       0,
    Labour_Charges:   0,
    Total_Charges:    0,
  })
  const [saving, setSaving] = useState(false)
  const f = k => e => setForm(p=>({...p, [k]: e.target.value}))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) await servicesAPI.update(record.Service_ID, form)
      else        await servicesAPI.store(form)
      onSaved(isEdit ? 'Service record updated' : 'Service complaint logged')
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const autoTotal = () => {
    const t = (parseFloat(form.Parts_Cost)||0) + (parseFloat(form.Labour_Charges)||0)
    setForm(p=>({...p, Total_Charges: t.toFixed(2)}))
  }

  return (
    <div className="erp-modal-overlay">
      <div className="erp-modal" style={{maxWidth:680}}>
        <div className="erp-modal-header">
          <div className="erp-modal-title">
            <i className="bi bi-wrench me-1"/>{isEdit ? `Update Service #${record.Service_ID}` : 'Log Service Complaint'}
          </div>
          <button className="btn-close btn-close-white" onClick={onClose}/>
        </div>
        <form onSubmit={handleSave}>
          <div className="erp-modal-body">
            {!isEdit && (
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="erp-label">Serial Number *</label>
                  <select className="form-select erp-input" required value={form.Serial_ID} onChange={f('Serial_ID')}>
                    <option value="">Select serial…</option>
                    {serials.filter(s=>s.Status==='Sold'||s.Status==='Service').map(s=>(
                      <option key={s.Serial_ID} value={s.Serial_ID}>
                        {s.Serial_No} — {s.Item_Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">Customer</label>
                  <select className="form-select erp-input" value={form.Customer_ID} onChange={f('Customer_ID')}>
                    <option value="">Select customer…</option>
                    {customers.map(c=><option key={c.Customer_ID} value={c.Customer_ID}>{c.Customer_Name}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">Complaint Date</label>
                  <input type="date" className="form-control erp-input" value={form.Complaint_Date} onChange={f('Complaint_Date')}/>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">Engineer Name</label>
                  <input className="form-control erp-input" placeholder="Tech name" value={form.Engineer_Name} onChange={f('Engineer_Name')}/>
                </div>
                <div className="col-12">
                  <label className="erp-label">Issue Description *</label>
                  <textarea className="form-control erp-input" rows={3} required placeholder="Describe the problem…"
                    value={form.Issue_Description} onChange={f('Issue_Description')}/>
                </div>
              </div>
            )}

            {isEdit && (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="erp-label">Status</label>
                    <select className="form-select erp-input" value={form.Status} onChange={f('Status')}>
                      {SERVICE_STATUSES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="erp-label">Engineer Name</label>
                    <input className="form-control erp-input" value={form.Engineer_Name} onChange={f('Engineer_Name')}/>
                  </div>
                  <div className="col-md-4">
                    <label className="erp-label">Closed Date</label>
                    <input type="date" className="form-control erp-input" value={form.Closed_Date} onChange={f('Closed_Date')}/>
                  </div>
                  <div className="col-12">
                    <label className="erp-label">Diagnosed Issue</label>
                    <textarea className="form-control erp-input" rows={2} value={form.Diagnosed_Issue} onChange={f('Diagnosed_Issue')}/>
                  </div>
                  <div className="col-12">
                    <label className="erp-label">Parts Used</label>
                    <input className="form-control erp-input" placeholder="Part names / SKUs" value={form.Parts_Used} onChange={f('Parts_Used')}/>
                  </div>
                </div>

                {/* Charges */}
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-currency-rupee"/>Charges</div>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="erp-label">Parts Cost ₹</label>
                      <input type="number" step="0.01" className="form-control erp-input" value={form.Parts_Cost} onChange={f('Parts_Cost')} onBlur={autoTotal}/>
                    </div>
                    <div className="col-md-4">
                      <label className="erp-label">Labour ₹</label>
                      <input type="number" step="0.01" className="form-control erp-input" value={form.Labour_Charges} onChange={f('Labour_Charges')} onBlur={autoTotal}/>
                    </div>
                    <div className="col-md-4">
                      <label className="erp-label">Total ₹</label>
                      <input type="number" step="0.01" className="form-control erp-input" value={form.Total_Charges} onChange={f('Total_Charges')}/>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="erp-label">Resolution Notes</label>
                    <textarea className="form-control erp-input" rows={2} value={form.Resolution_Notes} onChange={f('Resolution_Notes')} placeholder="What was done to fix the issue…"/>
                  </div>
                  <div className="col-md-4">
                    <label className="erp-label">Next Service Due</label>
                    <input type="date" className="form-control erp-input" value={form.Next_Service_Due} onChange={f('Next_Service_Due')}/>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="erp-modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-erp-save" disabled={saving}>
              {saving?<><span className="spinner-border spinner-border-sm me-1"/>…</>:<><i className="bi bi-check-lg"/>{isEdit?'Update':'Log Complaint'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ServiceRecordsPage() {
  const [rows, setRows]           = useState([])
  const [serials, setSerials]     = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [filters, setFilters]     = useState({ status: '', search: '' })
  const [toasts, setToasts]       = useState([])

  const toast = (msg, type='success') => {
    const id = Date.now()
    setToasts(p=>[...p,{id,msg,type}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 3200)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.search) params.search = filters.search
      const [r1, r2, r3] = await Promise.all([
        servicesAPI.list(params),
        serialsAPI.list({ status: 'Sold,Service' }),
        customersAPI.list({ is_active: 1 }),
      ])
      setRows(r1.data.data || [])
      setSerials(r2.data.data || [])
      setCustomers(r3.data.data || [])
    } catch { toast('Load failed', 'error') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  const handleSaved = (msg) => { toast(msg); setShowModal(false); setEditing(null); load() }
  const formatDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—'

  const openCounts = rows.filter(r => ['Open','In Progress','Waiting Parts'].includes(r.Status)).length

  return (
    <div className="master-page">
      <Toast toasts={toasts}/>

      <div className="master-page-header">
        <div>
          <div className="page-title"><i className="bi bi-wrench-adjustable me-2"/>Service Records</div>
          <div className="page-subtitle">Hardware service complaints, repair tracking &amp; AMC management</div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {openCounts > 0 && (
            <span className="badge bg-danger fs-6 px-3">{openCounts} Open</span>
          )}
          <button className="btn-erp-add" onClick={()=>{setEditing(null);setShowModal(true)}}>
            <i className="bi bi-plus-lg"/> Log Complaint
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="erp-card mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-5">
            <div className="erp-search">
              <i className="bi bi-search search-icon"/>
              <input className="form-control erp-input" placeholder="Search serial, item, customer, issue…"
                value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))}/>
            </div>
          </div>
          <div className="col-md-3">
            <select className="form-select erp-input" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
              <option value="">All Status</option>
              {SERVICE_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-outline-secondary w-100" onClick={()=>setFilters({status:'',search:''})}>
              <i className="bi bi-x-circle me-1"/>Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="erp-card">
        <div className="erp-card-header">
          <div className="erp-card-title"><span className="badge bg-danger me-1">{rows.length}</span>Service Records</div>
        </div>
        {loading ? (
          <div className="p-4">{[1,2,3].map(i=><div key={i} className="erp-skeleton mb-2" style={{height:50}}/>)}</div>
        ) : rows.length === 0 ? (
          <div className="erp-empty">
            <div className="empty-icon"><i className="bi bi-wrench"/></div>
            <p>No service records found</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th><th>Complaint Date</th><th>Serial No</th><th>Item</th>
                  <th>Customer</th><th>Issue</th><th>Status</th>
                  <th>Warranty</th><th>Total ₹</th><th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.Service_ID}>
                    <td className="text-muted" style={{fontSize:'.75rem'}}>{i+1}</td>
                    <td style={{fontSize:'.82rem'}}>{formatDate(r.Complaint_Date)}</td>
                    <td><span className="fw-bold font-monospace" style={{fontSize:'.85rem'}}>{r.Serial_No || '—'}</span></td>
                    <td style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'.85rem'}}>{r.Item_Name||'—'}</td>
                    <td style={{fontSize:'.85rem'}}>{r.Customer_Name||'—'}</td>
                    <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'.82rem'}} title={r.Issue_Description}>{r.Issue_Description}</td>
                    <td><span className={`erp-badge ${STATUS_COLORS[r.Status]||'erp-badge-gray'}`}>{r.Status}</span></td>
                    <td>
                      {r.Is_Under_Warranty==1
                        ? <span className="erp-badge erp-badge-green">Warranty</span>
                        : r.Is_Under_AMC==1
                        ? <span className="erp-badge erp-badge-blue">AMC</span>
                        : <span className="erp-badge erp-badge-gray">N/A</span>}
                    </td>
                    <td className="fw-semibold">₹{parseFloat(r.Total_Charges||0).toLocaleString('en-IN')}</td>
                    <td className="text-end">
                      <button className="btn-erp-edit" onClick={()=>{setEditing(r);setShowModal(true)}}>
                        <i className="bi bi-pencil"/> Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ServiceModal
          record={editing}
          serials={serials}
          customers={customers}
          onClose={()=>{setShowModal(false);setEditing(null)}}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
