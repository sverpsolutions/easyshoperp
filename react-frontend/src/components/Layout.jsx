import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user } = useAuth()
  if (!user) return null

  // Operators get simple layout without sidebar
  if (user.role === 'Operator') {
    return (
      <div>
        <Navbar />
        <div className="container-fluid py-4">
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="main-content flex-grow-1">
        <Navbar />
        <div className="container-fluid p-4">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
