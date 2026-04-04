import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/erp-theme.css'

const mainMenu = [
  { to: '/dashboard',  icon: 'bi-speedometer2',     label: 'Dashboard',     color: '#3b82f6' },
  { to: '/jobs',       icon: 'bi-clipboard2-data',  label: 'Jobs',          color: '#8b5cf6' },
  { to: '/employees',  icon: 'bi-people',           label: 'Employees',     color: '#10b981' },
  { to: '/customers',  icon: 'bi-person-lines-fill',label: 'Customers',     color: '#f59e0b' },
  { to: '/attendance', icon: 'bi-calendar-check',   label: 'Attendance',    color: '#06b6d4' },
  { to: '/advances',   icon: 'bi-cash-coin',        label: 'Advances',      color: '#84cc16' },
  { to: '/bills',      icon: 'bi-receipt',          label: 'Bills',         color: '#f43f5e' },
  { to: '/purchase',   icon: 'bi-truck',            label: 'Purchase',      color: '#0ea5e9' },
  { to: '/suppliers',  icon: 'bi-shop',             label: 'Suppliers',     color: '#a855f7' },
  { to: '/conversion', icon: 'bi-scissors',         label: 'Conversion',    color: '#14b8a6' },
  { to: '/reports',    icon: 'bi-bar-chart-line',   label: 'Reports',       color: '#f97316' },
  { to: '/settings',   icon: 'bi-gear',             label: 'Settings',      color: '#6b7280' },
]

const masterMenu = [
  { to: '/master/company',       icon: 'bi-building',      label: 'Company Master',      color: '#2563eb' },
  { to: '/master/gst',           icon: 'bi-percent',       label: 'GST Tax Master',      color: '#d97706' },
  { to: '/master/hsn',           icon: 'bi-upc',           label: 'HSN Master',          color: '#7c3aed' },
  { to: '/master/groups',        icon: 'bi-collection',    label: 'Group Master',        color: '#0891b2' },
  { to: '/master/subgroups',     icon: 'bi-diagram-2',     label: 'Subgroup Master',     color: '#0e7490' },
  { to: '/master/categories',    icon: 'bi-tags',          label: 'Category Master',     color: '#16a34a' },
  { to: '/master/subcategories', icon: 'bi-tag',           label: 'Subcategory Master',  color: '#15803d' },
  { to: '/master/brands',        icon: 'bi-award',         label: 'Brand Master',        color: '#dc2626' },
  { to: '/master/manufacturers', icon: 'bi-factory',       label: 'Manufacturer Master', color: '#475569' },
  { to: '/master/uom',           icon: 'bi-rulers',        label: 'UOM Master',          color: '#0284c7' },
  { to: '/items',                icon: 'bi-box-seam',      label: 'Item Master',         color: '#16a34a' },
]

const hwMenu = [
  { to: '/machines',  icon: 'bi-cpu',               label: 'Machines',        color: '#6366f1' },
  { to: '/serials',   icon: 'bi-qr-code-scan',      label: 'Serial Tracking', color: '#0891b2' },
  { to: '/services',  icon: 'bi-wrench-adjustable', label: 'Service Records', color: '#dc2626' },
]

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        'nav-link d-flex align-items-center gap-2 py-2 px-2 rounded-2 mb-1 ' + (isActive ? 'active' : '')
      }
      style={({ isActive }) => ({
        color: isActive ? '#fff' : '#94a3b8',
        background: isActive ? item.color + '30' : 'transparent',
        fontSize: '.82rem',
        fontWeight: isActive ? 600 : 400,
        textDecoration: 'none',
        transition: 'all .12s',
      })}
      onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#e2e8f0' }}
      onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' } }}
    >
      <i className={`bi ${item.icon}`} style={{ fontSize: '.9rem', color: item.color, width: 18, textAlign: 'center', flexShrink: 0 }} />
      {item.label}
    </NavLink>
  )
}

function SubNavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        'nav-link d-flex align-items-center gap-2 py-1 px-2 rounded-2 mb-1 ' + (isActive ? 'active' : '')
      }
      style={({ isActive }) => ({
        color: isActive ? '#fff' : '#94a3b8',
        background: isActive ? item.color + '30' : 'transparent',
        fontSize: '.77rem',
        fontWeight: isActive ? 600 : 400,
        paddingLeft: '1.75rem',
        textDecoration: 'none',
      })}
    >
      <i className={`bi ${item.icon}`} style={{ fontSize: '.8rem', color: item.color, width: 15, textAlign: 'center', flexShrink: 0 }} />
      {item.label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user } = useAuth()
  const [masterOpen, setMasterOpen] = useState(false)
  const [hwOpen, setHwOpen]         = useState(false)

  return (
    <div
      className="sidebar d-flex flex-column"
      style={{ background: '#0f172a', height: '100vh', overflowY: 'auto', overflowX: 'hidden', minWidth: 220, paddingBottom: '1rem' }}
    >
      {/* Logo */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <div style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(37,99,235,.4)' }}>
            <i className="bi bi-upc-scan text-white" style={{ fontSize: '1.05rem' }} />
          </div>
          <div>
            <div className="text-white fw-bold" style={{ fontSize: '.88rem', lineHeight: 1.2 }}>Barcode ERP</div>
            <div className="text-muted" style={{ fontSize: '.65rem', letterSpacing: '.04em' }}>v5.0 — EasyShop</div>
          </div>
        </div>
        {user && (
          <div className="d-flex align-items-center gap-2 p-2 rounded-2" style={{ background: 'rgba(255,255,255,.04)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="bi bi-person-fill text-white" style={{ fontSize: '.75rem' }} />
            </div>
            <div className="overflow-hidden">
              <div className="text-white" style={{ fontSize: '.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <span className="badge bg-primary" style={{ fontSize: '.6rem', padding: '1px 6px' }}>{user.role}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Navigation ── */}
      <div className="px-2 mt-2">
        <div className="sidebar-section-label">Navigation</div>
        <nav className="nav flex-column">
          {mainMenu.map(item => <NavItem key={item.to} item={item} />)}
        </nav>
      </div>

      {/* ── Master Section ── */}
      <div className="px-2 mt-2">
        <div className="sidebar-section-label">Masters</div>
        <button
          className="w-100 d-flex align-items-center justify-content-between px-2 py-2 rounded-2 border-0 mb-1"
          onClick={() => setMasterOpen(o => !o)}
          style={{ background: masterOpen ? 'rgba(37,99,235,.15)' : 'rgba(255,255,255,.04)', color: masterOpen ? '#60a5fa' : '#94a3b8', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}
        >
          <span className="d-flex align-items-center gap-2">
            <i className="bi bi-database" style={{ color: '#60a5fa' }} />
            Master Section
          </span>
          <i className={`bi ${masterOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ fontSize: '.7rem', opacity: .7 }} />
        </button>

        <div style={{ maxHeight: masterOpen ? 800 : 0, overflow: 'hidden', transition: 'max-height .25s ease' }}>
          <nav className="nav flex-column">
            {masterMenu.map(item => <SubNavItem key={item.to} item={item} />)}
          </nav>
        </div>
      </div>

      {/* ── Hardware Section ── */}
      <div className="px-2 mt-2">
        <div className="sidebar-section-label">Hardware</div>
        <button
          className="w-100 d-flex align-items-center justify-content-between px-2 py-2 rounded-2 border-0 mb-1"
          onClick={() => setHwOpen(o => !o)}
          style={{ background: hwOpen ? 'rgba(99,102,241,.15)' : 'rgba(255,255,255,.04)', color: hwOpen ? '#818cf8' : '#94a3b8', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}
        >
          <span className="d-flex align-items-center gap-2">
            <i className="bi bi-cpu" style={{ color: '#818cf8' }} />
            HW Tracking
          </span>
          <i className={`bi ${hwOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ fontSize: '.7rem', opacity: .7 }} />
        </button>

        <div style={{ maxHeight: hwOpen ? 200 : 0, overflow: 'hidden', transition: 'max-height .2s ease' }}>
          <nav className="nav flex-column">
            {hwMenu.map(item => <SubNavItem key={item.to} item={item} />)}
          </nav>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div className="px-3 pt-2 text-muted" style={{ fontSize: '.62rem', borderTop: '1px solid rgba(255,255,255,.06)', lineHeight: 1.8 }}>
        <i className="bi bi-code-slash me-1" />SV ERP Solutions<br />
        &copy; 2025 EasyShop Marketing Pvt Ltd
      </div>
    </div>
  )
}
