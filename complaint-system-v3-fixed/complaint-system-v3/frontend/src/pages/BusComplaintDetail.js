import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import StatusTimeline from '../components/StatusTimeline';
import { useAuth } from '../context/AuthContext';

export default function BusComplaintDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const isCoordinator = user && (user.role === 'bus_coordinator' || user.role === 'admin');

  const [complaint, setComplaint] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [response,  setResponse]  = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [message,   setMessage]   = useState('');

  // Escalation Modal
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  // Image Modal
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    loadComplaint();
  }, [id]);

  const loadComplaint = async () => {
    try {
      const res = await axios.get(`/api/bus-complaints/${id}`);
      setComplaint(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      console.error(err);
      navigate('/complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (targetStatus) => {
    setSaving(true);
    try {
      await axios.put(`/api/bus-complaints/${id}/status`, { status: targetStatus || newStatus });
      setMessage('Bus complaint status updated successfully!');
      loadComplaint();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;

    setSaving(true);
    try {
      await axios.post(`/api/bus-complaints/${id}/escalate`, { escalation_reason: escalateReason });
      setMessage('Grievance has been escalated to University Administration.');
      setShowEscalateModal(false);
      loadComplaint();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to escalate grievance.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendResponse = async () => {
    if (!response.trim()) return;
    setSaving(true);
    try {
      await axios.post(`/api/bus-complaints/${id}/respond`, { message: response });
      setMessage('Official response posted and student notified.');
      setResponse('');
      loadComplaint();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to post response.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAiDraft = async () => {
    setAiDraftLoading(true);
    try {
      const res = await axios.post('/api/ai/draft-reply', {
        complaintTitle: complaint.title,
        complaintDescription: complaint.description,
        categoryOrType: `Bus Transport (${complaint.complaint_type})`,
        status: newStatus || complaint.status,
      });
      if (res.data?.draft) setResponse(res.data.draft);
    } catch (e) {
      console.error(e);
    } finally {
      setAiDraftLoading(false);
    }
  };

  if (loading) return <Layout><div className="spinner" /></Layout>;
  if (!complaint) return null;

  return (
    <Layout breadcrumbs={[
      { label: 'Transportation', path: '/bus/complaints' },
      { label: `Bus Ticket #B-${complaint.bus_complaint_id}` }
    ]}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Header */}
        <div className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>
                Bus Grievance #B-{complaint.bus_complaint_id}
              </h1>
              <span className={`badge badge-${complaint.status.toLowerCase().replace(' ', '-')}`}>
                {complaint.status}
              </span>
              {complaint.is_safety_hazard === 1 && (
                <span className="badge badge-hazard">🚨 Safety Hazard</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Incident occurred on {new Date(complaint.incident_datetime).toLocaleString()} · Logged by {complaint.student_name}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        {/* Status Progress Timeline */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Transportation Workflow Timeline
          </div>
          <StatusTimeline
            status={complaint.status}
            moduleType="transportation"
            isEscalated={complaint.status === 'Escalated'}
          />
        </div>

        {complaint.status === 'Escalated' && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: 8, marginBottom: 16 }}>
            <strong style={{ color: '#991B1B' }}>⚠️ Escalated to Administration:</strong>
            <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 4 }}>
              {complaint.escalation_reason}
            </div>
          </div>
        )}

        {message && (
          <div style={{ padding: '12px 16px', background: '#DCFCE7', color: '#15803D', borderRadius: 8, marginBottom: 16 }}>
            {message}
          </div>
        )}

        {/* Transit Details Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, marginBottom: 14 }}>{complaint.title}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>ROUTE</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                {complaint.route_number || 'R-00'}: {complaint.route_name || 'Campus Transit'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>BUS VEHICLE</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                {complaint.bus_number || 'Unassigned / General Route'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>ISSUE TYPE</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, textTransform: 'capitalize' }}>
                {complaint.complaint_type.replace('_', ' ')}
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>PRIORITY</div>
              <div style={{ marginTop: 2 }}>
                <span className={`badge badge-priority-${complaint.priority.toLowerCase()}`}>{complaint.priority}</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              INCIDENT DESCRIPTION
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {complaint.description}
            </div>
          </div>

          {/* Photo Attachments Gallery */}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
                📸 ATTACHED PHOTO EVIDENCE ({complaint.attachments.length})
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {complaint.attachments.map((att) => (
                  <div
                    key={att.attachment_id}
                    onClick={() => setActiveImage(`/uploads/${att.filename}`)}
                    style={{
                      width: 110,
                      height: 110,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                  >
                    <img
                      src={`/uploads/${att.filename}`}
                      alt={att.original_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Responses Thread */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>Official Communications</h3>
          {(!complaint.responses || complaint.responses.length === 0) ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              No official responses logged yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {complaint.responses.map(r => (
                <div key={r.response_id} style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: 'var(--primary)' }}>
                      🚌 {r.user_name} ({r.user_role === 'admin' ? 'University Admin' : 'Bus Coordinator'})
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(r.responded_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13 }}>{r.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Trail Log */}
        {complaint.auditLog && complaint.auditLog.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Audit Trail & Activity Log</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {complaint.auditLog.map(log => (
                <div key={log.log_id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', width: 140 }}>
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(log.created_at).toLocaleDateString()}
                  </span>
                  <span className="badge badge-priority-low">{log.action}</span>
                  <span style={{ color: 'var(--text-primary)', flex: 1 }}>{log.notes}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>by {log.actor_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coordinator Controls */}
        {isCoordinator && (
          <div className="card" style={{ borderTop: '4px solid var(--secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="card-title" style={{ fontSize: 16, margin: 0 }}>
                Bus Coordinator Triage & Dispatch
              </h3>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setShowEscalateModal(true)}
              >
                ⚠️ Escalate to Admin
              </button>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Workflow Status:</label>
              <select
                className="form-select"
                style={{ maxWidth: 220 }}
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                <option value="Received">Received</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleStatusChange(newStatus)}
                disabled={saving}
              >
                Update Workflow Stage
              </button>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Dispatch Official Response</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerateAiDraft}
                  disabled={aiDraftLoading}
                >
                  {aiDraftLoading ? 'Generating...' : '✨ Generate AI Response Draft'}
                </button>
              </div>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Compose message to student..."
                value={response}
                onChange={e => setResponse(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendResponse}
                disabled={saving || !response.trim()}
              >
                {saving ? 'Posting...' : 'Dispatch Response →'}
              </button>
            </div>
          </div>
        )}

        {/* Escalation Modal */}
        {showEscalateModal && (
          <div className="modal-overlay" onClick={() => setShowEscalateModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 18, marginBottom: 10, color: '#B91C1C' }}>
                ⚠️ Escalate Bus Grievance to Administration
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                This notifies the Dean and System Administrators immediately. Please provide specific operational context.
              </p>
              <form onSubmit={handleEscalate}>
                <div className="form-group">
                  <label className="form-label">Escalation Reason & Notes *</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    required
                    placeholder="Specify why administrative intervention or disciplinary action is needed..."
                    value={escalateReason}
                    onChange={e => setEscalateReason(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEscalateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={saving}>
                    {saving ? 'Escalating...' : 'Confirm Escalation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Image Zoom Modal */}
        {activeImage && (
          <div className="modal-overlay" onClick={() => setActiveImage(null)}>
            <div style={{ maxWidth: 800, maxHeight: '90vh', background: 'transparent' }} onClick={e => e.stopPropagation()}>
              <img
                src={activeImage}
                alt="Enlarged evidence"
                style={{ width: '100%', height: 'auto', borderRadius: 8, boxShadow: 'var(--shadow-xl)' }}
              />
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setActiveImage(null)}>
                  ✕ Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
