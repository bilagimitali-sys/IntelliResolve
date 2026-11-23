import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', form);
      login(res.data.token, res.data.user);

      const role = res.data.user.role;
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'bus_coordinator') {
        navigate('/bus/dashboard');
      } else if (['department_coordinator', 'faculty', 'staff'].includes(role)) {
        navigate('/dept/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      {/* ── LEFT PANEL: Preserved Campus Image & Crest ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.90)), url(/kle-campus.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
      }}>
        {/* Top Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src="/kle-logo.png"
            alt="KLE Tech Crest"
            style={{ width: 56, height: 56, background: '#FFFFFF', borderRadius: 10, padding: 4 }}
          />
          <div>
            <h2 style={{ fontSize: 20, color: '#FFFFFF', margin: 0 }}>KLE Technological University</h2>
            <div style={{ color: 'var(--secondary)', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Belagavi Campus · Grievance Platform
            </div>
          </div>
        </div>

        {/* Center Institutional Mission */}
        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 36, lineHeight: 1.2, marginBottom: 16, color: '#FFFFFF' }}>
            Empowering Transparent, AI-Assisted University Governance.
          </h1>
          <p style={{ fontSize: 15, color: '#CBD5E1', lineHeight: 1.6, marginBottom: 24 }}>
            A centralized grievance redressal mechanism providing department-wise triage, campus transportation issue management, real-time tracking, and automated safety response.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span className="badge badge-priority-low" style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}>
              NAAC 'A' Grade
            </span>
            <span className="badge badge-priority-low" style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}>
              UGC & AICTE Recognised
            </span>
            <span className="badge badge-priority-low" style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}>
              Belagavi, Karnataka
            </span>
          </div>
        </div>

        {/* Footer address */}
        <div style={{ fontSize: 12, color: '#94A3B8' }}>
          Dr. M. S. Sheshgiri Campus, Udyambag, Belagavi – 590008 · grievance@kletech.ac.in
        </div>
      </div>

      {/* ── RIGHT PANEL: Clean Executive Sign In ── */}
      <div style={{
        width: 480,
        maxWidth: '100%',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>Sign In to Portal</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Enter your institutional email to access your account
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Institutional Email</label>
            <input
              name="email"
              type="email"
              required
              className="form-input"
              placeholder="e.g. ravi@kletech.ac.in"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              name="password"
              type="password"
              required
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 12 }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Don't have a student account?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>Register as Student</Link>
        </div>

        {/* Demo Credentials Helper Pill */}
        <div style={{ marginTop: 32, padding: '14px', background: 'var(--bg-subtle)', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Demo Accounts (Password: Password@1234):</div>
          <div style={{ color: 'var(--text-secondary)' }}>• Admin: <code>admin@kletech.ac.in</code></div>
          <div style={{ color: 'var(--text-secondary)' }}>• Student: <code>ravi@kletech.ac.in</code></div>
          <div style={{ color: 'var(--text-secondary)' }}>• Dept Coord (CSE): <code>cse.coord@kletech.ac.in</code></div>
          <div style={{ color: 'var(--text-secondary)' }}>• Bus Coord: <code>bus.coord@kletech.ac.in</code></div>
        </div>
      </div>
    </div>
  );
}
