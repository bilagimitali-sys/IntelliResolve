import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const studentNav = [
  { path: '/dashboard',          icon: '◈', label: 'Dashboard' },
  { path: '/complaints/new',     icon: '＋', label: 'New Complaint' },
  { path: '/complaints',         icon: '☰', label: 'My Complaints' },
  { path: '/notifications',      icon: '◎', label: 'Notifications' },
];

const adminNav = [
  { path: '/dashboard',          icon: '◈', label: 'Dashboard' },
  { path: '/admin/complaints',   icon: '☰', label: 'All Complaints' },
  { path: '/admin/analytics',    icon: '▦', label: 'Analytics' },
  { path: '/notifications',      icon: '◎', label: 'Notifications' },
];

export default function Sidebar({ unreadCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const navItems  = (user?.role === 'admin' || user?.role === 'staff') ? adminNav : studentNav;
  const initials  = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>CMS</h2>
        <span>Complaint System</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
            {item.path === '/notifications' && unreadCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: 'var(--danger)',
                color: 'white',
                borderRadius: '10px',
                padding: '1px 7px',
                fontSize: '11px',
                fontWeight: '600'
              }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button
          className="nav-item"
          style={{ marginTop: 8, color: 'var(--danger)' }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          <span className="icon">⏻</span>
          Logout
        </button>
      </div>
    </div>
  );
}
