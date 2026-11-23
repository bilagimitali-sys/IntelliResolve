import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

export default function BusFleetView() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/bus-complaints/buses'),
      axios.get('/api/bus-complaints/routes'),
    ])
      .then(([bRes, rRes]) => {
        setBuses(bRes.data || []);
        setRoutes(rRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="spinner" /></Layout>;

  return (
    <Layout breadcrumbs={[{ label: 'Transportation', path: '/bus/dashboard' }, { label: 'Fleet & Routes' }]}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Campus Fleet & Transit Routes Directory</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Official KLE Technological University Belagavi Campus transportation schedule & vehicles
          </p>
        </div>
      </div>

      {/* Buses Directory */}
      <div className="card" style={{ marginBottom: 24, padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16 }}>🚌 Campus Bus Vehicles ({buses.length})</h3>
        </div>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Bus ID</th>
                <th>Registration / Vehicle #</th>
                <th>Capacity</th>
                <th>Designated Driver</th>
                <th>Contact Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(b => (
                <tr key={b.bus_id}>
                  <td><strong>#{b.bus_id}</strong></td>
                  <td><strong>{b.bus_number}</strong></td>
                  <td>{b.capacity} Seats</td>
                  <td>{b.driver_name || 'Assigned Driver'}</td>
                  <td><code>{b.driver_phone || 'N/A'}</code></td>
                  <td><span className="badge badge-resolved">Active Service</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Routes Directory */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16 }}>🚏 Scheduled Campus Routes ({routes.length})</h3>
        </div>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Route #</th>
                <th>Route Name</th>
                <th>Origin → Destination</th>
                <th>Morning Schedule</th>
                <th>Evening Schedule</th>
                <th>Intermediate Key Stops</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(r => (
                <tr key={r.route_id}>
                  <td><span className="badge badge-assigned">{r.route_number}</span></td>
                  <td><strong>{r.route_name}</strong></td>
                  <td>{r.start_point} ➔ {r.end_point}</td>
                  <td><code>{r.morning_schedule}</code></td>
                  <td><code>{r.evening_schedule}</code></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.stops_list}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
