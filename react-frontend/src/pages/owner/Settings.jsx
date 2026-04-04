import React, { useState, useEffect, useRef } from 'react'
import { settingsAPI } from '../../api/api'
import { uploadImage } from '../../api/api'

const TABS = [
  { key: 'company',  label: 'Company',      icon: 'bi-building'        },
  { key: 'address',  label: 'Address',      icon: 'bi-geo-alt'         },
  { key: 'gst',      label: 'GST & Tax',    icon: 'bi-receipt-cutoff'  },
  { key: 'bank',     label: 'Bank Details', icon: 'bi-bank'            },
  { key: 'invoice',  label: 'Invoice Config', icon: 'bi-file-earmark-text' },
  { key: 'telegram', label: 'Telegram',     icon: 'bi-telegram'        },
]

function FL({ label, children, hint }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold small text-uppercase text-muted ls-wide mb-1" style={{letterSpacing:'0.05em'}}>
        {label}
      </label>
      {children}
      {hint && <div className="form-text text-muted">{hint}</div>}
    </div>
  )
}

function FI({ value, onChange, placeholder, type='text', mono=false }) {
  return (
    <input
      type={type}
      className={`form-control${mono ? ' font-monospace' : ''}`}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}

function FS({ value, onChange, children }) {
  return (
    <select className="form-select" value={value ?? ''} onChange={onChange}>
      {children}
    </select>
  )
}

export default function SettingsPage() {
  const [flat, setFlat]       = useState({})
  const [activeTab, setTab]   = useState('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)
  const [logoUploading, setLU] = useState(false)
  const logoRef = useRef()

  useEffect(() => { load() }, [])

  const load = () => {
    settingsAPI.get().then(r => {
      // Flatten grouped settings into flat key:value
      const grouped = r.data.data || {}
      const f = {}
      Object.values(grouped).forEach(group => {
        Object.entries(group).forEach(([k, v]) => { f[k] = v.value })
      })
      setFlat(f)
    }).finally(() => setLoading(false))
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const setF = (k, v) => setFlat(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsAPI.update(flat)
      showToast('Settings saved successfully!')
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed.', 'error')
    } finally { setSaving(false) }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setLU(true)
    try {
      const { data } = await uploadImage(file, 'company')
      setF('logo_url', data.data.url)
      showToast('Logo uploaded!')
    } catch { showToast('Logo upload failed.', 'error') }
    finally { setLU(false); e.target.value = '' }
  }

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className="spinner-border text-primary me-2"/>
      <span className="text-muted">Loading settings…</span>
    </div>
  )

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`position-fixed top-0 end-0 m-4 alert alert-${toast.type === 'error' ? 'danger' : 'success'} shadow-lg d-flex align-items-center gap-2`}
          style={{ zIndex: 9999, minWidth: 280 }}>
          <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`}></i>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h4 className="fw-bold mb-0"><i className="bi bi-gear-fill me-2 text-primary"></i>Company Settings</h4>
          <small className="text-muted">Configure your organisation's identity, tax, bank & system preferences</small>
        </div>
        <button className="btn btn-primary px-4 py-2 fw-semibold" onClick={handleSave} disabled={saving}>
          {saving
            ? <><span className="spinner-border spinner-border-sm me-2"/>Saving…</>
            : <><i className="bi bi-check-lg me-2"></i>Save Settings</>
          }
        </button>
      </div>

      <div className="d-flex gap-3 align-items-start">
        {/* Left Sidebar Tabs */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="card border-0 shadow-sm rounded-3 p-2">
            <nav className="nav flex-column gap-1">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`btn d-flex align-items-center gap-2 text-start rounded-2 px-3 py-2 fw-semibold small border-0 ${
                    activeTab === t.key
                      ? 'btn-primary'
                      : 'btn-light text-muted'
                  }`}>
                  <i className={`bi ${t.icon} fs-6`}></i>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-grow-1">
          <div className="card border-0 shadow-sm rounded-3 p-4">

            {/* ── COMPANY ───────────────────────────────── */}
            {activeTab === 'company' && (
              <div>
                <h6 className="fw-bold text-primary border-bottom pb-2 mb-4">
                  <i className="bi bi-building me-2"></i>Basic Information
                </h6>

                {/* Logo upload */}
                <FL label="Company Logo">
                  <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 border">
                    {flat.logo_url
                      ? <img src={flat.logo_url} alt="Logo"
                          className="rounded-2 border bg-white p-1"
                          style={{ width: 80, height: 80, objectFit: 'contain' }}/>
                      : <div className="rounded-2 border bg-white d-flex align-items-center justify-content-center"
                          style={{ width: 80, height: 80 }}>
                          <i className="bi bi-building fs-2 text-muted"></i>
                        </div>
                    }
                    <div>
                      <input ref={logoRef} type="file" accept="image/*" className="d-none" onChange={handleLogoUpload}/>
                      <button type="button" className="btn btn-outline-primary btn-sm mb-1"
                        onClick={() => logoRef.current.click()} disabled={logoUploading}>
                        <i className="bi bi-upload me-1"></i>
                        {logoUploading ? 'Uploading…' : 'Upload Logo'}
                      </button>
                      <div className="text-muted small">PNG, JPG · max 2MB · recommended 200×60px</div>
                      {flat.logo_url && (
                        <input className="form-control form-control-sm mt-1" value={flat.logo_url}
                          onChange={e => setF('logo_url', e.target.value)} placeholder="Or paste URL"/>
                      )}
                    </div>
                  </div>
                </FL>

                <div className="row g-3">
                  <div className="col-md-6">
                    <FL label="Factory / Company Name *">
                      <FI value={flat.factory_name} onChange={e => setF('factory_name', e.target.value)} placeholder="e.g. Quraish Label Factory"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Legal / Registered Name">
                      <FI value={flat.company_legal_name} onChange={e => setF('company_legal_name', e.target.value)} placeholder="Full registered legal name"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Mobile / WhatsApp">
                      <FI value={flat.factory_mobile} onChange={e => setF('factory_mobile', e.target.value)} placeholder="+91 XXXXX XXXXX"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Email">
                      <FI value={flat.factory_email} type="email" onChange={e => setF('factory_email', e.target.value)} placeholder="info@company.com"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Website">
                      <FI value={flat.company_website} onChange={e => setF('company_website', e.target.value)} placeholder="https://yourcompany.com"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Tagline">
                      <FI value={flat.company_tagline} onChange={e => setF('company_tagline', e.target.value)} placeholder="Quality you can trust"/>
                    </FL>
                  </div>
                </div>
              </div>
            )}

            {/* ── ADDRESS ───────────────────────────────── */}
            {activeTab === 'address' && (
              <div>
                <h6 className="fw-bold text-primary border-bottom pb-2 mb-4">
                  <i className="bi bi-geo-alt me-2"></i>Registered Address
                </h6>
                <div className="row g-3">
                  <div className="col-12">
                    <FL label="Address Line 1">
                      <FI value={flat.factory_address} onChange={e => setF('factory_address', e.target.value)} placeholder="Building, Street, Area"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="City">
                      <FI value={flat.factory_city} onChange={e => setF('factory_city', e.target.value)} placeholder="e.g. Greater Noida"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="State">
                      <FS value={flat.state} onChange={e => setF('state', e.target.value)}>
                        {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
                          'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
                          'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
                          'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
                          'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
                          'Chandigarh','Puducherry'].map(s => <option key={s}>{s}</option>)}
                      </FS>
                    </FL>
                  </div>
                  <div className="col-md-4">
                    <FL label="Pincode">
                      <FI value={flat.factory_pincode} onChange={e => setF('factory_pincode', e.target.value)} placeholder="e.g. 201306"/>
                    </FL>
                  </div>
                  <div className="col-md-4">
                    <FL label="Country">
                      <FI value={flat.country} onChange={e => setF('country', e.target.value)} placeholder="India"/>
                    </FL>
                  </div>
                </div>
              </div>
            )}

            {/* ── GST & TAX ────────────────────────────── */}
            {activeTab === 'gst' && (
              <div>
                <h6 className="fw-bold text-primary border-bottom pb-2 mb-4">
                  <i className="bi bi-receipt-cutoff me-2"></i>GST & Tax Identifiers
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <FL label="GST Number">
                      <FI value={flat.factory_gst} onChange={e => setF('factory_gst', e.target.value.toUpperCase())} placeholder="e.g. 09XXXXX1234Z1" mono/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="PAN Number">
                      <FI value={flat.factory_pan} onChange={e => setF('factory_pan', e.target.value.toUpperCase())} placeholder="e.g. AAAPL1234C" mono/>
                    </FL>
                  </div>
                  <div className="col-md-4">
                    <FL label="GST State Code">
                      <FI value={flat.gst_state_code} onChange={e => setF('gst_state_code', e.target.value)} placeholder="e.g. 09 (UP)" mono/>
                    </FL>
                  </div>
                  <div className="col-md-4">
                    <FL label="Default GST Rate %">
                      <FS value={flat.default_gst_rate} onChange={e => setF('default_gst_rate', e.target.value)}>
                        {['0','5','12','18','28'].map(r => <option key={r} value={r}>GST {r}%</option>)}
                      </FS>
                    </FL>
                  </div>
                </div>

                <div className="alert alert-info border-0 mt-3 rounded-3">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>GST Logic:</strong> Same state → CGST + SGST split. Different state → IGST applied on invoice.
                </div>

                <div className="row g-3 mt-1">
                  <div className="col-md-4">
                    <FL label="CGST Rate %">
                      <FI value={flat.cgst_rate} onChange={e => setF('cgst_rate', e.target.value)} placeholder="9"/>
                    </FL>
                  </div>
                  <div className="col-md-4">
                    <FL label="SGST Rate %">
                      <FI value={flat.sgst_rate} onChange={e => setF('sgst_rate', e.target.value)} placeholder="9"/>
                    </FL>
                  </div>
                  <div className="col-md-4">
                    <FL label="IGST Rate %">
                      <FI value={flat.igst_rate} onChange={e => setF('igst_rate', e.target.value)} placeholder="18"/>
                    </FL>
                  </div>
                </div>
              </div>
            )}

            {/* ── BANK ─────────────────────────────────── */}
            {activeTab === 'bank' && (
              <div>
                <h6 className="fw-bold text-primary border-bottom pb-2 mb-4">
                  <i className="bi bi-bank me-2"></i>Bank Account Details
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <FL label="Account Holder Name">
                      <FI value={flat.bank_account_name} onChange={e => setF('bank_account_name', e.target.value)} placeholder="Name as per bank records"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Bank Name">
                      <FI value={flat.bank_name} onChange={e => setF('bank_name', e.target.value)} placeholder="e.g. State Bank of India"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Account Number">
                      <FI value={flat.bank_account} onChange={e => setF('bank_account', e.target.value)} placeholder="Account number" mono/>
                    </FL>
                  </div>
                  <div className="col-md-3">
                    <FL label="IFSC Code">
                      <FI value={flat.bank_ifsc} onChange={e => setF('bank_ifsc', e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" mono/>
                    </FL>
                  </div>
                  <div className="col-md-3">
                    <FL label="Branch Name">
                      <FI value={flat.bank_branch} onChange={e => setF('bank_branch', e.target.value)} placeholder="Branch"/>
                    </FL>
                  </div>
                </div>
                <div className="alert alert-success border-0 rounded-3 mt-2">
                  <i className="bi bi-check-circle me-2"></i>
                  Bank details appear on the bottom of PDF invoices for payment reference.
                </div>
              </div>
            )}

            {/* ── INVOICE CONFIG ────────────────────────── */}
            {activeTab === 'invoice' && (
              <div>
                <h6 className="fw-bold text-primary border-bottom pb-2 mb-4">
                  <i className="bi bi-file-earmark-text me-2"></i>Invoice & Billing Configuration
                </h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <FL label="Invoice Prefix" hint="e.g. INV, TAX, SI">
                      <FI value={flat.invoice_series} onChange={e => setF('invoice_series', e.target.value.toUpperCase())} placeholder="INV" mono/>
                    </FL>
                  </div>
                  <div className="col-md-4">
                    <FL label="Challan Prefix" hint="e.g. DC, CH">
                      <FI value={flat.challan_series} onChange={e => setF('challan_series', e.target.value.toUpperCase())} placeholder="DC" mono/>
                    </FL>
                  </div>
                  <div className="col-md-4">
                    <FL label="Next Invoice Number">
                      <FI value={flat.next_invoice_no} type="number" onChange={e => setF('next_invoice_no', e.target.value)} placeholder="1"/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Invoice Format">
                      <FS value={flat.invoice_format} onChange={e => setF('invoice_format', e.target.value)}>
                        <option value="PREFIX-YY-NNNN">PREFIX-YY-NNNN → INV-26-0001</option>
                        <option value="PREFIX-YYYY-NNNN">PREFIX-YYYY-NNNN → INV-2026-0001</option>
                        <option value="PREFIX-YYRR-NNNN">PREFIX-YYRR-NNNN → INV-2627-0001</option>
                        <option value="PREFIX-NNNN">PREFIX-NNNN → INV-0001</option>
                      </FS>
                    </FL>
                  </div>
                  <div className="col-md-3">
                    <FL label="Currency Symbol">
                      <FI value={flat.currency_symbol} onChange={e => setF('currency_symbol', e.target.value)} placeholder="₹"/>
                    </FL>
                  </div>
                  <div className="col-md-3">
                    <FL label="Job Prefix">
                      <FI value={flat.job_prefix} onChange={e => setF('job_prefix', e.target.value.toUpperCase())} placeholder="JOB" mono/>
                    </FL>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-light rounded-3 p-3 mt-3 border">
                  <div className="small text-muted fw-bold mb-2 text-uppercase" style={{letterSpacing:'0.05em'}}>Invoice Number Preview</div>
                  <span className="font-monospace fw-bold text-primary fs-5">
                    {(() => {
                      const prefix = flat.invoice_series || 'INV'
                      const fmt    = flat.invoice_format || 'PREFIX-YY-NNNN'
                      const n      = String(flat.next_invoice_no || 1).padStart(4,'0')
                      const now    = new Date()
                      const yy     = String(now.getFullYear()).slice(-2)
                      const yyyy   = now.getFullYear()
                      const yyrr   = yy + String(parseInt(yy)+1)
                      return fmt
                        .replace('PREFIX', prefix)
                        .replace('YYRR', yyrr)
                        .replace('YYYY', yyyy)
                        .replace('YY', yy)
                        .replace('NNNN', n)
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* ── TELEGRAM ─────────────────────────────── */}
            {activeTab === 'telegram' && (
              <div>
                <h6 className="fw-bold text-primary border-bottom pb-2 mb-4">
                  <i className="bi bi-telegram me-2"></i>Telegram Notifications
                </h6>
                <div className="row g-3">
                  <div className="col-12">
                    <FL label="Telegram Bot Token" hint="Get from @BotFather on Telegram">
                      <FI value={flat.telegram_bot_token || flat.telegram_token}
                        onChange={e => { setF('telegram_bot_token', e.target.value); setF('telegram_token', e.target.value) }}
                        placeholder="1234567890:ABCDEFxxxxxxx" mono/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Owner Chat ID">
                      <FI value={flat.telegram_owner_chat_id} onChange={e => setF('telegram_owner_chat_id', e.target.value)} placeholder="Your Telegram Chat ID" mono/>
                    </FL>
                  </div>
                  <div className="col-md-6">
                    <FL label="Enable Telegram Notifications">
                      <div className="form-check form-switch pt-2">
                        <input className="form-check-input" type="checkbox" id="tg_enabled" role="switch"
                          checked={flat.telegram_enabled === '1'}
                          onChange={e => setF('telegram_enabled', e.target.checked ? '1' : '0')}/>
                        <label className="form-check-label" htmlFor="tg_enabled">
                          {flat.telegram_enabled === '1' ? 'Enabled' : 'Disabled'}
                        </label>
                      </div>
                    </FL>
                  </div>
                </div>
                <hr/>
                <div className="row g-3">
                  {[
                    ['notify_on_job_start',    'Notify when job starts'],
                    ['notify_on_job_complete', 'Notify when job completes'],
                    ['notify_milestones',      'Notify at 25/50/75% milestones'],
                  ].map(([key, label]) => (
                    <div key={key} className="col-md-6">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id={key} role="switch"
                          checked={flat[key] === '1'}
                          onChange={e => setF(key, e.target.checked ? '1' : '0')}/>
                        <label className="form-check-label fw-semibold small" htmlFor={key}>{label}</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
