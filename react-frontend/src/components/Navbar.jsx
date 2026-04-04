import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="top-navbar d-flex align-items-center justify-content-between">
      <div className="fw-semibold text-muted">
        <i className="bi bi-factory me-2"></i>
        Barcode Label Factory
      </div>
      <div className="d-flex align-items-center gap-3">
        <span className="text-muted small">
          <i className="bi bi-person-circle me-1"></i>
          {user?.name} ({user?.role})
        </span>
        <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-1"></i>
          Logout
        </button>
      </div>
    </nav>
  )
}
