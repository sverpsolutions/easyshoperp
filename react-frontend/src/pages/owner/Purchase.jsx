import React, { useState, useEffect, useCallback } from 'react'
import { purchaseAPI, itemsAPI, suppliersAPI } from '../../api/api'

const PAY_COLOR = { Unpaid:'danger', Partial:'warning', Paid:'success' }

const defaultItem = { Item_ID:'', Item_Name:'', Item_Code:'', Qty:1, Unit:'Roll', Rate:0, Amount:0, Tax_Pct:18, Tax_Amount:0, HSN_Code:'' }

const defaultForm = {
  Purchase_Number:'', Purchase_Date: new Date().toISOString().slice(0,10),
  Supplier_ID:'', Supplier_Name:'', Supplier_GST:'', Invoice_No:'', Invoice_Date:'',
  Gross_Amount:0, Discount_Amt:0, Tax_Amount:0, Net_Amount:0,
  Amount_Paid:0, Balance_Due:0, Payment_Status:'Unpaid', Payment_Mode:'', Notes:'',
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

export default function PurchasePage() {
  const [purchases, setPurchases]   = useState([])
  const [items, setItems]           = useState([])
  const [suppliers, setSuppliers]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(defaultForm)
  const [lineItems, setLineItems] = useState([{ ...defaultItem }])
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)
  const [filters, setFilters]     = useState({ supplier:'', payment_status:'', from:'', to:'' })
  const [summary, setSummary]     = useState({})

  const showToast = (msg, type='success') => setToast({ msg, type })

  const load = useCallback(() => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
    purchaseAPI.list(params).then(r => setPurchases(r.data.data || [])).finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    itemsAPI.list({ is_active: 1 }).then(r => setItems(r.data.data || []))
    suppliersAPI.dropdown().then(r => setSuppliers(r.data.data || []))
    purchaseAPI.summary().then(r => setSummary(r.data.data || {}))
  }, [])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const calcTotals = (its, disc = null) => {
    const discount = disc ?? parseFloat(form.Discount_Amt || 0)
    const gross   = its.reduce((s, i) => s + parseFloat(i.Amount || 0), 0)
    const tax     = its.reduce((s, i) => s + parseFloat(i.Tax_Amount || 0), 0)
    const net     = gross + tax - discount
    setForm(p => ({
      ...p,
      Gross_Amount: gross.toFixed(2),
      Tax_Amount:   tax.toFixed(2),
      Net_Amount:   Math.max(0, net).toFixed(2),
      Balance_Due:  Math.max(0, net - parseFloat(p.Amount_Paid || 0)).toFixed(2),
    }))
  }

  const updateLineItem = (idx, k, v) => {
    const updated = lineItems.map((it, i) => {
      if (i !== idx) return it
      const u = { ...it, [k]: v }
      if (k === 'Item_ID') {
        const found = items.find(x => String(x.Item_ID) === String(v))
        if (found) {
          u.Item_Name = found.Item_Name
          u.Item_Code = found.Item_Code
          u.Unit      = found.Unit || 'Roll'
          u.HSN_Code  = found.HSN_Code || ''
          u.Tax_Pct   = parseFloat(found.GST_Rate || 18)
          u.Rate      = parseFloat(found.Purchase_Rate || 0)
        }
      }
      if (['Qty','Rate','Item_ID'].includes(k)) {
        u.Amount     = (parseFloat(u.Qty || 0) * parseFloat(u.Rate || 0)).toFixed(2)
        u.Tax_Amount = (parseFloat(u.Amount) * parseFloat(u.Tax_Pct || 0) / 100).toFixed(2)
      }
      if (k === 'Tax_Pct') {
        u.Tax_Amount = (parseFloat(u.Amount || 0) * parseFloat(v || 0) / 100).toFixed(2)
      }
      return u
    })
    setLineItems(updated)
    calcTotals(updated)
  }

  const openNew = async () => {
    const r = await purchaseAPI.nextNumber()
    setForm({ ...defaultForm, Purchase_Number: r.data.data.purchase_number })
    setLineItems([{ ...defaultItem }])
    setEditing(null); setShowModal(true)
  }

  const openEdit = async id => {
    const r = await purchaseAPI.get(id)
    const p = r.data.data
    setForm({ ...defaultForm, ...p })
    setLineItems(p.items?.length ? p.items : [{ ...defaultItem }])
    setEditing(id); setShowModal(true)
  }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const data = { ...form, items: lineItems }
      if (editing) { await purchaseAPI.update(editing, data); showToast('Purchase updated') }
      else         { await purchaseAPI.store(data); showToast('Purchase created') }
      setShowModal(false); load()
      purchaseAPI.summary().then(r => setSummary(r.data.data || {}))
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving purchase', 'danger')
    } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this purchase? Stock will be reversed.')) return
    try { await purchaseAPI.delete(id); load(); showToast('Purchase deleted') }
    catch (err) { showToast(err.response?.data?.message || 'Error', 'danger') }
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-truck me-2 text-primary"></i>Purchase</h4>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <i className="bi bi-plus-lg me-1"></i>New Purchase
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Purchases', value: parseInt(summary.total_purchases||0),         icon:'bi-truck',           color:'primary', fmt: v => v },
          { label:'Total Value',     value: parseFloat(summary.total_value||0),            icon:'bi-bag',             color:'info',    fmt: v => '₹'+v.toLocaleString(undefined,{maximumFractionDigits:0}) },
          { label:'Total Paid',      value: parseFloat(summary.total_paid||0),             icon:'bi-check-circle',    color:'success', fmt: v => '₹'+v.toLocaleString(undefined,{maximumFractionDigits:0}) },
          { label:'Outstanding',     value: parseFloat(summary.total_due||0),              icon:'bi-exclamation-circle', color:'warning', fmt: v => '₹'+v.toLocaleString(undefined,{maximumFractionDigits:0}) },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className={`rounded-circle bg-${c.color} bg-opacity-10 p-3`}>
                  <i className={`bi ${c.icon} fs-4 text-${c.color}`}></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">{c.fmt(c.value)}</div>
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
            <div className="col-md-3">
              <input className="form-control form-control-sm" placeholder="Supplier name…"
                value={filters.supplier} onChange={e => setFilters(p => ({ ...p, supplier: e.target.value }))}/>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filters.payment_status}
                onChange={e => setFilters(p => ({ ...p, payment_status: e.target.value }))}>
                <option value="">All Status</option>
                {['Unpaid','Partial','Paid'].map(s => <option key={s}>{s}</option>)}
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
                <th>Purchase #</th><th>Date</th><th>Supplier</th><th>Invoice No</th>
                <th>Net Amt</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"/>
                </td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-5 text-muted">
                  <i className="bi bi-truck me-2"></i>No purchases found
                </td></tr>
              ) : purchases.map(p => (
                <tr key={p.Purchase_ID}>
                  <td><span className="fw-semibold text-primary">{p.Purchase_Number}</span></td>
                  <td><small>{p.Purchase_Date}</small></td>
                  <td>
                    <div className="fw-semibold">{p.Supplier_Name}</div>
                    {p.Supplier_GST && <small className="text-muted font-monospace">{p.Supplier_GST}</small>}
                  </td>
                  <td><small className="text-muted">{p.Invoice_No || '—'}</small></td>
                  <td className="fw-bold">₹{parseFloat(p.Net_Amount||0).toLocaleString()}</td>
                  <td className="text-success">₹{parseFloat(p.Amount_Paid||0).toLocaleString()}</td>
                  <td className={parseFloat(p.Balance_Due||0) > 0 ? 'text-danger fw-semibold' : 'text-muted'}>
                    ₹{parseFloat(p.Balance_Due||0).toLocaleString()}
                  </td>
                  <td><span className={`badge bg-${PAY_COLOR[p.Payment_Status]||'secondary'}`}>{p.Payment_Status}</span></td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-primary" onClick={() => openEdit(p.Purchase_ID)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-outline-danger" onClick={() => handleDelete(p.Purchase_ID)}>
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
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-truck me-2 text-primary"></i>
                  {editing ? 'Edit Purchase' : 'New Purchase'} — <span className="text-primary">{form.Purchase_Number}</span>
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body pt-3">
                  {/* Supplier Details */}
                  <div className="card border-0 bg-light rounded-3 p-3 mb-3">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small">Supplier *</label>
                        <select className="form-select" value={form.Supplier_ID||''}
                          onChange={e => {
                            const id = e.target.value
                            const found = suppliers.find(s => String(s.Supplier_ID) === String(id))
                            setForm(p => ({
                              ...p,
                              Supplier_ID:   id,
                              Supplier_Name: found ? found.Supplier_Name : p.Supplier_Name,
                              Supplier_GST:  found ? (found.GST_No || '') : p.Supplier_GST,
                            }))
                          }}>
                          <option value="">Select supplier…</option>
                          {suppliers.map(s => (
                            <option key={s.Supplier_ID} value={s.Supplier_ID}>{s.Supplier_Name}</option>
                          ))}
                        </select>
                        {!form.Supplier_ID && (
                          <input className="form-control mt-1" value={form.Supplier_Name||''}
                            onChange={e => setF('Supplier_Name', e.target.value)}
                            placeholder="Or type manually…"/>
                        )}
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold small">Supplier GST</label>
                        <input className="form-control font-monospace" value={form.Supplier_GST||''}
                          onChange={e => setF('Supplier_GST', e.target.value)} placeholder="Auto-filled from supplier"/>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold small">Purchase Date *</label>
                        <input type="date" className="form-control" required value={form.Purchase_Date}
                          onChange={e => setF('Purchase_Date', e.target.value)}/>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold small">Invoice No</label>
                        <input className="form-control" value={form.Invoice_No||''}
                          onChange={e => setF('Invoice_No', e.target.value)} placeholder="Supplier inv. no."/>
                      </div>
                      <div className="col-md-1">
                        <label className="form-label fw-semibold small">Inv. Date</label>
                        <input type="date" className="form-control" value={form.Invoice_Date||''}
                          onChange={e => setF('Invoice_Date', e.target.value)}/>
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold mb-0"><i className="bi bi-list-ul me-1 text-primary"></i>Items</h6>
                      <button type="button" className="btn btn-outline-primary btn-sm"
                        onClick={() => setLineItems(p => [...p, { ...defaultItem }])}>
                        <i className="bi bi-plus me-1"></i>Add Row
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-bordered table-sm align-middle">
                        <thead className="table-light">
                          <tr>
                            <th style={{minWidth:200}}>Item</th>
                            <th style={{width:90}}>Qty</th>
                            <th style={{width:60}}>Unit</th>
                            <th style={{width:100}}>Rate (₹)</th>
                            <th style={{width:110}}>Amount (₹)</th>
                            <th style={{width:70}}>GST%</th>
                            <th style={{width:110}}>Tax (₹)</th>
                            <th style={{width:90}}>HSN</th>
                            <th style={{width:40}}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((it, idx) => (
                            <tr key={idx}>
                              <td>
                                <select className="form-select form-select-sm"
                                  value={it.Item_ID||''} onChange={e => updateLineItem(idx, 'Item_ID', e.target.value)}>
                                  <option value="">Select item…</option>
                                  {items.map(i => <option key={i.Item_ID} value={i.Item_ID}>{i.Item_Name}</option>)}
                                </select>
                                {it.Item_ID && <small className="text-muted font-monospace d-block">{it.Item_Code}</small>}
                              </td>
                              <td><input type="number" className="form-control form-control-sm" min="0" step="0.001"
                                value={it.Qty} onChange={e => updateLineItem(idx, 'Qty', e.target.value)}/></td>
                              <td><input className="form-control form-control-sm" value={it.Unit}
                                onChange={e => updateLineItem(idx, 'Unit', e.target.value)}/></td>
                              <td><input type="number" className="form-control form-control-sm" min="0" step="0.01"
                                value={it.Rate} onChange={e => updateLineItem(idx, 'Rate', e.target.value)}/></td>
                              <td><input type="number" className="form-control form-control-sm bg-light" readOnly value={it.Amount}/></td>
                              <td><input type="number" className="form-control form-control-sm" min="0" max="100" step="0.1"
                                value={it.Tax_Pct} onChange={e => updateLineItem(idx, 'Tax_Pct', e.target.value)}/></td>
                              <td><input type="number" className="form-control form-control-sm bg-light" readOnly value={it.Tax_Amount}/></td>
                              <td><input className="form-control form-control-sm font-monospace" value={it.HSN_Code||''}
                                onChange={e => updateLineItem(idx, 'HSN_Code', e.target.value)}/></td>
                              <td>
                                <button type="button" className="btn btn-outline-danger btn-sm"
                                  onClick={() => { const n = lineItems.filter((_,i)=>i!==idx); setLineItems(n); calcTotals(n) }}>
                                  <i className="bi bi-x"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals + Payment */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Notes</label>
                      <textarea className="form-control" rows={3} value={form.Notes||''}
                        onChange={e => setF('Notes', e.target.value)} placeholder="Optional notes"/>
                    </div>
                    <div className="col-md-6">
                      <div className="table-responsive">
                        <table className="table table-sm mb-2">
                          <tbody>
                            <tr>
                              <td className="text-muted">Gross Amount</td>
                              <td className="text-end fw-semibold">₹{parseFloat(form.Gross_Amount||0).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td className="text-muted">Discount</td>
                              <td><input type="number" className="form-control form-control-sm text-end" min="0" step="0.01"
                                value={form.Discount_Amt||0}
                                onChange={e => { setF('Discount_Amt', e.target.value); calcTotals(lineItems, parseFloat(e.target.value)) }}/></td>
                            </tr>
                            <tr>
                              <td className="text-muted">Tax Amount</td>
                              <td className="text-end">₹{parseFloat(form.Tax_Amount||0).toFixed(2)}</td>
                            </tr>
                            <tr className="table-primary">
                              <td><strong>Net Amount</strong></td>
                              <td className="text-end fw-bold fs-5">₹{parseFloat(form.Net_Amount||0).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td className="text-muted">Amount Paid</td>
                              <td>
                                <input type="number" className="form-control form-control-sm text-end" min="0" step="0.01"
                                  value={form.Amount_Paid||0}
                                  onChange={e => {
                                    const paid = parseFloat(e.target.value||0)
                                    const net  = parseFloat(form.Net_Amount||0)
                                    setForm(p => ({
                                      ...p,
                                      Amount_Paid:     paid,
                                      Balance_Due:     Math.max(0, net - paid).toFixed(2),
                                      Payment_Status:  paid >= net ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
                                    }))
                                  }}/>
                              </td>
                            </tr>
                            <tr>
                              <td className="text-danger fw-semibold">Balance Due</td>
                              <td className="text-end text-danger fw-bold">₹{parseFloat(form.Balance_Due||0).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="row g-2">
                        <div className="col-6">
                          <select className="form-select form-select-sm" value={form.Payment_Status||'Unpaid'}
                            onChange={e => setF('Payment_Status', e.target.value)}>
                            {['Unpaid','Partial','Paid'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="col-6">
                          <select className="form-select form-select-sm" value={form.Payment_Mode||''}
                            onChange={e => setF('Payment_Mode', e.target.value)}>
                            <option value="">Payment Mode</option>
                            {['Cash','Bank Transfer','Cheque','UPI','Credit'].map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light px-4" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-2"/>}
                    {editing ? 'Update Purchase' : 'Save Purchase'}
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
