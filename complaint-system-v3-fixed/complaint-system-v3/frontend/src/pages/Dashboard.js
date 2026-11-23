import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [stats,    setStats]   = useState(null);
  const [recentDept, setRecentDept] = useState([]);
  const [recentBus,  setRecentBus]  = useState([]);
  const [loading,  setLoading] = useState(true);

  // Role routing enforcement: redirect non-students to their respective operational portals
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (user.role === 'bus_coordinator') {
      navigate('/bus/dashboard');
    } else if (['department_coordinator', 'faculty', 'staff'].includes(user.role)) {
      navigate('/dept/dashboard');
    }
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch department complaints
      const deptRes = await axios.get('/api/complaints');
      const deptList = deptRes.data || [];

      // 2. Fetch bus complaints
      const busRes = await axios.get('/api/bus-complaints');
      const busList = busRes.data || [];

      setRecentDept(deptList.slice(0, 4));
      setRecentBus(busList.slice(0, 4));

      const totalAll = deptList.length + busList.length;
      const pendingAll = deptList.filter(c => c.status === 'Pending').length + busList.filter(c => c.status === 'Received' || c.status === 'Under Review').length;
      const inProgressAll = deptList.filter(c => c.status === 'In Progress').length + busList.filter(c => c.status === 'In Progress' || c.status === 'Assigned').length;
      const resolvedAll = deptList.filter(c => c.status === 'Resolved').length + busList.filter(c => c.status === 'Resolved').length;

      setStats({
        total: totalAll,
        pending: pendingAll,
        inProgress: inProgressAll,
        resolved: resolvedAll,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'student') loadData();
  }, [user, loadData]);

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout breadcrumbs={[{ label: 'Student Portal' }]}>
      {/* University Hero Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--slate-900) 0%, #1E293B 100%)',
        borderRadius: '16px',
        padding: '36px 32px',
        color: '#FFFFFF',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img
            src="/kle-logo.png"
            alt="KLE Tech Crest"
            style={{ width: '60px', height: '60px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '12px', padding: '4px' }}
          />
          <div>
            <h1 style={{ fontSize: '26px', color: '#FFFFFF', marginBottom: '4px' }}>
              Welcome back, {user?.name}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--slate-300)' }}>
              {user?.department || 'Student'} · KLE Technological University, Belagavi Campus
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/complaints/new')}
          >
            ➕ Lodge New Grievance
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon-wrap">📋</div>
          <div>
            <div className="stat-num">{stats?.total || 0}</div>
            <div className="stat-label-text">Total Submitted</div>
          </div>
        </div>
        <div className="stat-box warning">
          <div className="stat-icon-wrap" style={{ color: 'var(--secondary)' }}>⏳</div>
          <div>
            <div className="stat-num">{stats?.pending || 0}</div>
            <div className="stat-label-text">Pending Review</div>
          </div>
        </div>
        <div className="stat-box info">
          <div className="stat-icon-wrap" style={{ color: '#2563EB' }}>⚙️</div>
          <div>
            <div className="stat-num">{stats?.inProgress || 0}</div>
            <div className="stat-label-text">In Progress</div>
          </div>
        </div>
        <div className="stat-box success">
          <div className="stat-icon-wrap" style={{ color: '#16A34A' }}>✅</div>
          <div>
            <div className="stat-num">{stats?.resolved || 0}</div>
            <div className="stat-label-text">Resolved</div>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🏛️</div>
          <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>Department & Academic Grievance</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Submit grievances regarding academic matters, syllabus, hostel, examination, finance, or campus labs.
          </p>
          <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/complaints/new')}>
            Lodge Academic Grievance →
          </button>
        </div>

        <div className="card" style={{ borderLeft: '5px solid var(--secondary)' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🚌</div>
          <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>Bus & Transportation Grievance</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Report campus bus delays, driver conduct, vehicle maintenance issues, or route deviation directly to transport.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/complaints/new')}>
            Report Bus Issue →
          </button>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Grievances</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/complaints')}>
            View All Grievances
          </button>
        </div>

        {recentDept.length === 0 && recentBus.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📂</div>
            <p>You have not submitted any grievances yet.</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/complaints/new')}>
              Submit Your First Grievance
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Module</th>
                  <th>Title</th>
                  <th>Category / Type</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentDept.map(c => (
                  <tr key={`dept-${c.complaint_id}`}>
                    <td><strong>#{c.complaint_id}</strong></td>
                    <td><span className="badge badge-priority-low">🏛️ Dept</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.title}</div>
                      {c.is_safety_hazard === 1 && (
                        <span className="badge badge-hazard" style={{ marginTop: 4 }}>🚨 Safety Alert</span>
                      )}
                    </td>
                    <td>{c.department_code ? `${c.department_code} · ` : ''}{c.category}</td>
                    <td><span className={`badge badge-${c.status.toLowerCase().replace(' ', '-')}`}>{c.status}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/complaints/${c.complaint_id}`)}>
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}
                {recentBus.map(b => (
                  <tr key={`bus-${b.bus_complaint_id}`}>
                    <td><strong>#B-{b.bus_complaint_id}</strong></td>
                    <td><span className="badge badge-assigned">🚌 Bus</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.title}</div>
                      {b.is_safety_hazard === 1 && (
                        <span className="badge badge-hazard" style={{ marginTop: 4 }}>🚨 Safety Alert</span>
                      )}
                    </td>
                    <td>{b.complaint_type.toUpperCase()} · {b.route_number || 'Transit'}</td>
                    <td><span className={`badge badge-${b.status.toLowerCase().replace(' ', '-')}`}>{b.status}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/bus-complaints/${b.bus_complaint_id}`)}>
                        Details →
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
