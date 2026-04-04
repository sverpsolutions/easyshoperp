/**
 * MasterCRUD — Reusable Master Page with ERP styling
 * Used by: Group, Subgroup, Category, Subcategory, UOM, Brand pages
 */
import React, { useState, useEffect, useCallback } from 'react'
import '../.././../styles/erp-theme.css'

function Toast({ toasts }) {
  return (
    <div className="erp-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`erp-toast ${t.type}`}>
          <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}`}/>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

export default function MasterCRUD({
  title,
  subtitle,
  icon,
  iconBg = 'bg-primary',
  columns,         // [{key, label, render?}]
  formFields,      // [{name, label, type, options?, placeholder?, required?}]
  fetchFn,
  createFn,
  updateFn,
  deleteFn,
  pkField,         // primary key field name
  emptyMsg = 'No records found',
}) {
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState({})
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
      const res = await fetchFn()
      setRows(res.data.data || [])
    } catch { toast('Failed to load', 'error') }
    finally { setLoading(false) }
  }, [fetchFn])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    const init = {}
    formFields.forEach(f => { init[f.name] = f.default ?? '' })
    setForm(init)
    setShowModal(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    const init = {}
    formFields.forEach(f => { init[f.name] = row[f.name] ?? '' })
    setForm(init)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateFn(editing[pkField], form)
        toast('Updated successfully')
      } else {
        await createFn(form)
        toast('Created successfully')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Delete "${row[columns[0].key]}"?`)) return
    try {
      await deleteFn(row[pkField])
      toast('Deleted')
      load()
    } catch { toast('Delete failed', 'error') }
  }

  const filtered = rows.filter(r =>
    !search || columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="master-page">
      <Toast toasts={toasts} />

      {/* Header */}
      <div className="master-page-header">
        <div>
          <div className="page-title">
            <i className={`bi ${icon} me-2`}/>{title}
          </div>
          <div className="page-subtitle">{subtitle}</div>
        </div>
        <button className="btn-erp-add" onClick={openCreate}>
          <i className="bi bi-plus-lg"/> Add New
        </button>
      </div>

      {/* Card */}
      <div className="erp-card">
        <div className="erp-card-header">
          <div className="erp-card-title">
            <span className={`badge ${iconBg} me-1`}>{filtered.length}</span>
            Records
          </div>
          <div className="erp-search" style={{width: 220}}>
            <i className="bi bi-search search-icon"/>
            <input
              className="form-control form-control-sm erp-input"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            {[1,2,3].map(i => (
              <div key={i} className="erp-skeleton mb-2" style={{height: 40}}/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="erp-empty">
            <div className="empty-icon"><i className={`bi ${icon}`}/></div>
            <p>{search ? 'No results for your search.' : emptyMsg}</p>
            {!search && <button className="btn-erp-add" onClick={openCreate}><i className="bi bi-plus-lg"/> Add First Record</button>}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th style={{width: 50}}>#</th>
                  {columns.map(c => <th key={c.key}>{c.label}</th>)}
                  <th style={{width: 120}} className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row[pkField]}>
                    <td className="text-muted" style={{fontSize: '.75rem'}}>{i + 1}</td>
                    {columns.map(c => (
                      <td key={c.key}>
                        {c.render ? c.render(row[c.key], row) : (row[c.key] ?? <span className="text-muted">—</span>)}
                      </td>
                    ))}
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <button className="btn-erp-edit" onClick={() => openEdit(row)}>
                          <i className="bi bi-pencil"/> Edit
                        </button>
                        <button className="btn-erp-delete" onClick={() => handleDelete(row)}>
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
              <div className="erp-modal-title">
                <i className={`bi ${icon}`}/>
                {editing ? `Edit ${title}` : `Add ${title}`}
              </div>
              <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}/>
            </div>
            <form onSubmit={handleSave}>
              <div className="erp-modal-body">
                <div className="row g-3">
                  {formFields.map(f => (
                    <div key={f.name} className={`col-${f.col || 12}`}>
                      <label className="erp-label">{f.label}{f.required && ' *'}</label>
                      {f.type === 'select' ? (
                        <select
                          className="form-select erp-input"
                          required={f.required}
                          value={form[f.name] ?? ''}
                          onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))}
                        >
                          <option value="">Select {f.label}…</option>
                          {(f.options || []).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          className="form-control erp-input"
                          rows={3}
                          placeholder={f.placeholder}
                          value={form[f.name] ?? ''}
                          onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))}
                        />
                      ) : (
                        <input
                          className="form-control erp-input"
                          type={f.type || 'text'}
                          required={f.required}
                          placeholder={f.placeholder}
                          value={form[f.name] ?? ''}
                          onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="erp-modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-erp-save" disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-1"/> Saving…</>
                    : <><i className="bi bi-check-lg"/> {editing ? 'Update' : 'Save'}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
