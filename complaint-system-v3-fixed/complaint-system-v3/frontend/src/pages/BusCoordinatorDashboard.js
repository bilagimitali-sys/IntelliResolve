import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function BusCoordinatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { newComplaintAlert } = useSocket();

  const [complaints, setComplaints] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, busRes, routeRes] = await Promise.all([
        axios.get('/api/bus-complaints'),
        axios.get('/api/bus-complaints/buses'),
        axios.get('/api/bus-complaints/routes'),
      ]);
      setComplaints(compRes.data || []);
      setBuses(busRes.data || []);
      setRoutes(routeRes.data || []);
    } catch (err) {
      console.error('Bus dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when socket receives new complaint
  useEffect(() => {
    if (newComplaintAlert) loadData();
  }, [newComplaintAlert, loadData]);

  const stats = {
    total: complaints.length,
    received: complaints.filter(c => c.status === 'Received').length,
    review: complaints.filter(c => c.status === 'Under Review').length,
    inProgress: complaints.filter(c => c.status === 'In Progress' || c.status === 'Assigned').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
    escalated: complaints.filter(c => c.status === 'Escalated').length,
    safetyAlerts: complaints.filter(c => c.is_safety_hazard === 1 && c.status !== 'Resolved').length,
  };

  const filtered = complaints.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterType && c.complaint_type !== filterType) return false;
    if (filterRoute && String(c.route_id) !== String(filterRoute)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout breadcrumbs={[{ label: 'Transportation Hub' }]}>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Campus Transportation Coordinator Hub</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Belagavi Campus Transit Management · Fleet: {buses.length} Buses | {routes.length} Active Routes
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/bus/fleet')}>
          🚏 View Fleet & Schedules →
        </button>
      </div>

      {/* Safety Hazard Alert Strip */}
      {stats.safetyAlerts > 0 && (
        <div className="safety-alert-strip">
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <strong>URGENT: {stats.safetyAlerts} Active Transportation Safety Grievance(s) Detected!</strong>
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.9 }}>
              Includes rash driving, mechanical failure, or emergency incident. Prioritized at the top of the queue.
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon-wrap">🚌</div>
          <div>
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label-text">Total Grievances</div>
          </div>
        </div>
        <div className="stat-box warning">
          <div className="stat-icon-wrap" style={{ color: 'var(--secondary)' }}>📥</div>
          <div>
            <div className="stat-num">{stats.received}</div>
            <div className="stat-label-text">Received / New</div>
          </div>
        </div>
        <div className="stat-box info">
          <div className="stat-icon-wrap" style={{ color: '#2563EB' }}>⚙️</div>
          <div>
            <div className="stat-num">{stats.inProgress}</div>
            <div className="stat-label-text">Active / In Progress</div>
          </div>
        </div>
        <div className="stat-box success">
          <div className="stat-icon-wrap" style={{ color: '#16A34A' }}>✅</div>
          <div>
            <div className="stat-num">{stats.resolved}</div>
            <div className="stat-label-text">Resolved</div>
          </div>
        </div>
        {stats.escalated > 0 && (
          <div className="stat-box danger">
            <div className="stat-icon-wrap" style={{ color: '#DC2626' }}>⚠️</div>
            <div>
              <div className="stat-num">{stats.escalated}</div>
              <div className="stat-label-text">Escalated to Admin</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: 280 }}
            placeholder="🔍 Search title or keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            style={{ maxWidth: 180 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Under Review">Under Review</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Escalated">Escalated</option>
          </select>
          <select
            className="form-select"
            style={{ maxWidth: 180 }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">All Issue Types</option>
            <option value="delay">Delay</option>
            <option value="driver_behaviour">Driver Conduct</option>
            <option value="cleanliness">Cleanliness</option>
            <option value="maintenance">Maintenance</option>
            <option value="route_issue">Route Deviation</option>
            <option value="overcrowding">Overcrowding</option>
            <option value="safety">Safety</option>
          </select>
          <select
            className="form-select"
            style={{ maxWidth: 220 }}
            value={filterRoute}
            onChange={e => setFilterRoute(e.target.value)}
          >
            <option value="">All Routes</option>
            {routes.map(r => (
              <option key={r.route_id} value={r.route_id}>
                {r.route_number}: {r.route_name.slice(0, 24)}...
              </option>
            ))}
          </select>
          {(filterStatus || filterType || filterRoute || search) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setFilterStatus(''); setFilterType(''); setFilterRoute(''); setSearch(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Grievance Queue Table */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🚌</div>
            <p>No bus grievances match your search criteria.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Route / Vehicle</th>
                  <th>Incident Details</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Logged Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.bus_complaint_id} style={{ background: b.is_safety_hazard === 1 ? '#FFF5F5' : 'transparent' }}>
                    <td><strong>#B-{b.bus_complaint_id}</strong></td>
                    <td>
                      <div><strong>{b.route_number || 'Transit Route'}</strong></div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.bus_number || 'General Route'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.description}
                      </div>
                      {b.is_safety_hazard === 1 && (
                        <span className="badge badge-hazard" style={{ marginTop: 4 }}>🚨 Safety Alert</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-assigned" style={{ textTransform: 'capitalize' }}>
                        {b.complaint_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-priority-${b.priority.toLowerCase()}`}>{b.priority}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${b.status.toLowerCase().replace(' ', '-')}`}>{b.status}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/bus-complaints/${b.bus_complaint_id}`)}
                      >
                        Manage →
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
