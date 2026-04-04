import React, { useState, useEffect, useRef } from 'react'
import { mastersAPI, uploadImage } from '../../../api/api'
import '../../../styles/erp-theme.css'

const defaultForm = {
  Company_Name: '', Address: '', City: '', State: '', Pincode: '', Mobile: '',
  Email: '', Website: '', GSTIN: '', PAN: '', Theme_Color: '#2563eb',
  Bank_Name: '', Bank_Account: '', Bank_IFSC: '', Bank_Branch: '', Financial_Year: '2024-25',
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

export default function CompanyMaster() {
  const [form, setForm]         = useState(defaultForm)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toasts, setToasts]     = useState([])
  const [logoUpl, setLogoUpl]   = useState(false)
  const [logoPath, setLogoPath] = useState('')
  const logoRef = useRef()
  const PHOTO_BASE = import.meta.env.VITE_APP_URL || ''

  const toast = (msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }

  useEffect(() => {
    mastersAPI.getCompany().then(r => {
      const d = r.data.data
      if (d && d.Company_Name) {
        setForm({ ...defaultForm, ...d })
        setLogoPath(d.Logo_Path || '')
      }
    }).finally(() => setLoading(false))
  }, [])

  const f = (k) => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleLogo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogoUpl(true)
    try {
      const res = await uploadImage(file, 'company')
      const path = res.data.data?.path || res.data.path || ''
      setLogoPath(path)
      setForm(p => ({ ...p, Logo_Path: path }))
      toast('Logo uploaded')
    } catch { toast('Logo upload failed', 'error') }
    finally { setLogoUpl(false) }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await mastersAPI.saveCompany({ ...form, Logo_Path: logoPath })
      toast('Company profile saved!')
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="master-page d-flex justify-content-center align-items-center" style={{minHeight: 300}}>
      <div className="spinner-border text-primary"/>
    </div>
  )

  return (
    <div className="master-page">
      <Toast toasts={toasts}/>

      <div className="master-page-header">
        <div>
          <div className="page-title"><i className="bi bi-building me-2"/>Company Master</div>
          <div className="page-subtitle">Organization profile, GSTIN, bank details &amp; branding</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-light text-primary fw-bold">
            <i className="bi bi-shield-check me-1"/>Production Data
          </span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="row g-3">
          {/* Left Column */}
          <div className="col-lg-8">
            {/* Basic Info */}
            <div className="erp-card mb-3">
              <div className="erp-card-header">
                <div className="erp-card-title"><i className="bi bi-info-circle text-primary"/>Basic Information</div>
              </div>
              <div className="row g-3">
                <div className="col-12">
                  <label className="erp-label">Company Name *</label>
                  <input className="form-control erp-input" required value={form.Company_Name} onChange={f('Company_Name')} placeholder="EasyShop Marketing Pvt Ltd"/>
                </div>
                <div className="col-12">
                  <label className="erp-label">Address</label>
                  <textarea className="form-control erp-input" rows={2} value={form.Address} onChange={f('Address')} placeholder="Full address"/>
                </div>
                <div className="col-md-4">
                  <label className="erp-label">City</label>
                  <input className="form-control erp-input" value={form.City} onChange={f('City')} placeholder="New Delhi"/>
                </div>
                <div className="col-md-4">
                  <label className="erp-label">State</label>
                  <input className="form-control erp-input" value={form.State} onChange={f('State')} placeholder="Delhi"/>
                </div>
                <div className="col-md-4">
                  <label className="erp-label">Pincode</label>
                  <input className="form-control erp-input" value={form.Pincode} onChange={f('Pincode')} placeholder="110001"/>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">Mobile</label>
                  <input className="form-control erp-input" value={form.Mobile} onChange={f('Mobile')} placeholder="+91 98765 43210"/>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">Email</label>
                  <input className="form-control erp-input" type="email" value={form.Email} onChange={f('Email')} placeholder="info@company.com"/>
                </div>
                <div className="col-12">
                  <label className="erp-label">Website</label>
                  <input className="form-control erp-input" value={form.Website} onChange={f('Website')} placeholder="https://www.company.com"/>
                </div>
              </div>
            </div>

            {/* GST / Tax */}
            <div className="erp-card mb-3">
              <div className="erp-card-header">
                <div className="erp-card-title"><i className="bi bi-receipt text-warning"/>GST &amp; Tax Registration</div>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="erp-label">GSTIN</label>
                  <input className="form-control erp-input" style={{textTransform:'uppercase'}} value={form.GSTIN} onChange={f('GSTIN')} placeholder="22AAAAA0000A1Z5" maxLength={15}/>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">PAN Number</label>
                  <input className="form-control erp-input" style={{textTransform:'uppercase'}} value={form.PAN} onChange={f('PAN')} placeholder="AAAAA9999A" maxLength={10}/>
                </div>
                <div className="col-md-4">
                  <label className="erp-label">Financial Year</label>
                  <select className="form-select erp-input" value={form.Financial_Year} onChange={f('Financial_Year')}>
                    {['2023-24','2024-25','2025-26','2026-27'].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Bank */}
            <div className="erp-card">
              <div className="erp-card-header">
                <div className="erp-card-title"><i className="bi bi-bank text-success"/>Bank Details</div>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="erp-label">Bank Name</label>
                  <input className="form-control erp-input" value={form.Bank_Name} onChange={f('Bank_Name')} placeholder="HDFC Bank"/>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">Account Number</label>
                  <input className="form-control erp-input" value={form.Bank_Account} onChange={f('Bank_Account')} placeholder="1234567890"/>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">IFSC Code</label>
                  <input className="form-control erp-input" style={{textTransform:'uppercase'}} value={form.Bank_IFSC} onChange={f('Bank_IFSC')} placeholder="HDFC0001234"/>
                </div>
                <div className="col-md-6">
                  <label className="erp-label">Branch</label>
                  <input className="form-control erp-input" value={form.Bank_Branch} onChange={f('Bank_Branch')} placeholder="Connaught Place, New Delhi"/>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-lg-4">
            {/* Logo Upload */}
            <div className="erp-card mb-3 text-center">
              <div className="erp-card-header">
                <div className="erp-card-title"><i className="bi bi-image text-info"/>Company Logo</div>
              </div>
              <div className="mb-3">
                {logoPath ? (
                  <img src={`${PHOTO_BASE}/${logoPath}`} alt="Logo"
                    style={{maxWidth: 160, maxHeight: 120, objectFit:'contain', borderRadius: 8, border:'1px solid #e2e8f0'}}/>
                ) : (
                  <div style={{width: 160, height: 120, border:'2px dashed #e2e8f0', borderRadius: 8, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', color:'#94a3b8', flexDirection:'column', gap: 4}}>
                    <i className="bi bi-building" style={{fontSize: 32}}/>
                    <span style={{fontSize: '.72rem'}}>No logo</span>
                  </div>
                )}
              </div>
              <input type="file" ref={logoRef} style={{display:'none'}} accept="image/*" onChange={handleLogo}/>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => logoRef.current.click()} disabled={logoUpl}>
                {logoUpl ? <><span className="spinner-border spinner-border-sm me-1"/>Uploading…</> : <><i className="bi bi-upload me-1"/>Upload Logo</>}
              </button>
            </div>

            {/* Theme Color */}
            <div className="erp-card">
              <div className="erp-card-header">
                <div className="erp-card-title"><i className="bi bi-palette text-purple"/>Theme Color</div>
              </div>
              <div className="text-center">
                <div className="mb-2" style={{width: 80, height: 80, borderRadius: '50%', background: form.Theme_Color, margin:'0 auto', boxShadow:'0 4px 15px rgba(0,0,0,.2)', border:'3px solid #fff'}}/>
                <input type="color" className="form-control form-control-color mx-auto" style={{width: 80, height: 40}}
                  value={form.Theme_Color} onChange={f('Theme_Color')} title="Pick theme color"/>
                <p className="text-muted mt-2 mb-0" style={{fontSize:'.75rem'}}>{form.Theme_Color}</p>
                <p className="text-muted mt-1" style={{fontSize:'.72rem'}}>This color is used across the ERP system</p>
                <div className="d-flex gap-2 justify-content-center flex-wrap mt-2">
                  {['#2563eb','#16a34a','#dc2626','#7c3aed','#0891b2','#d97706','#0f172a'].map(c => (
                    <div key={c} onClick={() => setForm(p=>({...p, Theme_Color: c}))}
                      style={{width:24,height:24,borderRadius:'50%',background:c,cursor:'pointer',border: form.Theme_Color===c?'3px solid #fff':undefined, boxShadow: form.Theme_Color===c?`0 0 0 2px ${c}`:undefined, transition:'all .15s'}}/>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="text-end mt-3">
          <button type="submit" className="btn-erp-save px-4 py-2" disabled={saving} style={{fontSize: '1rem'}}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2"/>Saving…</>
              : <><i className="bi bi-check-circle me-2"/>Save Company Profile</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
