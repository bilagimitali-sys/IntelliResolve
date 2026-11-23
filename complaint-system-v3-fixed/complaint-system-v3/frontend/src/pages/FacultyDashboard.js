import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth }   from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function FacultyDashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { newComplaintAlert } = useSocket();

  const [complaints, setComplaints] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState({ status: '', category: '', priority: '', search: '' });

  // Reload list whenever a real-time newComplaint arrives
  useEffect(() => {
    if (newComplaintAlert) load();
  }, [newComplaintAlert]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status)   params.status   = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search)   params.search   = filters.search;
      const res = await axios.get('/api/complaints', { params });
      setComplaints(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total:      complaints.length,
    pending:    complaints.filter(c => c.status === 'Pending').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved:   complaints.filter(c => c.status === 'Resolved').length,
    safetyAlerts: complaints.filter(c => c.is_safety_hazard === 1 && c.status !== 'Resolved').length,
  };

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout breadcrumbs={[{ label: 'Department Portal' }]}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>
            {user?.department || 'Department'} Grievance Management
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Welcome, {user?.name} · Department Coordinator Portal · Belagavi Campus
          </p>
        </div>
      </div>

      {/* Safety Alerts */}
      {stats.safetyAlerts > 0 && (
        <div className="safety-alert-strip">
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <strong>URGENT: {stats.safetyAlerts} Department Safety / Emergency Grievance(s) Require Immediate Attention!</strong>
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.9 }}>
              Flagged for safety, health, or harassment risks. Prioritized at the top of the queue.
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon-wrap">🏛️</div>
          <div>
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label-text">Dept Grievances</div>
          </div>
        </div>
        <div className="stat-box warning">
          <div className="stat-icon-wrap" style={{ color: 'var(--secondary)' }}>⏳</div>
          <div>
            <div className="stat-num">{stats.pending}</div>
            <div className="stat-label-text">Pending Review</div>
          </div>
        </div>
        <div className="stat-box info">
          <div className="stat-icon-wrap" style={{ color: '#2563EB' }}>⚙️</div>
          <div>
            <div className="stat-num">{stats.inProgress}</div>
            <div className="stat-label-text">In Progress</div>
          </div>
        </div>
        <div className="stat-box success">
          <div className="stat-icon-wrap" style={{ color: '#16A34A' }}>✅</div>
          <div>
            <div className="stat-num">{stats.resolved}</div>
            <div className="stat-label-text">Resolved</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: 280 }}
            placeholder="🔍 Search title or keywords..."
            value={filters.search}
            onChange={e => setF('search', e.target.value)}
          />
          <select
            className="form-select"
            style={{ maxWidth: 180 }}
            value={filters.status}
            onChange={e => setF('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select
            className="form-select"
            style={{ maxWidth: 180 }}
            value={filters.priority}
            onChange={e => setF('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          {(filters.status || filters.priority || filters.search) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setFilters({ status: '', category: '', priority: '', search: '' })}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Complaints Table */}
      <div className="card" style={{ padding: 0 }}>
        {complaints.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📂</div>
            <p>No complaints routed to your department matching the filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Title & Description</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.complaint_id} style={{ background: c.is_safety_hazard === 1 ? '#FFF5F5' : 'transparent' }}>
                    <td><strong>#{c.complaint_id}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </div>
                      {c.is_safety_hazard === 1 && (
                        <span className="badge badge-hazard" style={{ marginTop: 4 }}>🚨 Safety Hazard</span>
                      )}
                    </td>
                    <td>{c.category}</td>
                    <td><span className={`badge badge-priority-${c.priority.toLowerCase()}`}>{c.priority}</span></td>
                    <td><span className={`badge badge-${c.status.toLowerCase().replace(' ', '-')}`}>{c.status}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/complaints/${c.complaint_id}`)}
                      >
                        Manage & Reply →
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
