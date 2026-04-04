import React, { useState, useEffect } from 'react'
import { billsAPI, customersAPI } from '../../api/api'

const PAY_STATUS_COLOR = { Unpaid:'danger', Partial:'warning', Paid:'success', Cancelled:'secondary' }

export default function BillsPage() {
  const [bills, setBills]         = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState({})
  const [items, setItems]         = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [filters, setFilters]     = useState({ status:'', customer:'', from:'', to:'' })

  const defaultForm = { Customer_Name:'', Customer_ID:'', Mobile:'', Bill_Date: new Date().toISOString().slice(0,10),
    Gross_Amount:0, Discount_Amt:0, Tax_Amount:0, Net_Amount:0,
    Amount_Paid:0, Payment_Status:'Unpaid', External_Ref:'', Notes:'' }
  const defaultItem = { Description:'', Size:'', Label_Type:'', Qty:1, Rate:0, Amount:0, Tax_Pct:0, Tax_Amount:0 }

  const load = () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
    billsAPI.list(params).then(r=>setBills(r.data.data)).finally(()=>setLoading(false))
  }

  useEffect(() => {
    load()
    customersAPI.list().then(r=>setCustomers(r.data.data))
  }, [])

  const openNew = async () => {
    const numR = await billsAPI.nextNumber()
    setForm({ ...defaultForm, Bill_Number: numR.data.data.bill_number })
    setItems([{ ...defaultItem }])
    setEditing(null); setShowModal(true); setError('')
  }

  const openEdit = async id => {
    const r = await billsAPI.get(id)
    setForm(r.data.data)
    setItems(r.data.data.items || [])
    setEditing(id); setShowModal(true); setError('')
  }

  const calcTotals = (its) => {
    const gross   = its.reduce((s,i) => s + parseFloat(i.Amount||0), 0)
    const tax     = its.reduce((s,i) => s + parseFloat(i.Tax_Amount||0), 0)
    const net     = gross + tax - parseFloat(form.Discount_Amt||0)
    setForm(p => ({ ...p, Gross_Amount: gross.toFixed(2), Tax_Amount: tax.toFixed(2), Net_Amount: Math.max(0,net).toFixed(2),
      Balance_Due: Math.max(0, net - parseFloat(p.Amount_Paid||0)).toFixed(2) }))
  }

  const updateItem = (idx, k, v) => {
    const updated = items.map((it, i) => {
      if (i !== idx) return it
      const u = { ...it, [k]: v }
      if (k === 'Qty' || k === 'Rate') u.Amount = (parseFloat(u.Qty||0) * parseFloat(u.Rate||0)).toFixed(2)
      if (k === 'Tax_Pct' || k === 'Amount') u.Tax_Amount = (parseFloat(u.Amount||0) * parseFloat(u.Tax_Pct||0) / 100).toFixed(2)
      return u
    })
    setItems(updated)
    calcTotals(updated)
  }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const data = { ...form, items }
      if (editing) await billsAPI.update(editing, data)
      else         await billsAPI.store(data)
      setShowModal(false); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving bill')
    } finally { setSaving(false) }
  }

  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-receipt me-2 text-primary"></i>Bills / Invoices</h4>
        <button className="btn btn-primary" onClick={openNew}><i className="bi bi-plus-lg me-1"></i>New Bill</button>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-auto">
              <select className="form-select form-select-sm" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
                <option value="">All Status</option>
                {['Unpaid','Partial','Paid','Cancelled'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-auto">
              <input className="form-control form-control-sm" placeholder="Customer..." value={filters.customer}
                onChange={e=>setFilters(p=>({...p,customer:e.target.value}))}/>
            </div>
            <div className="col-auto">
              <input type="date" className="form-control form-control-sm" value={filters.from}
                onChange={e=>setFilters(p=>({...p,from:e.target.value}))}/>
            </div>
            <div className="col-auto">
              <input type="date" className="form-control form-control-sm" value={filters.to}
                onChange={e=>setFilters(p=>({...p,to:e.target.value}))}/>
            </div>
            <div className="col-auto">
              <button className="btn btn-outline-primary btn-sm" onClick={load}><i className="bi bi-search me-1"></i>Search</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr><th>Bill #</th><th>Date</th><th>Customer</th><th>Net Amt</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm"/></td></tr>
              ) : bills.map(b=>(
                <tr key={b.Bill_ID}>
                  <td className="fw-semibold text-primary">{b.Bill_Number}</td>
                  <td>{b.Bill_Date}</td>
                  <td>{b.Customer_Name}</td>
                  <td className="fw-bold">₹{parseFloat(b.Net_Amount).toLocaleString()}</td>
                  <td className="text-success">₹{parseFloat(b.Amount_Paid||0).toLocaleString()}</td>
                  <td className={parseFloat(b.Balance_Due)>0?'text-danger fw-bold':''}>
                    ₹{parseFloat(b.Balance_Due||0).toLocaleString()}
                  </td>
                  <td><span className={`badge bg-${PAY_STATUS_COLOR[b.Payment_Status]||'secondary'}`}>{b.Payment_Status}</span></td>
                  <td>
                    <button className="btn btn-outline-primary btn-sm" onClick={()=>openEdit(b.Bill_ID)}>
                      <i className="bi bi-pencil"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && bills.length === 0 && (
                <tr><td colSpan={8} className="text-center py-4 text-muted">No bills found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{editing?'Edit Bill':'New Bill'} — {form.Bill_Number}</h5>
                <button className="btn-close" onClick={()=>setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="row g-3 mb-3">
                    <div className="col-md-5">
                      <label className="form-label">Customer Name *</label>
                      <input className="form-control" required value={form.Customer_Name||''} onChange={e=>f('Customer_Name',e.target.value)}/>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Mobile</label>
                      <input className="form-control" value={form.Mobile||''} onChange={e=>f('Mobile',e.target.value)}/>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Bill Date</label>
                      <input type="date" className="form-control" value={form.Bill_Date||''} onChange={e=>f('Bill_Date',e.target.value)}/>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">External Ref</label>
                      <input className="form-control" placeholder="Ext. bill no." value={form.External_Ref||''} onChange={e=>f('External_Ref',e.target.value)}/>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="table-responsive mb-3">
                    <table className="table table-bordered table-sm">
                      <thead className="table-light">
                        <tr><th>Description</th><th>Size</th><th>Label Type</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Tax%</th><th>Tax Amt</th><th></th></tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td><input className="form-control form-control-sm" value={it.Description} onChange={e=>updateItem(idx,'Description',e.target.value)}/></td>
                            <td><input className="form-control form-control-sm" style={{width:80}} value={it.Size||''} onChange={e=>updateItem(idx,'Size',e.target.value)}/></td>
                            <td><input className="form-control form-control-sm" style={{width:90}} value={it.Label_Type||''} onChange={e=>updateItem(idx,'Label_Type',e.target.value)}/></td>
                            <td><input type="number" className="form-control form-control-sm" style={{width:70}} value={it.Qty} onChange={e=>updateItem(idx,'Qty',e.target.value)}/></td>
                            <td><input type="number" className="form-control form-control-sm" style={{width:80}} value={it.Rate} onChange={e=>updateItem(idx,'Rate',e.target.value)}/></td>
                            <td><input type="number" className="form-control form-control-sm" style={{width:90}} value={it.Amount} readOnly/></td>
                            <td><input type="number" className="form-control form-control-sm" style={{width:70}} value={it.Tax_Pct} onChange={e=>updateItem(idx,'Tax_Pct',e.target.value)}/></td>
                            <td><input type="number" className="form-control form-control-sm" style={{width:80}} value={it.Tax_Amount} readOnly/></td>
                            <td><button type="button" className="btn btn-outline-danger btn-sm" onClick={()=>{const n=items.filter((_,i)=>i!==idx);setItems(n);calcTotals(n)}}><i className="bi bi-x"></i></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={()=>setItems(p=>[...p,{...defaultItem}])}>
                      <i className="bi bi-plus me-1"></i>Add Item
                    </button>
                  </div>

                  {/* Totals */}
                  <div className="row justify-content-end">
                    <div className="col-md-4">
                      <table className="table table-sm">
                        <tbody>
                          <tr><td>Gross Amount:</td><td className="fw-bold text-end">₹{parseFloat(form.Gross_Amount||0).toFixed(2)}</td></tr>
                          <tr><td>Discount:</td><td><input type="number" className="form-control form-control-sm" value={form.Discount_Amt||0} onChange={e=>{f('Discount_Amt',e.target.value);calcTotals(items)}}/></td></tr>
                          <tr><td>Tax:</td><td className="text-end">₹{parseFloat(form.Tax_Amount||0).toFixed(2)}</td></tr>
                          <tr className="table-primary"><td><strong>Net Amount:</strong></td><td className="fw-bold text-end">₹{parseFloat(form.Net_Amount||0).toFixed(2)}</td></tr>
                          <tr><td>Amount Paid:</td><td><input type="number" className="form-control form-control-sm" value={form.Amount_Paid||0} onChange={e=>f('Amount_Paid',e.target.value)}/></td></tr>
                        </tbody>
                      </table>
                      <select className="form-select form-select-sm" value={form.Payment_Status||'Unpaid'} onChange={e=>f('Payment_Status',e.target.value)}>
                        {['Unpaid','Partial','Paid','Cancelled'].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-1"/>}
                    {editing ? 'Update Bill' : 'Create Bill'}
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
