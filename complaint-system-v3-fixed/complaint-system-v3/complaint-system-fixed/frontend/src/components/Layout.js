import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import AiChatWidget from './AiChatWidget';
import { useSocket } from '../context/SocketContext';
import { useAuth }   from '../context/AuthContext';

export default function Layout({ children, breadcrumbs = [] }) {
  const [unread, setUnread] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { newComplaintAlert, clearAlert } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Load unread count & poll every 30s
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = () => {
      axios.get('/api/notifications')
        .then(res => {
          if (isMounted) {
            const count = res.data.filter(n => !n.is_read).length;
            setUnread(count);
          }
        })
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-layout">
      {/* Sidebar with Mobile Drawer */}
      <Sidebar
        unreadCount={unread}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="main-content">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="nav-left-group">
            <button
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle Navigation Menu"
            >
              ☰
            </button>

            {/* Breadcrumbs */}
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link to="/dashboard">Portal</Link>
              {breadcrumbs.map((b, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="breadcrumb-separator">/</span>
                  {b.path ? <Link to={b.path}>{b.label}</Link> : <span className="breadcrumb-current">{b.label}</span>}
                </span>
              ))}
              {breadcrumbs.length === 0 && (
                <>
                  <span className="breadcrumb-separator">/</span>
                  <span className="breadcrumb-current">Dashboard</span>
                </>
              )}
            </nav>
          </div>

          <div className="nav-right-group">
            {/* Notifications Button */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/notifications')}
              style={{ position: 'relative' }}
              title="Notifications"
            >
              🔔 Notifications
              {unread > 0 && (
                <span className="nav-badge-pill" style={{ position: 'relative', top: 'auto', right: 'auto' }}>
                  {unread}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Real-Time Toast Notification */}
        {newComplaintAlert && (
          <div
            style={{
              margin: '16px 32px 0 32px',
              padding: '12px 18px',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderLeft: '4px solid var(--primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📢</span>
              <div>
                <strong style={{ color: '#FCD34D' }}>
                  New {newComplaintAlert.bus_complaint_id ? 'Bus Complaint' : 'Grievance'} #{newComplaintAlert.bus_complaint_id || newComplaintAlert.complaint_id}
                </strong>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  {newComplaintAlert.title}
                </div>
              </div>
            </div>
            <button
              onClick={clearAlert}
              style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Page Content */}
        <div className="content-container">
          {children}
        </div>

        {/* University Branded Footer */}
        <footer style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          padding: '24px 32px',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/kle-logo.png"
                alt="KLE Tech Logo"
                style={{ width: 24, height: 24, objectFit: 'contain' }}
              />
              <span>
                <strong>KLE Technological University</strong> — Belagavi Campus, Karnataka – 590008
              </span>
            </div>
            <div>
              Grievance Cell: <a href="mailto:grievance@kletech.ac.in">grievance@kletech.ac.in</a> | NAAC 'A' Grade | UGC Recognised
            </div>
          </div>
        </footer>

        {/* Global AI Grievance Assistant Widget */}
        <AiChatWidget />
      </main>
    </div>
  );
}
