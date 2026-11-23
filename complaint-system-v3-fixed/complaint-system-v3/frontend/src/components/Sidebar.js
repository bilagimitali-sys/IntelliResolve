import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ unreadCount = 0, isOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const getNavItems = () => {
    switch (user?.role) {
      case 'bus_coordinator':
        return [
          { path: '/bus/dashboard',  icon: '🚌', label: 'Transport Hub' },
          { path: '/bus/complaints', icon: '📋', label: 'Bus Grievances' },
          { path: '/bus/fleet',      icon: '🚏', label: 'Fleet & Routes' },
          { path: '/bus/analytics',  icon: '📊', label: 'Transit Analytics' },
          { path: '/notifications',  icon: '🔔', label: 'Notifications' },
        ];
      case 'department_coordinator':
      case 'faculty':
      case 'staff':
        return [
          { path: '/dept/dashboard',  icon: '🏛️', label: 'Dept Dashboard' },
          { path: '/dept/complaints', icon: '📋', label: 'Dept Grievances' },
          { path: '/dept/analytics',  icon: '📊', label: 'Analytics' },
          { path: '/notifications',   icon: '🔔', label: 'Notifications' },
        ];
      case 'admin':
        return [
          { path: '/admin/dashboard',    icon: '⚡', label: 'Command Center' },
          { path: '/admin/complaints',   icon: '📋', label: 'All Grievances' },
          { path: '/admin/coordinators', icon: '👥', label: 'Coordinators' },
          { path: '/admin/fleet',        icon: '🚌', label: 'Fleet & Routes' },
          { path: '/admin/analytics',    icon: '📊', label: 'Campus Analytics' },
          { path: '/notifications',      icon: '🔔', label: 'Notifications' },
        ];
      case 'student':
      default:
        return [
          { path: '/dashboard',      icon: '🏠', label: 'Overview' },
          { path: '/complaints/new', icon: '➕', label: 'New Grievance' },
          { path: '/complaints',     icon: '📋', label: 'My Grievances' },
          { path: '/notifications',  icon: '🔔', label: 'Notifications' },
        ];
    }
  };

  const navItems = getNavItems();
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const formatRole = (r) => {
    if (!r) return 'User';
    if (r === 'department_coordinator') return 'Dept Coordinator';
    if (r === 'bus_coordinator') return 'Bus Coordinator';
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* University Crest Header */}
        <div className="sidebar-header">
          <img
            src="/kle-logo.png"
            alt="KLE Tech Logo"
            className="sidebar-logo-img"
          />
          <div>
            <div className="sidebar-brand-name">KLE Tech Grievance</div>
            <div className="sidebar-brand-sub">Belagavi Campus</div>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.path === '/notifications' && unreadCount > 0 && (
                <span className="nav-badge-pill">{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer Profile & Controls */}
        <div className="sidebar-footer">
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>

          <div className="user-profile-card">
            <div className="user-avatar-circle">{initials}</div>
            <div className="user-meta-text">
              <div className="user-name" title={user?.name}>{user?.name}</div>
              <div className="user-role-label" title={user?.department || formatRole(user?.role)}>
                {user?.department ? `${user.department} (${formatRole(user?.role)})` : formatRole(user?.role)}
              </div>
            </div>
          </div>

          <button
            className="nav-item"
            style={{ color: '#F87171' }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <span className="icon">⏻</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
