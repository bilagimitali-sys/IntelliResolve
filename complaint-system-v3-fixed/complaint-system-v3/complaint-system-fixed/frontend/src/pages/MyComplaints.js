import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

export default function MyComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState({ status: '', category: '', priority: '' });

  useEffect(() => { loadComplaints(); }, []);

  const loadComplaints = async () => {
    try {
      const res = await axios.get('/api/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = complaints.filter(c => {
    if (filter.status   && c.status   !== filter.status)   return false;
    if (filter.category && c.category !== filter.category) return false;
    if (filter.priority && c.priority !== filter.priority) return false;
    return true;
  });

  const statusBadge = s => {
    const map = { 'Pending': 'badge-pending', 'In Progress': 'badge-progress', 'Resolved': 'badge-resolved' };
    return <span className={`badge ${map[s]}`}>{s}</span>;
  };
  const priorityBadge = p => {
    const map = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
    return <span className={`badge ${map[p]}`}>{p}</span>;
  };

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Complaints</h1>
          <p className="page-sub">{complaints.length} total complaints</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/complaints/new')}>
          ＋ New Complaint
        </button>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <select className="filter-select" value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select className="filter-select" value={filter.category}
          onChange={e => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          {['Academic','Infrastructure','Hostel','Library','Administration'].map(c =>
            <option key={c} value={c}>{c}</option>
          )}
        </select>

        <select className="filter-select" value={filter.priority}
          onChange={e => setFilter({ ...filter, priority: e.target.value })}>
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {(filter.status || filter.category || filter.priority) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => setFilter({ status:'', category:'', priority:'' })}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No complaints found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.complaint_id}>
                    <td className="text-xs">#{c.complaint_id}</td>
                    <td style={{ fontWeight: 500, maxWidth: 250 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </div>
                    </td>
                    <td className="text-sm">{c.category}</td>
                    <td>{priorityBadge(c.priority)}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td className="text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/complaints/${c.complaint_id}`)}>
                        View →
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
