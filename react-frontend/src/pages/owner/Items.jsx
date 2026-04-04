import React, { useState, useEffect, useRef, useCallback } from 'react'
import { itemsAPI, mastersAPI, uploadImage } from '../../api/api'
import '../../styles/erp-theme.css'

const PHOTO_BASE = import.meta.env.VITE_APP_URL || ''

const PAPER_TYPES = ['Thermal', 'Art Paper', 'BOPP', 'PET', 'PP', 'Vinyl', 'Kraft', 'Couche']
const CORE_TYPES  = ['1 inch', '3 inch', '2 inch']
const ITEM_TYPES  = ['Plain', 'Printed']
const GST_RATES   = [0, 5, 12, 18, 28]

const defaultForm = {
  Item_Code: '', Item_Name: '', Group_ID: '', Subgroup_ID: '', Category_ID: '',
  Subcategory_ID: '', Brand_ID: '', Manufacturer: '', Paper_Type: '', Core_Type: '',
  Item_Type: 'Plain', Size_Width: '', Size_Length: '', Labels_Per_Roll: '',
  HSN_Code: '', HSN_ID: '', GST_Rate: 18, GST_Tax_ID: '', UOM_ID: '', Unit: 'Roll',
  Purchase_Rate: '', Sale_Rate: '', Min_Stock: 0, Barcode_Value: '', Photo_Path: '',
  Model_No: '', Part_No: '', EAN_Code: '', Notes: '',
  // Hardware fields
  Is_Hardware: 0, Serial_Required: 0, Warranty_Months: 0, AMC_Years: 0, Service_Applicable: 0,
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

// Quick-add inline modal for adding hierarchy entries
function QuickAddModal({ title, fields, onSave, onClose }) {
  const [vals, setVals] = useState({})
  const handleSubmit = e => { e.preventDefault(); onSave(vals) }
  return (
    <div className="modal d-block" style={{background:'rgba(0,0,0,0.5)',zIndex:1060}}>
      <div className="modal-dialog modal-sm modal-dialog-centered">
        <div className="modal-content rounded-3 border-0 shadow">
          <div className="modal-header border-0 pb-0">
            <h6 className="modal-title fw-bold">{title}</h6>
            <button className="btn-close" onClick={onClose}/>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {fields.map(f => (
                <div key={f.name} className="mb-2">
                  <label className="form-label small fw-semibold">{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="form-select form-select-sm" required={f.required}
                      value={vals[f.name]||''} onChange={e=>setVals(p=>({...p,[f.name]:e.target.value}))}>
                      <option value="">Select…</option>
                      {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input className="form-control form-control-sm" required={f.required}
                      value={vals[f.name]||''} placeholder={f.placeholder||''}
                      onChange={e=>setVals(p=>({...p,[f.name]:e.target.value}))}/>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ItemsPage() {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [hierarchy, setHierarchy] = useState({ groups:[], subgroups:[], categories:[], subcategories:[], brands:[] })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(defaultForm)
  const [saving, setSaving]       = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [toast, setToast]         = useState(null)
  const [search, setSearch]       = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterType, setFilterType]   = useState('')
  const [photoUploading, setPU]   = useState(false)
  const [quickAdd, setQuickAdd]   = useState(null) // { type, ... }
  const [masterDD, setMasterDD]   = useState({ gst_taxes:[], hsn_codes:[], uoms:[], manufacturers:[] })
  const photoRef = useRef()

  const showToast = (msg, type='success') => setToast({ msg, type })

  const loadHierarchy = () => {
    itemsAPI.hierarchy().then(r => setHierarchy(r.data.data || {}))
    mastersAPI.dropdowns().then(r => {
      const d = r.data.data || {}
      setMasterDD({ gst_taxes: d.gst_taxes||[], hsn_codes: d.hsn_codes||[], uoms: d.uoms||[], manufacturers: d.manufacturers||[] })
    }).catch(()=>{})
  }

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (filterGroup) params.group_id = filterGroup
    if (filterType)  params.item_type = filterType
    if (search)      params.search = search
    itemsAPI.list(params)
      .then(r => setItems(r.data.data || []))
      .finally(() => setLoading(false))
  }, [filterGroup, filterType, search])

  useEffect(() => { loadHierarchy() }, [])
  useEffect(() => { load() }, [load])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openNew = () => {
    setForm(defaultForm); setEditing(null); setActiveTab('general'); setShowModal(true)
  }
  const openEdit = item => {
    setForm({ ...defaultForm, ...item }); setEditing(item.Item_ID); setActiveTab('general'); setShowModal(true)
  }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await itemsAPI.update(editing, form); showToast('Item updated') }
      else         { await itemsAPI.store(form); showToast('Item created') }
      setShowModal(false); load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving item', 'danger')
    } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Deactivate this item?')) return
    try { await itemsAPI.delete(id); load(); showToast('Item deactivated') }
    catch (err) { showToast(err.response?.data?.message || 'Error', 'danger') }
  }

  const handlePhotoUpload = async e => {
    const file = e.target.files[0]; if (!file) return
    setPU(true)
    try {
      const { data } = await uploadImage(file, 'machine')
      setF('Photo_Path', data.data.url)
    } catch { showToast('Photo upload failed', 'danger') }
    finally { setPU(false); e.target.value = '' }
  }

  // Filtered subgroups/categories/subcategories for cascading dropdowns
  const filtSubgroups   = hierarchy.subgroups?.filter(s => !form.Group_ID || String(s.Group_ID) === String(form.Group_ID)) || []
  const filtCategories  = hierarchy.categories?.filter(c => !form.Subgroup_ID || String(c.Subgroup_ID) === String(form.Subgroup_ID)) || []
  const filtSubcats     = hierarchy.subcategories?.filter(sc => !form.Category_ID || String(sc.Category_ID) === String(form.Category_ID)) || []

  // Summary stats
  const stats = {
    total:   items.length,
    plain:   items.filter(i => i.Item_Type === 'Plain').length,
    printed: items.filter(i => i.Item_Type === 'Printed').length,
    lowStock:items.filter(i => parseInt(i.Current_Stock||0) <= parseInt(i.Min_Stock||0)).length,
  }

  // Quick-add helpers
  const openQuickAdd = (type) => setQuickAdd({ type })
  const handleQuickSave = async (vals) => {
    try {
      switch (quickAdd.type) {
        case 'group':       await itemsAPI.storeGroup({ Group_Name: vals.name }); break
        case 'subgroup':    await itemsAPI.storeSubgroup({ Subgroup_Name: vals.name, Group_ID: vals.Group_ID }); break
        case 'category':    await itemsAPI.storeCategory({ Category_Name: vals.name, Subgroup_ID: vals.Subgroup_ID }); break
        case 'subcategory': await itemsAPI.storeSubcategory({ Subcategory_Name: vals.name, Category_ID: vals.Category_ID }); break
        case 'brand':       await itemsAPI.storeBrand({ Brand_Name: vals.name }); break
      }
      await loadHierarchy()
      showToast('Added successfully')
      setQuickAdd(null)
    } catch(err) { showToast('Error adding', 'danger') }
  }

  const quickAddConfig = {
    group:       { title:'Add Group',       fields:[{ name:'name', label:'Group Name', required:true, placeholder:'e.g. Labels' }] },
    brand:       { title:'Add Brand',       fields:[{ name:'name', label:'Brand Name', required:true, placeholder:'e.g. Zebra' }] },
    subgroup:    { title:'Add Subgroup',    fields:[
      { name:'Group_ID',  label:'Group',        type:'select', required:true, options: hierarchy.groups?.map(g=>({value:g.Group_ID,label:g.Group_Name}))||[] },
      { name:'name',      label:'Subgroup Name', required:true, placeholder:'e.g. Barcode Labels' },
    ]},
    category:    { title:'Add Category',    fields:[
      { name:'Subgroup_ID', label:'Subgroup',      type:'select', options: hierarchy.subgroups?.map(s=>({value:s.Subgroup_ID,label:s.Subgroup_Name}))||[] },
      { name:'name',        label:'Category Name',  required:true },
    ]},
    subcategory: { title:'Add Subcategory', fields:[
      { name:'Category_ID', label:'Category',          type:'select', options: hierarchy.categories?.map(c=>({value:c.Category_ID,label:c.Category_Name}))||[] },
      { name:'name',        label:'Subcategory Name',   required:true },
    ]},
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {quickAdd && (
        <QuickAddModal
          title={quickAddConfig[quickAdd.type]?.title}
          fields={quickAddConfig[quickAdd.type]?.fields || []}
          onSave={handleQuickSave}
          onClose={() => setQuickAdd(null)}
        />
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-box-seam me-2 text-primary"></i>Item Master
        </h4>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <i className="bi bi-plus-lg me-1"></i>Add Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Items',  value:stats.total,   icon:'bi-box-seam',      color:'primary' },
          { label:'Plain',        value:stats.plain,   icon:'bi-file-earmark',  color:'info' },
          { label:'Printed',      value:stats.printed, icon:'bi-printer',       color:'success' },
          { label:'Low Stock',    value:stats.lowStock,icon:'bi-exclamation-triangle', color:'warning' },
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
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search text-muted"></i></span>
                <input className="form-control" placeholder="Search by name, code, barcode…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x"></i></button>}
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                <option value="">All Groups</option>
                {hierarchy.groups?.map(g => <option key={g.Group_ID} value={g.Group_ID}>{g.Group_Name}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">All Types</option>
                <option value="Plain">Plain</option>
                <option value="Printed">Printed</option>
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted small">{items.length} item{items.length !== 1 ? 's' : ''}</span>
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
                <th>Code</th><th>Item Name</th><th>Group</th><th>Type</th>
                <th>Paper</th><th>Size (W×L mm)</th><th>Qty/Roll</th>
                <th>Sale Rate</th><th>Stock</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"/>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-5 text-muted">
                  <i className="bi bi-box-seam me-2"></i>No items found
                </td></tr>
              ) : items.map(item => {
                const lowStock = parseInt(item.Current_Stock||0) <= parseInt(item.Min_Stock||0)
                return (
                  <tr key={item.Item_ID}>
                    <td>
                      {item.Photo_Path
                        ? <img src={PHOTO_BASE + item.Photo_Path} alt={item.Item_Name}
                            className="rounded-2 border" style={{width:42,height:42,objectFit:'cover'}}/>
                        : <div className="rounded-2 d-flex align-items-center justify-content-center bg-light border"
                            style={{width:42,height:42}}>
                            <i className="bi bi-box-seam text-muted"></i>
                          </div>
                      }
                    </td>
                    <td><code className="small text-primary">{item.Item_Code}</code></td>
                    <td>
                      <div className="fw-semibold" style={{maxWidth:220}}>{item.Item_Name}</div>
                      {item.Brand_Name && <small className="text-muted">{item.Brand_Name}</small>}
                    </td>
                    <td>
                      <div className="small">{item.Group_Name || '—'}</div>
                      {item.Category_Name && <small className="text-muted">{item.Category_Name}</small>}
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <span className={`badge ${item.Item_Type==='Printed'?'bg-success':'bg-secondary'}`}>
                          {item.Item_Type || '—'}
                        </span>
                        {item.Is_Hardware==1 && (
                          <span className="badge" style={{background:'#1d4ed8',fontSize:'.65rem'}}>
                            <i className="bi bi-cpu me-1"/>HW
                          </span>
                        )}
                      </div>
                    </td>
                    <td><small>{item.Paper_Type || '—'}</small></td>
                    <td>
                      <small>
                        {item.Size_Width && item.Size_Length
                          ? `${parseFloat(item.Size_Width)}×${parseFloat(item.Size_Length)}`
                          : '—'}
                      </small>
                    </td>
                    <td><small>{item.Labels_Per_Roll > 0 ? parseInt(item.Labels_Per_Roll).toLocaleString() : '—'}</small></td>
                    <td><small>₹{parseFloat(item.Sale_Rate||0).toFixed(2)}</small></td>
                    <td>
                      <span className={`badge ${lowStock ? 'bg-warning text-dark' : 'bg-success bg-opacity-10 text-success border border-success-subtle'}`}>
                        {item.Current_Stock || 0} {item.Unit}
                        {lowStock && <i className="bi bi-exclamation-triangle ms-1"></i>}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary" title="Edit" onClick={() => openEdit(item)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-outline-danger" title="Deactivate" onClick={() => handleDelete(item.Item_ID)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-box-seam me-2 text-primary"></i>
                  {editing ? 'Edit Item' : 'Add Item'}
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body pt-3">
                  <div className="row g-4">
                    {/* LEFT: Photo + Item Code */}
                    <div className="col-md-3">
                      <div className="text-center p-3 bg-light rounded-3 border h-100 d-flex flex-column align-items-center justify-content-start gap-2">
                        {form.Photo_Path
                          ? <img src={PHOTO_BASE + form.Photo_Path} alt="Item"
                              className="rounded-3 border shadow-sm" style={{width:100,height:100,objectFit:'cover'}}/>
                          : <div className="rounded-3 d-flex align-items-center justify-content-center bg-white border"
                              style={{width:100,height:100}}>
                              <i className="bi bi-box-seam fs-1 text-muted"></i>
                            </div>
                        }
                        <input ref={photoRef} type="file" accept="image/*" className="d-none" onChange={handlePhotoUpload}/>
                        <button type="button" className="btn btn-outline-primary btn-sm w-100"
                          onClick={() => photoRef.current.click()} disabled={photoUploading}>
                          <i className="bi bi-camera me-1"></i>
                          {photoUploading ? 'Uploading…' : 'Upload Photo'}
                        </button>
                        <small className="text-muted">JPG/PNG · Max 2MB</small>
                        <hr className="w-100 my-1"/>

                        {/* Item Code */}
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Item Code</label>
                          <input className="form-control form-control-sm font-monospace"
                            value={form.Item_Code||''} placeholder="Auto if blank"
                            onChange={e => setF('Item_Code', e.target.value)}/>
                        </div>

                        {/* Type + Unit */}
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Item Type</label>
                          <select className="form-select form-select-sm" value={form.Item_Type||'Plain'} onChange={e=>setF('Item_Type',e.target.value)}>
                            {ITEM_TYPES.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Unit</label>
                          <input className="form-control form-control-sm" value={form.Unit||'Roll'} onChange={e=>setF('Unit',e.target.value)}/>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Tabs */}
                    <div className="col-md-9">
                      <ul className="nav nav-tabs mb-3">
                        {[
                          { key:'general',   label:'General',     icon:'bi-info-circle' },
                          { key:'specs',     label:'Specs',       icon:'bi-rulers' },
                          { key:'pricing',   label:'Pricing',     icon:'bi-currency-rupee' },
                          { key:'hierarchy', label:'Hierarchy',   icon:'bi-diagram-3' },
                          { key:'hardware',  label:'Hardware',    icon:'bi-cpu', highlight: form.Is_Hardware==1 },
                        ].map(t => (
                          <li key={t.key} className="nav-item">
                            <button type="button"
                              className={`nav-link ${activeTab===t.key?'active':''} ${t.highlight?'text-warning fw-bold':''}`}
                              onClick={() => setActiveTab(t.key)}>
                              <i className={`bi ${t.icon} me-1`}></i>{t.label}
                              {t.highlight && <span className="ms-1 badge bg-warning text-dark" style={{fontSize:'.65rem'}}>ON</span>}
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="tab-content">
                        {/* ── General Tab ── */}
                        {activeTab === 'general' && (
                          <div className="row g-3">
                            <div className="col-12">
                              <label className="form-label fw-semibold small">Item Name *</label>
                              <input className="form-control" required value={form.Item_Name||''}
                                placeholder="e.g. Thermal Label 100×150mm Blank"
                                onChange={e=>setF('Item_Name',e.target.value)}/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Brand
                                <button type="button" className="btn btn-link btn-sm py-0 ms-1 text-primary" onClick={() => openQuickAdd('brand')}>
                                  <i className="bi bi-plus-circle"></i>
                                </button>
                              </label>
                              <select className="form-select" value={form.Brand_ID||''} onChange={e=>setF('Brand_ID',e.target.value)}>
                                <option value="">Select brand…</option>
                                {hierarchy.brands?.map(b=><option key={b.Brand_ID} value={b.Brand_ID}>{b.Brand_Name}</option>)}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Manufacturer</label>
                              <input className="form-control" value={form.Manufacturer||''}
                                placeholder="Manufacturer name" onChange={e=>setF('Manufacturer',e.target.value)}/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">HSN Code</label>
                              <input className="form-control font-monospace" value={form.HSN_Code||''}
                                placeholder="e.g. 48219090" onChange={e=>setF('HSN_Code',e.target.value)}/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Barcode Value</label>
                              <input className="form-control font-monospace" value={form.Barcode_Value||''}
                                placeholder="Barcode / SKU" onChange={e=>setF('Barcode_Value',e.target.value)}/>
                            </div>
                            <div className="col-12">
                              <label className="form-label fw-semibold small">Notes</label>
                              <textarea className="form-control" rows={2} value={form.Notes||''}
                                placeholder="Optional notes" onChange={e=>setF('Notes',e.target.value)}/>
                            </div>
                          </div>
                        )}

                        {/* ── Specs Tab ── */}
                        {activeTab === 'specs' && (
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Paper Type</label>
                              <select className="form-select" value={form.Paper_Type||''} onChange={e=>setF('Paper_Type',e.target.value)}>
                                <option value="">Select paper type…</option>
                                {PAPER_TYPES.map(p=><option key={p}>{p}</option>)}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Core Type</label>
                              <select className="form-select" value={form.Core_Type||''} onChange={e=>setF('Core_Type',e.target.value)}>
                                <option value="">Select core type…</option>
                                {CORE_TYPES.map(c=><option key={c}>{c}</option>)}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Size Width (mm)</label>
                              <input type="number" className="form-control" min="0" step="0.01"
                                value={form.Size_Width||''} placeholder="e.g. 100"
                                onChange={e=>setF('Size_Width',e.target.value)}/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Size Length (mm)</label>
                              <input type="number" className="form-control" min="0" step="0.01"
                                value={form.Size_Length||''} placeholder="e.g. 150"
                                onChange={e=>setF('Size_Length',e.target.value)}/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Labels Per Roll</label>
                              <input type="number" className="form-control" min="0"
                                value={form.Labels_Per_Roll||''} placeholder="e.g. 500"
                                onChange={e=>setF('Labels_Per_Roll',e.target.value)}/>
                            </div>
                            <div className="col-md-6">
                              {/* Item display preview */}
                              <label className="form-label fw-semibold small">Display Preview</label>
                              <div className="p-3 bg-light rounded-3 border small font-monospace" style={{lineHeight:1.7}}>
                                <div><strong>{form.Item_Name || 'Item Name'}</strong></div>
                                {form.Size_Width && form.Size_Length && (
                                  <div className="text-muted">Size: {form.Size_Width}×{form.Size_Length} mm</div>
                                )}
                                {form.Paper_Type && <div className="text-muted">Paper: {form.Paper_Type}</div>}
                                {form.Core_Type  && <div className="text-muted">Core: {form.Core_Type}</div>}
                                {form.Labels_Per_Roll > 0 && <div className="text-muted">Qty/Roll: {parseInt(form.Labels_Per_Roll).toLocaleString()}</div>}
                                {form.Barcode_Value && <div className="text-primary">|||| {form.Barcode_Value}</div>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Pricing Tab ── */}
                        {activeTab === 'pricing' && (
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Purchase Rate (₹)</label>
                              <div className="input-group">
                                <span className="input-group-text">₹</span>
                                <input type="number" className="form-control" min="0" step="0.01"
                                  value={form.Purchase_Rate||''} placeholder="0.00"
                                  onChange={e=>setF('Purchase_Rate',e.target.value)}/>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Sale Rate (₹)</label>
                              <div className="input-group">
                                <span className="input-group-text">₹</span>
                                <input type="number" className="form-control" min="0" step="0.01"
                                  value={form.Sale_Rate||''} placeholder="0.00"
                                  onChange={e=>setF('Sale_Rate',e.target.value)}/>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">GST Rate (%)</label>
                              <select className="form-select" value={form.GST_Rate||18} onChange={e=>setF('GST_Rate',e.target.value)}>
                                {GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Minimum Stock</label>
                              <input type="number" className="form-control" min="0"
                                value={form.Min_Stock||0} onChange={e=>setF('Min_Stock',e.target.value)}/>
                            </div>
                            {/* Rate card preview */}
                            {(form.Sale_Rate > 0) && (
                              <div className="col-12">
                                <div className="p-3 bg-light rounded-3 border">
                                  <div className="fw-semibold small mb-2"><i className="bi bi-receipt me-1"></i>Rate Card Preview</div>
                                  <div className="row g-2 small">
                                    <div className="col-6">Base Rate: <strong>₹{parseFloat(form.Sale_Rate||0).toFixed(2)}</strong></div>
                                    <div className="col-6">GST ({form.GST_Rate}%): <strong>₹{(parseFloat(form.Sale_Rate||0) * parseFloat(form.GST_Rate||0) / 100).toFixed(2)}</strong></div>
                                    <div className="col-12 text-primary fw-bold">Total: ₹{(parseFloat(form.Sale_Rate||0) * (1 + parseFloat(form.GST_Rate||0)/100)).toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Hardware Tab ── */}
                        {activeTab === 'hardware' && (
                          <div>
                            {/* Toggle */}
                            <div className={`hardware-toggle mb-3 ${form.Is_Hardware==1?'active':''}`}>
                              <div className="form-check form-switch mb-0" style={{transform:'scale(1.3)',transformOrigin:'left'}}>
                                <input className="form-check-input" type="checkbox" id="hwToggle"
                                  checked={form.Is_Hardware==1}
                                  onChange={e => setF('Is_Hardware', e.target.checked ? 1 : 0)}/>
                              </div>
                              <div>
                                <label htmlFor="hwToggle" className="fw-bold mb-0" style={{cursor:'pointer'}}>
                                  <i className="bi bi-cpu me-1 text-warning"/>Is Hardware Item?
                                </label>
                                <div className="text-muted small">Enable for Printers, Computers, Scanners — unlocks serial tracking &amp; warranty</div>
                              </div>
                            </div>

                            {form.Is_Hardware == 1 && (
                              <div className="row g-3">
                                {/* Serial */}
                                <div className="col-12">
                                  <div className="form-section">
                                    <div className="form-section-title">
                                      <i className="bi bi-qr-code-scan"/>Serial Number Tracking
                                    </div>
                                    <div className="row g-3">
                                      <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-3 p-3 border rounded-3 bg-white">
                                          <div className="form-check form-switch mb-0">
                                            <input className="form-check-input" type="checkbox" id="serialToggle"
                                              checked={form.Serial_Required==1}
                                              onChange={e => setF('Serial_Required', e.target.checked ? 1 : 0)}/>
                                          </div>
                                          <div>
                                            <label htmlFor="serialToggle" className="fw-semibold small mb-0" style={{cursor:'pointer'}}>
                                              Serial Number Required
                                            </label>
                                            <div className="text-muted" style={{fontSize:'.72rem'}}>Track each unit individually</div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-3 p-3 border rounded-3 bg-white">
                                          <div className="form-check form-switch mb-0">
                                            <input className="form-check-input" type="checkbox" id="svcToggle"
                                              checked={form.Service_Applicable==1}
                                              onChange={e => setF('Service_Applicable', e.target.checked ? 1 : 0)}/>
                                          </div>
                                          <div>
                                            <label htmlFor="svcToggle" className="fw-semibold small mb-0" style={{cursor:'pointer'}}>
                                              Service Applicable
                                            </label>
                                            <div className="text-muted" style={{fontSize:'.72rem'}}>Enable service records for this item</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Warranty / AMC */}
                                <div className="col-12">
                                  <div className="form-section">
                                    <div className="form-section-title">
                                      <i className="bi bi-shield-check"/>Warranty &amp; AMC
                                    </div>
                                    <div className="row g-3">
                                      <div className="col-md-4">
                                        <label className="erp-label">Warranty (Months)</label>
                                        <input type="number" className="form-control erp-input" min="0" max="120"
                                          value={form.Warranty_Months||0}
                                          onChange={e=>setF('Warranty_Months', e.target.value)}
                                          placeholder="e.g. 12"/>
                                        <div className="text-muted mt-1" style={{fontSize:'.72rem'}}>Auto-activates on sale date</div>
                                      </div>
                                      <div className="col-md-4">
                                        <label className="erp-label">Free AMC Period</label>
                                        <select className="form-select erp-input" value={form.AMC_Years||0} onChange={e=>setF('AMC_Years', e.target.value)}>
                                          <option value="0">No AMC</option>
                                          <option value="1">1 Year</option>
                                          <option value="2">2 Years</option>
                                          <option value="3">3 Years</option>
                                        </select>
                                      </div>
                                      <div className="col-md-4">
                                        <label className="erp-label">Model Number</label>
                                        <input className="form-control erp-input" value={form.Model_No||''} onChange={e=>setF('Model_No',e.target.value)} placeholder="GX430T"/>
                                      </div>
                                      <div className="col-md-4">
                                        <label className="erp-label">Part Number</label>
                                        <input className="form-control erp-input" value={form.Part_No||''} onChange={e=>setF('Part_No',e.target.value)} placeholder="ZEB-GX430T"/>
                                      </div>
                                      <div className="col-md-4">
                                        <label className="erp-label">EAN / Barcode</label>
                                        <input className="form-control erp-input font-monospace" value={form.EAN_Code||''} onChange={e=>setF('EAN_Code',e.target.value)} placeholder="1234567890123"/>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Summary badge */}
                                <div className="col-12">
                                  <div className="d-flex flex-wrap gap-2">
                                    {form.Serial_Required==1  && <span className="erp-badge erp-badge-blue"><i className="bi bi-qr-code-scan me-1"/>Serial Tracked</span>}
                                    {form.Warranty_Months > 0 && <span className="erp-badge erp-badge-green"><i className="bi bi-shield-check me-1"/>{form.Warranty_Months}m Warranty</span>}
                                    {form.AMC_Years > 0       && <span className="erp-badge erp-badge-purple"><i className="bi bi-calendar-check me-1"/>{form.AMC_Years}yr AMC</span>}
                                    {form.Service_Applicable==1&& <span className="erp-badge erp-badge-orange"><i className="bi bi-wrench me-1"/>Service</span>}
                                  </div>
                                </div>
                              </div>
                            )}

                            {form.Is_Hardware != 1 && (
                              <div className="text-center py-4 text-muted">
                                <i className="bi bi-cpu" style={{fontSize:'3rem',opacity:.2}}/>
                                <p className="mt-2">Enable "Is Hardware Item" above to configure serial number &amp; warranty settings.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Hierarchy Tab ── */}
                        {activeTab === 'hierarchy' && (
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Group
                                <button type="button" className="btn btn-link btn-sm py-0 ms-1 text-primary" onClick={() => openQuickAdd('group')}>
                                  <i className="bi bi-plus-circle"></i>
                                </button>
                              </label>
                              <select className="form-select" value={form.Group_ID||''}
                                onChange={e => { setF('Group_ID', e.target.value); setF('Subgroup_ID',''); setF('Category_ID',''); setF('Subcategory_ID','') }}>
                                <option value="">Select group…</option>
                                {hierarchy.groups?.map(g=><option key={g.Group_ID} value={g.Group_ID}>{g.Group_Name}</option>)}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Subgroup
                                <button type="button" className="btn btn-link btn-sm py-0 ms-1 text-primary" onClick={() => openQuickAdd('subgroup')}>
                                  <i className="bi bi-plus-circle"></i>
                                </button>
                              </label>
                              <select className="form-select" value={form.Subgroup_ID||''}
                                onChange={e => { setF('Subgroup_ID', e.target.value); setF('Category_ID',''); setF('Subcategory_ID','') }}>
                                <option value="">Select subgroup…</option>
                                {filtSubgroups.map(s=><option key={s.Subgroup_ID} value={s.Subgroup_ID}>{s.Subgroup_Name}</option>)}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Category
                                <button type="button" className="btn btn-link btn-sm py-0 ms-1 text-primary" onClick={() => openQuickAdd('category')}>
                                  <i className="bi bi-plus-circle"></i>
                                </button>
                              </label>
                              <select className="form-select" value={form.Category_ID||''}
                                onChange={e => { setF('Category_ID', e.target.value); setF('Subcategory_ID','') }}>
                                <option value="">Select category…</option>
                                {filtCategories.map(c=><option key={c.Category_ID} value={c.Category_ID}>{c.Category_Name}</option>)}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Subcategory
                                <button type="button" className="btn btn-link btn-sm py-0 ms-1 text-primary" onClick={() => openQuickAdd('subcategory')}>
                                  <i className="bi bi-plus-circle"></i>
                                </button>
                              </label>
                              <select className="form-select" value={form.Subcategory_ID||''} onChange={e=>setF('Subcategory_ID',e.target.value)}>
                                <option value="">Select subcategory…</option>
                                {filtSubcats.map(sc=><option key={sc.Subcategory_ID} value={sc.Subcategory_ID}>{sc.Subcategory_Name}</option>)}
                              </select>
                            </div>

                            {/* Hierarchy breadcrumb preview */}
                            {(form.Group_ID || form.Category_ID) && (
                              <div className="col-12">
                                <div className="p-3 bg-light rounded-3 border small">
                                  <div className="text-muted mb-1 fw-semibold"><i className="bi bi-diagram-3 me-1"></i>Hierarchy Path</div>
                                  <div className="d-flex align-items-center gap-2 flex-wrap">
                                    {[
                                      { id: form.Group_ID,       list: hierarchy.groups,        key:'Group_ID',       label:'Group_Name' },
                                      { id: form.Subgroup_ID,    list: hierarchy.subgroups,     key:'Subgroup_ID',    label:'Subgroup_Name' },
                                      { id: form.Category_ID,    list: hierarchy.categories,    key:'Category_ID',    label:'Category_Name' },
                                      { id: form.Subcategory_ID, list: hierarchy.subcategories, key:'Subcategory_ID', label:'Subcategory_Name' },
                                    ].filter(x => x.id).map((x, i) => {
                                      const found = x.list?.find(item => String(item[x.key]) === String(x.id))
                                      return found ? (
                                        <React.Fragment key={i}>
                                          {i > 0 && <i className="bi bi-chevron-right text-muted"></i>}
                                          <span className="badge bg-primary bg-opacity-10 text-primary">{found[x.label]}</span>
                                        </React.Fragment>
                                      ) : null
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light px-4" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-2"/>}
                    {editing ? 'Update Item' : 'Add Item'}
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
