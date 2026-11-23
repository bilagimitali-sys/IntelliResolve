import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

export default function AdminCreateStaff() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'department_coordinator',
    department_id: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/departments'),
      ]);
      setUsers(usersRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.role === 'department_coordinator' && !form.department_id) {
      setError('Please assign a department for the Department Coordinator.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/admin/coordinators', form);
      setSuccess(`Coordinator account created for ${form.name} successfully!`);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'department_coordinator',
        department_id: '',
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create coordinator account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`/api/admin/users/${userId}/status`, { is_active: !currentStatus });
      loadData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return <Layout><div className="spinner" /></Layout>;

  const coordinators = users.filter(u => ['department_coordinator', 'bus_coordinator', 'staff', 'faculty'].includes(u.role));

  return (
    <Layout breadcrumbs={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Coordinators' }]}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>University Coordinator Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Provision and manage Department Coordinators and Campus Transportation Coordinators
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Provision New Coordinator
        </button>
      </div>

      {success && (
        <div style={{ padding: '12px 16px', background: '#DCFCE7', color: '#15803D', borderRadius: 8, marginBottom: 16 }}>
          {success}
        </div>
      )}

      {/* Coordinator Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role Designation</th>
                <th>Assigned Department</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {coordinators.map(u => (
                <tr key={u.user_id}>
                  <td><strong>{u.name}</strong></td>
                  <td><code>{u.email}</code></td>
                  <td>
                    {u.role === 'bus_coordinator' ? (
                      <span className="badge badge-assigned">🚌 Bus Coordinator</span>
                    ) : (
                      <span className="badge badge-priority-medium">🏛️ Dept Coordinator</span>
                    )}
                  </td>
                  <td>
                    {u.department_name ? (
                      <span>{u.department_code || ''} — {u.department_name}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Universal Campus Transit</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-resolved' : 'badge-escalated'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleStatus(u.user_id, u.is_active)}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog for Coordinator Creation */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>Provision Coordinator Account</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              Account will be enabled immediately with the assigned permissions.
            </p>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 6, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  name="name"
                  required
                  className="form-input"
                  placeholder="e.g. Prof. Anand Patil / Mr. Ramesh Kulkarni"
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
                  placeholder="coordinator@kletech.ac.in"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Temporary Password (Min 6 chars) *</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Password@1234"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Coordinator Role Type *</label>
                <select
                  name="role"
                  className="form-select"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="department_coordinator">Department Grievance Coordinator</option>
                  <option value="bus_coordinator">Campus Transportation / Bus Coordinator</option>
                </select>
              </div>

              {form.role === 'department_coordinator' && (
                <div className="form-group">
                  <label className="form-label">Designated University Department *</label>
                  <select
                    name="department_id"
                    className="form-select"
                    value={form.department_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.icon} {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
