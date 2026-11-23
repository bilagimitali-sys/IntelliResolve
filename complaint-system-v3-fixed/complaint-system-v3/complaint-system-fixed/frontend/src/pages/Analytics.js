import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, LineElement, PointElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import Layout from '../components/Layout';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  ArcElement, LineElement, PointElement,
  Title, Tooltip, Legend
);

const chartOpts = {
  responsive: true,
  plugins: { legend: { labels: { color: '#9094b0', font: { size: 12 } } } },
  scales: {
    x: { ticks: { color: '#9094b0' }, grid: { color: '#2e3348' } },
    y: { ticks: { color: '#9094b0' }, grid: { color: '#2e3348' } }
  }
};

const pieOpts = {
  responsive: true,
  plugins: { legend: { position: 'bottom', labels: { color: '#9094b0', padding: 16, font: { size: 12 } } } }
};

export default function Analytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/analytics')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="spinner" /></Layout>;
  if (!data)   return <Layout><p>Failed to load analytics.</p></Layout>;

  const { totals, byCategory, byPriority, monthly, avgResolutionDays, recent } = data;

  const COLORS = ['#6c63ff','#00d4aa','#ffb830','#ff5c7c','#4ecdc4'];

  const categoryChart = {
    labels: byCategory.map(c => c.category),
    datasets: [{
      label: 'Complaints',
      data:  byCategory.map(c => c.count),
      backgroundColor: COLORS.slice(0, byCategory.length),
      borderRadius: 6,
    }]
  };

  const statusChart = {
    labels: ['Pending','In Progress','Resolved'],
    datasets: [{
      data: [totals.pending, totals.in_progress, totals.resolved],
      backgroundColor: ['#ffb830','#6c63ff','#00d4aa'],
      borderWidth: 0,
    }]
  };

  const priorityChart = {
    labels: byPriority.map(p => p.priority),
    datasets: [{
      data:  byPriority.map(p => p.count),
      backgroundColor: ['#ff5c7c','#ffb830','#00d4aa'],
      borderWidth: 0,
    }]
  };

  const monthlyChart = {
    labels: monthly.map(m => m.month),
    datasets: [
      {
        label: 'Total',
        data:  monthly.map(m => m.total),
        borderColor: '#6c63ff',
        backgroundColor: 'rgba(108,99,255,0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Resolved',
        data:  monthly.map(m => m.resolved),
        borderColor: '#00d4aa',
        backgroundColor: 'rgba(0,212,170,0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const lineOpts = {
    responsive: true,
    plugins: { legend: { labels: { color: '#9094b0', font: { size: 12 } } } },
    scales: {
      x: { ticks: { color: '#9094b0' }, grid: { color: '#2e3348' } },
      y: { ticks: { color: '#9094b0' }, grid: { color: '#2e3348' }, beginAtZero: true }
    }
  };

  const statusBadge = s => {
    const map = { 'Pending':'badge-pending','In Progress':'badge-progress','Resolved':'badge-resolved' };
    return <span className={`badge ${map[s]}`}>{s}</span>;
  };
  const priorityBadge = p => {
    const map = { High:'badge-high', Medium:'badge-medium', Low:'badge-low' };
    return <span className={`badge ${map[p]}`}>{p}</span>;
  };

  const resolutionRate = totals.total > 0
    ? Math.round((totals.resolved / totals.total) * 100) : 0;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-sub">Resolution performance overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-label">Total Complaints</div>
          <div className="stat-value">{totals.total}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{totals.pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value" style={{color:'var(--accent)'}}>{totals.in_progress}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Resolved</div>
          <div className="stat-value">{totals.resolved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolution Rate</div>
          <div className="stat-value" style={{color:'var(--success)'}}>{resolutionRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. Resolution</div>
          <div className="stat-value" style={{color:'var(--warning)'}}>{avgResolutionDays || '—'}</div>
          <div className="text-xs" style={{marginTop:4}}>days</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <h3 style={{fontSize:14, fontWeight:600, marginBottom:16}}>Complaints by Category</h3>
          <Bar data={categoryChart} options={{...chartOpts, plugins:{...chartOpts.plugins, legend:{display:false}}}} />
        </div>

        <div className="card">
          <h3 style={{fontSize:14, fontWeight:600, marginBottom:16}}>Status Distribution</h3>
          <Doughnut data={statusChart} options={pieOpts} />
        </div>

        <div className="card">
          <h3 style={{fontSize:14, fontWeight:600, marginBottom:16}}>Priority Breakdown</h3>
          <Doughnut data={priorityChart} options={pieOpts} />
        </div>

        <div className="card">
          <h3 style={{fontSize:14, fontWeight:600, marginBottom:16}}>Monthly Trend (6 months)</h3>
          <Line data={monthlyChart} options={lineOpts} />
        </div>
      </div>

      {/* Recent complaints table */}
      <div className="card" style={{marginTop: 24}}>
        <h3 style={{fontSize:14, fontWeight:600, marginBottom:16}}>Recent Complaints</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Student</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(c => (
                <tr key={c.complaint_id}>
                  <td className="text-xs">#{c.complaint_id}</td>
                  <td style={{fontWeight:500, fontSize:14}}>{c.title}</td>
                  <td className="text-sm">{c.student_name}</td>
                  <td>{priorityBadge(c.priority)}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td className="text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
