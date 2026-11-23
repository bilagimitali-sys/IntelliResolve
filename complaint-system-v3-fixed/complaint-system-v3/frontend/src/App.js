import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider }         from './context/ThemeContext';
import { SocketProvider }        from './context/SocketContext';
import './index.css';

// Public Pages
import Login             from './pages/Login';
import Register          from './pages/Register';

// Student Pages
import Dashboard         from './pages/Dashboard';
import NewComplaint      from './pages/NewComplaint';
import MyComplaints      from './pages/MyComplaints';
import ComplaintDetail   from './pages/ComplaintDetail';
import BusComplaintDetail from './pages/BusComplaintDetail';
import Notifications     from './pages/Notifications';

// Department Coordinator Pages
import FacultyDashboard  from './pages/FacultyDashboard';

// Bus Coordinator Pages
import BusCoordinatorDashboard from './pages/BusCoordinatorDashboard';
import BusFleetView            from './pages/BusFleetView';

// Admin Pages
import AdminDashboard    from './pages/AdminDashboard';
import AdminComplaints   from './pages/AdminComplaints';
import AdminCreateStaff  from './pages/AdminCreateStaff';
import Analytics         from './pages/Analytics';

// ── Strict Allow-List Route Guard ────────────────────────────
function Private({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-page)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the user's appropriate portal rather than a 403 screen
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'bus_coordinator') return <Navigate to="/bus/dashboard" replace />;
    if (['department_coordinator', 'faculty', 'staff'].includes(user.role)) return <Navigate to="/dept/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ── Role Redirect Root Helper ────────────────────────────────
function RoleRedirectRoot() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'bus_coordinator') return <Navigate to="/bus/dashboard" replace />;
  if (['department_coordinator', 'faculty', 'staff'].includes(user.role)) return <Navigate to="/dept/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ── Public Routes ── */}
      <Route path="/login"    element={user ? <RoleRedirectRoot /> : <Login />} />
      <Route path="/register" element={user ? <RoleRedirectRoot /> : <Register />} />

      {/* ── Student Portal Routes ── */}
      <Route path="/dashboard" element={
        <Private allowedRoles={['student']}><Dashboard /></Private>
      } />
      <Route path="/complaints/new" element={
        <Private allowedRoles={['student']}><NewComplaint /></Private>
      } />
      <Route path="/complaints" element={
        <Private allowedRoles={['student']}><MyComplaints /></Private>
      } />

      {/* ── Shared Grievance Detail Views (Scoped inside components) ── */}
      <Route path="/complaints/:id" element={
        <Private allowedRoles={['student', 'department_coordinator', 'faculty', 'staff', 'admin']}>
          <ComplaintDetail />
        </Private>
      } />
      <Route path="/bus-complaints/:id" element={
        <Private allowedRoles={['student', 'bus_coordinator', 'admin']}>
          <BusComplaintDetail />
        </Private>
      } />

      {/* ── Notifications Center ── */}
      <Route path="/notifications" element={
        <Private><Notifications /></Private>
      } />

      {/* ── Department Coordinator Portal ── */}
      <Route path="/dept/dashboard" element={
        <Private allowedRoles={['department_coordinator', 'faculty', 'staff']}>
          <FacultyDashboard />
        </Private>
      } />
      <Route path="/dept/complaints" element={
        <Private allowedRoles={['department_coordinator', 'faculty', 'staff']}>
          <FacultyDashboard />
        </Private>
      } />
      <Route path="/dept/analytics" element={
        <Private allowedRoles={['department_coordinator', 'faculty', 'staff']}>
          <Analytics />
        </Private>
      } />
      {/* Backward compatible route */}
      <Route path="/faculty/dashboard" element={<Navigate to="/dept/dashboard" replace />} />

      {/* ── Campus Transportation / Bus Coordinator Portal ── */}
      <Route path="/bus/dashboard" element={
        <Private allowedRoles={['bus_coordinator']}>
          <BusCoordinatorDashboard />
        </Private>
      } />
      <Route path="/bus/complaints" element={
        <Private allowedRoles={['bus_coordinator']}>
          <BusCoordinatorDashboard />
        </Private>
      } />
      <Route path="/bus/fleet" element={
        <Private allowedRoles={['bus_coordinator', 'admin']}>
          <BusFleetView />
        </Private>
      } />
      <Route path="/bus/analytics" element={
        <Private allowedRoles={['bus_coordinator']}>
          <Analytics />
        </Private>
      } />

      {/* ── University Administrator Portal ── */}
      <Route path="/admin/dashboard" element={
        <Private allowedRoles={['admin']}>
          <AdminDashboard />
        </Private>
      } />
      <Route path="/admin/complaints" element={
        <Private allowedRoles={['admin']}>
          <AdminComplaints />
        </Private>
      } />
      <Route path="/admin/coordinators" element={
        <Private allowedRoles={['admin']}>
          <AdminCreateStaff />
        </Private>
      } />
      <Route path="/admin/create-staff" element={<Navigate to="/admin/coordinators" replace />} />
      <Route path="/admin/fleet" element={
        <Private allowedRoles={['admin']}>
          <BusFleetView />
        </Private>
      } />
      <Route path="/admin/analytics" element={
        <Private allowedRoles={['admin']}>
          <Analytics />
        </Private>
      } />

      {/* ── Root & Fallback ── */}
      <Route path="/" element={<RoleRedirectRoot />} />
      <Route path="*" element={<RoleRedirectRoot />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
