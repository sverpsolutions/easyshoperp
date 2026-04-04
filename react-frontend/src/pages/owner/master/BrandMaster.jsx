import React, { useState, useEffect, useCallback } from 'react'
import { mastersAPI } from '../../../api/api'
import '../../../styles/erp-theme.css'

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

const defaultForm = { Brand_Name: '', Manufacturer_ID: '' }

export default function BrandMaster() {
  const [rows, setRows]           = useState([])
  const [mfrList, setMfrList]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(defaultForm)
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')
  const [toasts, setToasts]       = useState([])

  const toast = (msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [r1, r2] = await Promise.all([mastersAPI.listBrands(), mastersAPI.listManufacturers()])
    setRows(r1.data.data || [])
    setMfrList(r2.data.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r => !search || r.Brand_Name?.toLowerCase().includes(search.toLowerCase()) || r.Manufacturer_Name?.toLowerCase().includes(search.toLowerCase()))

  const openCreate = () => { setEditing(null); setForm(defaultForm); setShowModal(true) }
  const openEdit   = (r)  => { setEditing(r); setForm({ Brand_Name: r.Brand_Name, Manufacturer_ID: r.Manufacturer_ID || '' }); setShowModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await mastersAPI.updateBrand(editing.Brand_ID, form)
      else         await mastersAPI.storeBrand(form)
      toast(editing ? 'Brand updated' : 'Brand created')
      setShowModal(false)
      load()
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (r) => {
    if (!confirm(`Delete brand "${r.Brand_Name}"?`)) return
    await mastersAPI.deleteBrand(r.Brand_ID)
    toast('Deleted')
    load()
  }

  return (
    <div className="master-page">
      <Toast toasts={toasts}/>
      <div className="master-page-header">
        <div>
          <div className="page-title"><i className="bi bi-award me-2"/>Brand Master</div>
          <div className="page-subtitle">Product brands linked to manufacturers — Zebra, HP, Brother…</div>
        </div>
        <button className="btn-erp-add" onClick={openCreate}><i className="bi bi-plus-lg"/> Add Brand</button>
      </div>
      <div className="erp-card">
        <div className="erp-card-header">
          <div className="erp-card-title"><span className="badge bg-primary me-1">{filtered.length}</span> Brands</div>
          <div className="erp-search" style={{width:220}}>
            <i className="bi bi-search search-icon"/>
            <input className="form-control form-control-sm erp-input" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        {loading ? (
          <div className="p-4">{[1,2,3].map(i=><div key={i} className="erp-skeleton mb-2" style={{height:40}}/>)}</div>
        ) : (
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr><th>#</th><th>Brand Name</th><th>Manufacturer</th><th className="text-end">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.Brand_ID}>
                    <td className="text-muted" style={{fontSize:'.75rem'}}>{i+1}</td>
                    <td><span className="fw-semibold">{r.Brand_Name}</span></td>
                    <td>{r.Manufacturer_Name ? <span className="erp-badge erp-badge-gray">{r.Manufacturer_Name}</span> : <span className="text-muted">—</span>}</td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <button className="btn-erp-edit" onClick={() => openEdit(r)}><i className="bi bi-pencil"/> Edit</button>
                        <button className="btn-erp-delete" onClick={() => handleDelete(r)}><i className="bi bi-trash"/> Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="erp-modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="erp-modal" style={{maxWidth:440}}>
            <div className="erp-modal-header">
              <div className="erp-modal-title"><i className="bi bi-award"/>{editing ? 'Edit Brand' : 'Add Brand'}</div>
              <button className="btn-close btn-close-white" onClick={()=>setShowModal(false)}/>
            </div>
            <form onSubmit={handleSave}>
              <div className="erp-modal-body">
                <div className="mb-3">
                  <label className="erp-label">Brand Name *</label>
                  <input className="form-control erp-input" required value={form.Brand_Name} onChange={e=>setForm(p=>({...p,Brand_Name:e.target.value}))} placeholder="Zebra"/>
                </div>
                <div>
                  <label className="erp-label">Manufacturer</label>
                  <select className="form-select erp-input" value={form.Manufacturer_ID} onChange={e=>setForm(p=>({...p,Manufacturer_ID:e.target.value}))}>
                    <option value="">No specific manufacturer</option>
                    {mfrList.map(m=><option key={m.Manufacturer_ID} value={m.Manufacturer_ID}>{m.Manufacturer_Name}</option>)}
                  </select>
                </div>
              </div>
              <div className="erp-modal-footer">
                <button type="button" className="btn btn-light" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-erp-save" disabled={saving}>
                  {saving?<><span className="spinner-border spinner-border-sm me-1"/>Saving…</>:<><i className="bi bi-check-lg"/>{editing?'Update':'Save'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
