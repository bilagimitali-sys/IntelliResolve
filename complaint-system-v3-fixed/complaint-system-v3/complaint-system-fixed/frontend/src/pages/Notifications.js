import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { loadNotifs(); }, []);

  const loadNotifs = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    await axios.put(`/api/notifications/${id}/read`);
    setNotifs(n => n.map(x => x.notif_id === id ? { ...x, is_read: true } : x));
  };

  const markAllRead = async () => {
    await axios.put('/api/notifications/read-all/all');
    setNotifs(n => n.map(x => ({ ...x, is_read: true })));
  };

  const unread = notifs.filter(n => !n.is_read).length;

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {notifs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔔</div>
            <p>No notifications yet.</p>
          </div>
        ) : (
          notifs.map(n => (
            <div key={n.notif_id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: n.is_read ? 'transparent' : 'rgba(108,99,255,0.04)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => {
                markRead(n.notif_id);
                navigate(`/complaints/${n.complaint_id}`);
              }}
            >
              <div style={{
                width: 8, height: 8,
                borderRadius: '50%',
                background: n.is_read ? 'var(--border)' : 'var(--accent)',
                marginTop: 6,
                flexShrink: 0,
              }} />

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: n.is_read ? 400 : 500 }}>
                  {n.message}
                </div>
                <div className="text-xs" style={{ marginTop: 4 }}>
                  Complaint #{n.complaint_id}: {n.complaint_title} · {new Date(n.sent_at).toLocaleString()}
                </div>
              </div>

              {!n.is_read && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); markRead(n.notif_id); }}
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
