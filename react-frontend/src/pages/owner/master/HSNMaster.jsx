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

const defaultForm = { HSN_Code: '', Description: '', GST_Tax_ID: '' }

export default function HSNMaster() {
  const [rows, setRows]           = useState([])
  const [gstList, setGstList]     = useState([])
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
    try {
      setLoading(true)
      const [r1, r2] = await Promise.all([mastersAPI.listHSN({ search }), mastersAPI.listGST()])
      setRows(r1.data.data || [])
      setGstList(r2.data.data || [])
    } catch { toast('Load failed', 'error') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(defaultForm); setShowModal(true) }
  const openEdit   = (r)  => { setEditing(r); setForm({ HSN_Code: r.HSN_Code, Description: r.Description, GST_Tax_ID: r.GST_Tax_ID || '' }); setShowModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await mastersAPI.updateHSN(editing.HSN_ID, form)
      else         await mastersAPI.storeHSN(form)
      toast(editing ? 'HSN updated' : 'HSN created')
      setShowModal(false)
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Delete HSN ${row.HSN_Code}?`)) return
    await mastersAPI.deleteHSN(row.HSN_ID)
    toast('Deleted')
    load()
  }

  return (
    <div className="master-page">
      <Toast toasts={toasts}/>

      <div className="master-page-header">
        <div>
          <div className="page-title"><i className="bi bi-upc me-2"/>HSN Master</div>
          <div className="page-subtitle">HSN codes linked with GST Tax — drives auto tax in sales</div>
        </div>
        <button className="btn-erp-add" onClick={openCreate}>
          <i className="bi bi-plus-lg"/> Add HSN Code
        </button>
      </div>

      <div className="erp-card">
        <div className="erp-card-header">
          <div className="erp-card-title">
            <span className="badge bg-primary me-1">{rows.length}</span> HSN Codes
          </div>
          <div className="erp-search" style={{width: 260}}>
            <i className="bi bi-search search-icon"/>
            <input className="form-control form-control-sm erp-input"
              placeholder="Search HSN code or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4">{[1,2,3,4].map(i=><div key={i} className="erp-skeleton mb-2" style={{height:40}}/>)}</div>
        ) : rows.length === 0 ? (
          <div className="erp-empty">
            <div className="empty-icon"><i className="bi bi-upc"/></div>
            <p>No HSN codes found</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>HSN Code</th>
                  <th>Description</th>
                  <th>GST Tax</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.HSN_ID}>
                    <td className="text-muted" style={{fontSize:'.75rem'}}>{i+1}</td>
                    <td>
                      <span className="fw-bold text-primary font-monospace">{r.HSN_Code}</span>
                    </td>
                    <td style={{maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.Description}</td>
                    <td>
                      {r.Tax_Name
                        ? <span className="erp-badge erp-badge-blue">{r.Tax_Name}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>{r.CGST_Pct != null ? `${r.CGST_Pct}%` : '—'}</td>
                    <td>{r.SGST_Pct != null ? `${r.SGST_Pct}%` : '—'}</td>
                    <td>{r.IGST_Pct != null ? `${r.IGST_Pct}%` : '—'}</td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <button className="btn-erp-edit" onClick={() => openEdit(r)}>
                          <i className="bi bi-pencil"/> Edit
                        </button>
                        <button className="btn-erp-delete" onClick={() => handleDelete(r)}>
                          <i className="bi bi-trash"/> Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="erp-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="erp-modal" style={{maxWidth: 520}}>
            <div className="erp-modal-header">
              <div className="erp-modal-title"><i className="bi bi-upc"/>{editing ? 'Edit HSN Code' : 'Add HSN Code'}</div>
              <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}/>
            </div>
            <form onSubmit={handleSave}>
              <div className="erp-modal-body">
                <div className="row g-3">
                  <div className="col-md-5">
                    <label className="erp-label">HSN Code *</label>
                    <input className="form-control erp-input" required style={{textTransform:'uppercase', fontFamily:'monospace', fontWeight:700}}
                      value={form.HSN_Code}
                      onChange={e => setForm(p => ({ ...p, HSN_Code: e.target.value }))}
                      placeholder="48119200"/>
                  </div>
                  <div className="col-md-7">
                    <label className="erp-label">GST Tax Rate *</label>
                    <select className="form-select erp-input" required
                      value={form.GST_Tax_ID}
                      onChange={e => setForm(p => ({ ...p, GST_Tax_ID: e.target.value }))}>
                      <option value="">Select GST rate…</option>
                      {gstList.map(g => (
                        <option key={g.GST_Tax_ID} value={g.GST_Tax_ID}>
                          {g.Tax_Name} (IGST {g.IGST_Pct}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="erp-label">Description *</label>
                    <textarea className="form-control erp-input" rows={3} required
                      value={form.Description}
                      onChange={e => setForm(p => ({ ...p, Description: e.target.value }))}
                      placeholder="Self-adhesive paper / barcode labels"/>
                  </div>

                  {form.GST_Tax_ID && (() => {
                    const g = gstList.find(x => String(x.GST_Tax_ID) === String(form.GST_Tax_ID))
                    return g ? (
                      <div className="col-12">
                        <div className="d-flex gap-2 p-3 rounded" style={{background:'#f0f9ff', border:'1px solid #bae6fd'}}>
                          <div className="text-center flex-fill">
                            <div style={{fontSize:'.7rem', color:'#0891b2', fontWeight:700}}>CGST</div>
                            <div style={{fontSize:'1.1rem', fontWeight:800, color:'#0e7490'}}>{g.CGST_Pct}%</div>
                          </div>
                          <div className="text-center flex-fill">
                            <div style={{fontSize:'.7rem', color:'#0891b2', fontWeight:700}}>SGST</div>
                            <div style={{fontSize:'1.1rem', fontWeight:800, color:'#0e7490'}}>{g.SGST_Pct}%</div>
                          </div>
                          <div className="text-center flex-fill">
                            <div style={{fontSize:'.7rem', color:'#0891b2', fontWeight:700}}>IGST</div>
                            <div style={{fontSize:'1.1rem', fontWeight:800, color:'#0e7490'}}>{g.IGST_Pct}%</div>
                          </div>
                          <div className="text-center flex-fill border-start ps-2">
                            <div style={{fontSize:'.7rem', color:'#16a34a', fontWeight:700}}>TOTAL</div>
                            <div style={{fontSize:'1.25rem', fontWeight:900, color:'#15803d'}}>{g.Total_Pct}%</div>
                          </div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
              <div className="erp-modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-erp-save" disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1"/>Saving…</> : <><i className="bi bi-check-lg"/>{editing ? 'Update' : 'Save'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
