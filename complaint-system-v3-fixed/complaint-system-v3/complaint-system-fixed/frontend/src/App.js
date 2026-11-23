import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

import Login            from './pages/Login';
import Register         from './pages/Register';
import Dashboard        from './pages/Dashboard';
import NewComplaint     from './pages/NewComplaint';
import MyComplaints     from './pages/MyComplaints';
import ComplaintDetail  from './pages/ComplaintDetail';
import AdminComplaints  from './pages/AdminComplaints';
import Analytics        from './pages/Analytics';
import Notifications    from './pages/Notifications';

// Protected route wrapper
function Private({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}><div className="spinner" /></div>;
  if (!user)   return <Navigate to="/login" />;
  if (adminOnly && user.role === 'student') return <Navigate to="/dashboard" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      {/* Student + Admin */}
      <Route path="/dashboard"       element={<Private><Dashboard /></Private>} />
      <Route path="/complaints"      element={<Private><MyComplaints /></Private>} />
      <Route path="/complaints/new"  element={<Private><NewComplaint /></Private>} />
      <Route path="/complaints/:id"  element={<Private><ComplaintDetail /></Private>} />
      <Route path="/notifications"   element={<Private><Notifications /></Private>} />

      {/* Admin only */}
      <Route path="/admin/complaints" element={<Private adminOnly><AdminComplaints /></Private>} />
      <Route path="/admin/analytics"  element={<Private adminOnly><Analytics /></Private>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
