import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [stats,     setStats]     = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  // BUG FIX: useCallback so the function ref is stable for useEffect dep array
  const loadData = useCallback(async () => {
    try {
      const res = await axios.get('/api/complaints');
      const complaints = res.data;
      setRecent(complaints.slice(0, 5));
      setStats({
        total:      complaints.length,
        pending:    complaints.filter(c => c.status === 'Pending').length,
        inProgress: complaints.filter(c => c.status === 'In Progress').length,
        resolved:   complaints.filter(c => c.status === 'Resolved').length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // BUG FIX: include isAdmin and navigate in deps to avoid stale closure warning
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/complaints');
      return;
    }
    loadData();
  }, [isAdmin, navigate, loadData]);

  const statusBadge = (status) => {
    const map = { 'Pending': 'badge-pending', 'In Progress': 'badge-progress', 'Resolved': 'badge-resolved' };
    return <span className={`badge ${map[status] || ''}`}>{status}</span>;
  };

  const priorityBadge = (p) => {
    const map = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
    return <span className={`badge ${map[p]}`}>{p}</span>;
  };

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Welcome back, {user?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/complaints/new')}>
          ＋ New Complaint
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-label">Total Complaints</div>
          <div className="stat-value">{stats?.total || 0}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats?.pending || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats?.inProgress || 0}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Resolved</div>
          <div className="stat-value">{stats?.resolved || 0}</div>
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recent Complaints</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/complaints')}>
            View All
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No complaints yet. Submit your first complaint.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }}
              onClick={() => navigate('/complaints/new')}>
              Submit Complaint
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(c => (
                  <tr key={c.complaint_id}>
                    <td className="text-xs">#{c.complaint_id}</td>
                    <td style={{ fontWeight: 500 }}>{c.title}</td>
                    <td><span className="text-sm">{c.category}</span></td>
                    <td>{priorityBadge(c.priority)}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td className="text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/complaints/${c.complaint_id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
