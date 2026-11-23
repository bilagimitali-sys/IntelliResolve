import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import DepartmentSelector from '../components/DepartmentSelector';
import VoiceRecorder from '../components/VoiceRecorder';
import AiComplaintAssistant from '../components/AiComplaintAssistant';

export default function NewComplaint() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dept'); // 'dept' | 'bus'

  // ── DEPARTMENTS, BUSES & ROUTES ──
  const [departments, setDepartments] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);

  // ── DEPARTMENT COMPLAINT STATE ──
  const [deptForm, setDeptForm] = useState({
    title: '',
    description: '',
    original_description: '',
    ai_structured_summary: '',
    category: 'Academic',
    customCategory: '',
    priority: 'Low',
    is_safety_hazard: false,
  });
  const [selectedDept, setSelectedDept] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [voiceBlob, setVoiceBlob] = useState(null);

  // ── BUS COMPLAINT STATE ──
  const [busForm, setBusForm] = useState({
    title: '',
    description: '',
    original_description: '',
    bus_id: '',
    route_id: '',
    complaint_type: 'delay',
    incident_datetime: new Date().toISOString().slice(0, 16),
    priority: 'Medium',
    is_safety_hazard: false,
  });
  const [busImages, setBusImages] = useState([]);

  // Common submission states
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [routingBadge, setRoutingBadge] = useState(null);

  // Load departments, buses and routes
  useEffect(() => {
    axios.get('/api/departments')
      .then(res => setDepartments(res.data))
      .catch(() => {});

    axios.get('/api/bus-complaints/buses')
      .then(res => setBuses(res.data))
      .catch(() => {});

    axios.get('/api/bus-complaints/routes')
      .then(res => setRoutes(res.data))
      .catch(() => {});
  }, []);

  // ── DUPLICATE CHECK HELPER ──
  const checkDuplicates = useCallback(async ({ title, description, module_type, department_id, bus_id, route_id }) => {
    if (!title && !description) return;
    try {
      const res = await axios.post('/api/ai/check-duplicates', {
        title,
        description,
        module_type,
        department_id,
        bus_id,
        route_id,
      });
      if (res.data?.has_duplicate) {
        setDuplicateWarning(res.data);
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      // Ignore non-fatal duplicate check errors
    }
  }, []);

  // ── UNIFIED INTELLIGENT GRIEVANCE APPLIER ──
  const applyIntelligentGrievance = useCallback((data) => {
    if (!data) return;

    const isTransport = data.target_module === 'transportation' || !!data.bus_complaint_type || !!data.bus_id || !!data.route_id;

    if (isTransport) {
      setActiveTab('bus');
      setBusForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        original_description: data.original_description || prev.original_description,
        complaint_type: data.bus_complaint_type || prev.complaint_type,
        bus_id: data.bus_id || prev.bus_id,
        route_id: data.route_id || prev.route_id,
        priority: data.suggested_priority || prev.priority,
        is_safety_hazard: data.is_safety_hazard || false,
      }));

      setRoutingBadge({
        type: 'transit',
        label: `Campus Bus & Transit Coordinator • ${data.route_number ? 'Route ' + data.route_number : 'Campus Fleet'}`,
        priority: data.suggested_priority || 'Medium',
        is_safety: data.is_safety_hazard || false,
      });

      checkDuplicates({
        title: data.title,
        description: data.description,
        module_type: 'transportation',
        bus_id: data.bus_id,
        route_id: data.route_id,
      });
    } else {
      setActiveTab('dept');
      setDeptForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        original_description: data.original_description || prev.original_description,
        ai_structured_summary: data.ai_structured_summary || prev.ai_structured_summary,
        category: data.suggested_category || prev.category,
        priority: data.suggested_priority || prev.priority,
        is_safety_hazard: data.is_safety_hazard || false,
      }));

      // Find and select department
      if (data.department_id || data.department_code) {
        const match = departments.find(d =>
          (data.department_id && d.id === parseInt(data.department_id, 10)) ||
          (data.department_code && d.code?.toUpperCase() === data.department_code?.toUpperCase())
        );
        if (match) {
          setSelectedDept(match);
        }
      }

      setRoutingBadge({
        type: 'department',
        label: `Dept of ${data.department_name || 'Academic Redressal'} (${data.department_code || 'DEPT'})`,
        priority: data.suggested_priority || 'Low',
        is_safety: data.is_safety_hazard || false,
      });

      checkDuplicates({
        title: data.title,
        description: data.description,
        module_type: 'department',
        department_id: data.department_id || selectedDept?.id,
      });
    }
  }, [checkDuplicates, departments, selectedDept?.id]);

  // Handle prefill from localStorage or custom event
  useEffect(() => {
    // 1. From localStorage (e.g. from AiChatWidget floating bot)
    const stored = localStorage.getItem('kle_prefill_complaint');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        applyIntelligentGrievance(parsed);
      } catch (e) {}
      localStorage.removeItem('kle_prefill_complaint');
    }

    // 2. Event listener for live updates if widget was used while on page
    const handlePrefillEvent = (e) => {
      if (e.detail) applyIntelligentGrievance(e.detail);
    };
    window.addEventListener('kle_prefill_loaded', handlePrefillEvent);
    return () => window.removeEventListener('kle_prefill_loaded', handlePrefillEvent);
  }, [applyIntelligentGrievance]);

  // ── REAL-TIME DEBOUNCED DUPLICATE CHECK ON TYPING ──
  useEffect(() => {
    const title = activeTab === 'dept' ? deptForm.title : busForm.title;
    const desc  = activeTab === 'dept' ? deptForm.description : busForm.description;
    if (!title || title.trim().length < 6) return;

    const timer = setTimeout(() => {
      checkDuplicates({
        title,
        description: desc,
        module_type: activeTab === 'dept' ? 'department' : 'transportation',
        department_id: selectedDept?.id,
        bus_id: busForm.bus_id,
        route_id: busForm.route_id,
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [activeTab, deptForm.title, deptForm.description, busForm.title, busForm.description, selectedDept?.id, busForm.bus_id, busForm.route_id, checkDuplicates]);

  // ── SUBMIT DEPARTMENT COMPLAINT ──
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDept) {
      setError('Please select a target university department.');
      return;
    }
    if (!deptForm.title.trim() || !deptForm.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('title', deptForm.title);
      fd.append('description', deptForm.description);
      fd.append('original_description', deptForm.original_description || deptForm.description);
      fd.append('ai_structured_summary', deptForm.ai_structured_summary || '');
      fd.append('category', deptForm.category);
      if (deptForm.category === 'Others') fd.append('customCategory', deptForm.customCategory);
      fd.append('priority', deptForm.priority);
      fd.append('department_id', selectedDept.id);
      fd.append('is_safety_hazard', deptForm.is_safety_hazard);

      if (attachment) fd.append('attachment', attachment);
      if (voiceBlob)   fd.append('voiceNote', voiceBlob, 'voice-note.webm');

      const res = await axios.post('/api/complaints', fd);
      setSuccess(`Department Grievance #${res.data.complaint_id} lodged successfully!`);
      setTimeout(() => navigate(`/complaints/${res.data.complaint_id}`), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit grievance');
    } finally {
      setLoading(false);
    }
  };

  // ── SUBMIT BUS COMPLAINT ──
  const handleBusSubmit = async (e) => {
    e.preventDefault();
    if (!busForm.title.trim() || !busForm.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('title', busForm.title);
      fd.append('description', busForm.description);
      fd.append('original_description', busForm.original_description || busForm.description);
      fd.append('complaint_type', busForm.complaint_type);
      fd.append('bus_id', busForm.bus_id || '');
      fd.append('route_id', busForm.route_id || '');
      fd.append('incident_datetime', busForm.incident_datetime);
      fd.append('priority', busForm.priority);
      fd.append('is_safety_hazard', busForm.is_safety_hazard);

      busImages.forEach((img) => {
        fd.append('attachments', img);
      });

      const res = await axios.post('/api/bus-complaints', fd);
      setSuccess(`Transportation Grievance #${res.data.bus_complaint_id} submitted to Bus Coordinator!`);
      setTimeout(() => navigate(`/bus-complaints/${res.data.bus_complaint_id}`), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit bus grievance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout breadcrumbs={[{ label: 'Grievances', path: '/complaints' }, { label: 'New Grievance' }]}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Module Switcher Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            type="button"
            className={`btn ${activeTab === 'dept' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '14px 18px', fontSize: 15 }}
            onClick={() => { setActiveTab('dept'); setError(''); setDuplicateWarning(null); }}
          >
            🏛️ Department & Academic Grievance
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'bus' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '14px 18px', fontSize: 15 }}
            onClick={() => { setActiveTab('bus'); setError(''); setDuplicateWarning(null); }}
          >
            🚌 Campus Bus & Transport Grievance
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '12px 16px', background: '#DCFCE7', color: '#15803D', borderRadius: 8, marginBottom: 16 }}>
            {success}
          </div>
        )}

        {/* Intelligent Auto-Routing Indicator Badge */}
        {routingBadge && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            color: '#166534',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <span>
                <strong>Intelligently Auto-Routed: </strong>
                {routingBadge.label}
              </span>
            </div>
            <span className={`routing-badge ${routingBadge.is_safety ? 'badge-safety-critical' : ''}`}>
              {routingBadge.is_safety ? '🚨 Critical Safety Hazard' : `Priority: ${routingBadge.priority}`}
            </span>
          </div>
        )}

        {/* Duplicate Detection Warning Banner */}
        {duplicateWarning && (
          <div className="duplicate-alert-banner">
            <span className="icon">⚠️</span>
            <div className="duplicate-alert-text" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>Potential Duplicate Detected ({duplicateWarning.similarity_percentage}% match)</strong>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => setDuplicateWarning(null)}
                >
                  Proceed Anyway (Unique Issue)
                </button>
              </div>
              <div style={{ marginTop: 4 }}>{duplicateWarning.message}</div>
            </div>
          </div>
        )}

        {/* ── TAB 1: DEPARTMENT COMPLAINT FORM ── */}
        {activeTab === 'dept' && (
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Lodge Department Grievance</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Routed directly to the Head of Department & Department Coordinator
                </p>
              </div>
            </div>

            {/* AI Assistant for Department */}
            <AiComplaintAssistant
              moduleType="department"
              onApply={applyIntelligentGrievance}
            />

            <form onSubmit={handleDeptSubmit}>
              {/* Department Selector */}
              <DepartmentSelector
                value={selectedDept}
                onChange={setSelectedDept}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={deptForm.category}
                    onChange={e => setDeptForm({ ...deptForm, category: e.target.value })}
                  >
                    <option value="Academic">Academic / Curriculum</option>
                    <option value="Infrastructure">Infrastructure / Labs / Classrooms</option>
                    <option value="Hostel">Hostel & Accommodation</option>
                    <option value="Library">Library & Reading Rooms</option>
                    <option value="Examination">Examination & Valuation</option>
                    <option value="Finance">Finance & Fee Accounts</option>
                    <option value="Administration">General Administration</option>
                    <option value="Others">Others (Specify below)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={deptForm.priority}
                    onChange={e => setDeptForm({ ...deptForm, priority: e.target.value })}
                  >
                    <option value="Low">Low (Standard review)</option>
                    <option value="Medium">Medium (Attention within 48h)</option>
                    <option value="High">High (Urgent resolution needed)</option>
                    <option value="Critical">Critical (Immediate danger/hazard)</option>
                  </select>
                </div>
              </div>

              {deptForm.category === 'Others' && (
                <div className="form-group">
                  <label className="form-label">Specify Custom Category *</label>
                  <input
                    className="form-input"
                    placeholder="Enter category name..."
                    value={deptForm.customCategory}
                    onChange={e => setDeptForm({ ...deptForm, customCategory: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Title / Subject *</label>
                <input
                  className="form-input"
                  placeholder="e.g., Computer terminal #14 not turning on in CSE Lab 3"
                  value={deptForm.title}
                  onChange={e => setDeptForm({ ...deptForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description of Grievance *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Provide complete facts. Use the AI Assistant above if you want your informal draft structured automatically."
                  value={deptForm.description}
                  onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                  required
                />
              </div>

              {/* Safety Hazard Toggle */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={deptForm.is_safety_hazard}
                    onChange={e => setDeptForm({ ...deptForm, is_safety_hazard: e.target.checked })}
                  />
                  <span>🚨 This issue is a Safety / Emergency Hazard (Harassment, Accident, Fire, Violence)</span>
                </label>
              </div>

              {/* Voice Note & Document Upload */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label className="form-label">📎 Attachment (Photo / Document)</label>
                  <input
                    type="file"
                    className="form-input"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    onChange={e => setAttachment(e.target.files[0] || null)}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Max size 10MB. Allowed: JPG, PNG, PDF</span>
                </div>
                <div>
                  <label className="form-label">🎤 Record Voice Note (Optional)</label>
                  <VoiceRecorder
                    onRecordingComplete={setVoiceBlob}
                    onClear={() => setVoiceBlob(null)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting Grievance...' : 'Submit Department Grievance →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 2: BUS & TRANSPORTATION COMPLAINT FORM ── */}
        {activeTab === 'bus' && (
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Report Transportation / Bus Issue</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Handled exclusively by the University Campus Transport Coordinator
                </p>
              </div>
            </div>

            {/* AI Assistant for Bus */}
            <AiComplaintAssistant
              moduleType="transportation"
              onApply={applyIntelligentGrievance}
            />

            <form onSubmit={handleBusSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Select Bus Number (Optional / If Known)</label>
                  <select
                    className="form-select"
                    value={busForm.bus_id}
                    onChange={e => setBusForm({ ...busForm, bus_id: e.target.value })}
                  >
                    <option value="">-- Select Bus (or leave unassigned) --</option>
                    {buses.map(b => (
                      <option key={b.bus_id} value={b.bus_id}>
                        {b.bus_number} {b.driver_name ? `(${b.driver_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Campus Route *</label>
                  <select
                    className="form-select"
                    value={busForm.route_id}
                    onChange={e => setBusForm({ ...busForm, route_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Route --</option>
                    {routes.map(r => (
                      <option key={r.route_id} value={r.route_id}>
                        {r.route_number}: {r.route_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Issue Type *</label>
                  <select
                    className="form-select"
                    value={busForm.complaint_type}
                    onChange={e => setBusForm({ ...busForm, complaint_type: e.target.value })}
                  >
                    <option value="delay">Bus Delay / Irregular Timing</option>
                    <option value="driver_behaviour">Driver / Staff Conduct</option>
                    <option value="cleanliness">Bus Cleanliness & Hygiene</option>
                    <option value="maintenance">Breakdown / Mechanical Issue</option>
                    <option value="route_issue">Route Deviation / Missed Stop</option>
                    <option value="overcrowding">Overcrowding & Seating</option>
                    <option value="safety">Unsafe Driving / Safety Concern</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date & Time of Incident *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={busForm.incident_datetime}
                    onChange={e => setBusForm({ ...busForm, incident_datetime: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={busForm.priority}
                    onChange={e => setBusForm({ ...busForm, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  placeholder="e.g., 45-minute delay on CBT Route in the morning"
                  value={busForm.title}
                  onChange={e => setBusForm({ ...busForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description of Transit Incident *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe the stop, sequence of events, and specifics..."
                  value={busForm.description}
                  onChange={e => setBusForm({ ...busForm, description: e.target.value })}
                  required
                />
              </div>

              {/* Safety Hazard Toggle */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={busForm.is_safety_hazard}
                    onChange={e => setBusForm({ ...busForm, is_safety_hazard: e.target.checked })}
                  />
                  <span>🚨 Safety Hazard (Rash driving, brake problem, altercation, overcrowding risk)</span>
                </label>
              </div>

              {/* Multi-Photo Upload */}
              <div className="form-group">
                <label className="form-label">📸 Photo Evidence (Optional, max 3 photos)</label>
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  className="form-input"
                  onChange={e => {
                    const files = Array.from(e.target.files).slice(0, 3);
                    setBusImages(files);
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Upload clear photos of vehicle condition, crowd, or incident. Max 5MB each.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Bus Grievance →'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
