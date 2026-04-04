import React, { useState, useEffect, useCallback } from 'react'
import { conversionAPI, itemsAPI, machinesAPI, employeesAPI } from '../../api/api'

const STATUS_COLOR = { Draft:'secondary', Completed:'success', Cancelled:'danger' }

const defaultForm = {
  Conversion_Number:'', Conversion_Date: new Date().toISOString().slice(0,10),
  Input_Item_ID:'', Input_Item_Name:'', Input_Qty:'', Input_Unit:'Roll',
  Output_Item_ID:'', Output_Item_Name:'', Output_Qty:'', Output_Unit:'Roll',
  Wastage_Qty:0, Wastage_Pct:0, Machine_ID:'', Operator_ID:'', Notes:'', Status:'Draft',
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

export default function ConversionPage() {
  const [records, setRecords]   = useState([])
  const [items, setItems]       = useState([])
  const [machines, setMachines] = useState([])
  const [operators, setOperators] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(defaultForm)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)
  const [filters, setFilters]   = useState({ status:'', from:'', to:'' })

  const showToast = (msg, type='success') => setToast({ msg, type })

  const load = useCallback(() => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
    conversionAPI.list(params).then(r => setRecords(r.data.data || [])).finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    itemsAPI.list({ is_active: 1 }).then(r => setItems(r.data.data || []))
    machinesAPI.list().then(r => setMachines(r.data.data || []))
    employeesAPI.operators().then(r => setOperators(r.data.data || []))
  }, [])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const calcWastage = (inQty, outQty) => {
    const i = parseFloat(inQty || 0)
    const o = parseFloat(outQty || 0)
    const w = Math.max(0, i - o)
    const pct = i > 0 ? ((w / i) * 100).toFixed(2) : 0
    return { wastage: w.toFixed(3), pct }
  }

  const handleInputChange = (k, v) => {
    setForm(p => {
      const updated = { ...p, [k]: v }
      if (k === 'Input_Item_ID') {
        const found = items.find(x => String(x.Item_ID) === String(v))
        if (found) {
          updated.Input_Item_Name = found.Item_Name
          updated.Input_Unit      = found.Unit || 'Roll'
        }
      }
      if (k === 'Output_Item_ID') {
        const found = items.find(x => String(x.Item_ID) === String(v))
        if (found) {
          updated.Output_Item_Name = found.Item_Name
          updated.Output_Unit      = found.Unit || 'Roll'
        }
      }
      if (k === 'Input_Qty' || k === 'Output_Qty') {
        const inQ  = k === 'Input_Qty'  ? parseFloat(v||0) : parseFloat(updated.Input_Qty||0)
        const outQ = k === 'Output_Qty' ? parseFloat(v||0) : parseFloat(updated.Output_Qty||0)
        const { wastage, pct } = calcWastage(inQ, outQ)
        updated.Wastage_Qty = wastage
        updated.Wastage_Pct = pct
      }
      return updated
    })
  }

  const openNew = async () => {
    const r = await conversionAPI.nextNumber()
    setForm({ ...defaultForm, Conversion_Number: r.data.data.conversion_number })
    setEditing(null); setShowModal(true)
  }

  const openEdit = async id => {
    const r = await conversionAPI.get(id)
    setForm({ ...defaultForm, ...r.data.data })
    setEditing(id); setShowModal(true)
  }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await conversionAPI.update(editing, form); showToast('Conversion updated') }
      else         { await conversionAPI.store(form); showToast('Conversion saved') }
      setShowModal(false); load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving', 'danger')
    } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this conversion? Stock changes will be reversed.')) return
    try { await conversionAPI.delete(id); load(); showToast('Conversion deleted') }
    catch (err) { showToast(err.response?.data?.message || 'Error', 'danger') }
  }

  // Input item stock
  const inputItemDetails = items.find(x => String(x.Item_ID) === String(form.Input_Item_ID))
  const outputItemDetails = items.find(x => String(x.Item_ID) === String(form.Output_Item_ID))

  const stats = {
    total:     records.length,
    completed: records.filter(r => r.Status === 'Completed').length,
    draft:     records.filter(r => r.Status === 'Draft').length,
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-scissors me-2 text-primary"></i>Conversion / Slitting</h4>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <i className="bi bi-plus-lg me-1"></i>New Conversion
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total',     value: stats.total,     icon:'bi-scissors',      color:'primary' },
          { label:'Completed', value: stats.completed, icon:'bi-check-circle',  color:'success' },
          { label:'Draft',     value: stats.draft,     icon:'bi-pencil-square', color:'secondary' },
        ].map(c => (
          <div key={c.label} className="col-4 col-md-3">
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
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filters.status}
                onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
                <option value="">All Status</option>
                {['Draft','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control form-control-sm" value={filters.from}
                onChange={e => setFilters(p => ({ ...p, from: e.target.value }))}/>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control form-control-sm" value={filters.to}
                onChange={e => setFilters(p => ({ ...p, to: e.target.value }))}/>
            </div>
            <div className="col-auto">
              <button className="btn btn-outline-primary btn-sm" onClick={load}>
                <i className="bi bi-search me-1"></i>Filter
              </button>
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
                <th>Conversion #</th><th>Date</th>
                <th>Input Item</th><th>Input Qty</th>
                <th>Output Item</th><th>Output Qty</th>
                <th>Wastage</th><th>Machine</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"/>
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-5 text-muted">
                  <i className="bi bi-scissors me-2"></i>No conversion records
                </td></tr>
              ) : records.map(rec => (
                <tr key={rec.Conversion_ID}>
                  <td><span className="fw-semibold text-primary">{rec.Conversion_Number}</span></td>
                  <td><small>{rec.Conversion_Date}</small></td>
                  <td>
                    <div className="small fw-semibold">{rec.Input_Item_Name || rec.Input_Item_Name_DB}</div>
                  </td>
                  <td><span className="badge bg-info text-dark">{parseFloat(rec.Input_Qty||0)} {rec.Input_Unit}</span></td>
                  <td>
                    <div className="small fw-semibold">{rec.Output_Item_Name || rec.Output_Item_Name_DB || '—'}</div>
                  </td>
                  <td><span className="badge bg-success bg-opacity-10 text-success border border-success-subtle">
                    {parseFloat(rec.Output_Qty||0)} {rec.Output_Unit}
                  </span></td>
                  <td>
                    <span className={`badge ${parseFloat(rec.Wastage_Pct||0) > 10 ? 'bg-danger' : 'bg-warning text-dark'}`}>
                      {parseFloat(rec.Wastage_Qty||0)} ({parseFloat(rec.Wastage_Pct||0)}%)
                    </span>
                  </td>
                  <td><small className="text-muted">{rec.Machine_Name || '—'}</small></td>
                  <td><span className={`badge bg-${STATUS_COLOR[rec.Status]||'secondary'}`}>{rec.Status}</span></td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-primary" onClick={() => openEdit(rec.Conversion_ID)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-outline-danger" onClick={() => handleDelete(rec.Conversion_ID)}>
                        <i className="bi bi-trash"></i>
                      </button>
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
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-scissors me-2 text-primary"></i>
                  {editing ? 'Edit Conversion' : 'New Conversion'} — <span className="text-primary">{form.Conversion_Number}</span>
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body pt-3">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Conversion Date *</label>
                      <input type="date" className="form-control" required
                        value={form.Conversion_Date} onChange={e => setF('Conversion_Date', e.target.value)}/>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Machine</label>
                      <select className="form-select" value={form.Machine_ID||''} onChange={e => setF('Machine_ID', e.target.value)}>
                        <option value="">Select machine…</option>
                        {machines.map(m => <option key={m.Machine_ID} value={m.Machine_ID}>{m.Machine_Name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Operator</label>
                      <select className="form-select" value={form.Operator_ID||''} onChange={e => setF('Operator_ID', e.target.value)}>
                        <option value="">Select operator…</option>
                        {operators.map(op => <option key={op.Employee_ID} value={op.Employee_ID}>{op.Name}</option>)}
                      </select>
                    </div>
                  </div>

                  <hr className="my-3"/>

                  {/* Input Section */}
                  <div className="row g-3 mb-3">
                    <div className="col-12">
                      <h6 className="fw-bold text-info"><i className="bi bi-arrow-right-circle me-1"></i>Input (Raw Material)</h6>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Input Item *</label>
                      <select className="form-select" required value={form.Input_Item_ID||''}
                        onChange={e => handleInputChange('Input_Item_ID', e.target.value)}>
                        <option value="">Select input item…</option>
                        {items.map(i => <option key={i.Item_ID} value={i.Item_ID}>{i.Item_Name}</option>)}
                      </select>
                      {inputItemDetails && (
                        <small className="text-muted mt-1 d-block">
                          <i className="bi bi-box-seam me-1"></i>
                          Current Stock: <strong>{inputItemDetails.Current_Stock || 0} {inputItemDetails.Unit}</strong>
                        </small>
                      )}
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Input Qty *</label>
                      <div className="input-group">
                        <input type="number" className="form-control" required min="0" step="0.001"
                          value={form.Input_Qty||''} placeholder="0"
                          onChange={e => handleInputChange('Input_Qty', e.target.value)}/>
                        <span className="input-group-text">{form.Input_Unit}</span>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Input Unit</label>
                      <input className="form-control" value={form.Input_Unit||'Roll'}
                        onChange={e => setF('Input_Unit', e.target.value)}/>
                    </div>
                  </div>

                  {/* Output Section */}
                  <div className="row g-3 mb-3">
                    <div className="col-12">
                      <h6 className="fw-bold text-success"><i className="bi bi-arrow-left-circle me-1"></i>Output (Finished)</h6>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Output Item</label>
                      <select className="form-select" value={form.Output_Item_ID||''}
                        onChange={e => handleInputChange('Output_Item_ID', e.target.value)}>
                        <option value="">Same as input / Select…</option>
                        {items.map(i => <option key={i.Item_ID} value={i.Item_ID}>{i.Item_Name}</option>)}
                      </select>
                      {outputItemDetails && (
                        <small className="text-muted mt-1 d-block">
                          Stock: <strong>{outputItemDetails.Current_Stock || 0} {outputItemDetails.Unit}</strong>
                        </small>
                      )}
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Output Qty *</label>
                      <div className="input-group">
                        <input type="number" className="form-control" required min="0" step="0.001"
                          value={form.Output_Qty||''} placeholder="0"
                          onChange={e => handleInputChange('Output_Qty', e.target.value)}/>
                        <span className="input-group-text">{form.Output_Unit}</span>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Output Unit</label>
                      <input className="form-control" value={form.Output_Unit||'Roll'}
                        onChange={e => setF('Output_Unit', e.target.value)}/>
                    </div>
                  </div>

                  {/* Wastage Summary Card */}
                  {form.Input_Qty > 0 && (
                    <div className={`alert ${parseFloat(form.Wastage_Pct||0) > 10 ? 'alert-danger' : 'alert-warning'} rounded-3 py-2`}>
                      <div className="row text-center">
                        <div className="col-4 border-end">
                          <div className="small text-muted">Input</div>
                          <div className="fw-bold">{parseFloat(form.Input_Qty||0)} {form.Input_Unit}</div>
                        </div>
                        <div className="col-4 border-end">
                          <div className="small text-muted">Output</div>
                          <div className="fw-bold text-success">{parseFloat(form.Output_Qty||0)} {form.Output_Unit}</div>
                        </div>
                        <div className="col-4">
                          <div className="small text-muted">Wastage</div>
                          <div className="fw-bold text-danger">
                            {parseFloat(form.Wastage_Qty||0)} ({parseFloat(form.Wastage_Pct||0)}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="row g-3 mt-1">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Status</label>
                      <select className="form-select" value={form.Status||'Draft'} onChange={e => setF('Status', e.target.value)}>
                        {['Draft','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
                      </select>
                      {form.Status === 'Completed' && (
                        <small className="text-success mt-1 d-block">
                          <i className="bi bi-info-circle me-1"></i>Stock will be updated on save
                        </small>
                      )}
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fw-semibold small">Notes</label>
                      <textarea className="form-control" rows={2} value={form.Notes||''}
                        onChange={e => setF('Notes', e.target.value)} placeholder="Optional notes"/>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light px-4" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-2"/>}
                    {editing ? 'Update' : 'Save Conversion'}
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
