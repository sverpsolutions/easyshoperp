import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function EmployeeLogin() {
  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      if (user.role === 'Owner' || user.role === 'Admin') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/operator', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

      {/* Factory branding */}
      <div className="text-center mb-4">
        <div className="rounded-circle bg-warning d-inline-flex align-items-center justify-content-center mb-3"
          style={{ width: 70, height: 70 }}>
          <i className="bi bi-person-badge fs-2 text-dark"></i>
        </div>
        <h3 className="text-white fw-bold mb-1">Employee Login</h3>
        <p className="text-white-50 small">Barcode Label Factory — Operator Portal</p>
      </div>

      {/* Login Card */}
      <div className="card border-0 shadow-lg" style={{ width: 380 }}>
        <div className="card-body p-4">

          {error && (
            <div className="alert alert-danger py-2 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Employee Username</label>
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-light"><i className="bi bi-person text-muted"></i></span>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Password</label>
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-light"><i className="bi bi-lock text-muted"></i></span>
                <input
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-warning w-100 py-2 fw-bold fs-5"
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right me-2"></i>Sign In</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer link to admin */}
      <div className="mt-4 text-center">
        <Link to="/login" className="text-white-50 small text-decoration-none">
          <i className="bi bi-shield-lock me-1"></i>Admin / Owner Login →
        </Link>
      </div>

      {/* Help text */}
      <div className="mt-3 text-center">
        <small className="text-white-50">
          Forgot your password? Contact your supervisor.
        </small>
      </div>
    </div>
  )
}
