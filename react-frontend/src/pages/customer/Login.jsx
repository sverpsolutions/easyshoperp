import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { portalAPI } from '../../api/api'

export default function CustomerLogin() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await portalAPI.login(form)
      // Store customer session in localStorage for portal
      localStorage.setItem('portal_user', JSON.stringify(res.data.data))
      navigate('/portal/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
      <div className="card border-0 shadow-lg" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-5">
          {/* Logo */}
          <div className="text-center mb-4">
            <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-3"
                 style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 14px rgba(37,99,235,.4)' }}>
              <i className="bi bi-person-circle text-white fs-3"/>
            </div>
            <h4 className="fw-bold mb-1">Customer Portal</h4>
            <p className="text-muted small">EasyShop Marketing Pvt Ltd</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small">
              <i className="bi bi-exclamation-circle me-2"/>{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold small">Portal Username</label>
              <div className="input-group">
                <span className="input-group-text bg-light"><i className="bi bi-person text-muted"/></span>
                <input
                  type="text" className="form-control" placeholder="Your username"
                  value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  required autoFocus/>
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold small">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light"><i className="bi bi-lock text-muted"/></span>
                <input
                  type="password" className="form-control" placeholder="Your password"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required/>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100 fw-semibold py-2" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm me-2"/>Logging in…</> : <><i className="bi bi-box-arrow-in-right me-2"/>Login</>}
            </button>
          </form>

          <div className="text-center mt-4 text-muted small">
            <i className="bi bi-shield-lock me-1"/>Secure customer portal
          </div>
        </div>
      </div>

      <div className="position-fixed bottom-0 start-0 end-0 text-center pb-3 text-white-50" style={{ fontSize: '.72rem' }}>
        © 2025 EasyShop Marketing Pvt Ltd · Powered by SV ERP Solutions
      </div>
    </div>
  )
}
