import React, { useState, useEffect, useRef } from 'react'
import { customersAPI, uploadImage } from '../../api/api'

const PHOTO_BASE = import.meta.env.VITE_APP_URL || ''

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry',
  'Chandigarh','Dadra & Nagar Haveli','Daman & Diu','Lakshadweep',
]

const STATE_CODES = {
  'Andhra Pradesh':'37','Arunachal Pradesh':'12','Assam':'18','Bihar':'10',
  'Chhattisgarh':'22','Goa':'30','Gujarat':'24','Haryana':'06','Himachal Pradesh':'02',
  'Jharkhand':'20','Karnataka':'29','Kerala':'32','Madhya Pradesh':'23','Maharashtra':'27',
  'Manipur':'14','Meghalaya':'17','Mizoram':'15','Nagaland':'13','Odisha':'21',
  'Punjab':'03','Rajasthan':'08','Sikkim':'11','Tamil Nadu':'33','Telangana':'36',
  'Tripura':'16','Uttar Pradesh':'09','Uttarakhand':'05','West Bengal':'19',
  'Delhi':'07','Jammu & Kashmir':'01','Ladakh':'38','Puducherry':'34',
  'Chandigarh':'04','Dadra & Nagar Haveli':'26','Daman & Diu':'25','Lakshadweep':'31',
}

const defaultForm = {
  Customer_Name:'', Mobile:'', Alt_Mobile:'', Email:'',
  Address:'', City:'', State:'', State_Code:'',
  GST_No:'', PAN_No:'', Category:'Regular', Credit_Limit:0, Opening_Balance:0,
  Notes:'', Photo_Path:'', Portal_Username:'', Portal_Password:'', Portal_Active:0,
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999}}
         className={`alert alert-${type} shadow-lg d-flex align-items-center gap-2 py-2 px-3`}>
      <i className={`bi ${type==='success'?'bi-check-circle':'bi-exclamation-triangle'}`}></i>
      {msg}
      <button className="btn-close btn-close-sm ms-2" onClick={onClose}/>
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(defaultForm)
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [photoUploading, setPU]   = useState(false)
  const [viewCust, setViewCust]   = useState(null)
  const photoRef = useRef()

  const showToast = (msg, type='success') => setToast({ msg, type })

  const load = () => {
    customersAPI.list().then(r => setCustomers(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openNew  = () => { setForm(defaultForm); setEditing(null); setActiveTab('profile'); setShowModal(true) }
  const openEdit = c  => {
    setForm({ ...defaultForm, ...c, Portal_Password: '' })
    setEditing(c.Customer_ID); setActiveTab('profile'); setShowModal(true)
  }

  const openView = async id => {
    const r = await customersAPI.get(id)
    setViewCust(r.data.data)
  }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await customersAPI.update(editing, form); showToast('Customer updated') }
      else         { await customersAPI.store(form); showToast('Customer created') }
      setShowModal(false); load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving customer', 'danger')
    } finally { setSaving(false) }
  }

  const handleDeactivate = async id => {
    if (!confirm('Deactivate this customer?')) return
    try { await customersAPI.delete(id); load(); showToast('Customer deactivated') }
    catch (err) { showToast(err.response?.data?.message || 'Error', 'danger') }
  }

  const handlePhotoUpload = async e => {
    const file = e.target.files[0]; if (!file) return
    setPU(true)
    try {
      const { data } = await uploadImage(file, 'employee')
      setF('Photo_Path', data.data.url)
    } catch { showToast('Photo upload failed', 'danger') }
    finally { setPU(false); e.target.value = '' }
  }

  const handleStateChange = state => {
    setF('State', state)
    setF('State_Code', STATE_CODES[state] || '')
  }

  const catColor = c => c==='Corporate'?'danger':c==='Wholesale'?'warning text-dark':c==='Retail'?'info text-dark':'primary'

  const filtered = customers.filter(c => {
    const matchSearch = !search || c.Customer_Name?.toLowerCase().includes(search.toLowerCase()) ||
      c.Mobile?.includes(search) || c.City?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || c.Category === filterCat
    return matchSearch && matchCat
  })

  const stats = {
    total:      customers.length,
    active:     customers.filter(c => c.Is_Active).length,
    outstanding:customers.reduce((s, c) => s + parseFloat(c.Current_Balance||0), 0),
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-person-lines-fill me-2 text-primary"></i>Customers</h4>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <i className="bi bi-plus-lg me-1"></i>Add Customer
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total',       value: stats.total,  icon:'bi-people',           color:'primary' },
          { label:'Active',      value: stats.active, icon:'bi-person-check',     color:'success' },
          { label:'Outstanding', value: '₹'+stats.outstanding.toLocaleString(undefined,{maximumFractionDigits:0}), icon:'bi-currency-rupee', color:'warning' },
        ].map(c => (
          <div key={c.label} className="col-4 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className={`rounded-circle bg-${c.color} bg-opacity-10 p-3`}>
                  <i className={`bi ${c.icon} fs-4 text-${c.color}`}></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">{c.value}</div>
                  <div className="text-muted small">{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search text-muted"></i></span>
                <input className="form-control" placeholder="Search by name, mobile, city…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x"></i></button>}
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="">All Categories</option>
                {['Regular','Wholesale','Retail','Corporate'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted small">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{width:52}}></th>
                <th>Name</th><th>Mobile</th><th>City / State</th><th>GST</th>
                <th>Category</th><th>Balance</th><th>Portal</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"/>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-5 text-muted">
                  <i className="bi bi-person-lines-fill me-2"></i>No customers found
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.Customer_ID}>
                  <td>
                    {c.Photo_Path
                      ? <img src={PHOTO_BASE + c.Photo_Path} alt={c.Customer_Name}
                          className="rounded-circle border" style={{width:38,height:38,objectFit:'cover'}}/>
                      : <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                          style={{width:38,height:38,background:'#0ea5e9',fontSize:14}}>
                          {c.Customer_Name?.[0]}
                        </div>
                    }
                  </td>
                  <td>
                    <div className="fw-semibold">{c.Customer_Name}</div>
                    {c.Email && <small className="text-muted">{c.Email}</small>}
                  </td>
                  <td>
                    <div>{c.Mobile}</div>
                    {c.Alt_Mobile && <small className="text-muted">{c.Alt_Mobile}</small>}
                  </td>
                  <td><small>{[c.City, c.State].filter(Boolean).join(', ') || '—'}</small></td>
                  <td><small className="font-monospace">{c.GST_No || '—'}</small></td>
                  <td><span className={`badge bg-${catColor(c.Category)}`}>{c.Category}</span></td>
                  <td className={parseFloat(c.Current_Balance||0) > 0 ? 'text-danger fw-semibold' : 'text-muted'}>
                    ₹{parseFloat(c.Current_Balance||0).toLocaleString()}
                  </td>
                  <td>
                    {c.Portal_Active
                      ? <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle">Active</span>
                      : <span className="badge bg-secondary bg-opacity-10 text-secondary border">Off</span>}
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-info" title="View History" onClick={() => openView(c.Customer_ID)}>
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn btn-outline-primary" title="Edit" onClick={() => openEdit(c)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      {c.Is_Active && (
                        <button className="btn btn-outline-danger" title="Deactivate" onClick={() => handleDeactivate(c.Customer_ID)}>
                          <i className="bi bi-person-x"></i>
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

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-badge me-2 text-primary"></i>
                  {editing ? 'Edit Customer' : 'Add Customer'}
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body pt-3">
                  <div className="row g-4">
                    {/* LEFT: Photo + quick fields */}
                    <div className="col-md-3">
                      <div className="text-center p-3 bg-light rounded-3 border h-100 d-flex flex-column align-items-center justify-content-start gap-2">
                        <div style={{width:100,height:100}}>
                          {form.Photo_Path
                            ? <img src={PHOTO_BASE + form.Photo_Path} alt="Photo"
                                className="rounded-circle border shadow-sm w-100 h-100" style={{objectFit:'cover'}}/>
                            : <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white w-100 h-100"
                                style={{background:'#0ea5e9',fontSize:32}}>
                                {(form.Customer_Name||'?')[0]}
                              </div>
                          }
                        </div>
                        <input ref={photoRef} type="file" accept="image/*" className="d-none" onChange={handlePhotoUpload}/>
                        <button type="button" className="btn btn-outline-primary btn-sm w-100"
                          onClick={() => photoRef.current.click()} disabled={photoUploading}>
                          <i className="bi bi-camera me-1"></i>
                          {photoUploading ? 'Uploading…' : 'Upload Photo'}
                        </button>
                        <small className="text-muted">JPG/PNG · Max 2MB</small>
                        <hr className="w-100 my-1"/>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Category</label>
                          <select className="form-select form-select-sm" value={form.Category||'Regular'} onChange={e=>setF('Category',e.target.value)}>
                            {['Regular','Wholesale','Retail','Corporate'].map(c=><option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Credit Limit (₹)</label>
                          <input type="number" className="form-control form-control-sm" value={form.Credit_Limit||0}
                            onChange={e=>setF('Credit_Limit',e.target.value)}/>
                        </div>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Opening Balance (₹)</label>
                          <input type="number" className="form-control form-control-sm" value={form.Opening_Balance||0}
                            onChange={e=>setF('Opening_Balance',e.target.value)}/>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Tabs */}
                    <div className="col-md-9">
                      <ul className="nav nav-tabs mb-3">
                        {[
                          { key:'profile', label:'Profile',   icon:'bi-person' },
                          { key:'gst',     label:'GST & Tax', icon:'bi-receipt' },
                          { key:'portal',  label:'Portal',    icon:'bi-globe' },
                        ].map(t => (
                          <li key={t.key} className="nav-item">
                            <button type="button"
                              className={`nav-link ${activeTab===t.key?'active':''}`}
                              onClick={() => setActiveTab(t.key)}>
                              <i className={`bi ${t.icon} me-1`}></i>{t.label}
                            </button>
                          </li>
                        ))}
                      </ul>

                      {activeTab === 'profile' && (
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Customer Name *</label>
                            <input className="form-control" required value={form.Customer_Name||''}
                              onChange={e=>setF('Customer_Name',e.target.value)} placeholder="Full business/customer name"/>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold small">Mobile *</label>
                            <input className="form-control" required value={form.Mobile||''}
                              onChange={e=>setF('Mobile',e.target.value)} placeholder="Mobile number"/>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold small">Alt. Mobile</label>
                            <input className="form-control" value={form.Alt_Mobile||''}
                              onChange={e=>setF('Alt_Mobile',e.target.value)} placeholder="Alternate"/>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Email</label>
                            <input type="email" className="form-control" value={form.Email||''}
                              onChange={e=>setF('Email',e.target.value)} placeholder="Email address"/>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">City</label>
                            <input className="form-control" value={form.City||''}
                              onChange={e=>setF('City',e.target.value)} placeholder="City"/>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">State</label>
                            <select className="form-select" value={form.State||''} onChange={e=>handleStateChange(e.target.value)}>
                              <option value="">Select state…</option>
                              {INDIAN_STATES.map(s=><option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">State Code (GST)</label>
                            <input className="form-control font-monospace" value={form.State_Code||''} readOnly placeholder="Auto"/>
                          </div>
                          <div className="col-12">
                            <label className="form-label fw-semibold small">Address</label>
                            <textarea className="form-control" rows={2} value={form.Address||''}
                              onChange={e=>setF('Address',e.target.value)} placeholder="Full address"/>
                          </div>
                          <div className="col-12">
                            <label className="form-label fw-semibold small">Notes</label>
                            <textarea className="form-control" rows={2} value={form.Notes||''}
                              onChange={e=>setF('Notes',e.target.value)} placeholder="Internal notes"/>
                          </div>
                        </div>
                      )}

                      {activeTab === 'gst' && (
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">GST Number</label>
                            <input className="form-control font-monospace" value={form.GST_No||''}
                              onChange={e=>setF('GST_No',e.target.value.toUpperCase())} placeholder="e.g. 09AAAAA0000A1Z5"/>
                            {form.GST_No?.length === 15 && (
                              <small className="text-success mt-1 d-block">
                                <i className="bi bi-check-circle me-1"></i>State Code: {form.GST_No.substring(0,2)}
                              </small>
                            )}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">PAN Number</label>
                            <input className="form-control font-monospace" value={form.PAN_No||''}
                              onChange={e=>setF('PAN_No',e.target.value.toUpperCase())} placeholder="e.g. AAAAA0000A"/>
                          </div>
                          <div className="col-12">
                            <div className="p-3 bg-light rounded-3 border">
                              <div className="fw-semibold small mb-2">
                                <i className="bi bi-info-circle me-1 text-primary"></i>GST Tax Logic for Invoices
                              </div>
                              <div className="small text-muted">
                                {form.State_Code && form.State_Code !== '09'
                                  ? <><span className="badge bg-warning text-dark me-2">IGST</span>Customer is in a different state — IGST will apply on invoices</>
                                  : form.State_Code === '09'
                                    ? <><span className="badge bg-success me-2">CGST + SGST</span>Same state (UP) — CGST + SGST will apply</>
                                    : <span className="text-muted">Select state to see tax logic</span>
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'portal' && (
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Portal Username</label>
                            <input className="form-control font-monospace" value={form.Portal_Username||''}
                              onChange={e=>setF('Portal_Username',e.target.value)} placeholder="Customer login username"/>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">
                              {editing ? 'New Password (leave blank to keep)' : 'Portal Password'}
                            </label>
                            <input type="password" className="form-control" value={form.Portal_Password||''}
                              onChange={e=>setF('Portal_Password',e.target.value)} placeholder="Set password"/>
                          </div>
                          <div className="col-12">
                            <div className="form-check form-switch">
                              <input type="checkbox" className="form-check-input" id="portalActive"
                                checked={!!form.Portal_Active} onChange={e=>setF('Portal_Active',e.target.checked?1:0)}/>
                              <label className="form-check-label" htmlFor="portalActive">Enable Portal Access</label>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="alert alert-info py-2 rounded-3">
                              <i className="bi bi-globe me-2"></i>
                              Customers log in at <code>/customer-login</code> to view invoices and account statement.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light px-4" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-2"/>}
                    {editing ? 'Update Customer' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAIL / HISTORY MODAL */}
      {viewCust && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-3">
                  {viewCust.Photo_Path
                    ? <img src={PHOTO_BASE + viewCust.Photo_Path} alt={viewCust.Customer_Name}
                        className="rounded-circle border" style={{width:48,height:48,objectFit:'cover'}}/>
                    : <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                        style={{width:48,height:48,background:'#0ea5e9',fontSize:18}}>
                        {viewCust.Customer_Name?.[0]}
                      </div>
                  }
                  <div>
                    <h5 className="modal-title fw-bold mb-0">{viewCust.Customer_Name}</h5>
                    <div className="text-muted small">
                      {viewCust.Mobile}
                      {viewCust.City ? ` · ${viewCust.City}` : ''}
                      {viewCust.State ? `, ${viewCust.State}` : ''}
                    </div>
                  </div>
                </div>
                <button className="btn-close" onClick={() => setViewCust(null)}/>
              </div>
              <div className="modal-body pt-3">
                {/* Info Cards */}
                <div className="row g-3 mb-4">
                  {[
                    { label:'Outstanding', value:'₹'+parseFloat(viewCust.Current_Balance||0).toLocaleString(), color: parseFloat(viewCust.Current_Balance||0)>0?'danger':'success' },
                    { label:'Total Bills',  value: viewCust.bills?.length || 0, color:'primary' },
                    { label:'Total Jobs',   value: viewCust.jobs?.length  || 0, color:'info' },
                    { label:'GST No',       value: viewCust.GST_No || '—', color:'secondary' },
                  ].map(c => (
                    <div key={c.label} className="col-6 col-md-3">
                      <div className="p-3 bg-light rounded-3 text-center">
                        <div className="text-muted small">{c.label}</div>
                        <div className={`fw-bold fs-5 text-${c.color}`}>{c.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bills */}
                <h6 className="fw-bold mb-2"><i className="bi bi-receipt me-1 text-primary"></i>Bill History</h6>
                {viewCust.bills?.length > 0 ? (
                  <div className="table-responsive mb-4">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr><th>Bill #</th><th>Date</th><th>Net Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {viewCust.bills.map(b => (
                          <tr key={b.Bill_ID}>
                            <td className="text-primary fw-semibold">{b.Bill_Number}</td>
                            <td><small>{b.Bill_Date}</small></td>
                            <td className="fw-semibold">₹{parseFloat(b.Net_Amount||0).toLocaleString()}</td>
                            <td className="text-success">₹{parseFloat(b.Amount_Paid||0).toLocaleString()}</td>
                            <td className={parseFloat(b.Balance_Due||0)>0?'text-danger fw-semibold':'text-muted'}>
                              ₹{parseFloat(b.Balance_Due||0).toLocaleString()}
                            </td>
                            <td>
                              <span className={`badge bg-${b.Payment_Status==='Paid'?'success':b.Payment_Status==='Partial'?'warning':'danger'}`}>
                                {b.Payment_Status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-muted small mb-3">No bills yet.</p>}

                {/* Jobs */}
                <h6 className="fw-bold mb-2"><i className="bi bi-clipboard2-data me-1 text-primary"></i>Job History</h6>
                {viewCust.jobs?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr><th>Job #</th><th>Description</th><th>Qty</th><th>Status</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {viewCust.jobs.map(j => (
                          <tr key={j.Job_ID}>
                            <td className="text-primary fw-semibold">{j.Job_Number}</td>
                            <td><small>{j.Description || j.Label_Description || '—'}</small></td>
                            <td><small>{j.Total_Quantity?.toLocaleString() || '—'}</small></td>
                            <td>
                              <span className={`badge ${j.Status==='Completed'?'bg-success':j.Status==='Running'?'bg-primary':'bg-secondary'}`}>
                                {j.Status}
                              </span>
                            </td>
                            <td><small>{j.Created_Date || j.Job_Date || '—'}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-muted small">No jobs yet.</p>}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-primary btn-sm" onClick={() => { setViewCust(null); openEdit(viewCust) }}>
                  <i className="bi bi-pencil me-1"></i>Edit Customer
                </button>
                <button className="btn btn-light" onClick={() => setViewCust(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
