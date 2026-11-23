import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * DepartmentSelector — Card-grid department picker
 *
 * Props:
 *   value    — currently selected department object { id, code, name, ... }
 *   onChange — callback(deptObject) when a card is clicked
 */
export default function DepartmentSelector({ value, onChange }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    axios.get('/api/departments')
      .then(res => setDepartments(res.data))
      .catch(err => console.error('Failed to load departments:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dept-selector-wrapper">
        <label className="form-label" style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary, #0A2463)' }}>
          🏛️ Select Target Department <span style={{ color: 'var(--danger, #B91C1C)' }}>*</span>
        </label>
        <p className="dept-selector-hint">Loading departments...</p>
      </div>
    );
  }

  return (
    <div className="dept-selector-wrapper">
      <label className="form-label" style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary, #0A2463)' }}>
        🏛️ Select Target Department <span style={{ color: 'var(--danger, #B91C1C)' }}>*</span>
      </label>
      <p className="dept-selector-hint">
        Your complaint will be sent directly to this department
      </p>

      <div className="dept-card-grid">
        {departments.map(dept => (
          <button
            key={dept.id}
            type="button"
            className={`dept-card ${value?.id === dept.id ? 'selected' : ''}`}
            onClick={() => onChange(dept)}
            title={dept.name}
          >
            <span className="dept-icon">{dept.icon}</span>
            <span className="dept-name-text">{dept.code}</span>
            <span className="dept-code">{dept.name.length > 20 ? dept.name.substring(0, 18) + '…' : dept.name}</span>
          </button>
        ))}
      </div>

      {value && (
        <div className="dept-selected-info">
          <div className="dept-selected-name">
            <span>{value.icon}</span> {value.name}
          </div>
          <div className="dept-selected-email">
            Will be sent to: <strong>{value.hod_email}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
