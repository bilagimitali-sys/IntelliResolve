import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

export default function AdminComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState({ status:'', category:'', priority:'', search:'' });

  // BUG FIX: useCallback so function is stable and safe to put in useEffect deps
  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status)   params.status   = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search)   params.search   = filters.search;
      const res = await axios.get('/api/complaints', { params });
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  const statusBadge = s => {
    const map = { 'Pending':'badge-pending','In Progress':'badge-progress','Resolved':'badge-resolved' };
    return <span className={`badge ${map[s]}`}>{s}</span>;
  };
  const priorityBadge = p => {
    const map = { High:'badge-high', Medium:'badge-medium', Low:'badge-low' };
    return <span className={`badge ${map[p]}`}>{p}</span>;
  };

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Complaints</h1>
          <p className="page-sub">{complaints.length} complaints found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <input className="search-input"
          placeholder="🔍  Search by title or description..."
          value={filters.search}
          onChange={e => setF('search', e.target.value)} />

        <select className="filter-select" value={filters.status}
          onChange={e => setF('status', e.target.value)}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select className="filter-select" value={filters.category}
          onChange={e => setF('category', e.target.value)}>
          <option value="">All Categories</option>
          {['Academic','Infrastructure','Hostel','Library','Administration'].map(c =>
            <option key={c} value={c}>{c}</option>
          )}
        </select>

        <select className="filter-select" value={filters.priority}
          onChange={e => setF('priority', e.target.value)}>
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <button className="btn btn-secondary btn-sm"
          onClick={() => setFilters({ status:'',category:'',priority:'',search:'' })}>
          Clear
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="spinner" />
        ) : complaints.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No complaints match your filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Student</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.complaint_id}>
                    <td className="text-xs">#{c.complaint_id}</td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.student_name}</div>
                      <div className="text-xs">{c.student_email}</div>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </div>
                    </td>
                    <td className="text-sm">{c.category}</td>
                    <td>{priorityBadge(c.priority)}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td className="text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/complaints/${c.complaint_id}`)}>
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
