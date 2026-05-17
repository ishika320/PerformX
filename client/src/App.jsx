import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import CompleteProfile from './pages/CompleteProfile'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import Approvals from './pages/Approvals'
import Audit from './pages/Audit'
import Notifications from './pages/Notifications'
import ProgressUpdates from './pages/ProgressUpdates'
import Checkins from './pages/Checkins'
import TeamDashboard from './pages/TeamDashboard'
import TeamAnalytics from './pages/TeamAnalytics'
import UserManagement from './pages/UserManagement'
import Reports from './pages/Reports'
import SystemSettings from './pages/SystemSettings'
import ManagerCheckins from './pages/ManagerCheckins'
import CompletionDashboard from './pages/CompletionDashboard'
import EmployeeHome from './pages/EmployeeHome'
import ManagerHome from './pages/ManagerHome'
import AdminHome from './pages/AdminHome'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto p-4 pt-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute requireRole="manager"><Dashboard /></ProtectedRoute>}
          />
          <Route path="/employee" element={<ProtectedRoute requireRole="employee"><EmployeeHome /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute requireRole="manager"><ManagerHome /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminHome /></ProtectedRoute>} />
          <Route
            path="/goals"
            element={<ProtectedRoute><Goals /></ProtectedRoute>}
          />
          <Route
            path="/approvals"
            element={<ProtectedRoute requireRole="manager"><Approvals /></ProtectedRoute>}
          />
          <Route
            path="/team-dashboard"
            element={<ProtectedRoute requireRole="manager"><TeamDashboard /></ProtectedRoute>}
          />
          <Route
            path="/team-analytics"
            element={<ProtectedRoute requireRole="manager"><TeamAnalytics /></ProtectedRoute>}
          />
          <Route
            path="/manager-checkins"
            element={<ProtectedRoute requireRole="manager"><ManagerCheckins /></ProtectedRoute>}
          />
          <Route
            path="/completion"
            element={<ProtectedRoute requireRole="manager"><CompletionDashboard /></ProtectedRoute>}
          />
          <Route
            path="/progress"
            element={<ProtectedRoute><ProgressUpdates /></ProtectedRoute>}
          />
          <Route
            path="/checkins"
            element={<ProtectedRoute><Checkins /></ProtectedRoute>}
          />
          <Route
            path="/users"
            element={<ProtectedRoute requireRole="admin"><UserManagement /></ProtectedRoute>}
          />
          <Route
            path="/reports"
            element={<ProtectedRoute requireRole="admin"><Reports /></ProtectedRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute requireRole="admin"><SystemSettings /></ProtectedRoute>}
          />
          <Route
            path="/audit"
            element={<ProtectedRoute requireRole="admin"><Audit /></ProtectedRoute>}
          />
          <Route
            path="/notifications"
            element={<ProtectedRoute><Notifications /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
