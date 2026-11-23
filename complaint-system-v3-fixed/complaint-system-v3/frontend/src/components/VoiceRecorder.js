import { useState, useRef, useEffect, useCallback } from 'react';

const MAX_DURATION = 120; // 2 minutes in seconds

/**
 * VoiceRecorder — Inline voice recorder using MediaRecorder API
 *
 * Props:
 *   onRecordingComplete(blob) — called with the audio Blob when recording is accepted
 *   onClear()                 — called when recording is discarded
 */
export default function VoiceRecorder({ onRecordingComplete, onClear }) {
  const [state, setState]           = useState('idle'); // idle | recording | preview
  const [elapsed, setElapsed]       = useState(0);
  const [audioUrl, setAudioUrl]     = useState(null);
  const [error, setError]           = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);
  const streamRef        = useRef(null);

  // Format seconds → m:ss
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current)  clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm, fallback to mp4
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm'
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('preview');
        // Store blob for later use
        chunksRef.current = [blob]; // reuse chunks ref to hold the final blob
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(1000); // collect data every second
      setState('recording');
      setElapsed(0);

      // Timer
      let sec = 0;
      timerRef.current = setInterval(() => {
        sec++;
        setElapsed(sec);
        if (sec >= MAX_DURATION) {
          recorder.stop();
          clearInterval(timerRef.current);
        }
      }, 1000);

    } catch (err) {
      console.error('Mic access error:', err);
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const useRecording = () => {
    const blob = chunksRef.current[0]; // the final blob
    if (blob && onRecordingComplete) {
      onRecordingComplete(blob);
    }
  };

  const reRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setState('idle');
    setElapsed(0);
    chunksRef.current = [];
    if (onClear) onClear();
  };

  return (
    <div className="voice-recorder-wrapper">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        🎤 Voice Note <span style={{ fontSize: 12, color: 'var(--text-muted, #6B7FA8)', fontWeight: 400 }}>(optional, max 2 min)</span>
      </label>

      {error && (
        <div className="voice-error">{error}</div>
      )}

      {/* ── IDLE STATE ── */}
      {state === 'idle' && (
        <button type="button" className="voice-btn voice-btn-start" onClick={startRecording}>
          <span className="voice-btn-icon">🎤</span>
          Start Recording
        </button>
      )}

      {/* ── RECORDING STATE ── */}
      {state === 'recording' && (
        <div className="voice-recording-panel">
          <div className="voice-recording-indicator">
            <span className="voice-rec-dot" />
            <span className="voice-rec-label">Recording</span>
            <span className="voice-timer">{formatTime(elapsed)} / {formatTime(MAX_DURATION)}</span>
          </div>
          <div className="voice-progress-bar">
            <div
              className="voice-progress-fill"
              style={{ width: `${(elapsed / MAX_DURATION) * 100}%` }}
            />
          </div>
          {elapsed >= MAX_DURATION && (
            <div className="voice-max-warning">⏱ Maximum 2 minutes reached</div>
          )}
          <button type="button" className="voice-btn voice-btn-stop" onClick={stopRecording}>
            ⏹ Stop Recording
          </button>
        </div>
      )}

      {/* ── PREVIEW STATE ── */}
      {state === 'preview' && (
        <div className="voice-preview-panel">
          <audio controls src={audioUrl} style={{ width: '100%', borderRadius: 8 }} />
          <div className="voice-preview-actions">
            <button type="button" className="voice-btn voice-btn-rerecord" onClick={reRecord}>
              🗑 Re-record
            </button>
            <button type="button" className="voice-btn voice-btn-use" onClick={useRecording}>
              ✅ Use this recording
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
