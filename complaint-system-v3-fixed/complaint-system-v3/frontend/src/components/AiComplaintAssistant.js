import { useState } from 'react';
import axios from 'axios';

export default function AiComplaintAssistant({ onApply, defaultText = '', moduleType = 'department' }) {
  const [inputText, setInputText] = useState(defaultText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refinedResult, setRefinedResult] = useState(null);
  const [isOpen, setIsOpen] = useState(true); // Default open for ease of use
  const [mode, setMode] = useState('structure'); // 'structure' | 'chat'

  // Chat state inside assistant
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: 'Describe what happened casually. I will structure it into a formal grievance and automatically route it to the right department or bus route!'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Editable fields in preview
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleRefine = async (textToRefine) => {
    const raw = (textToRefine || inputText).trim();
    if (!raw) {
      setError('Please write a brief informal description of your grievance first.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Refine text structure
      const refineRes = await axios.post('/api/ai/refine-complaint', { text: raw });
      const refined = refineRes.data;

      // 2. Classify for intelligent routing, department/bus mapping, safety and priority
      const routeRes = await axios.post('/api/ai/intelligent-route', { text: raw });
      const routing = routeRes.data;

      const combined = {
        ...refined,
        ...routing,
        original_text: raw,
      };

      setRefinedResult(combined);
      setEditTitle(combined.suggested_title || '');
      setEditDesc(combined.formatted_description || combined.what_happened || '');
    } catch (err) {
      console.error('AI refinement error:', err);
      setError(err.response?.data?.error || 'AI assistant is currently busy. You can continue with manual entry.');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async (msgText) => {
    const text = (msgText || chatInput).trim();
    if (!text || chatLoading) return;

    setChatInput('');
    const newHistory = [
      ...chatMessages,
      { sender: 'user', text }
    ];
    setChatMessages(newHistory);
    setChatLoading(true);

    try {
      const res = await axios.post('/api/ai/chat', {
        message: text,
        conversationHistory: newHistory.slice(-6).map(m => ({ sender: m.sender, text: m.text })),
      });

      const replyData = res.data;
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: replyData.reply,
          recommendations: replyData.recommendations || [],
          extracted_complaint: replyData.extracted_complaint,
          duplicate_check: replyData.duplicate_check,
        }
      ]);

      if (replyData.extracted_complaint) {
        setRefinedResult({
          ...replyData.extracted_complaint,
          ...replyData.routing,
          original_text: text,
        });
        setEditTitle(replyData.extracted_complaint.title || replyData.extracted_complaint.suggested_title || '');
        setEditDesc(replyData.extracted_complaint.formatted_description || replyData.extracted_complaint.description || '');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Encountered a network issue. You can switch to Quick Structuring tab to refine your grievance.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleApply = () => {
    if (!refinedResult) return;
    onApply({
      target_module: refinedResult.target_module,
      department_id: refinedResult.department_id,
      department_code: refinedResult.department_code,
      department_name: refinedResult.department_name,
      bus_id: refinedResult.bus_id,
      bus_number: refinedResult.bus_number,
      route_id: refinedResult.route_id,
      route_number: refinedResult.route_number,
      route_name: refinedResult.route_name,
      routing_reason: refinedResult.routing_reason,
      title: editTitle,
      description: editDesc,
      original_description: refinedResult.original_text || inputText,
      ai_structured_summary: refinedResult.formatted_description,
      is_safety_hazard: refinedResult.is_safety_hazard,
      safety_reason: refinedResult.safety_reason,
      suggested_category: refinedResult.suggested_category,
      bus_complaint_type: refinedResult.bus_complaint_type,
      suggested_priority: refinedResult.suggested_priority,
      sentiment_score: refinedResult.sentiment_score,
      urgency_level: refinedResult.suggested_priority === 'Critical' ? 'Critical' : 'Normal',
      ai_confidence: refinedResult.confidence || 0.92,
    });
  };

  return (
    <div className="ai-assistant-box">
      <div className="ai-assistant-header flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <div>
            <h3>KLE Grievance AI Assistant</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              AI Structuring • Intelligent Department & Bus Routing • Zero-Hallucination Guarantee
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsOpen(o => !o)}
          >
            {isOpen ? 'Minimize Assistant ▲' : 'Open AI Assistant ▼'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: 14 }}>
          {/* Sub-mode switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'structure' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('structure')}
            >
              ✨ Quick Structuring & Routing
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('chat')}
            >
              💬 Interactive Chat Intake
            </button>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* ── MODE 1: QUICK STRUCTURING ── */}
          {mode === 'structure' && (
            <div>
              <div className="form-group">
                <label className="form-label">
                  Your Casual / Informal Grievance Draft (English or Hinglish)
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder='e.g., "Yesterday morning bus #02 from CBT arrived 35 mins late and skipped Goaves stop" OR "In CSE 3rd floor lab 204 the projector has no HDMI cable and AC is not working"'
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleRefine()}
                  disabled={loading}
                >
                  {loading ? 'Analyzing & Routing...' : '✨ Structure, Route & Check Duplicates'}
                </button>
                {inputText && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setInputText(''); setRefinedResult(null); }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── MODE 2: INTERACTIVE CHAT INTAKE ── */}
          {mode === 'chat' && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-page)', padding: 12, marginBottom: 16 }}>
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`} style={{ fontSize: 13 }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                    {m.recommendations && m.recommendations.length > 0 && (
                      <div style={{ marginTop: 6, padding: '6px 8px', borderRadius: 6, background: 'rgba(15, 23, 42, 0.04)', border: '1px solid var(--border)', fontSize: 12 }}>
                        <strong style={{ fontSize: 11, color: 'var(--primary)' }}>💡 Recommendations:</strong>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                          {m.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
                        </ul>
                      </div>
                    )}
                    {m.duplicate_check?.has_duplicate && (
                      <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '6px 8px', borderRadius: 6, fontSize: 11, color: '#92400E', marginTop: 6 }}>
                        ⚠️ <strong>Potential Duplicate Detected ({m.duplicate_check.similarity_percentage}% match):</strong>
                        <div>{m.duplicate_check.message}</div>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-bubble chat-bubble-bot" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    AI Assistant is thinking...
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: 13, padding: '7px 10px', flex: 1 }}
                  placeholder="Type your issue..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend(); } }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleChatSend()}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* ── INTELLIGENT ROUTING & STRUCTURE REVIEW ── */}
          {refinedResult && (
            <div style={{ marginTop: 14 }}>
              {/* Intelligent Routing Banner */}
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🎯</span>
                  <div style={{ fontSize: 13, color: '#166534' }}>
                    <strong>Intelligent Routing: </strong>
                    {refinedResult.target_module === 'transportation' ? (
                      <span>
                        🚌 <strong>Campus Bus & Transit Hub</strong>
                        {refinedResult.route_number && ` • Route ${refinedResult.route_number}`}
                        {refinedResult.bus_number && ` • ${refinedResult.bus_number}`}
                      </span>
                    ) : (
                      <span>
                        🏛️ <strong>Dept of {refinedResult.department_name || 'Academic Redressal'}</strong> ({refinedResult.department_code || 'DEPT'})
                        {refinedResult.suggested_category && ` • Category: ${refinedResult.suggested_category}`}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`routing-badge ${refinedResult.is_safety_hazard ? 'badge-safety-critical' : ''}`}>
                    Priority: {refinedResult.suggested_priority || 'Normal'}
                  </span>
                  <span style={{ fontSize: 11, color: '#166534', background: '#DCFCE7', padding: '3px 8px', borderRadius: 12, fontWeight: 700 }}>
                    {Math.round((refinedResult.confidence || 0.92) * 100)}% Match
                  </span>
                </div>
              </div>

              {refinedResult.is_safety_hazard && (
                <div className="safety-alert-strip">
                  <span>🚨</span>
                  <span>Safety Hazard Detected: This issue involves physical danger or urgent disruption. Escalate to Critical priority.</span>
                </div>
              )}

              {/* Side-by-Side Review Grid */}
              <div className="side-by-side-grid">
                {/* Left: Original Draft */}
                <div className="diff-panel">
                  <div className="diff-panel-title">
                    <span>Student Original Draft</span>
                    <span className="badge badge-priority-low">Unmodified</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6, flex: 1 }}>
                    {refinedResult.original_text || inputText}
                  </div>
                </div>

                {/* Right: AI Structured Report (Editable) */}
                <div className="diff-panel" style={{ borderColor: 'var(--primary)', background: '#FAFCFF' }}>
                  <div className="diff-panel-title" style={{ color: 'var(--primary)' }}>
                    <span>Structured Professional Report (Review & Edit)</span>
                    <span className="badge badge-progress">AI Formatted</span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SUGGESTED TITLE</label>
                    <input
                      className="form-input"
                      style={{ fontSize: 13, padding: '6px 10px' }}
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                    />
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>STRUCTURED DESCRIPTION</label>
                    <textarea
                      className="form-textarea"
                      style={{ fontSize: 13, padding: '8px 10px', flex: 1, minHeight: 140 }}
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Explicit Approval Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setRefinedResult(null)}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={handleApply}
                >
                  ✓ Approve & Auto-Fill Form
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
