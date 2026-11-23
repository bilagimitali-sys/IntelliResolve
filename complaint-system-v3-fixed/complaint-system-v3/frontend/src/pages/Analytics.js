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
  if (!data) return <Layout><p>Failed to load analytics data.</p></Layout>;

  const { department, transport, overall_safety_alerts } = data;

  // Modern Executive Color Palette (No dark purple)
  const COLORS = ['#B6081D', '#D97706', '#2563EB', '#10B981', '#64748B', '#8B5CF6', '#EC4899'];

  // 1. Department by Category Chart
  const categoryChartData = {
    labels: (department.byCategory || []).map(c => c.category),
    datasets: [{
      label: 'Complaints',
      data: (department.byCategory || []).map(c => c.count),
      backgroundColor: COLORS.slice(0, (department.byCategory || []).length),
      borderRadius: 6,
    }]
  };

  // 2. Department Status Distribution
  const deptStatusChartData = {
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [{
      data: [
        department.totals?.pending || 0,
        department.totals?.in_progress || 0,
        department.totals?.resolved || 0,
      ],
      backgroundColor: ['#F59E0B', '#2563EB', '#10B981'],
      borderWidth: 0,
    }]
  };

  // 3. Transportation Issue Types Chart
  const busTypesChartData = {
    labels: (transport.byType || []).map(t => t.complaint_type.replace('_', ' ').toUpperCase()),
    datasets: [{
      label: 'Transit Issues',
      data: (transport.byType || []).map(t => t.count),
      backgroundColor: ['#D97706', '#2563EB', '#10B981', '#EF4444', '#8B5CF6', '#64748B', '#B6081D'],
      borderRadius: 6,
    }]
  };

  // 4. Route Hotspots
  const routeHotspotsData = {
    labels: (transport.routeHotspots || []).map(r => r.route_number),
    datasets: [{
      label: 'Total Reports',
      data: (transport.routeHotspots || []).map(r => r.complaint_count),
      backgroundColor: '#B6081D',
      borderRadius: 6,
    }]
  };

  // 5. Monthly Trend
  const monthlyChartData = {
    labels: (department.monthly || []).map(m => m.month),
    datasets: [
      {
        label: 'Total Lodged',
        data: (department.monthly || []).map(m => m.total),
        borderColor: '#B6081D',
        backgroundColor: 'rgba(182, 8, 29, 0.08)',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Resolved',
        data: (department.monthly || []).map(m => m.resolved),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        tension: 0.35,
        fill: true,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 12, family: 'Inter' } }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#E2E8F0' } },
      x: { grid: { display: false } },
    }
  };

  return (
    <Layout breadcrumbs={[{ label: 'Analytics' }]}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Grievance Intelligence & Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Institutional performance metrics, transport hotspot diagnostics, and resolution trends
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon-wrap">📋</div>
          <div>
            <div className="stat-num">
              {(Number(department.totals?.total) || 0) + (Number(transport.totals?.total) || 0)}
            </div>
            <div className="stat-label-text">Total Grievances</div>
          </div>
        </div>

        <div className="stat-box warning">
          <div className="stat-icon-wrap" style={{ color: 'var(--secondary)' }}>⏱️</div>
          <div>
            <div className="stat-num">{department.avgResolutionDays} Days</div>
            <div className="stat-label-text">Avg Resolution Time</div>
          </div>
        </div>

        <div className="stat-box success">
          <div className="stat-icon-wrap" style={{ color: '#10B981' }}>✅</div>
          <div>
            <div className="stat-num">
              {(Number(department.totals?.resolved) || 0) + (Number(transport.totals?.resolved) || 0)}
            </div>
            <div className="stat-label-text">Resolved Cases</div>
          </div>
        </div>

        <div className="stat-box danger">
          <div className="stat-icon-wrap" style={{ color: '#EF4444' }}>🚨</div>
          <div>
            <div className="stat-num">{overall_safety_alerts}</div>
            <div className="stat-label-text">Safety Flags</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Department Grievances by Category */}
        <div className="card">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>
            🏛️ Department Grievances by Category
          </h3>
          <Bar data={categoryChartData} options={chartOptions} />
        </div>

        {/* Transportation Issues by Type */}
        <div className="card">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>
            🚌 Transportation Issues by Type
          </h3>
          <Bar data={busTypesChartData} options={chartOptions} />
        </div>

        {/* Department Status Distribution */}
        <div className="card">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>
            ⚖️ Grievance Status Ratio
          </h3>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <Doughnut
              data={deptStatusChartData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
          </div>
        </div>

        {/* Bus Route Hotspots */}
        <div className="card">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>
            📍 Campus Transit Route Hotspots
          </h3>
          <Bar data={routeHotspotsData} options={chartOptions} />
        </div>
      </div>

      {/* Monthly Trend Timeline */}
      <div className="card">
        <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>
          📈 Monthly Grievance Volume & Resolution Trajectory
        </h3>
        <Line data={monthlyChartData} options={chartOptions} />
      </div>
    </Layout>
  );
}
