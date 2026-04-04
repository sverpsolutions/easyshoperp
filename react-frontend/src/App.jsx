import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Core Pages
import Login from './pages/Login'
import EmployeeLogin from './pages/EmployeeLogin'
import Layout from './components/Layout'
import OwnerDashboard  from './pages/owner/Dashboard'
import JobsPage        from './pages/owner/Jobs'
import EmployeesPage   from './pages/owner/Employees'
import CustomersPage   from './pages/owner/Customers'
import AttendancePage  from './pages/owner/Attendance'
import AdvancesPage    from './pages/owner/Advances'
import BillsPage       from './pages/owner/Bills'
import ReportsPage     from './pages/owner/Reports'
import SettingsPage    from './pages/owner/Settings'
import MachinesPage    from './pages/owner/Machines'
import ItemsPage       from './pages/owner/Items'
import SuppliersPage   from './pages/owner/Suppliers'
import PurchasePage    from './pages/owner/Purchase'
import ConversionPage  from './pages/owner/Conversion'
import OperatorDashboard from './pages/operator/Dashboard'

// ── Master Pages ──────────────────────────────────────────────
import CompanyMaster      from './pages/owner/master/CompanyMaster'
import GSTMaster          from './pages/owner/master/GSTMaster'
import HSNMaster          from './pages/owner/master/HSNMaster'
import UOMMaster          from './pages/owner/master/UOMMaster'
import ManufacturerMaster from './pages/owner/master/ManufacturerMaster'
import BrandMaster        from './pages/owner/master/BrandMaster'
import GroupMaster        from './pages/owner/master/GroupMaster'
import SubgroupMaster     from './pages/owner/master/SubgroupMaster'
import CategoryMaster     from './pages/owner/master/CategoryMaster'
import SubcategoryMaster  from './pages/owner/master/SubcategoryMaster'

// ── Hardware Pages ────────────────────────────────────────────
import SerialMasterPage   from './pages/owner/SerialMaster'
import ServiceRecordsPage from './pages/owner/ServiceRecords'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="d-flex vh-100 align-items-center justify-content-center">
      <div className="spinner-border text-primary" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return user.role === 'Operator'
      ? <Navigate to="/operator" replace />
      : <Navigate to="/dashboard" replace />
  }
  return children
}

const OA = ['Owner','Admin']

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login"          element={!user ? <Login />         : <Navigate to={user?.role === 'Operator' ? '/operator' : '/dashboard'} replace />} />
      <Route path="/employee-login" element={!user ? <EmployeeLogin /> : <Navigate to={user?.role === 'Operator' ? '/operator' : '/dashboard'} replace />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        {/* ── Main ── */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<PrivateRoute roles={OA}><OwnerDashboard /></PrivateRoute>} />
        <Route path="jobs"       element={<PrivateRoute roles={OA}><JobsPage /></PrivateRoute>} />
        <Route path="employees"  element={<PrivateRoute roles={OA}><EmployeesPage /></PrivateRoute>} />
        <Route path="customers"  element={<PrivateRoute roles={OA}><CustomersPage /></PrivateRoute>} />
        <Route path="attendance" element={<PrivateRoute roles={OA}><AttendancePage /></PrivateRoute>} />
        <Route path="advances"   element={<PrivateRoute roles={OA}><AdvancesPage /></PrivateRoute>} />
        <Route path="bills"      element={<PrivateRoute roles={OA}><BillsPage /></PrivateRoute>} />
        <Route path="reports"    element={<PrivateRoute roles={OA}><ReportsPage /></PrivateRoute>} />
        <Route path="machines"   element={<PrivateRoute roles={OA}><MachinesPage /></PrivateRoute>} />
        <Route path="items"      element={<PrivateRoute roles={OA}><ItemsPage /></PrivateRoute>} />
        <Route path="suppliers"  element={<PrivateRoute roles={OA}><SuppliersPage /></PrivateRoute>} />
        <Route path="purchase"   element={<PrivateRoute roles={OA}><PurchasePage /></PrivateRoute>} />
        <Route path="conversion" element={<PrivateRoute roles={OA}><ConversionPage /></PrivateRoute>} />
        <Route path="settings"   element={<PrivateRoute roles={OA}><SettingsPage /></PrivateRoute>} />

        {/* ── Masters ── */}
        <Route path="master/company"       element={<PrivateRoute roles={OA}><CompanyMaster /></PrivateRoute>} />
        <Route path="master/gst"           element={<PrivateRoute roles={OA}><GSTMaster /></PrivateRoute>} />
        <Route path="master/hsn"           element={<PrivateRoute roles={OA}><HSNMaster /></PrivateRoute>} />
        <Route path="master/uom"           element={<PrivateRoute roles={OA}><UOMMaster /></PrivateRoute>} />
        <Route path="master/manufacturers" element={<PrivateRoute roles={OA}><ManufacturerMaster /></PrivateRoute>} />
        <Route path="master/brands"        element={<PrivateRoute roles={OA}><BrandMaster /></PrivateRoute>} />
        <Route path="master/groups"        element={<PrivateRoute roles={OA}><GroupMaster /></PrivateRoute>} />
        <Route path="master/subgroups"     element={<PrivateRoute roles={OA}><SubgroupMaster /></PrivateRoute>} />
        <Route path="master/categories"    element={<PrivateRoute roles={OA}><CategoryMaster /></PrivateRoute>} />
        <Route path="master/subcategories" element={<PrivateRoute roles={OA}><SubcategoryMaster /></PrivateRoute>} />

        {/* ── Hardware Tracking ── */}
        <Route path="serials"  element={<PrivateRoute roles={OA}><SerialMasterPage /></PrivateRoute>} />
        <Route path="services" element={<PrivateRoute roles={OA}><ServiceRecordsPage /></PrivateRoute>} />

        {/* ── Operator ── */}
        <Route path="operator" element={<PrivateRoute><OperatorDashboard /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
