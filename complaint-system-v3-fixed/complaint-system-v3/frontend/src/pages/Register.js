import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department_id: '',
    role: 'student',
  });
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/departments')
      .then(res => setDepartments(res.data || []))
      .catch(() => {});
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/auth/register', form);
      setSuccess('Student account registered successfully! Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check your information.');
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

        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 34, lineHeight: 1.25, marginBottom: 16, color: '#FFFFFF' }}>
            Join the KLE Tech Centralized Grievance Redressal System.
          </h1>
          <p style={{ fontSize: 15, color: '#CBD5E1', lineHeight: 1.6 }}>
            Submit and track academic grievances, hostel maintenance requests, exam cell queries, and campus bus issues with complete transparency.
          </p>
        </div>

        <div style={{ fontSize: 12, color: '#94A3B8' }}>
          Dr. M. S. Sheshgiri Campus, Udyambag, Belagavi – 590008 · grievance@kletech.ac.in
        </div>
      </div>

      {/* ── RIGHT PANEL: Registration Form ── */}
      <div style={{
        width: 500,
        maxWidth: '100%',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px',
        boxShadow: 'var(--shadow-xl)',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>Create Student Account</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Register with your institutional details to access student services
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '12px 16px', background: '#DCFCE7', color: '#15803D', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              name="name"
              required
              className="form-input"
              placeholder="e.g. Ravi Kumar"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
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
            <label className="form-label">Department / Branch *</label>
            <select
              name="department_id"
              className="form-select"
              value={form.department_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Your Department --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Password (Min 6 chars) *</label>
            <input
              name="password"
              type="password"
              required
              className="form-input"
              placeholder="Choose a strong password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register Student Account →'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Already registered?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>Sign In here</Link>
        </div>
      </div>
    </div>
  );
}
