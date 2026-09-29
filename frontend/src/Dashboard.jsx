import React, { useState, useEffect } from 'react';

const API = '';

function Dashboard() {
  const [prospectsCount, setProspectsCount] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/prospects`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setProspectsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setProspectsCount(0));
  }, []);

  return (
    <section className="cards" style={{ justifyContent: 'center' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: '280px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
        <h3 style={{ color: '#555', marginBottom: '0.5rem' }}>Total Prospectos</h3>
        <p style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--accent)', margin: 0 }}>
          {prospectsCount === null ? '...' : prospectsCount}
        </p>
      </div>
    </section>
  );
}

export default Dashboard;
