import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function ComplaintDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin' || user?.role === 'staff';

  const [complaint, setComplaint] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [response,  setResponse]  = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [message,   setMessage]   = useState('');

  useEffect(() => { loadComplaint(); }, [id]);

  const loadComplaint = async () => {
    try {
      const res = await axios.get(`/api/complaints/${id}`);
      setComplaint(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusOnly = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/complaints/${id}/status`, { status: newStatus });
      setMessage('Status updated successfully!');
      loadComplaint();
    } catch (err) {
      setMessage('Error updating status.');
    } finally {
      setSaving(false);
    }
  };

  const handleRespond = async () => {
    if (!response.trim()) return;
    setSaving(true);
    try {
      await axios.post(`/api/complaints/${id}/respond`, { message: response });
      await axios.put(`/api/complaints/${id}/status`, { status: newStatus });
      setMessage('Response posted and status updated!');
      setResponse('');
      loadComplaint();
    } catch (err) {
      setMessage('Error posting response.');
    } finally {
      setSaving(false);
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

  if (loading) return <Layout><div className="spinner" /></Layout>;
  if (!complaint) return null;

  return (
    <Layout>
      <div style={{ maxWidth: 760 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Complaint #{complaint.complaint_id}</h1>
            <p className="page-sub">Submitted on {new Date(complaint.created_at).toLocaleString()}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
        </div>

        {/* Complaint Info */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>{complaint.title}</h2>
            {statusBadge(complaint.status)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="card-sm">
              <div className="text-xs">Category</div>
              <div className="text-sm" style={{ marginTop: 4, fontWeight: 500 }}>{complaint.category}</div>
            </div>
            <div className="card-sm">
              <div className="text-xs">Priority</div>
              <div style={{ marginTop: 4 }}>{priorityBadge(complaint.priority)}</div>
            </div>
            <div className="card-sm">
              <div className="text-xs">Submitted by</div>
              <div className="text-sm" style={{ marginTop: 4, fontWeight: 500 }}>{complaint.student_name}</div>
            </div>
          </div>

          <div>
            <div className="text-xs" style={{ marginBottom: 8 }}>Description</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>{complaint.description}</p>
          </div>

          {complaint.attachment && (
            <div style={{ marginTop: 16 }}>
              <div className="text-xs" style={{ marginBottom: 8 }}>Attachment</div>
              {/* BUG FIX: Use relative URL via proxy instead of hardcoded localhost:5000 */}
              <a
                href={`/uploads/${complaint.attachment}`}
                target="_blank" rel="noreferrer"
                className="btn btn-secondary btn-sm">
                📎 View Attachment
              </a>
            </div>
          )}
        </div>

        {/* Responses / Timeline */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Responses & Timeline
          </h3>

          <div className="timeline-item">
            <div className="timeline-dot" style={{ background: 'var(--accent2)' }} />
            <div>
              <div className="text-sm" style={{ fontWeight: 500 }}>Complaint submitted</div>
              <div className="text-xs">{new Date(complaint.created_at).toLocaleString()}</div>
            </div>
          </div>

          {complaint.responses?.length === 0 && (
            <div style={{ padding: '20px 0', color: 'var(--text3)', fontSize: 14 }}>
              No responses yet.
            </div>
          )}

          {complaint.responses?.map(r => (
            <div key={r.response_id} className="timeline-item">
              <div className="timeline-dot" />
              <div style={{ flex: 1 }}>
                <div className="flex-between">
                  <div className="text-sm" style={{ fontWeight: 500 }}>{r.admin_name}</div>
                  <div className="text-xs">{new Date(r.responded_at).toLocaleString()}</div>
                </div>
                <div className="response-bubble" style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 14, color: 'var(--text2)' }}>{r.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Admin response panel */}
        {isAdmin && (
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Admin Actions</h3>
            {message && <div className="alert alert-success" style={{ marginBottom: 12 }}>{message}</div>}

            <div className="form-group">
              <label className="form-label">Update Status</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select className="form-select" value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <button className="btn btn-secondary" onClick={handleStatusOnly}
                  disabled={saving || newStatus === complaint.status}>
                  Update Status
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Response Message (optional)</label>
              <textarea className="form-textarea" rows={4}
                placeholder="Write your response to the student..."
                value={response} onChange={e => setResponse(e.target.value)} />
            </div>

            <button className="btn btn-primary" onClick={handleRespond}
              disabled={saving || !response.trim()}>
              {saving ? 'Posting...' : '✓ Post Response & Update Status'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
