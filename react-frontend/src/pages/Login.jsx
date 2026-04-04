import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      navigate(user.role === 'Operator' ? '/operator' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-lg border-0" style={{ width: 400 }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-upc-scan display-4 text-primary"></i>
            <h4 className="mt-2 fw-bold">Barcode MES</h4>
            <p className="text-muted small">Manufacturing Execution System</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2">
              <i className="bi bi-exclamation-triangle me-2"></i>{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Username</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-person"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold">Password</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-lock"></i></span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Logging in...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right me-2"></i>Login</>
              )}
            </button>
          </form>

          <div className="text-center mt-3 pt-3 border-top">
            <Link to="/employee-login" className="text-decoration-none text-muted small">
              <i className="bi bi-person-badge me-1"></i>Employee / Operator Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
