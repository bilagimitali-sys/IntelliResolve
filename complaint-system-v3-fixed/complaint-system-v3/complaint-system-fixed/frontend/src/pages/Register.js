import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [form,    setForm]    = useState({ name: '', email: '', password: '', role: 'student' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await axios.post('/api/auth/register', form);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Join the Complaint Management System</p>
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input name="name" required className="form-input"
              placeholder="Your full name"
              value={form.name} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input name="email" type="email" required className="form-input"
              placeholder="you@college.edu"
              value={form.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" required className="form-input"
              placeholder="Min 6 characters"
              value={form.password} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select name="role" className="form-select" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="staff">Department Staff</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}>
            {loading ? 'Creating account...' : 'Create account →'}
          </button>
        </form>

        <div className="divider" />
        <p className="text-sm text-muted" style={{ textAlign: 'center' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
