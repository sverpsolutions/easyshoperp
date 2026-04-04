import React, { useState, useEffect, useRef } from 'react'
import { suppliersAPI, uploadImage } from '../../api/api'

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
  Supplier_Name:'', Mobile:'', Alt_Mobile:'', Email:'', Contact_Person:'',
  Address:'', City:'', State:'', State_Code:'',
  GST_No:'', PAN_No:'', Category:'Regular',
  Bank_Name:'', Bank_Account:'', Bank_IFSC:'',
  Credit_Limit:0, Opening_Balance:0, Notes:'', Photo_Path:'',
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

const PAY_COLOR = { Unpaid:'danger', Partial:'warning', Paid:'success' }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
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
  const [viewSupplier, setViewSupplier] = useState(null)
  const photoRef = useRef()

  const showToast = (msg, type='success') => setToast({ msg, type })

  const load = () => {
    suppliersAPI.list({ is_active: 1 })
      .then(r => setSuppliers(r.data.data || []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openNew  = () => { setForm(defaultForm); setEditing(null); setActiveTab('profile'); setShowModal(true) }
  const openEdit = s  => { setForm({ ...defaultForm, ...s }); setEditing(s.Supplier_ID); setActiveTab('profile'); setShowModal(true) }

  const openView = async id => {
    const r = await suppliersAPI.get(id)
    setViewSupplier(r.data.data)
  }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await suppliersAPI.update(editing, form); showToast('Supplier updated') }
      else         { await suppliersAPI.store(form); showToast('Supplier created') }
      setShowModal(false); load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving supplier', 'danger')
    } finally { setSaving(false) }
  }

  const handleDeactivate = async id => {
    if (!confirm('Deactivate this supplier?')) return
    try { await suppliersAPI.delete(id); load(); showToast('Supplier deactivated') }
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

  const filtered = suppliers.filter(s => {
    const matchSearch = !search ||
      s.Supplier_Name?.toLowerCase().includes(search.toLowerCase()) ||
      s.Mobile?.includes(search) || s.City?.toLowerCase().includes(search.toLowerCase()) ||
      s.GST_No?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || s.Category === filterCat
    return matchSearch && matchCat
  })

  const stats = {
    total:       suppliers.length,
    outstanding: suppliers.reduce((s, x) => s + parseFloat(x.Current_Balance || 0), 0),
  }

  const avatar = (name, photo, size = 38, bg = '#7c3aed') => photo
    ? <img src={PHOTO_BASE + photo} alt={name}
        className="rounded-circle border" style={{width:size,height:size,objectFit:'cover'}}/>
    : <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
        style={{width:size,height:size,background:bg,fontSize:size*0.35}}>
        {name?.[0]?.toUpperCase()}
      </div>

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-shop me-2 text-primary"></i>Suppliers</h4>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <i className="bi bi-plus-lg me-1"></i>Add Supplier
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Suppliers', value: stats.total,  icon:'bi-shop',          color:'primary' },
          { label:'Outstanding',     value: '₹'+stats.outstanding.toLocaleString(undefined,{maximumFractionDigits:0}), icon:'bi-currency-rupee', color:'warning' },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className={`rounded-circle bg-${c.color} bg-opacity-10 p-3`}>
                  <i className={`bi ${c.icon} fs-4 text-${c.color}`}></i>
                </div>
                <div>
                  <div className="fs-3 fw-bold">{c.value}</div>
                  <div className="text-muted small">{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search text-muted"></i></span>
                <input className="form-control" placeholder="Search by name, mobile, city, GST…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x"></i></button>}
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="">All Categories</option>
                {['Regular','Wholesale','Manufacturer','Distributor'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted small">{filtered.length} supplier{filtered.length !== 1 ? 's' : ''}</span>
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
                <th>Name</th><th>Contact</th><th>City / State</th>
                <th>GST No</th><th>Category</th><th>Balance Due</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"/>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-5 text-muted">
                  <i className="bi bi-shop me-2"></i>No suppliers found
                </td></tr>
              ) : filtered.map(s => (
                <tr key={s.Supplier_ID}>
                  <td>{avatar(s.Supplier_Name, s.Photo_Path)}</td>
                  <td>
                    <div className="fw-semibold">{s.Supplier_Name}</div>
                    {s.Contact_Person && <small className="text-muted">{s.Contact_Person}</small>}
                    {s.Email && <small className="text-muted d-block">{s.Email}</small>}
                  </td>
                  <td>
                    <div>{s.Mobile || '—'}</div>
                    {s.Alt_Mobile && <small className="text-muted">{s.Alt_Mobile}</small>}
                  </td>
                  <td><small>{[s.City, s.State].filter(Boolean).join(', ') || '—'}</small></td>
                  <td><small className="font-monospace">{s.GST_No || '—'}</small></td>
                  <td>
                    <span className={`badge ${s.Category==='Manufacturer'?'bg-danger':s.Category==='Distributor'?'bg-warning text-dark':s.Category==='Wholesale'?'bg-info text-dark':'bg-primary'}`}>
                      {s.Category}
                    </span>
                  </td>
                  <td className={parseFloat(s.Current_Balance||0) > 0 ? 'text-danger fw-semibold' : 'text-muted'}>
                    ₹{parseFloat(s.Current_Balance||0).toLocaleString()}
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-info" title="View Purchases" onClick={() => openView(s.Supplier_ID)}>
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn btn-outline-primary" title="Edit" onClick={() => openEdit(s)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-outline-danger" title="Deactivate" onClick={() => handleDeactivate(s.Supplier_ID)}>
                        <i className="bi bi-x-circle"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD / EDIT MODAL ───────────────────────────────────── */}
      {showModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shop me-2 text-primary"></i>
                  {editing ? 'Edit Supplier' : 'Add Supplier'}
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body pt-3">
                  <div className="row g-4">
                    {/* LEFT: Photo + meta */}
                    <div className="col-md-3">
                      <div className="text-center p-3 bg-light rounded-3 border h-100 d-flex flex-column align-items-center justify-content-start gap-2">
                        <div style={{width:100,height:100}}>
                          {form.Photo_Path
                            ? <img src={PHOTO_BASE + form.Photo_Path} alt="Photo"
                                className="rounded-circle border shadow-sm w-100 h-100" style={{objectFit:'cover'}}/>
                            : <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white w-100 h-100"
                                style={{background:'#7c3aed',fontSize:32}}>
                                {(form.Supplier_Name||'?')[0]?.toUpperCase()}
                              </div>
                          }
                        </div>
                        <input ref={photoRef} type="file" accept="image/*" className="d-none" onChange={handlePhotoUpload}/>
                        <button type="button" className="btn btn-outline-primary btn-sm w-100"
                          onClick={() => photoRef.current.click()} disabled={photoUploading}>
                          <i className="bi bi-camera me-1"></i>
                          {photoUploading ? 'Uploading…' : 'Upload Logo'}
                        </button>
                        <small className="text-muted">JPG/PNG · Max 2MB</small>
                        <hr className="w-100 my-1"/>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Category</label>
                          <select className="form-select form-select-sm" value={form.Category||'Regular'} onChange={e=>setF('Category',e.target.value)}>
                            {['Regular','Wholesale','Manufacturer','Distributor'].map(c=><option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Credit Limit (₹)</label>
                          <input type="number" className="form-control form-control-sm" min="0"
                            value={form.Credit_Limit||0} onChange={e=>setF('Credit_Limit',e.target.value)}/>
                        </div>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Opening Balance (₹)</label>
                          <input type="number" className="form-control form-control-sm"
                            value={form.Opening_Balance||0} onChange={e=>setF('Opening_Balance',e.target.value)}/>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Tabs */}
                    <div className="col-md-9">
                      <ul className="nav nav-tabs mb-3">
                        {[
                          { key:'profile', label:'Profile',     icon:'bi-building' },
                          { key:'gst',     label:'GST & Tax',   icon:'bi-receipt' },
                          { key:'bank',    label:'Bank Details', icon:'bi-bank' },
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

                      {/* Profile Tab */}
                      {activeTab === 'profile' && (
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Supplier / Firm Name *</label>
                            <input className="form-control" required value={form.Supplier_Name||''}
                              onChange={e=>setF('Supplier_Name',e.target.value)} placeholder="Firm or supplier name"/>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Contact Person</label>
                            <input className="form-control" value={form.Contact_Person||''}
                              onChange={e=>setF('Contact_Person',e.target.value)} placeholder="Sales rep / owner name"/>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold small">Mobile</label>
                            <input className="form-control" value={form.Mobile||''}
                              onChange={e=>setF('Mobile',e.target.value)} placeholder="Primary mobile"/>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold small">Alt. Mobile</label>
                            <input className="form-control" value={form.Alt_Mobile||''}
                              onChange={e=>setF('Alt_Mobile',e.target.value)} placeholder="Alternate"/>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold small">Email</label>
                            <input type="email" className="form-control" value={form.Email||''}
                              onChange={e=>setF('Email',e.target.value)} placeholder="Email address"/>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold small">City</label>
                            <input className="form-control" value={form.City||''}
                              onChange={e=>setF('City',e.target.value)} placeholder="City"/>
                          </div>
                          <div className="col-md-5">
                            <label className="form-label fw-semibold small">State</label>
                            <select className="form-select" value={form.State||''} onChange={e=>handleStateChange(e.target.value)}>
                              <option value="">Select state…</option>
                              {INDIAN_STATES.map(s=><option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold small">State Code</label>
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

                      {/* GST Tab */}
                      {activeTab === 'gst' && (
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">GST Number</label>
                            <input className="form-control font-monospace" value={form.GST_No||''}
                              onChange={e=>setF('GST_No',e.target.value.toUpperCase())} placeholder="e.g. 09AAAAA0000A1Z5"/>
                            {form.GST_No?.length === 15 && (
                              <small className="text-success mt-1 d-block">
                                <i className="bi bi-check-circle me-1"></i>Valid length · State Code: {form.GST_No.substring(0,2)}
                              </small>
                            )}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">PAN Number</label>
                            <input className="form-control font-monospace" value={form.PAN_No||''}
                              onChange={e=>setF('PAN_No',e.target.value.toUpperCase())} placeholder="e.g. AAAAA0000A"/>
                          </div>
                          <div className="col-12">
                            <div className="p-3 bg-light rounded-3 border small text-muted">
                              <i className="bi bi-info-circle me-1 text-primary"></i>
                              GST No is used for Input Tax Credit on purchase invoices. Ensure this matches the supplier's official GSTIN.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bank Tab */}
                      {activeTab === 'bank' && (
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Bank Name</label>
                            <input className="form-control" value={form.Bank_Name||''}
                              onChange={e=>setF('Bank_Name',e.target.value)} placeholder="e.g. SBI, HDFC"/>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Account Number</label>
                            <input className="form-control font-monospace" value={form.Bank_Account||''}
                              onChange={e=>setF('Bank_Account',e.target.value)} placeholder="Account number"/>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">IFSC Code</label>
                            <input className="form-control font-monospace" value={form.Bank_IFSC||''}
                              onChange={e=>setF('Bank_IFSC',e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234"/>
                          </div>
                          <div className="col-12">
                            <div className="alert alert-warning py-2 rounded-3 small">
                              <i className="bi bi-shield-lock me-1"></i>
                              Bank details are stored securely and used for payment reference only.
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
                    {editing ? 'Update Supplier' : 'Add Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW / PURCHASE HISTORY MODAL ─────────────────────── */}
      {viewSupplier && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-3">
                  {avatar(viewSupplier.Supplier_Name, viewSupplier.Photo_Path, 48)}
                  <div>
                    <h5 className="modal-title fw-bold mb-0">{viewSupplier.Supplier_Name}</h5>
                    <div className="text-muted small">
                      {viewSupplier.Mobile && <span className="me-2"><i className="bi bi-telephone me-1"></i>{viewSupplier.Mobile}</span>}
                      {viewSupplier.City && <span><i className="bi bi-geo-alt me-1"></i>{[viewSupplier.City, viewSupplier.State].filter(Boolean).join(', ')}</span>}
                    </div>
                  </div>
                </div>
                <button className="btn-close" onClick={() => setViewSupplier(null)}/>
              </div>
              <div className="modal-body pt-3">
                {/* Info Cards */}
                <div className="row g-3 mb-4">
                  {[
                    { label:'Total Purchased', value:'₹'+parseFloat(viewSupplier.total_purchased||0).toLocaleString(undefined,{maximumFractionDigits:0}), color:'primary' },
                    { label:'Total Paid',       value:'₹'+parseFloat(viewSupplier.total_paid||0).toLocaleString(undefined,{maximumFractionDigits:0}),      color:'success' },
                    { label:'Balance Due',      value:'₹'+parseFloat(viewSupplier.total_due||0).toLocaleString(undefined,{maximumFractionDigits:0}),       color: parseFloat(viewSupplier.total_due||0)>0?'danger':'success' },
                    { label:'GST No',           value: viewSupplier.GST_No || '—', color:'secondary' },
                  ].map(c => (
                    <div key={c.label} className="col-6 col-md-3">
                      <div className="p-3 bg-light rounded-3 text-center">
                        <div className="text-muted small">{c.label}</div>
                        <div className={`fw-bold fs-6 text-${c.color}`}>{c.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bank Details (read-only) */}
                {(viewSupplier.Bank_Name || viewSupplier.Bank_IFSC) && (
                  <div className="p-3 bg-light rounded-3 border mb-4">
                    <div className="fw-semibold small mb-2"><i className="bi bi-bank me-1 text-primary"></i>Bank Details</div>
                    <div className="row g-2 small">
                      {viewSupplier.Bank_Name  && <div className="col-md-4"><span className="text-muted">Bank: </span><strong>{viewSupplier.Bank_Name}</strong></div>}
                      {viewSupplier.Bank_IFSC  && <div className="col-md-4"><span className="text-muted">IFSC: </span><strong className="font-monospace">{viewSupplier.Bank_IFSC}</strong></div>}
                    </div>
                  </div>
                )}

                {/* Purchase History */}
                <h6 className="fw-bold mb-2"><i className="bi bi-truck me-1 text-primary"></i>Purchase History</h6>
                {viewSupplier.purchases?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Purchase #</th><th>Date</th><th>Invoice No</th>
                          <th>Net Amount</th><th>Paid</th><th>Balance</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewSupplier.purchases.map(p => (
                          <tr key={p.Purchase_ID}>
                            <td className="text-primary fw-semibold">{p.Purchase_Number}</td>
                            <td><small>{p.Purchase_Date}</small></td>
                            <td><small className="text-muted">{p.Invoice_No || '—'}</small></td>
                            <td className="fw-semibold">₹{parseFloat(p.Net_Amount||0).toLocaleString()}</td>
                            <td className="text-success">₹{parseFloat(p.Amount_Paid||0).toLocaleString()}</td>
                            <td className={parseFloat(p.Balance_Due||0)>0?'text-danger fw-semibold':'text-muted'}>
                              ₹{parseFloat(p.Balance_Due||0).toLocaleString()}
                            </td>
                            <td><span className={`badge bg-${PAY_COLOR[p.Payment_Status]||'secondary'}`}>{p.Payment_Status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small">No purchases recorded yet.</p>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-primary btn-sm" onClick={() => { setViewSupplier(null); openEdit(viewSupplier) }}>
                  <i className="bi bi-pencil me-1"></i>Edit Supplier
                </button>
                <button className="btn btn-light" onClick={() => setViewSupplier(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
