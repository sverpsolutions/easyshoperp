import React, { useState, useEffect, useCallback } from 'react'
import { serialsAPI, itemsAPI, customersAPI } from '../../api/api'
import '../../styles/erp-theme.css'

const STATUS_COLORS = {
  'In Stock': 'erp-badge-green',
  'Sold':     'erp-badge-blue',
  'Service':  'erp-badge-yellow',
  'Damaged':  'erp-badge-red',
  'Returned': 'erp-badge-purple',
}

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

// ── Bulk Add Modal ──
function BulkAddModal({ items, onClose, onSaved }) {
  const [itemId, setItemId]       = useState('')
  const [qty, setQty]             = useState(1)
  const [serials, setSerials]     = useState([''])
  const [purchDate, setPurchDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]       = useState(false)

  const updateQty = (n) => {
    const q = Math.max(1, Math.min(200, parseInt(n) || 1))
    setQty(q)
    setSerials(prev => {
      const arr = [...prev]
      while (arr.length < q) arr.push('')
      return arr.slice(0, q)
    })
  }

  const updateSerial = (idx, val) => {
    setSerials(prev => { const a=[...prev]; a[idx]=val.toUpperCase(); return a })
  }

  const handleSave = async () => {
    if (!itemId) return alert('Select item first')
    const validSerials = serials.filter(s => s.trim() !== '')
    if (validSerials.length === 0) return alert('Enter at least one serial number')
    setSaving(true)
    try {
      const res = await serialsAPI.bulk({ Item_ID: itemId, serials: validSerials, Purchase_Date: purchDate })
      const { inserted, duplicates } = res.data.data
      let msg = `${inserted} serial(s) added`
      if (duplicates.length > 0) msg += `. ${duplicates.length} duplicate(s) skipped.`
      onSaved(msg)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }

  const hwItems = items.filter(i => i.Is_Hardware == 1 && i.Serial_Required == 1)

  return (
    <div className="erp-modal-overlay">
      <div className="erp-modal" style={{maxWidth: 680}}>
        <div className="erp-modal-header">
          <div className="erp-modal-title"><i className="bi bi-qr-code-scan me-1"/>Bulk Add Serial Numbers</div>
          <button className="btn-close btn-close-white" onClick={onClose}/>
        </div>
        <div className="erp-modal-body">
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="erp-label">Hardware Item *</label>
              <select className="form-select erp-input" value={itemId} onChange={e => setItemId(e.target.value)}>
                <option value="">Select item…</option>
                {hwItems.map(i => <option key={i.Item_ID} value={i.Item_ID}>{i.Item_Name}</option>)}
              </select>
              {items.length > 0 && hwItems.length === 0 && (
                <small className="text-danger">No hardware items with serial tracking. Enable in Item Master.</small>
              )}
            </div>
            <div className="col-md-3">
              <label className="erp-label">Quantity</label>
              <input type="number" min={1} max={200} className="form-control erp-input" value={qty}
                onChange={e => updateQty(e.target.value)}/>
            </div>
            <div className="col-md-3">
              <label className="erp-label">Purchase Date</label>
              <input type="date" className="form-control erp-input" value={purchDate}
                onChange={e => setPurchDate(e.target.value)}/>
            </div>
          </div>

          <label className="erp-label">Serial Numbers ({qty} rows)</label>
          <p className="text-muted" style={{fontSize:'.78rem'}}>Scan barcode or type manually. Each row = one unit.</p>

          <div className="serial-grid">
            {Array.from({length: qty}, (_, i) => (
              <div key={i} className="serial-row">
                <span className="serial-num">{i + 1}.</span>
                <input
                  type="text"
                  placeholder={`Serial #${i + 1}`}
                  value={serials[i] || ''}
                  onChange={e => updateSerial(i, e.target.value)}
                  autoFocus={i === 0}
                />
                {serials[i] && <i className="bi bi-check-circle-fill text-success" style={{fontSize:'.85rem'}}/>}
              </div>
            ))}
          </div>

          <div className="mt-2 d-flex gap-3">
            <span className="text-success small"><i className="bi bi-check-circle me-1"/>{serials.filter(s=>s.trim()).length} filled</span>
            <span className="text-muted small"><i className="bi bi-dash-circle me-1"/>{serials.filter(s=>!s.trim()).length} empty</span>
          </div>
        </div>
        <div className="erp-modal-footer">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn-erp-save" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-1"/>Saving…</> : <><i className="bi bi-check-circle me-1"/>Save Serials</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sell Modal ──
function SellModal({ serial, customers, onClose, onSaved }) {
  const [customerId, setCustomerId] = useState('')
  const [saleDate, setSaleDate]     = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]         = useState(false)

  const handleSell = async () => {
    if (!customerId) return alert('Select customer')
    setSaving(true)
    try {
      await serialsAPI.sell(serial.Serial_ID, { Customer_ID: customerId, Sale_Date: saleDate })
      onSaved('Serial marked as Sold. Warranty activated.')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="erp-modal-overlay">
      <div className="erp-modal" style={{maxWidth: 440}}>
        <div className="erp-modal-header">
          <div className="erp-modal-title"><i className="bi bi-bag-check me-1"/>Mark as Sold — {serial.Serial_No}</div>
          <button className="btn-close btn-close-white" onClick={onClose}/>
        </div>
        <div className="erp-modal-body">
          <div className="mb-3 p-3 rounded" style={{background:'#f0fdf4', border:'1px solid #86efac'}}>
            <div className="fw-bold">{serial.Item_Name}</div>
            <div className="text-muted small">S/N: {serial.Serial_No}</div>
            {serial.Warranty_Months > 0 && (
              <div className="mt-1 text-success small"><i className="bi bi-shield-check me-1"/>Warranty: {serial.Warranty_Months} months will auto-activate</div>
            )}
          </div>
          <div className="mb-3">
            <label className="erp-label">Customer *</label>
            <select className="form-select erp-input" value={customerId} onChange={e=>setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map(c=><option key={c.Customer_ID} value={c.Customer_ID}>{c.Customer_Name} — {c.Mobile}</option>)}
            </select>
          </div>
          <div>
            <label className="erp-label">Sale Date</label>
            <input type="date" className="form-control erp-input" value={saleDate} onChange={e=>setSaleDate(e.target.value)}/>
          </div>
        </div>
        <div className="erp-modal-footer">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn-erp-save" onClick={handleSell} disabled={saving}>
            {saving?<><span className="spinner-border spinner-border-sm me-1"/>…</>:<><i className="bi bi-bag-check me-1"/>Confirm Sale</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──
export default function SerialMasterPage() {
  const [rows, setRows]           = useState([])
  const [items, setItems]         = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [stats, setStats]         = useState({total:0, in_stock:0, sold:0, service:0})
  const [showBulk, setShowBulk]   = useState(false)
  const [showSell, setShowSell]   = useState(null)
  const [filters, setFilters]     = useState({ status: '', search: '', item_id: '' })
  const [toasts, setToasts]       = useState([])

  const toast = (msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status)  params.status   = filters.status
      if (filters.search)  params.search   = filters.search
      if (filters.item_id) params.item_id  = filters.item_id
      const [r1, r2, r3, r4] = await Promise.all([
        serialsAPI.list(params),
        itemsAPI.list({ is_active: 1 }),
        customersAPI.list({ is_active: 1 }),
        serialsAPI.stats(),
      ])
      setRows(r1.data.data || [])
      setItems(r2.data.data || [])
      setCustomers(r3.data.data || [])
      setStats(r4.data.data || {})
    } catch { toast('Load failed', 'error') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  const handleBulkSaved = (msg) => {
    toast(msg)
    setShowBulk(false)
    load()
  }

  const handleSellSaved = (msg) => {
    toast(msg)
    setShowSell(null)
    load()
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'
  const today = new Date().toISOString().split('T')[0]
  const isExpired = (d) => d && d < today

  return (
    <div className="master-page">
      <Toast toasts={toasts}/>

      <div className="master-page-header">
        <div>
          <div className="page-title"><i className="bi bi-qr-code-scan me-2"/>Serial Number Master</div>
          <div className="page-subtitle">Hardware serial tracking — Warranty, AMC, Sale &amp; Service status</div>
        </div>
        <button className="btn-erp-add" onClick={() => setShowBulk(true)}>
          <i className="bi bi-plus-lg"/> Add Serials
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-3">
        {[
          { label: 'Total Units',  value: stats.total,    color: 'blue',   icon: 'bi-cpu' },
          { label: 'In Stock',     value: stats.in_stock, color: 'green',  icon: 'bi-box-seam' },
          { label: 'Sold',         value: stats.sold,     color: '',       icon: 'bi-bag-check' },
          { label: 'In Service',   value: stats.service,  color: 'orange', icon: 'bi-wrench' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-md-3">
            <div className={`erp-stat-card ${s.color}`}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="stat-value">{s.value ?? 0}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
                <i className={`bi ${s.icon}`} style={{fontSize:'1.75rem', opacity:.2}}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="erp-card mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <div className="erp-search">
              <i className="bi bi-search search-icon"/>
              <input className="form-control erp-input" placeholder="Search serial, item, customer…"
                value={filters.search} onChange={e => setFilters(p=>({...p, search: e.target.value}))}/>
            </div>
          </div>
          <div className="col-md-3">
            <select className="form-select erp-input" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
              <option value="">All Status</option>
              {['In Stock','Sold','Service','Damaged','Returned'].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select erp-input" value={filters.item_id} onChange={e=>setFilters(p=>({...p,item_id:e.target.value}))}>
              <option value="">All Items</option>
              {items.filter(i=>i.Is_Hardware==1).map(i=><option key={i.Item_ID} value={i.Item_ID}>{i.Item_Name}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-outline-secondary w-100" onClick={()=>setFilters({status:'',search:'',item_id:''})}>
              <i className="bi bi-x-circle me-1"/>Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="erp-card">
        <div className="erp-card-header">
          <div className="erp-card-title"><span className="badge bg-primary me-1">{rows.length}</span>Serials</div>
        </div>

        {loading ? (
          <div className="p-4">{[1,2,3,4,5].map(i=><div key={i} className="erp-skeleton mb-2" style={{height:45}}/>)}</div>
        ) : rows.length === 0 ? (
          <div className="erp-empty">
            <div className="empty-icon"><i className="bi bi-cpu"/></div>
            <p>No serial numbers found</p>
            <button className="btn-erp-add" onClick={()=>setShowBulk(true)}><i className="bi bi-plus-lg"/> Add Serials</button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Serial No</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Purchase Date</th>
                  <th>Warranty</th>
                  <th>AMC</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.Serial_ID}>
                    <td className="text-muted" style={{fontSize:'.75rem'}}>{i+1}</td>
                    <td>
                      <span className="fw-bold font-monospace" style={{fontSize:'.88rem'}}>{r.Serial_No}</span>
                    </td>
                    <td>
                      <div style={{maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {r.Item_Name}
                      </div>
                      {r.Item_Code && <div className="text-muted" style={{fontSize:'.72rem'}}>{r.Item_Code}</div>}
                    </td>
                    <td>
                      <span className={`erp-badge ${STATUS_COLORS[r.Status] || 'erp-badge-gray'}`}>
                        {r.Status}
                      </span>
                    </td>
                    <td>
                      {r.Customer_Name ? (
                        <>
                          <div style={{fontSize:'.85rem'}}>{r.Customer_Name}</div>
                          <div className="text-muted" style={{fontSize:'.72rem'}}>{r.Customer_Mobile}</div>
                        </>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td style={{fontSize:'.82rem'}}>{formatDate(r.Purchase_Date)}</td>
                    <td>
                      {r.Warranty_Expiry ? (
                        <span className={`erp-badge ${isExpired(r.Warranty_Expiry) ? 'warranty-expired' : 'warranty-active'}`}>
                          {isExpired(r.Warranty_Expiry) ? 'Expired' : formatDate(r.Warranty_Expiry)}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {r.AMC_Expiry ? (
                        <span className={`erp-badge ${isExpired(r.AMC_Expiry) ? 'warranty-expired' : 'warranty-active'}`}>
                          {isExpired(r.AMC_Expiry) ? 'Expired' : formatDate(r.AMC_Expiry)}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        {r.Status === 'In Stock' && (
                          <button className="btn-erp-edit" onClick={() => setShowSell(r)}>
                            <i className="bi bi-bag-check"/> Sell
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showBulk && (
        <BulkAddModal
          items={items}
          onClose={() => setShowBulk(false)}
          onSaved={handleBulkSaved}
        />
      )}

      {showSell && (
        <SellModal
          serial={showSell}
          customers={customers}
          onClose={() => setShowSell(null)}
          onSaved={handleSellSaved}
        />
      )}
    </div>
  )
}
