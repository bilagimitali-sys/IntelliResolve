import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
  }, []);

  const loadNotifs = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifs(n => n.map(x => x.notif_id === id ? { ...x, is_read: 1 } : x));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/read-all/all');
      setNotifs(n => n.map(x => ({ ...x, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (n) => {
    markRead(n.notif_id);
    if (n.complaint_id && n.complaint_id > 0) {
      navigate(`/complaints/${n.complaint_id}`);
    } else {
      navigate('/complaints');
    }
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout breadcrumbs={[{ label: 'Notifications' }]}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Notifications Center</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Real-time status updates, coordinator responses, and system alerts
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {notifs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔔</div>
            <p>You have no notifications at this time.</p>
          </div>
        ) : (
          <div>
            {notifs.map(n => (
              <div
                key={n.notif_id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: n.is_read ? 'transparent' : 'rgba(182, 8, 29, 0.04)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: n.is_read ? 'var(--slate-300)' : 'var(--primary)',
                    flexShrink: 0
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: n.is_read ? 500 : 700, color: 'var(--text-primary)' }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(n.sent_at).toLocaleString()}
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(n.notif_id);
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
