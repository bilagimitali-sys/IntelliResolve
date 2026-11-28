import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AiChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'bot',
      text: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! 👋 I am **KLE Saarthi**, your university AI Grievance Assistant.\n\nYou can describe any academic, hostel, or campus bus issue to me. I will automatically route it to the right department or coordinator, check for duplicates, and help you file your grievance in seconds.`,
      chips: [
        '🚌 Report Bus Delay on Route R-01 (CBT)',
        '💻 Report Lab Workstation Issue in CSE',
        '🏠 Report Hostel Mess / Water Issue',
        '❓ How does intelligent routing work?'
      ]
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (!aiStatus) {
        axios.get('/api/ai/status')
          .then(res => setAiStatus(res.data))
          .catch(() => {});
      }
    }
  }, [messages, isOpen, aiStatus]);

  // If user is not logged in, don't show the widget
  if (!user) return null;

  const handleSend = async (textToSend) => {
    const msgText = (textToSend || input).trim();
    if (!msgText || loading) return;

    setInput('');
    const userMsgId = `u-${Date.now()}`;
    const newHistory = [
      ...messages,
      { id: userMsgId, sender: 'user', text: msgText }
    ];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Build lightweight conversation history for backend context
      const historyPayload = newHistory.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await axios.post('/api/ai/chat', {
        message: msgText,
        conversationHistory: historyPayload,
      });

      const botReply = res.data;
      const botMsgId = `b-${Date.now()}`;

      setMessages(prev => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          text: botReply.reply,
          recommendations: botReply.recommendations || [],
          extracted_complaint: botReply.extracted_complaint,
          routing: botReply.routing,
          safety: botReply.safety,
          duplicate_check: botReply.duplicate_check,
          chips: botReply.suggested_actions || []
        }
      ]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: 'I am experiencing a momentary communication hiccup with the university gateway. Please try again or visit the New Grievance form directly.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToForm = (extracted) => {
    if (!extracted) return;

    // Save to localStorage so NewComplaint page can pick it up immediately
    const prefillData = {
      target_module: extracted.target_module || 'department',
      title: extracted.title || extracted.suggested_title || '',
      description: extracted.description || extracted.formatted_description || extracted.what_happened || '',
      original_description: extracted.original_text || extracted.what_happened || '',
      ai_structured_summary: extracted.formatted_description || '',
      department_id: extracted.department_id || null,
      department_code: extracted.department_code || null,
      category: extracted.suggested_category || 'Academic',
      bus_id: extracted.bus_id || '',
      route_id: extracted.route_id || '',
      complaint_type: extracted.bus_complaint_type || 'delay',
      priority: extracted.suggested_priority || 'Medium',
      is_safety_hazard: extracted.is_safety_hazard || false,
      routing_reason: extracted.routing_reason || '',
      timestamp: Date.now()
    };

    localStorage.setItem('kle_prefill_complaint', JSON.stringify(prefillData));

    setIsOpen(false);
    if (location.pathname === '/complaints/new') {
      // Trigger a custom event if already on the page
      window.dispatchEvent(new CustomEvent('kle_prefill_loaded', { detail: prefillData }));
    } else {
      navigate('/complaints/new');
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          className="ai-floating-trigger"
          onClick={() => setIsOpen(true)}
          title="Open AI Grievance Assistant (KLE Saarthi)"
          aria-label="Open AI Grievance Assistant"
        >
          <span style={{ fontSize: 18 }}>🤖</span>
          <span>KLE Saarthi AI</span>
          <span className="ai-floating-badge">Online</span>
        </button>
      )}

      {/* Interactive Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-chat-avatar">🤖</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>KLE Saarthi AI</div>
                <div style={{ fontSize: 11, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: aiStatus?.configured ? '#22C55E' : '#F59E0B',
                    display: 'inline-block'
                  }} />
                  {aiStatus?.configured
                    ? `Live ${aiStatus.provider.toUpperCase()} Active`
                    : 'Smart Campus Assistant'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                style={{ background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 18 }}
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-chat-body">
            {messages.map((m) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className={`chat-bubble ${m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                  {/* Actionable Recommendations */}
                  {m.recommendations && m.recommendations.length > 0 && (
                    <div style={{
                      marginTop: 8,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(15, 23, 42, 0.04)',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--primary)', marginBottom: 4 }}>
                        💡 Recommendations
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {m.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Extracted Complaint Card if generated */}
                  {m.extracted_complaint && (
                    <div className="chat-complaint-card">
                      <div className="chat-complaint-card-header">
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                          🎯 Structured Grievance Draft
                        </span>
                        <span className={`routing-badge ${m.extracted_complaint.is_safety_hazard ? 'badge-safety-critical' : ''}`}>
                          {m.extracted_complaint.is_safety_hazard ? '🚨 Critical Safety Hazard' : `Priority: ${m.extracted_complaint.suggested_priority || 'Normal'}`}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div>
                          <strong>Routing Target: </strong>
                          {m.extracted_complaint.target_module === 'transportation'
                            ? `🚌 Campus Transit (${m.extracted_complaint.route_number || 'Route'}${m.extracted_complaint.bus_number ? ' - ' + m.extracted_complaint.bus_number : ''})`
                            : `🏛️ ${m.extracted_complaint.department_name || 'Academic Dept'} (${m.extracted_complaint.suggested_category || 'General'})`
                          }
                        </div>
                        {m.extracted_complaint.routing_reason && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            <em>{m.extracted_complaint.routing_reason}</em>
                          </div>
                        )}
                      </div>

                      {/* Duplicate Alert if detected */}
                      {m.duplicate_check?.has_duplicate && (
                        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '6px 10px', borderRadius: 6, fontSize: 11, color: '#92400E' }}>
                          ⚠️ <strong>Potential Duplicate ({m.duplicate_check.similarity_percentage}% match):</strong>
                          <div>{m.duplicate_check.message}</div>
                        </div>
                      )}

                      {/* Transfer to Form Button */}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: 6, width: '100%', fontSize: 12, padding: '7px 10px' }}
                        onClick={() => handleTransferToForm(m.extracted_complaint)}
                      >
                        ✓ Transfer to Grievance Form & Review
                      </button>
                    </div>
                  )}
                </div>

                {/* Suggestion Chips */}
                {m.chips && m.chips.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, paddingLeft: 4 }}>
                    {m.chips.map((chip, idx) => (
                      <button
                        key={idx}
                        className="chat-chip"
                        onClick={() => handleSend(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-bubble chat-bubble-bot" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>KLE Saarthi is thinking & routing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form
            className="ai-chat-footer"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask a question or describe an issue..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 14px' }}
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
