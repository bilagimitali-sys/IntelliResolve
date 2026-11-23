import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

export default function MyComplaints() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dept'); // 'dept' | 'bus'
  const [deptList, setDeptList] = useState([]);
  const [busList, setBusList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [deptRes, busRes] = await Promise.all([
        axios.get('/api/complaints'),
        axios.get('/api/bus-complaints'),
      ]);
      setDeptList(deptRes.data || []);
      setBusList(busRes.data || []);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDept = deptList.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredBus = busList.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout breadcrumbs={[{ label: 'Grievances', path: '/complaints' }, { label: 'My Submissions' }]}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Grievance Submissions</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Track resolution status and communications across campus departments and transportation
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/complaints/new')}>
          ＋ New Grievance
        </button>
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

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ maxWidth: 320 }}
          placeholder="🔍 Search grievance title or details..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="form-select"
          style={{ maxWidth: 200 }}
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
      </div>

      {/* Tables */}
      <div className="card" style={{ padding: 0 }}>
        {activeTab === 'dept' ? (
          filteredDept.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🏛️</div>
              <p>No department grievances found.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Department</th>
                    <th>Title & Incident</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDept.map(c => (
                    <tr key={c.complaint_id}>
                      <td><strong>#{c.complaint_id}</strong></td>
                      <td>
                        <span className="badge badge-priority-low">
                          {c.department_icon || '🏛️'} {c.department_code || 'DEPT'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        {c.is_safety_hazard === 1 && (
                          <span className="badge badge-hazard" style={{ marginTop: 4 }}>🚨 Safety Hazard</span>
                        )}
                      </td>
                      <td>{c.category}</td>
                      <td><span className={`badge badge-priority-${c.priority.toLowerCase()}`}>{c.priority}</span></td>
                      <td><span className={`badge badge-${c.status.toLowerCase().replace(' ', '-')}`}>{c.status}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/complaints/${c.complaint_id}`)}>
                          View →
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
              <p>No bus grievances found.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Route / Bus</th>
                    <th>Title</th>
                    <th>Issue Type</th>
                    <th>Incident Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBus.map(b => (
                    <tr key={b.bus_complaint_id}>
                      <td><strong>#B-{b.bus_complaint_id}</strong></td>
                      <td>
                        <div><strong>{b.route_number || 'Route'}</strong></div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.bus_number || 'Unassigned'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.title}</div>
                        {b.is_safety_hazard === 1 && (
                          <span className="badge badge-hazard" style={{ marginTop: 4 }}>🚨 Safety Alert</span>
                        )}
                      </td>
                      <td><span className="badge badge-assigned">{b.complaint_type.toUpperCase()}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(b.incident_datetime).toLocaleString()}</td>
                      <td><span className={`badge badge-${b.status.toLowerCase().replace(' ', '-')}`}>{b.status}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/bus-complaints/${b.bus_complaint_id}`)}>
                          View →
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
