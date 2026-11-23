import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/analytics'),
      axios.get('/api/bus-complaints?status=Escalated'),
    ])
      .then(([analyticsRes, escRes]) => {
        setData(analyticsRes.data);
        setEscalations(escRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="spinner" /></Layout>;

  const deptTotal = data?.department?.totals?.total || 0;
  const busTotal  = data?.transport?.totals?.total || 0;
  const safetyCount = data?.overall_safety_alerts || 0;

  return (
    <Layout breadcrumbs={[{ label: 'Admin Command Center' }]}>
      {/* Executive Command Header */}
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>University Grievance Command Center</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Central Administrative Oversight · KLE Technological University, Belagavi Campus
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/coordinators')}>
            👥 Manage Coordinators
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/analytics')}>
            📊 Analytics Hub
          </button>
        </div>
      </div>

      {/* Escalation Queue Alert Banner */}
      {escalations.length > 0 && (
        <div className="card" style={{ borderLeft: '5px solid #DC2626', background: '#FEF2F2', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <h3 style={{ fontSize: 16, color: '#991B1B', margin: 0 }}>
                {escalations.length} Grievance(s) Escalated for Administrative Action
              </h3>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => navigate('/admin/complaints?tab=bus&status=Escalated')}>
              Review Escalation Queue →
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#7F1D1D', margin: 0 }}>
            These matters could not be resolved by field coordinators and require university dean/administrator intervention.
          </p>
        </div>
      )}

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon-wrap">🏛️</div>
          <div>
            <div className="stat-num">{deptTotal}</div>
            <div className="stat-label-text">Department Grievances</div>
          </div>
        </div>
        <div className="stat-box info">
          <div className="stat-icon-wrap" style={{ color: '#2563EB' }}>🚌</div>
          <div>
            <div className="stat-num">{busTotal}</div>
            <div className="stat-label-text">Transit Grievances</div>
          </div>
        </div>
        <div className="stat-box warning">
          <div className="stat-icon-wrap" style={{ color: 'var(--secondary)' }}>⚠️</div>
          <div>
            <div className="stat-num">{escalations.length}</div>
            <div className="stat-label-text">Escalations</div>
          </div>
        </div>
        <div className="stat-box danger">
          <div className="stat-icon-wrap" style={{ color: '#DC2626' }}>🚨</div>
          <div>
            <div className="stat-num">{safetyCount}</div>
            <div className="stat-label-text">Safety Hazards</div>
          </div>
        </div>
      </div>

      {/* Navigation Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>📋 Grievances Registry</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Browse and triage all campus academic, departmental, and transportation complaints.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/complaints')}>
            Open All Grievances →
          </button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>👥 Coordinator Accounts</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Provision Department Coordinators (with department binding) and Bus Coordinators.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/coordinators')}>
            Manage Accounts →
          </button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>🚌 Fleet & Route Health</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Inspect campus buses, driver assignments, route punctuality, and transport schedules.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/fleet')}>
            Inspect Fleet →
          </button>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16 }}>Department Grievance Distribution</h3>
        </div>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Code</th>
                <th>Total Complaints</th>
                <th>Resolved</th>
                <th>Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {(data?.department?.byDepartment || []).slice(0, 8).map(d => {
                const total = Number(d.total_complaints) || 0;
                const res = Number(d.resolved_complaints) || 0;
                const rate = total > 0 ? Math.round((res / total) * 100) : 100;
                return (
                  <tr key={d.id}>
                    <td><strong>{d.icon} {d.name}</strong></td>
                    <td><span className="badge badge-priority-low">{d.code}</span></td>
                    <td>{total}</td>
                    <td>{res}</td>
                    <td>
                      <span className={`badge ${rate >= 70 ? 'badge-resolved' : 'badge-pending'}`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
