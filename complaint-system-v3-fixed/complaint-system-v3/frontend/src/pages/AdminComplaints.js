import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

export default function AdminComplaints() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'bus' ? 'bus' : 'dept';
  const initialStatus = queryParams.get('status') || '';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [deptList, setDeptList] = useState([]);
  const [busList, setBusList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterDept, setFilterDept] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, busRes, deptsRes, routesRes] = await Promise.all([
        axios.get('/api/complaints'),
        axios.get('/api/bus-complaints'),
        axios.get('/api/departments'),
        axios.get('/api/bus-complaints/routes'),
      ]);
      setDeptList(deptRes.data || []);
      setBusList(busRes.data || []);
      setDepartments(deptsRes.data || []);
      setRoutes(routesRes.data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDept = deptList.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterDept && String(c.department_id) !== String(filterDept)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredBus = busList.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterRoute && String(b.route_id) !== String(filterRoute)) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout breadcrumbs={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'All Grievances' }]}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Central Grievance Registry</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            System-wide complaints across all university departments and campus transportation routes
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button
          className="btn"
          style={{
            borderRadius: '8px 8px 0 0',
            borderBottom: activeTab === 'dept' ? '3px solid var(--primary)' : '3px solid transparent',
            background: activeTab === 'dept' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'dept' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700
          }}
          onClick={() => { setActiveTab('dept'); setFilterStatus(''); }}
        >
          🏛️ Department Grievances ({deptList.length})
        </button>
        <button
          className="btn"
          style={{
            borderRadius: '8px 8px 0 0',
            borderBottom: activeTab === 'bus' ? '3px solid var(--primary)' : '3px solid transparent',
            background: activeTab === 'bus' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'bus' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700
          }}
          onClick={() => { setActiveTab('bus'); setFilterStatus(''); }}
        >
          🚌 Transportation Grievances ({busList.length})
        </button>
      </div>

      {/* Filters */}
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
            {activeTab === 'dept' ? (
              <>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </>
            ) : (
              <>
                <option value="Received">Received</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Escalated">Escalated</option>
              </>
            )}
          </select>

          {activeTab === 'dept' ? (
            <select
              className="form-select"
              style={{ maxWidth: 240 }}
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.code} — {d.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="form-select"
              style={{ maxWidth: 240 }}
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
          )}

          {(filterStatus || filterDept || filterRoute || search) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setFilterStatus(''); setFilterDept(''); setFilterRoute(''); setSearch(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {activeTab === 'dept' ? (
          filteredDept.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🏛️</div>
              <p>No department grievances match the selected criteria.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Department</th>
                    <th>Student Name</th>
                    <th>Title & Description</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDept.map(c => (
                    <tr key={c.complaint_id} style={{ background: c.is_safety_hazard === 1 ? '#FFF5F5' : 'transparent' }}>
                      <td><strong>#{c.complaint_id}</strong></td>
                      <td>
                        <span className="badge badge-priority-low">
                          {c.department_icon} {c.department_code}
                        </span>
                      </td>
                      <td>{c.student_name}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        {c.is_safety_hazard === 1 && (
                          <span className="badge badge-hazard" style={{ marginTop: 4 }}>🚨 Safety Alert</span>
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
                          Triage →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredBus.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🚌</div>
              <p>No bus grievances match the selected criteria.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Route / Vehicle</th>
                    <th>Student Name</th>
                    <th>Title</th>
                    <th>Issue Type</th>
                    <th>Status</th>
                    <th>Incident Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBus.map(b => (
                    <tr key={b.bus_complaint_id} style={{ background: b.status === 'Escalated' ? '#FEF2F2' : (b.is_safety_hazard === 1 ? '#FFF5F5' : 'transparent') }}>
                      <td><strong>#B-{b.bus_complaint_id}</strong></td>
                      <td>
                        <div><strong>{b.route_number || 'Transit'}</strong></div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.bus_number || 'Unassigned'}</div>
                      </td>
                      <td>{b.student_name}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.title}</div>
                        {b.status === 'Escalated' && (
                          <span className="badge badge-escalated" style={{ marginTop: 4 }}>⚠️ ESCALATED</span>
                        )}
                        {b.is_safety_hazard === 1 && (
                          <span className="badge badge-hazard" style={{ marginTop: 4, marginLeft: 4 }}>🚨 Safety</span>
                        )}
                      </td>
                      <td><span className="badge badge-assigned">{b.complaint_type.toUpperCase()}</span></td>
                      <td><span className={`badge badge-${b.status.toLowerCase().replace(' ', '-')}`}>{b.status}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(b.incident_datetime).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/bus-complaints/${b.bus_complaint_id}`)}
                        >
                          Review →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
