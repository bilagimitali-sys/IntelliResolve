import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import StatusTimeline from '../components/StatusTimeline';
import { useAuth } from '../context/AuthContext';

export default function ComplaintDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const canRespond = user && ['admin', 'department_coordinator', 'faculty', 'staff'].includes(user.role);

  const [complaint, setComplaint] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [response,  setResponse]  = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [message,   setMessage]   = useState('');

  useEffect(() => {
    loadComplaint();
  }, [id]);

  const loadComplaint = async () => {
    try {
      const res = await axios.get(`/api/complaints/${id}`);
      setComplaint(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      console.error(err);
      navigate('/complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/complaints/${id}/status`, { status: newStatus });
      setMessage('Status updated successfully!');
      loadComplaint();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendResponse = async () => {
    if (!response.trim()) return;
    setSaving(true);
    try {
      await axios.post(`/api/complaints/${id}/respond`, { message: response });
      if (newStatus !== complaint.status) {
        await axios.put(`/api/complaints/${id}/status`, { status: newStatus });
      }
      setMessage('Response posted successfully!');
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
        categoryOrType: complaint.category,
        status: newStatus || complaint.status,
      });
      if (res.data?.draft) {
        setResponse(res.data.draft);
      }
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
      { label: 'Grievances', path: '/complaints' },
      { label: `Ticket #${complaint.complaint_id}` }
    ]}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Header Bar */}
        <div className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>
                Grievance #{complaint.complaint_id}
              </h1>
              <span className={`badge badge-${complaint.status.toLowerCase().replace(' ', '-')}`}>
                {complaint.status}
              </span>
              {complaint.is_safety_hazard === 1 && (
                <span className="badge badge-hazard">🚨 Safety Alert</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Submitted on {new Date(complaint.created_at).toLocaleString()}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        {/* 5-Stage / 3-Stage Visual Status Timeline */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Resolution Progress
          </div>
          <StatusTimeline
            status={complaint.status}
            moduleType="department"
          />
        </div>

        {message && (
          <div style={{ padding: '12px 16px', background: '#DCFCE7', color: '#15803D', borderRadius: 8, marginBottom: 16 }}>
            {message}
          </div>
        )}

        {/* Main Details Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>{complaint.title}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>DEPARTMENT</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                {complaint.department_icon} {complaint.department_code} — {complaint.department_name}
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>CATEGORY</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{complaint.category}</div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>PRIORITY</div>
              <div style={{ marginTop: 2 }}>
                <span className={`badge badge-priority-${complaint.priority.toLowerCase()}`}>{complaint.priority}</span>
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>SUBMITTED BY</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{complaint.student_name}</div>
            </div>
          </div>

          {/* Description Block */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              OFFICIAL GRIEVANCE STATEMENT
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {complaint.description}
            </div>
          </div>

          {/* If Student provided raw informal text, show original alongside */}
          {complaint.original_description && complaint.original_description !== complaint.description && (
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                ORIGINAL STUDENT INPUT (PRE-AI REFINEMENT)
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                "{complaint.original_description}"
              </div>
            </div>
          )}

          {/* Attachments & Voice Note */}
          {(complaint.attachment || complaint.voice_note_path) && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {complaint.attachment && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Attachment</div>
                  <a
                    href={`/uploads/${complaint.attachment}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    📎 View Document / Photo
                  </a>
                  {complaint.is_ai_image === 1 && (
                    <span className="badge badge-hazard" style={{ marginLeft: 8 }}>🤖 AI Image Flagged</span>
                  )}
                </div>
              )}

              {complaint.voice_note_path && (
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>🎤 Student Voice Note</div>
                  <audio
                    controls
                    src={`/uploads/${complaint.voice_note_path}`}
                    style={{ width: '100%', height: 36 }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Official Response History */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>Official Response Thread</h3>
          {(!complaint.responses || complaint.responses.length === 0) ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              No official responses posted yet. Department coordinators are reviewing the matter.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {complaint.responses.map((r) => (
                <div key={r.response_id} style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong style={{ fontSize: 13, color: 'var(--primary)' }}>
                      🏛️ {r.admin_name} ({r.responder_role === 'admin' ? 'University Admin' : 'Coordinator'})
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(r.responded_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{r.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coordinator / Admin Response & Status Action Box */}
        {canRespond && (
          <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
            <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>
              Coordinator Action & Resolution Dispatch
            </h3>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Update Status:</label>
              <select
                className="form-select"
                style={{ maxWidth: 220 }}
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleStatusUpdate}
                disabled={saving}
              >
                Save Status Only
              </button>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Compose Official Response to Student</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerateAiDraft}
                  disabled={aiDraftLoading}
                >
                  {aiDraftLoading ? 'Generating...' : '✨ Generate AI Draft Reply'}
                </button>
              </div>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Draft the department's official reply to the student. AI generated replies can be freely modified before dispatching."
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
                {saving ? 'Dispatching...' : 'Dispatch Response & Notify Student →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
