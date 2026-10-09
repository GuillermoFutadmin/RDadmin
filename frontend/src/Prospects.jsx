import React, { useState, useEffect, useRef } from 'react';
import { CotizacionView } from './Cotizacion';
import { IconUsers, IconTrendingUp, IconFileText, IconCheckCircle, IconEdit, IconPlusCircle, IconTrash, IconSearch } from './icons';
import ProjectTracking, { getProjectTrackingProgress } from './ProjectTracking';


const API = '';

// ─── ApproveRejectModal ─── standalone so state persists across re-renders ───
function ApproveRejectModal({ prospect, fetchProspects, onClose }) {
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');

  const handleApprove = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));

    await fetch(`${API}/api/prospects/${prospect.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_contract: true, contract_date: new Date().toISOString(), status: 'APROBADO', contract_password: pwd }),
    });
    onClose(); fetchProspects();
  };

  const handleRejectConfirm = async () => {
    if (!reason.trim()) { alert('Por favor escribe el motivo de rechazo.'); return; }
    await fetch(`${API}/api/prospects/${prospect.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_papelera: true, papelera_reason: reason.trim() }),
    });
    onClose(); fetchProspects();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '440px', maxWidth: '95vw', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        <h3 style={{ margin: '0 0 0.3rem', color: '#1e293b', fontSize: '1.1rem' }}>Se aprobó el proyecto?</h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.2rem' }}>
          <strong>{prospect.name}</strong> · {prospect.project_type}
        </p>

        {showReason ? (
          <>
            <p style={{ fontSize: '0.88rem', fontWeight: '700', color: '#dc2626', margin: '0 0 0.5rem' }}>
              Por que no se aprobo el proyecto?
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Ej. Presupuesto fuera de rango, cliente decidio no continuar..."
              autoFocus
              style={{ width: '100%', padding: '8px', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={() => { setShowReason(false); setReason(''); }}
                style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                Volver
              </button>
              <button
                onClick={handleRejectConfirm}
                style={{ flex: 2, padding: '0.75rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                Confirmar Rechazo
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={handleApprove}
                style={{ flex: 1, padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}>
                SI - Pasar a Contratos
              </button>
              <button
                onClick={() => setShowReason(true)}
                style={{ flex: 1, padding: '0.75rem', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}>
                NO - Papelera
              </button>
            </div>
            <button
              onClick={onClose}
              style={{ width: '100%', marginTop: '0.6rem', padding: '0.5rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem' }}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shared styles
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inputStyle = {
  width: '100%', padding: '0.5rem', borderRadius: '6px',
  border: '1px solid #ddd', marginTop: '0.4rem', fontSize: '0.95rem'
};
const labelStyle = { fontWeight: '600', fontSize: '0.9rem', color: '#444' };
const sectionStyle = {
  padding: '1.2rem', border: '1px solid #eee',
  borderRadius: '10px', display: 'grid', gap: '1rem'
};
const sectionTitleStyle = {
  fontSize: '1.4rem', fontWeight: '800',
  color: 'var(--accent)', marginBottom: '1rem',
  borderBottom: '2px solid var(--accent)', paddingBottom: '0.4rem',
  letterSpacing: '0.5px', textAlign: 'center'
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. EmpathyGuide â€” full-screen before form
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmpathyGuide({ onContinue, onCancel }) {
  const TOTAL = 150;
  const [seconds, setSeconds] = useState(TOTAL);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (started && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds(s => s - 1), 1000);
    }
    if (seconds === 0 && intervalRef.current) clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [started, seconds]);

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const pct = ((TOTAL - seconds) / TOTAL) * 100;

  const steps = [
    { icon: '👋', label: 'Saludo inicial', text: '"Hola, buen día [Nombre], soy Rogelio de RD Carpintería."', note: 'Espera su respuesta antes de continuar.' },
    { icon: '🤝', label: 'Rompe el hielo', text: '"Qué tal tu día? Cómo estás?"', note: 'Dale continuidad según el tema que surja en el momento.' },
    { icon: '💬', label: 'Deja que fluya', text: 'Escucha activamente. No interrumpas. La plática avanza de forma natural.', note: 'Este momento de conexión dura entre 2 y 3 minutos.' },
  ];

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>☕</div>
        <h2 style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '0.4rem' }}>Guía de Apertura</h2>
        <p style={{ color: '#888', fontSize: '0.95rem' }}>Antes de iniciar el formulario, tómate un momento para conectar con el prospecto.</p>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem 1.2rem', backgroundColor: '#fdf8f6', borderRadius: '10px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>{step.icon}</div>
            <div>
              <p style={{ fontWeight: '700', color: '#333', marginBottom: '0.3rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{step.label}</p>
              <p style={{ color: '#222', marginBottom: '0.3rem', fontStyle: 'italic' }}>{step.text}</p>
              <p style={{ color: '#888', fontSize: '0.85rem' }}>{step.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {!started ? (
          <button onClick={() => setStarted(true)}
            style={{ backgroundColor: 'var(--accent)', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            ▶️ Iniciar temporizador (2:30 min)
          </button>
        ) : (
          <div>
            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 1rem' }}>
              <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="55" cy="55" r="48" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                <circle cx="55" cy="55" r="48" fill="none"
                  stroke={seconds === 0 ? '#22c55e' : 'var(--accent)'}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - pct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700', color: seconds === 0 ? '#22c55e' : 'var(--accent)' }}>
                {seconds === 0 ? '✔️' : fmt(seconds)}
              </div>
            </div>
            <p style={{ color: seconds === 0 ? '#22c55e' : '#666', fontWeight: '600' }}>
              {seconds === 0 ? '¡¡Tiempo completado! Ya puedes continuar.' : '¡Tiempo de conexión corriendo...'}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={onContinue}
          style={{ flex: 1, backgroundColor: 'var(--accent)', color: 'white', padding: '0.9rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
          Continuar al formulario ➡️
        </button>
        <button onClick={onCancel}
          style={{ padding: '0.9rem 1.5rem', backgroundColor: '#eee', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2. Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EMPTY_FORM = {
  name: '', contact_info: '', location: '',
  priorities: { tiempo: false, calidad: false, precio: false },
  expectations: '', has_design: false, design_details: '',
  measurements: '', hardware_details: '',
  start_date: '', delivery_date: '', production_days: '',
  project_type: '', project_type_other: '', kitchen_layout: '', kitchen_addons: '', closet_layout: '', closet_addons: '',
  kitchen_measurements: '', kitchen_island_measurements: '', kitchen_peninsula_measurements: '',
  closet_measurements: '', closet_island_measurements: '', closet_vanity_measurements: '',
  door_solid_measurements: '', door_tambor_measurements: '', restorations: [], other_measurements: '', material_type: '',
  material_type_2: '',
  material_type_interior: '',
  material_type_exterior: '',
  wood_tone: '',
  project_timeline: '', estimated_price: '',
  interior_color_type: '', interior_color_code: '',
  exterior_inf_color_type: '', exterior_inf_color_code: '',
  exterior_sup_color_type: '', exterior_sup_color_code: '',
  countertop_type: '', inhabited_house: '', how_found: ''
};

function dbToForm(p) {
  const prio = { tiempo: false, calidad: false, precio: false };
  if (p.project_priorities) {
    p.project_priorities.split(',').forEach(k => {
      const key = k.trim().toLowerCase();
      if (key in prio) prio[key] = true;
    });
  }
  const form = {
    name: p.name || '', contact_info: p.contact_info || '', location: p.location || '',
    priorities: prio, expectations: p.expectations || '',
    has_design: p.has_design || false, design_details: p.design_details || '',
    measurements: p.measurements || '', hardware_details: p.hardware_details || '',
    start_date: p.start_date || '', delivery_date: p.delivery_date || '', production_days: p.production_days || '',
    project_timeline: p.project_timeline || '',
    project_type: p.project_type || '', project_type_other: p.project_type_other || '', kitchen_layout: p.kitchen_layout || '', kitchen_addons: p.kitchen_addons || '', closet_layout: p.closet_layout || '', closet_addons: p.closet_addons || '',
    kitchen_measurements: p.kitchen_measurements || '', kitchen_island_measurements: p.kitchen_island_measurements || '', kitchen_peninsula_measurements: p.kitchen_peninsula_measurements || '',
    closet_measurements: p.closet_measurements || '', closet_island_measurements: p.closet_island_measurements || '', closet_vanity_measurements: p.closet_vanity_measurements || '',
    door_solid_measurements: p.door_solid_measurements || '', door_tambor_measurements: p.door_tambor_measurements || '', restoration_measurements: p.restoration_measurements || '', restoration_details: p.restoration_details || '', other_measurements: p.other_measurements || '', material_type: p.material_type || '', material_type_2: p.material_type_2 || '', estimated_price: p.estimated_price || '',
    interior_color_type: p.interior_color_type || '', interior_color_code: p.interior_color_code || '',
    exterior_inf_color_type: p.exterior_inf_color_type || '', exterior_inf_color_code: p.exterior_inf_color_code || '',
    exterior_sup_color_type: p.exterior_sup_color_type || '', exterior_sup_color_code: p.exterior_sup_color_code || '',
    countertop_type: p.countertop_type || '', inhabited_house: p.inhabited_house || '', how_found: p.how_found || ''
  };
  
  try {
    if (p.restoration_details && p.restoration_details.startsWith('[')) {
      form.restorations = JSON.parse(p.restoration_details);
    } else if (p.restoration_details || p.restoration_measurements) {
      form.restorations = [{ type: p.restoration_details || 'Otros', measurements: p.restoration_measurements || '' }];
    } else {
      form.restorations = [];
    }
  } catch(e) {
    form.restorations = [];
  }
  return form;
}

function formToPayload(f) {
  return {
    name: f.name, contact_info: f.contact_info, location: f.location,
    project_priorities: Object.keys(f.priorities).filter(k => f.priorities[k]).join(', '),
    expectations: f.expectations, has_design: f.has_design,
    design_details: f.design_details,
    hardware_details: f.hardware_details,
    start_date: f.start_date || null, delivery_date: f.delivery_date || null, production_days: f.production_days || null,
    project_type: f.project_type || null, project_type_other: f.project_type_other || null, kitchen_layout: f.kitchen_layout || null, kitchen_addons: f.kitchen_addons || null, closet_layout: f.closet_layout || null, closet_addons: f.closet_addons || null,
    kitchen_measurements: f.kitchen_measurements || null, kitchen_island_measurements: f.kitchen_island_measurements || null, kitchen_peninsula_measurements: f.kitchen_peninsula_measurements || null,
    closet_measurements: f.closet_measurements || null, closet_island_measurements: f.closet_island_measurements || null, closet_vanity_measurements: f.closet_vanity_measurements || null,
    door_solid_measurements: f.door_solid_measurements || null, door_tambor_measurements: f.door_tambor_measurements || null, 
    restoration_details: JSON.stringify(f.restorations || []),
    restoration_measurements: null,
    other_measurements: f.other_measurements || null,
    measurements: (() => {
      const parts = [];
      if (f.kitchen_measurements) parts.push(`Cocina (${f.kitchen_layout || 'Distribución'}): ${f.kitchen_measurements}`);
      if (f.kitchen_island_measurements) parts.push(`Isla: ${f.kitchen_island_measurements}`);
      if (f.kitchen_peninsula_measurements) parts.push(`Península: ${f.kitchen_peninsula_measurements}`);
      if (f.closet_measurements) parts.push(`Clóset (${f.closet_layout || 'Distribución'}): ${f.closet_measurements}`);
      if (f.closet_island_measurements) parts.push(`Isla Clóset: ${f.closet_island_measurements}`);
      if (f.closet_vanity_measurements) parts.push(`Vanity: ${f.closet_vanity_measurements}`);
      if (f.door_solid_measurements) parts.push(`Puerta Sólida: ${f.door_solid_measurements}`);
      if (f.door_tambor_measurements) parts.push(`Puerta Tambor: ${f.door_tambor_measurements}`);
      if (f.restorations && f.restorations.length > 0) {
        parts.push(`Restauración: ${f.restorations.map(r => `${r.type} (${r.measurements})`).join(', ')}`);
      }
      if (f.other_measurements) parts.push(`Otros: ${f.other_measurements}`);
      return parts.length > 0 ? parts.join(' | ') : (f.measurements || null);
    })(),
    material_type: f.material_type, estimated_price: f.estimated_price, project_timeline: f.project_timeline || null,
    interior_color_type: f.interior_color_type, interior_color_code: f.interior_color_code,
    exterior_inf_color_type: f.exterior_inf_color_type, exterior_inf_color_code: f.exterior_inf_color_code,
    exterior_sup_color_type: f.exterior_sup_color_type, exterior_sup_color_code: f.exterior_sup_color_code,
    countertop_type: f.countertop_type, inhabited_house: f.inhabited_house, how_found: f.how_found || null
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── MATERIAL SELECTOR COMPONENT ───────────────────────────────
const MATERIAL_CATEGORIES = [
  {
    category: 'Triplay y enchapados',
    icon: '🪵',
    color: '#7C4A1E',
    items: [
      {
        id: 'BirchNatural34',
        label: 'Triplay Birch Natural 3/4',
        img: '/enchapados/birch_natural.jpg',
        badge: '#E8D9B5',
        desc: 'Triplay de abedul natural 3/4", capas uniformes y finas. Alta resistencia y superficie lisa ideal para lacas y enchapes.'
      },
      {
        id: 'Alder',
        label: 'Aliso (Alder)',
        img: '/enchapados/alder.jpg',
        badge: '#C39A6B',
        desc: 'Madera suave con veta recta, toma el tinte muy bien.'
      },
      {
        id: 'Walnut',
        label: 'Nogal (Walnut)',
        img: '/enchapados/walnut.jpg',
        badge: '#5C3A21',
        desc: 'Tonos oscuros y lujosos, grano fino y muy elegante.'
      },
      {
        id: 'Cherry',
        label: 'Cerezo (Cherry)',
        img: '/enchapados/cherry.jpg',
        badge: '#9F5B36',
        desc: 'Color cálido y rojizo que se enriquece con el tiempo.'
      },
      {
        id: 'HardMaple',
        label: 'Maple Duro',
        img: '/enchapados/hard_maple.jpg',
        badge: '#E4CC9C',
        desc: 'Muy denso y claro, excelente resistencia y apariencia limpia.'
      },
      {
        id: 'Mahogany',
        label: 'Caoba (Mahogany)',
        img: '/enchapados/mahogany.jpg',
        badge: '#7B3F2A',
        desc: 'Acabado premium rojizo suave y vetas clásicas.'
      },
      {
        id: 'RedOak',
        label: 'Roble Rojo',
        img: '/enchapados/red_oak.jpg',
        badge: '#C79A73',
        desc: 'Patrón de veta muy pronunciado y cálido.'
      },
      {
        id: 'SoftMaple',
        label: 'Maple Suave',
        img: '/enchapados/soft_maple.jpg',
        badge: '#DFD1B3',
        desc: 'Similar al Maple duro pero más ligero.'
      },
      {
        id: 'WhiteOak',
        label: 'Roble Blanco',
        img: '/enchapados/white_oak.jpg',
        badge: '#D3B88A',
        desc: 'Veta fuerte, color más grisáceo/dorado que el roble rojo.'
      },
      {
        id: 'WhitePine',
        label: 'Pino Blanco',
        img: '/enchapados/white_pine.jpg',
        badge: '#EBDCB9',
        desc: 'Muy claro, ligero y de grano sutil.'
      }
    ]
  },
,
  {
    category: 'Melamina (Catálogo Real)',
    icon: '🍀',
    color: '#2E7D32',
    hasFilters: true,
    items: [
      // Maderas Claras / Escandinavas
      { id: 'Melamina - Espiga', label: 'Espiga', subcat: 'Maderas Claras', img: '/melaminas/espiga.jpg', desc: 'Patrón espiga / herringbone en roble claro escandinavo.' },
      { id: 'Melamina - Chardonnay', label: 'Chardonnay', subcat: 'Maderas Claras', img: '/melaminas/chardonnay.jpg', desc: 'Tono crema cálido con suave veta lineal.' },
      { id: 'Melamina - Encino Polar', label: 'Encino Polar', subcat: 'Maderas Claras', img: '/melaminas/encino_polar.jpg', desc: 'Roble polar blanqueado de alta luminosidad.' },
      { id: 'Melamina - Fresno Bruma', label: 'Fresno Bruma', subcat: 'Maderas Claras', img: '/melaminas/fresno_bruma.jpg', desc: 'Grisáceo nórdico con poro suave.' },

      // Maderas Cálidas / Naturales
      { id: 'Melamina - Roble Santana', label: 'Roble Santana', subcat: 'Maderas Cálidas', img: '/melaminas/roble_santana.jpg', desc: 'Roble natural de veta amplia y cálida.' },
      { id: 'Melamina - Nogal Británico', label: 'Nogal Británico', subcat: 'Maderas Cálidas', img: '/melaminas/nogal_britanico.jpg', desc: 'Nogal clásico de tono medio balanceado.' },
      { id: 'Melamina - Malta', label: 'Malta', subcat: 'Maderas Cálidas', img: '/melaminas/malta.jpg', desc: 'Madera miel con vetas sutiles elegantes.' },
      { id: 'Melamina - Latte', label: 'Latte', subcat: 'Maderas Cálidas', img: '/melaminas/latte.jpg', desc: 'Tono café latte con nudos y vetas rústicas.' },
      { id: 'Melamina - Monarca', label: 'Monarca', subcat: 'Maderas Cálidas', img: '/melaminas/monarca.jpg', desc: 'Tono tostado suave muy versátil.' },
      { id: 'Melamina - Durango', label: 'Durango', subcat: 'Maderas Cálidas', img: '/melaminas/durango.jpg', desc: 'Madera oscura rústica con carácter marcado.' },
      { id: 'Melamina - Cerezo', label: 'Cerezo', subcat: 'Maderas Cálidas', img: '/melaminas/cerezo.jpg', desc: 'Cálido rojizo con textura tradicional.' },
      { id: 'Melamina - Rioja', label: 'Rioja', subcat: 'Maderas Cálidas', img: '/melaminas/rioja.jpg', desc: 'Madera rojiza profunda de gran elegancia.' },
      { id: 'Melamina - Dakota', label: 'Dakota', subcat: 'Maderas Cálidas', img: '/melaminas/dakota.jpg', desc: 'Efecto duelas ensambladas estilo rústico.' },
      { id: 'Melamina - Roble Mérida', label: 'Roble Mérida', subcat: 'Maderas Cálidas', img: '/melaminas/roble_merida.jpg', desc: 'Roble dorado clásico y luminoso.' },

      // Maderas Oscuras / Contemporáneas
      { id: 'Melamina - Wengué', label: 'Wengué', subcat: 'Maderas Oscuras', img: '/melaminas/wengue.jpg', desc: 'Tono chocolate muy oscuro casi negro.' },
      { id: 'Melamina - Ébano Indi', label: 'Ébano Indi', subcat: 'Maderas Oscuras', img: '/melaminas/ebano_indi.jpg', desc: 'Veta vertical negra carbón profunda.' },
      { id: 'Melamina - Nogal Neo', label: 'Nogal Neo', subcat: 'Maderas Oscuras', img: '/melaminas/nogal_neo.jpg', desc: 'Nogal contemporáneo de veta definida.' },
      { id: 'Melamina - Oporto', label: 'Oporto', subcat: 'Maderas Oscuras', img: '/melaminas/oporto.jpg', desc: 'Café ahumado con estilo arquitectónico.' },
      { id: 'Melamina - Anáhuac', label: 'Anáhuac', subcat: 'Maderas Oscuras', img: '/melaminas/anahuac.jpg', desc: 'Azul noche con veta profunda contemporánea.' },

      // Lisos / Unicolores
      { id: 'Melamina - Blanco Absoluto', label: 'Blanco Absoluto', subcat: 'Lisos y Unicolores', img: '/melaminas/blanco_absoluto.jpg', desc: 'Blanco puro mate de máxima pulcritud.' },
      { id: 'Melamina - Blanco Frosty', label: 'Blanco Frosty', subcat: 'Lisos y Unicolores', img: '/melaminas/blanco_frosty.jpg', desc: 'Blanco frío reflectante de fácil limpieza.' },
      { id: 'Melamina - Negro', label: 'Negro', subcat: 'Lisos y Unicolores', img: '/melaminas/negro.jpg', desc: 'Negro profundo sobrio de alto impacto.' },
      { id: 'Melamina - Zafiro', label: 'Zafiro', subcat: 'Lisos y Unicolores', img: '/melaminas/zafiro.jpg', desc: 'Azul marino zafiro intenso de tendencia.' },
      { id: 'Melamina - Jade', label: 'Jade', subcat: 'Lisos y Unicolores', img: '/melaminas/jade.jpg', desc: 'Verde bosque profundo contemporáneo.' },
      { id: 'Melamina - Terra', label: 'Terra', subcat: 'Lisos y Unicolores', img: '/melaminas/terra.jpg', desc: 'Terracota tierra cálido y acogedor.' },
      { id: 'Melamina - Gris Claro', label: 'Gris Claro', subcat: 'Lisos y Unicolores', img: '/melaminas/gris_claro.jpg', desc: 'Gris neutro suave y minimalista.' },
      { id: 'Melamina - Gris', label: 'Gris', subcat: 'Lisos y Unicolores', img: '/melaminas/gris.jpg', desc: 'Gris medio neutro ideal para contrastes.' },
      { id: 'Melamina - Visón', label: 'Visón', subcat: 'Lisos y Unicolores', img: '/melaminas/vison.jpg', desc: 'Gris topo / visón cálido europeo.' },
      { id: 'Melamina - Oxford', label: 'Oxford', subcat: 'Lisos y Unicolores', img: '/melaminas/oxford.jpg', desc: 'Gris carbón oscuro formal.' },
      { id: 'Melamina - Níquel', label: 'Níquel', subcat: 'Lisos y Unicolores', img: '/melaminas/niquel.jpg', desc: 'Grafito metálico / níquel vanguardista.' },

      // Texturas y Diseños Especiales
      { id: 'Melamina - Turmalina', label: 'Turmalina', subcat: 'Piedra y Especiales', img: '/melaminas/turmalina.jpg', desc: 'Piedra turmalina gris volcánica mineral.' },
      { id: 'Melamina - Cairo', label: 'Cairo', subcat: 'Piedra y Especiales', img: '/melaminas/cairo.jpg', desc: 'Textura textil tipo lino cálido tramado.' },
      { id: 'Melamina - Precompuesto Ceniza', label: 'Precompuesto Ceniza', subcat: 'Piedra y Especiales', img: '/melaminas/precompuesto_ceniza.jpg', desc: 'Diseño lineal fino con gradiente cenizo.' }
    ]
  },
  {
    category: 'Madera Sólida',
    icon: '🌳',
    color: '#4E342E',
    items: [
      {
        id: 'Roble',
        label: 'Roble',
        img: '/maderas/roble.jpg',
        badge: '#C8A96E',
        desc: 'Fuerte y duradero, conocido por sus patrones de veta clásicos.'
      },
      {
        id: 'Maple',
        label: 'Maple',
        img: '/maderas/maple.jpg',
        badge: '#E2C98A',
        desc: 'Madera de grano fino y superficie lisa, aspecto claro y limpio.'
      },
      {
        id: 'Cerezo',
        label: 'Cerezo',
        img: '/maderas/cerezo.jpg',
        badge: '#A0522D',
        desc: 'Color rojizo que se intensifica con el tiempo, textura suave y elegante.'
      },
      {
        id: 'Nogal',
        label: 'Nogal',
        img: '/maderas/nogal.jpg',
        badge: '#5C3A1E',
        desc: 'Tonos oscuros y lujosos con veta fina y elegante. Muy premium.'
      },
      {
        id: 'Caoba',
        label: 'Caoba',
        img: '/maderas/caoba.jpg',
        badge: '#7B3F2A',
        desc: 'Madera premium con acabado rojizo suave y tonos cálidos.'
      },
      {
        id: 'Teca',
        label: 'Teca',
        img: '/maderas/teca.jpg',
        badge: '#8B6914',
        desc: 'Naturalmente aceitosa, muy resistente a la humedad y la intemperie.'
      },
      {
        id: 'Pino',
        label: 'Pino',
        img: '/maderas/pino.jpg',
        badge: '#D4B483',
        desc: 'Ligero y asequible con veta recta, ideal para muebles funcionales.'
      },
      {
        id: 'Abedul',
        label: 'Abedul',
        img: '/maderas/abedul.jpg',
        badge: '#F0E0B0',
        desc: 'Claro en color, textura uniforme y veta sutil. Ligero y resistente.'
      },
      {
        id: 'Fresno',
        label: 'Fresno',
        img: '/maderas/fresno.jpg',
        badge: '#C9A96E',
        desc: 'Fuerte y flexible con un patrón de veta pronunciado y llamativo.'
      },
      {
        id: 'Haya',
        label: 'Haya',
        img: '/maderas/haya.jpg',
        badge: '#D2A679',
        desc: 'Dura, pesada y excelente para uso cotidiano y mobiliario resistente.'
      },
      {
        id: 'Cecia',
        label: 'Cecia',
        img: '/maderas/cecia.jpg',
        badge: '#C49A6C',
        desc: 'Fuerte y durable con un cálido tinte rojizo y veta fina.'
      },
      {
        id: 'Cedro',
        label: 'Cedro',
        img: '/maderas/cedro.jpg',
        badge: '#B5651D',
        desc: 'Naturalmente fragante y resistente a insectos. Ideal para clósets.'
      },
      {
        id: 'Nogal Americano',
        label: 'Nogal Americano',
        img: '/maderas/nogal_americano.jpg',
        badge: '#6B4226',
        desc: 'Extremadamente fuerte con un patrón de veta llamativo y contrastante.'
      },
      {
        id: 'Ébano',
        label: 'Ébano',
        img: '/maderas/ebano.jpg',
        badge: '#1C0F0A',
        desc: 'Madera excepcionalmente densa, color negro profundo y acabado lujoso.'
      },
      {
        id: 'Palo de Rosa',
        label: 'Palo de Rosa',
        img: '/maderas/palo_de_rosa.jpg',
        badge: '#C17B6F',
        desc: 'Exótico y bello, con veta única y colores rojizos intensos.'
      }
    ]
  }
];


// ─── Natural Wood Grain Swatch (SVG feTurbulence) ─────────────────────────
function WoodSwatch({ wood, hovered }) {
  const filterId = 'wg-' + wood.id.replace(/[^a-zA-Z0-9]/g, '-');
  const { hex, grainHex, seed = 1, baseFreqX = 0.012, baseFreqY = 0.65, octaves = 4 } = wood;
  const grain = grainHex || hex;
  return (
    <svg
      width="100%"
      height="88px"
      style={{
        display: 'block',
        transition: 'transform 0.3s ease',
        transform: hovered ? 'scale(1.06)' : 'scale(1)'
      }}
    >
      <defs>
        <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${baseFreqX} ${baseFreqY}`}
            numOctaves={octaves}
            seed={seed}
            result="noise"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 3.2"
            result="grain_mask"
          />
          <feBlend in="SourceGraphic" in2="noise" mode="multiply" result="blended" />
          <feComposite in="blended" in2="SourceGraphic" operator="in" />
        </filter>
        <linearGradient id={filterId + '-bg'} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={hex} stopOpacity="0.92" />
          <stop offset="30%"  stopColor={hex} stopOpacity="1"    />
          <stop offset="60%"  stopColor={grain} stopOpacity="0.88" />
          <stop offset="100%" stopColor={hex} stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {/* Base wood color */}
      <rect width="100%" height="100%" fill={`url(#${filterId}-bg)`} />
      {/* Natural grain overlay via turbulence */}
      <rect width="100%" height="100%" fill={grain} filter={`url(#${filterId})`} opacity="0.55" />
      {/* Subtle light sheen */}
      <rect width="100%" height="100%"
        fill="url(#wood-sheen)"
        opacity="0.18"
      />
    </svg>
  );
}

function MaterialCard({ m, slotNumber, onClick }) {
  const [hovered, setHovered] = useState(false);
  const isSelected = slotNumber === 1 || slotNumber === 2 || slotNumber === 3 || slotNumber === 4;
  const borderColor = slotNumber === 1 ? '#f97316' : slotNumber === 2 ? '#2563eb' : slotNumber === 3 ? '#16a34a' : slotNumber === 4 ? '#9333ea' : hovered ? '#cbd5e1' : '#e2e8f0';
  const badgeColor = slotNumber === 1 ? '#f97316' : slotNumber === 2 ? '#2563eb' : slotNumber === 3 ? '#16a34a' : '#9333ea';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `2px solid ${borderColor}`,
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: isSelected
          ? (slotNumber === 1 ? '0 0 0 3px rgba(249,115,22,0.22), 0 4px 12px rgba(0,0,0,0.08)' : slotNumber === 2 ? '0 0 0 3px rgba(37,99,235,0.22), 0 4px 12px rgba(0,0,0,0.08)' : slotNumber === 3 ? '0 0 0 3px rgba(22,163,74,0.22), 0 4px 12px rgba(0,0,0,0.08)' : '0 0 0 3px rgba(147,51,234,0.22), 0 4px 12px rgba(0,0,0,0.08)')
          : hovered
          ? '0 4px 10px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        backgroundColor: 'white',
        transition: 'all 0.18s ease',
        transform: isSelected ? 'translateY(-2px)' : hovered ? 'translateY(-1px)' : 'none',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#f8fafc', height: '88px' }}>
        <img
          src={m.img}
          alt={m.label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.3s ease',
            transform: hovered ? 'scale(1.06)' : 'scale(1)'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div style={{
          display: 'none',
          width: '100%',
          height: '100%',
          backgroundColor: m.badge || '#64748b',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '700',
          fontSize: '0.85rem',
          padding: '0.5rem',
          textAlign: 'center'
        }}>
          {m.label}
        </div>
        {isSelected && (
          <div style={{
            position: 'absolute', top: '6px', right: '6px',
            padding: '2px 8px', borderRadius: '12px',
            backgroundColor: badgeColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
            color: 'white', fontSize: '0.72rem', fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
            zIndex: 2
          }}>
            <span>✔</span>
            <span>{slotNumber === 3 ? 'Int' : slotNumber === 4 ? 'Ext' : 'Mat ' + slotNumber}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0.45rem 0.55rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.2rem' }}>
          <p style={{
            fontWeight: '700', fontSize: '0.8rem', color: '#1e293b',
            margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }} title={m.label}>{m.label}</p>
        </div>
        {m.subcat && (
          <span style={{
            fontSize: '0.62rem',
            color: '#64748b',
            backgroundColor: '#f1f5f9',
            padding: '1px 5px',
            borderRadius: '4px',
            alignSelf: 'flex-start',
            fontWeight: '500'
          }}>{m.subcat}</span>
        )}
        <p style={{
          fontSize: '0.67rem', color: '#64748b', margin: '0.15rem 0 0',
          lineHeight: '1.25', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>{m.desc}</p>
      </div>
    </div>
  );
}

function MaterialSelector({ value, value2, value3, value4, onChange }) {
  const [activeSlot, setActiveSlot] = useState(1);
  const [activeMelaminaTab, setActiveMelaminaTab] = useState('Todas');
  const [melaminaSearch, setMelaminaSearch] = useState('');

  const melaminaTabs = [
    { key: 'Todas', label: 'Todas (33)' },
    { key: 'Maderas Claras', label: '🌾 Claras (4)' },
    { key: 'Maderas Cálidas', label: '🪵 Cálidas (10)' },
    { key: 'Maderas Oscuras', label: '☕ Oscuras (5)' },
    { key: 'Lisos y Unicolores', label: '🎨 Lisos / Colores (11)' },
    { key: 'Piedra y Especiales', label: '🪨 Piedra y Textil (3)' },
  ];

  const allItems = MATERIAL_CATEGORIES.flatMap(c => c.items);
  const item1 = allItems.find(m => m.id === value || m.label === value);
  const item2 = allItems.find(m => m.id === value2 || m.label === value2);
  const item3 = allItems.find(m => m.id === value3 || m.label === value3) || null;
  const item4 = allItems.find(m => m.id === value4 || m.label === value4) || null;

  const handleCardClick = (m) => {
    if (value === m.id || value === m.label) {
      onChange({ target: { name: 'material_type', value: '' } });
      setActiveSlot(1);
      return;
    }
    if (value2 === m.id || value2 === m.label) {
      onChange({ target: { name: 'material_type_2', value: '' } });
      setActiveSlot(2);
      return;
    }
    if (value3 === m.id || value3 === m.label) {
      onChange({ target: { name: 'material_type_interior', value: '' } });
      setActiveSlot(3);
      return;
    }
    if (value4 === m.id || value4 === m.label) {
      onChange({ target: { name: 'material_type_exterior', value: '' } });
      setActiveSlot(4);
      return;
    }

    if (activeSlot === 1) {
      onChange({ target: { name: 'material_type', value: m.id } });
      if (!value2) setActiveSlot(2);
    } else if (activeSlot === 2) {
      onChange({ target: { name: 'material_type_2', value: m.id } });
    } else if (activeSlot === 3) {
      onChange({ target: { name: 'material_type_interior', value: m.id } });
    } else {
      onChange({ target: { name: 'material_type_exterior', value: m.id } });
    }
  };

  const clearSlot = (slot, e) => {
    e.stopPropagation();
    if (slot === 1) {
      onChange({ target: { name: 'material_type', value: '' } });
      setActiveSlot(1);
    } else if (slot === 2) {
      onChange({ target: { name: 'material_type_2', value: '' } });
      setActiveSlot(2);
    } else if (slot === 3) {
      onChange({ target: { name: 'material_type_interior', value: '' } });
      setActiveSlot(3);
    } else {
      onChange({ target: { name: 'material_type_exterior', value: '' } });
      setActiveSlot(4);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      
      {/* SELECTOR DE 2 SLOTS */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>
              Selección de Materiales
            </h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Elige hasta 4 materiales: principal, acento, interior y exterior.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
          
          {/* Slot 1: Principal */}
          <div
            onClick={() => setActiveSlot(1)}
            style={{
              padding: '0.75rem 0.9rem',
              borderRadius: '10px',
              border: activeSlot === 1 ? '2px solid #f97316' : '1px solid #e2e8f0',
              backgroundColor: activeSlot === 1 ? '#fff7ed' : '#f8fafc',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: activeSlot === 1 ? '0 0 0 3px rgba(249,115,22,0.18)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {item1 ? (
              <img src={item1.img} alt="" style={{ width: '46px', height: '46px', borderRadius: '7px', objectFit: 'cover', border: '1px solid #fed7aa' }} />
            ) : (
              <div style={{ width: '46px', height: '46px', borderRadius: '7px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                🥇
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase' }}>
                  Material 1 (Principal)
                </span>
                {activeSlot === 1 && (
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#f97316', color: 'white', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                    Seleccionando
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                {item1 ? item1.label : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' }}>Clic aquí para elegir</span>}
              </div>
            </div>
            {item1 && (
              <button
                type="button"
                onClick={(e) => clearSlot(1, e)}
                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px 8px', borderRadius: '5px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                title="Quitar"
              >✕ Quitar</button>
            )}
          </div>

          {/* Slot 2: Secundario */}
          <div
            onClick={() => setActiveSlot(2)}
            style={{
              padding: '0.75rem 0.9rem',
              borderRadius: '10px',
              border: activeSlot === 2 ? '2px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: activeSlot === 2 ? '#eff6ff' : '#f8fafc',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: activeSlot === 2 ? '0 0 0 3px rgba(37,99,235,0.18)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {item2 ? (
              <img src={item2.img} alt="" style={{ width: '46px', height: '46px', borderRadius: '7px', objectFit: 'cover', border: '1px solid #bfdbfe' }} />
            ) : (
              <div style={{ width: '46px', height: '46px', borderRadius: '7px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                🥈
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' }}>
                  Material 2 (Secundario / Acento)
                </span>
                {activeSlot === 2 && (
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#2563eb', color: 'white', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                    Seleccionando
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                {item2 ? item2.label : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' }}>+ Opcional: Combinar</span>}
              </div>
            </div>
            {item2 && (
              <button
                type="button"
                onClick={(e) => clearSlot(2, e)}
                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px 8px', borderRadius: '5px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                title="Quitar"
              >✕ Quitar</button>
            )}
          </div>

          {/* Slot 3: Interior */}
          <div
            onClick={() => setActiveSlot(3)}
            style={{
              padding: '0.75rem 0.9rem',
              borderRadius: '10px',
              border: activeSlot === 3 ? '2px solid #16a34a' : '1px solid #e2e8f0',
              backgroundColor: activeSlot === 3 ? '#f0fdf4' : '#f8fafc',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: activeSlot === 3 ? '0 0 0 3px rgba(22,163,74,0.18)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {item3 ? (
              <img src={item3.img} alt="" style={{ width: '46px', height: '46px', borderRadius: '7px', objectFit: 'cover', border: '1px solid #86efac' }}
                onError={(e) => { e.target.style.display='none'; }}
              />
            ) : (
              <div style={{ width: '46px', height: '46px', borderRadius: '7px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                🏠
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase' }}>
                  Material Interior
                </span>
                {activeSlot === 3 && (
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#16a34a', color: 'white', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                    Seleccionando
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                {item3 ? item3.label : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' }}>Clic aquí para elegir</span>}
              </div>
            </div>
            {item3 && (
              <button
                type="button"
                onClick={(e) => clearSlot(3, e)}
                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px 8px', borderRadius: '5px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                title="Quitar"
              >✕ Quitar</button>
            )}
          </div>

          {/* Slot 4: Exterior */}
          <div
            onClick={() => setActiveSlot(4)}
            style={{
              padding: '0.75rem 0.9rem',
              borderRadius: '10px',
              border: activeSlot === 4 ? '2px solid #9333ea' : '1px solid #e2e8f0',
              backgroundColor: activeSlot === 4 ? '#faf5ff' : '#f8fafc',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: activeSlot === 4 ? '0 0 0 3px rgba(147,51,234,0.18)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {item4 ? (
              <img src={item4.img} alt="" style={{ width: '46px', height: '46px', borderRadius: '7px', objectFit: 'cover', border: '1px solid #d8b4fe' }}
                onError={(e) => { e.target.style.display='none'; }}
              />
            ) : (
              <div style={{ width: '46px', height: '46px', borderRadius: '7px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                🏡
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#9333ea', textTransform: 'uppercase' }}>
                  Material Exterior
                </span>
                {activeSlot === 4 && (
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#9333ea', color: 'white', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                    Seleccionando
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                {item4 ? item4.label : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' }}>Clic aquí para elegir</span>}
              </div>
            </div>
            {item4 && (
              <button
                type="button"
                onClick={(e) => clearSlot(4, e)}
                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px 8px', borderRadius: '5px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                title="Quitar"
              >✕ Quitar</button>
            )}
          </div>

        </div>
      </div>

      {/* CATÁLOGO DE MATERIALES */}
      {MATERIAL_CATEGORIES.map(cat => {
        let displayItems = cat.items;
        if (cat.hasFilters) {
          if (activeMelaminaTab !== 'Todas') {
            displayItems = displayItems.filter(m => m.subcat === activeMelaminaTab);
          }
          if (melaminaSearch.trim()) {
            const q = melaminaSearch.toLowerCase().trim();
            displayItems = displayItems.filter(m =>
              m.label.toLowerCase().includes(q) || (m.desc && m.desc.toLowerCase().includes(q))
            );
          }
        }

        return (
          <div key={cat.category} style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '0.8rem', border: '1px solid #f1f5f9' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.8rem',
              borderBottom: `2px solid ${cat.color}`,
              paddingBottom: '0.45rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                <h4 style={{
                  margin: 0, color: cat.color,
                  fontSize: '1.15rem', fontWeight: '800',
                  letterSpacing: '0.5px'
                }}>{cat.category}</h4>
                <span style={{
                  fontSize: '0.72rem', color: '#64748b', backgroundColor: '#f1f5f9',
                  padding: '2px 7px', borderRadius: '10px', fontWeight: '600'
                }}>
                  {cat.items.length} opciones
                </span>
              </div>
            </div>

            {cat.hasFilters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {melaminaTabs.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveMelaminaTab(tab.key)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '20px',
                        border: activeMelaminaTab === tab.key ? '1px solid #2E7D32' : '1px solid #e2e8f0',
                        backgroundColor: activeMelaminaTab === tab.key ? '#E8F5E9' : '#ffffff',
                        color: activeMelaminaTab === tab.key ? '#1B5E20' : '#475569',
                        fontWeight: activeMelaminaTab === tab.key ? '700' : '500',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={melaminaSearch}
                    onChange={(e) => setMelaminaSearch(e.target.value)}
                    placeholder="🔍 Filtrar por nombre (ej. Santana, Espiga, Zafiro, Blanco...)"
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.8rem',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      boxSizing: 'border-box'
                    }}
                  />
                  {melaminaSearch && (
                    <button
                      type="button"
                      onClick={() => setMelaminaSearch('')}
                      style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 'bold'
                      }}
                    >✕</button>
                  )}
                </div>
              </div>
            )}

            {displayItems.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: '1rem 0' }}>
                No se encontraron opciones con "{melaminaSearch}".
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.65rem'
              }}>
                {displayItems.map(m => {
                  let slotNum = 0;
                  if (value === m.id || value === m.label) slotNum = 1;
                  else if (value2 === m.id || value2 === m.label) slotNum = 2;
                  else if (value3 === m.id || value3 === m.label) slotNum = 3;
                  else if (value4 === m.id || value4 === m.label) slotNum = 4;

                  return (
                    <MaterialCard
                      key={m.id}
                      m={m}
                      slotNumber={slotNum}
                      onClick={() => handleCardClick(m)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* RESUMEN DE MATERIALES SELECCIONADOS */}
      {(item1 || item2 || item3 || item4) && (
        <div style={{
          padding: '0.85rem 1.1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ✔ Resumen de Materiales Seleccionados
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {item1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: '#fff7ed', padding: '0.45rem 0.8rem', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                <img src={item1.img} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#ea580c' }}>1. Principal</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>{item1.label}</div>
                </div>
              </div>
            )}
            {item2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: '#eff6ff', padding: '0.45rem 0.8rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <img src={item2.img} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#2563eb' }}>2. Secundario / Acento</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>{item2.label}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
// ─── WOOD TONES SELECTOR ──────────────────────────────────────
const WOOD_TONES = [
  { id: 'natural', label: 'Natural' },
  { id: 'golden_honey', label: 'Miel Dorada' },
  { id: 'warm_chestnut', label: 'Castaño Cálido' },
  { id: 'cinnamon', label: 'Canela' },
  { id: 'nutmeg', label: 'Nuez' },
  { id: 'merlot', label: 'Merlot' },
  { id: 'tuscan_coffee', label: 'Café Toscano' }
];

const WOOD_MAP = {
  'Roble': 'roble',
  'Maple': 'maple',
  'Cerezo': 'cerezo',
  'Caoba': 'caoba',
  'Nogal': 'nogal'
};

function WoodTonesSelector({ woodType, value, onChange }) {
  if (!WOOD_MAP[woodType]) return null;
  const prefix = WOOD_MAP[woodType];

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
      <p style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.8rem', color: '#1e293b' }}>
        Tonalidades para {woodType}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.8rem' }}>
        {WOOD_TONES.map(tone => {
          const selected = value === tone.id;
          return (
            <div
              key={tone.id}
              onClick={() => onChange({ target: { name: 'wood_tone', value: tone.id } })}
              style={{
                border: selected ? '2px solid var(--accent)' : '1px solid #cbd5e1',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: selected ? '0 0 0 3px rgba(249,115,22,0.15)' : 'none',
                backgroundColor: 'white',
                transition: 'all 0.15s ease',
                transform: selected ? 'translateY(-2px)' : 'none',
                position: 'relative'
              }}
            >
              <img
                src={`/tonalidades/${prefix}_${tone.id}.jpg`}
                alt={tone.label}
                style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{
                display: 'none', width: '100%', height: '80px', backgroundColor: '#e2e8f0',
                alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#64748b'
              }}>
                Sin imagen
              </div>
              <div style={{ padding: '0.4rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155', margin: 0, lineHeight: '1.2' }}>
                  {tone.label}
                </p>
              </div>
              {selected && (
                <div style={{
                  position: 'absolute', top: '4px', right: '4px', width: '18px', height: '18px',
                  borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold'
                }}>✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── COLOR SELECTOR COMPONENT ─────────────────────────────────
const STAIN_COLORS = [
  { name: 'Blanca', code: 'TS-6101', hex: '#EBE4D5', img: '/manchas/ts_6101.jpg' },
  { name: 'Negra', code: 'TS-6102', hex: '#2A2A2A', img: '/manchas/ts_6102.jpg' },
  { name: 'Ocre', code: 'TS-6103', hex: '#C98D26', img: '/manchas/ts_6103.jpg' },
  { name: 'Amarillo Oro', code: 'TS-6105', hex: '#EBB414', img: '/manchas/ts_6105.jpg' },
  { name: 'Rojo Colonial', code: 'TS-6106', hex: '#9B3331', img: '/manchas/ts_6106.jpg' },
  { name: 'Rojo Vivo', code: 'TS-6107', hex: '#B8282E', img: '/manchas/ts_6107.jpg' },
  { name: 'Naranja', code: 'TS-6108', hex: '#CD4C1B', img: '/manchas/ts_6108.jpg' },
  { name: 'Azul', code: 'TS-6109', hex: '#2A467F', img: '/manchas/ts_6109.jpg' },
  { name: 'Verde', code: 'TS-6110', hex: '#379057', img: '/manchas/ts_6110.jpg' },
  { name: 'Royal Marrón', code: 'TS-6111', hex: '#632731', img: '/manchas/ts_6111.jpg' },
  { name: 'Early American', code: 'TS-6112', hex: '#583D22', img: '/manchas/ts_6112.jpg' },
  { name: 'Verde Ficus', code: 'TS-6113', hex: '#394A30', img: '/manchas/ts_6113.jpg' },
  { name: 'Nogal americano', code: 'TS-6114', hex: '#5E412A', img: '/manchas/ts_6114.jpg' },
  { name: 'Nogal clásico', code: 'TS-6115', hex: '#51371B', img: '/manchas/ts_6115.jpg' },
  { name: 'Maple', code: 'TS-6116', hex: '#A8573E', img: '/manchas/ts_6116.jpg' },
  { name: 'Caoba inglés', code: 'TS-6117', hex: '#7A2C34', img: '/manchas/ts_6117.jpg' },
  { name: 'Caoba comercial', code: 'TS-6118', hex: '#652321', img: '/manchas/ts_6118.jpg' },
  { name: 'Caoba clásico', code: 'TS-6119', hex: '#763124', img: '/manchas/ts_6119.jpg' },
  { name: 'Roble', code: 'TS-6120', hex: '#633B18', img: '/manchas/ts_6120.jpg' },
  { name: 'Arce', code: 'TS-6121', hex: '#D89018', img: '/manchas/ts_6121.jpg' },
  { name: 'Cedro', code: 'TS-6122', hex: '#AD591B', img: '/manchas/ts_6122.jpg' },
  { name: 'Olmo', code: 'TS-6123', hex: '#AC8324', img: '/manchas/ts_6123.jpg' },
  { name: 'Oyamel', code: 'TS-6124', hex: '#752A26', img: '/manchas/ts_6124.jpg' },
  { name: 'Magnolia', code: 'TS-6125', hex: '#B15918', img: '/manchas/ts_6125.jpg' },
  { name: 'Ciprés', code: 'TS-6126', hex: '#583918', img: '/manchas/ts_6126.jpg' },
  { name: 'Amaranto', code: 'TS-6127', hex: '#672733', img: '/manchas/ts_6127.jpg' },
  { name: 'Palo de rosa', code: 'TS-6128', hex: '#481932', img: '/manchas/ts_6128.jpg' },
  { name: 'Chocolate', code: 'TS-6129', hex: '#2C2729', img: '/manchas/ts_6129.jpg' },
  { name: 'Avellana', code: 'TS-6130', hex: '#491E1C', img: '/manchas/ts_6130.jpg' },
  { name: 'Cherry', code: 'TS-6131', hex: '#5E1B28', img: '/manchas/ts_6131.jpg' },
  { name: 'Nogal claro', code: 'TS-6132', hex: '#4B2F1C', img: '/manchas/ts_6132.jpg' },
  { name: 'Encino americano', code: 'TS-6133', hex: '#7A3521', img: '/manchas/ts_6133.jpg' },
  { name: 'Gris Perla', code: 'TS-6134', hex: '#C5C0B8', img: '/manchas/ts_6134.jpg' },
  { name: 'Gris Titanio', code: 'TS-6135', hex: '#7C7872', img: '/manchas/ts_6135.jpg' },
  { name: 'Gris Grafito', code: 'TS-6136', hex: '#3A3836', img: '/manchas/ts_6136.jpg' },
  { name: 'Álamo', code: 'TS-6137', hex: '#8A7A6A', img: '/manchas/ts_6137.jpg' },
  { name: 'Cacao', code: 'TS-6138', hex: '#3C2E27', img: '/manchas/ts_6138.jpg' },
  { name: 'Abeto', code: 'TS-6139', hex: '#5B6E52', img: '/manchas/ts_6139.jpg' }
];

const SOLID_FAMILIES = {
  'Amarillo': [
    { name: 'Amarillo Canario 10-01', hex: '#FEF08A' },
    { name: 'Amarillo Sol 10-02', hex: '#FDE047' },
    { name: 'Mostaza 10-03', hex: '#EAB308' },
    { name: 'Oro 10-04', hex: '#CA8A04' }
  ],
  'Azul': [
    { name: 'Cielo 20-01', hex: '#BAE6FD' },
    { name: 'Marino 20-02', hex: '#3B82F6' },
    { name: 'Rey 20-03', hex: '#1D4ED8' },
    { name: 'Océano 20-04', hex: '#1E3A8A' }
  ],
  'Blanco': [
    { name: 'Blanco Puro 30-01', hex: '#FFFFFF' },
    { name: 'Hueso 30-02', hex: '#F8FAFC' },
    { name: 'Ostión 30-03', hex: '#F1F5F9' },
    { name: 'Perla 30-04', hex: '#E2E8F0' }
  ],
  'Café': [
    { name: 'Arena 40-01', hex: '#D6D3D1' },
    { name: 'Beige 40-02', hex: '#D4D4D8' },
    { name: 'Chocolate 40-03', hex: '#78350F' },
    { name: 'Moka 40-04', hex: '#451A03' }
  ],
  'Gris': [
    { name: 'Plata 50-01', hex: '#E2E8F0' },
    { name: 'Acero 50-02', hex: '#94A3B8' },
    { name: 'Plomo 50-03', hex: '#475569' },
    { name: 'Antracita 50-04', hex: '#1E293B' }
  ],
  'Morados y Rosas': [
    { name: 'Rosa Pastel 60-01', hex: '#FBCFE8' },
    { name: 'Rosa 24-02', hex: '#F472B6' },
    { name: 'Fucsia 60-03', hex: '#DB2777' },
    { name: 'Lila 60-04', hex: '#C084FC' },
    { name: 'Uva 60-05', hex: '#7E22CE' },
    { name: 'Berenjena 60-06', hex: '#4C1D95' }
  ],
  'Negro': [
    { name: 'Negro Intenso 70-01', hex: '#000000' },
    { name: 'Negro Mate 70-02', hex: '#171717' }
  ],
  'Rojo': [
    { name: 'Cereza 80-01', hex: '#FDA4AF' },
    { name: 'Carmín 80-02', hex: '#F43F5E' },
    { name: 'Rojo Vivo 80-03', hex: '#E11D48' },
    { name: 'Vino 80-04', hex: '#9F1239' }
  ],
  'Verde': [
    { name: 'Menta 90-01', hex: '#A7F3D0' },
    { name: 'Limón 90-02', hex: '#4ADE80' },
    { name: 'Esmeralda 90-03', hex: '#10B981' },
    { name: 'Bosque 90-04', hex: '#065F46' }
  ]
};
function getColorHex(type, code) {
  if (!code) return null;
  if (type === 'Mancha') {
    const stain = STAIN_COLORS.find(c => code.includes(c.code));
    return stain ? stain.hex : null;
  } else if (type === 'Color Cerrado') {
    for (const family in SOLID_FAMILIES) {
      const solid = SOLID_FAMILIES[family].find(c => code.includes(c.name));
      if (solid) return solid.hex;
    }
    return null;
  }
  return null;
}

const FAMILY_BASE_COLORS = [
  { name: 'Amarillo', hex: '#FDE047' },
  { name: 'Azul', hex: '#1E3A8A' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Café', hex: '#78350F' },
  { name: 'Gris', hex: '#D1D5DB' },
  { name: 'Morados y Rosas', hex: '#6B21A8' },
  { name: 'Negro', hex: '#000000' },
  { name: 'Rojo', hex: '#DC2626' },
  { name: 'Verde', hex: '#10B981' }
];

function ColorSelector({ title, typeValue, codeValue, typeName, codeName, onChange, showPrefinish }) {
  const [baseSolid, setBaseSolid] = useState('');
  
  return (
    <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#fcfcfc' }}>
      <p style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.8rem', color: '#1e293b' }}>{title}</p>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
          <input type="radio" name={typeName} value="Mancha" checked={typeValue === 'Mancha'} onChange={onChange} />
          Mancha (Tintas)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
          <input type="radio" name={typeName} value="Color Cerrado" checked={typeValue === 'Color Cerrado'} onChange={onChange} />
          Color Cerrado
        </label>
        {showPrefinish && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="radio"
              name={typeName}
              value="Prefinish"
              checked={typeValue === 'Prefinish'}
              onChange={(e) => {
                onChange(e);
                onChange({ target: { name: codeName, value: 'Prefinish (Pre-acabado)' } });
              }}
            />
            Prefinish
          </label>
        )}
      </div>

      {typeValue === 'Prefinish' && (
        <div style={{ padding: '0.8rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', color: '#475569', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <strong>Nota:</strong> Se utilizará material pre-acabado de fábrica (no requiere aplicación de pintura).
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: '600' }}>📸 Referencia de terminado Prefinish:</p>
            <img
              src="/prefinish_ref.jpg"
              alt="Referencia terminado Prefinish"
              style={{
                width: '100%',
                maxWidth: '380px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                objectFit: 'cover',
                display: 'block',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
              }}
            />
          </div>
        </div>
      )}

      {typeValue === 'Mancha' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
          gap: '0.6rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {STAIN_COLORS.map(c => {
            const isSelected = codeValue === `${c.code} - ${c.name}`;
            return (
              <div
                key={c.code}
                onClick={() => onChange({ target: { name: codeName, value: `${c.code} - ${c.name}` } })}
                style={{
                  border: isSelected ? '3px solid #f97316' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: isSelected
                    ? '0 0 0 3px rgba(249,115,22,0.18)'
                    : '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'border 0.15s, box-shadow 0.15s',
                  backgroundColor: 'white',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  position: 'relative'
                }}
              >
                <div style={{ height: '80px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={c.img}
                    alt={c.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.parentNode.style.backgroundColor = c.hex;
                    }}
                  />
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '4px', right: '4px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: '#f97316',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.65rem', fontWeight: 'bold',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.4)', zIndex: 2
                    }}>✓</div>
                  )}
                </div>
                <div style={{ padding: '0.28rem 0.35rem', backgroundColor: 'white', textAlign: 'center', lineHeight: '1.2' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.58rem', color: '#64748b', letterSpacing: '0.2px' }}>{c.code}</div>
                  <div style={{ fontWeight: '600', fontSize: '0.7rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {typeValue === 'Color Cerrado' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Familia de Colores (Selecciona una base)</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {FAMILY_BASE_COLORS.map(c => (
              <div key={c.name} 
                   onClick={() => setBaseSolid(c.name)}
                   style={{ 
                     width: '32px', height: '32px', backgroundColor: c.hex,
                     border: baseSolid === c.name ? '3px solid var(--accent)' : '1px solid #cbd5e1',
                     borderRadius: '4px', cursor: 'pointer',
                     boxShadow: baseSolid === c.name ? '0 0 0 2px rgba(249, 115, 22, 0.2)' : 'none'
                   }} 
                   title={c.name}
              />
            ))}
          </div>
          
          {baseSolid && (
            <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
               <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', fontWeight: '600' }}>Tonos de {baseSolid}</p>
               <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                 {SOLID_FAMILIES[baseSolid].map(shade => (
                    <div key={shade.name}
                         onClick={() => onChange({ target: { name: codeName, value: shade.name } })}
                         style={{
                           width: '40px', height: '40px', backgroundColor: shade.hex,
                           border: codeValue === shade.name ? '3px solid var(--accent)' : '1px solid #cbd5e1',
                           borderRadius: '4px', cursor: 'pointer', position: 'relative'
                         }}
                         title={shade.name}
                    >
                      {codeValue === shade.name && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ['#FFFFFF', '#F8FAFC', '#F1F5F9'].includes(shade.hex) ? '#000' : '#FFF', fontSize: '1.2rem' }}>
                          ✓
                        </div>
                      )}
                    </div>
                 ))}
               </div>
               
               <label style={{ fontWeight: '600', fontSize: '0.8rem', color: '#334155' }}>
                 Color seleccionado:
               </label>
               <input type="text" name={codeName} value={codeValue} onChange={onChange} 
                      placeholder="También puedes escribirlo manualmente..." 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.3rem', fontSize: '0.85rem' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// 3. ProspectForm
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ─────────────────────────────────────────────
// PROJECT TYPES LIST
// ─────────────────────────────────────────────
const PROJECT_TYPES = [
  { id: 'COCINA', label: 'COCINA', icon: '🍳', desc: 'Cocinas integrales, alacenas e islas' },
  { id: 'CLÓSET', label: 'CLÓSET / VESTIDOR', icon: '🚪', desc: 'Clósets, walk-in closets, cajoneras' },
  { id: 'PUERTA SÓLIDA', label: 'PUERTA SÓLIDA', icon: '🪵', desc: 'Puertas principales de madera maciza' },
  { id: 'PUERTA DE TAMBOR', label: 'PUERTA DE TAMBOR', icon: '🚪', desc: 'Puertas interiores ligeras y semi-sólidas' },
  { id: 'RESTAURACIONES', label: 'RESTAURACIONES', icon: '🛠️', desc: 'Mantenimiento, relaqueado y reparación' },
  { id: 'OTROS', label: 'OTROS', icon: '✨', desc: 'Muebles de baño, TV, repisas, cantinas...' },
];

const KITCHEN_LAYOUTS = [
  { id: 'LINEAL', label: 'Lineal', img: '/layouts/cocina_lineal.png', desc: 'Sobre una sola pared' },
  { id: 'EN L', label: 'En "L"', img: '/layouts/cocina_l.png', desc: 'En escuadra de dos muros' },
  { id: 'PARALELO', label: 'Paralelo', img: '/layouts/cocina_paralelo.png', desc: 'Dos frentes enfrentados' },
  { id: 'EN U', label: 'En "U"', img: '/layouts/cocina_u.png', desc: 'En tres paredes contiguas' },
];

const KITCHEN_ADDONS = [
  { id: 'CON ISLA', label: 'Con Isla', icon: '🏝️', img: '/layouts/cocina_isla.png', desc: 'Módulo central exento de trabajo o barra' },
  { id: 'CON PENÍNSULA', label: 'Con Península', icon: '🍹', img: '/layouts/cocina_peninsula.png', desc: 'Extensión fija unida a un lateral o muro' },
];

const CLOSET_LAYOUTS = [
  { id: 'LINEAL', label: 'Lineal', img: '/layouts/closet_lineal.png', desc: 'Frontal a lo largo de un muro' },
  { id: 'EN L', label: 'En "L"', img: '/layouts/closet_l.png', desc: 'Aprovechamiento en escuadra' },
  { id: 'PARALELO', label: 'Paralelo', img: '/layouts/closet_paralelo.png', desc: 'Doble frente con pasillo central' },
  { id: 'EN U', label: 'En "U"', img: '/layouts/closet_u.png', desc: 'Tres lados de almacenamiento' },
  { id: 'WALK-IN CLÓSET', label: 'Walk-in Clóset', img: '/layouts/closet_walkin.png', desc: 'Vestidor exclusivo transitable' },
];

const CLOSET_ADDONS = [
  { id: 'CON ISLA CENTRAL', label: 'Con Isla Central', icon: '🗄️', img: '/layouts/closet_isla.png', desc: 'Cajonera o mesa de accesorios al centro' },
  { id: 'CON VANITY', label: 'Con Vanity (Tocador)', icon: '🪞', img: '/layouts/closet_vanity.png', desc: 'Área de peinador, espejo y maquillaje' },
];

function ProspectForm({ initial, onSave, onCancel, editingId }) {
  const [formData, setFormData] = useState(initial || EMPTY_FORM);
  const resolveUrl = (path) => !path ? null : (path.startsWith('http') ? path : `${API}${path}`);
  const [spaceImageFile, setSpaceImageFile] = useState([]);
  const [spaceImagePreview, setSpaceImagePreview] = useState(
    initial?.space_image_path ? initial.space_image_path.split(',').map(p => resolveUrl(p.trim())) : []
  );
  const spaceFileRef = useRef();

  const [refImageFile, setRefImageFile] = useState([]);
  const [refImagePreview, setRefImagePreview] = useState(
    initial?.reference_image_path
      ? initial.reference_image_path.split(',').map(p => resolveUrl(p.trim()))
      : (initial?.design_image_path ? [resolveUrl(initial.design_image_path)] : [])
  );
  const refFileRef = useRef();

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };
  const handleCheckboxChange = (e) => {
    setFormData(prev => ({ ...prev, priorities: { ...prev.priorities, [e.target.name]: e.target.checked } }));
  };
  const handleProjectTypeToggle = (typeId) => {
    const current = formData.project_type ? formData.project_type.split(', ').filter(Boolean) : [];
    let updated;
    if (current.includes(typeId)) {
      updated = current.filter(t => t !== typeId);
    } else {
      updated = [...current, typeId];
    }
    setFormData(prev => ({
      ...prev,
      project_type: updated.join(', '),
      project_type_other: updated.includes('OTROS') ? prev.project_type_other : ''
    }));
  };

  const handleSpaceImageChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSpaceImageFile(prev => [...(prev || []), ...files]);
      const previews = files.map(f => URL.createObjectURL(f));
      setSpaceImagePreview(prev => [...(prev || []), ...previews]);
    }
  };
  const handleRefImageChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setRefImageFile(prev => [...(prev || []), ...files]);
      const previews = files.map(f => URL.createObjectURL(f));
      setRefImagePreview(prev => [...(prev || []), ...previews]);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData, { spaceImageFile, refImageFile }, editingId);
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--accent)', textAlign: 'center', fontSize: '2rem', fontWeight: '800' }}>
        {editingId ? 'Editar Prospecto' : 'Capturar Prospecto'}
      </h2>
      <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') e.preventDefault(); }} style={{ display: 'grid', gap: '1.5rem' }}>

        {/* Cliente */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}> Información del Cliente</p>
          <div>
            <label style={labelStyle}>Nombre de prospecto *</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Número o correo</label>
              <input required type="text" name="contact_info" value={formData.contact_info} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ubicación</label>
              <input required type="text" name="location" value={formData.location} onChange={handleChange} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Casa habitada</label>
              <select required name="inhabited_house" value={formData.inhabited_house} onChange={handleChange} style={{ ...inputStyle, backgroundColor: 'white' }}>
                <option value="">Selecciona...</option>
                <option value="Si">Sí</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>📲 ¿Cómo nos conociste?</label>
              <select required name="how_found" value={formData.how_found} onChange={handleChange} style={{ ...inputStyle, backgroundColor: 'white' }}>
                <option value="">Selecciona...</option>
                <option value="Redes Sociales">Redes Sociales (Instagram / Facebook)</option>
                <option value="Recomendación">Recomendación de alguien</option>
                <option value="Google">Google / Búsqueda en internet</option>
                <option value="Página Web">Página Web</option>
                <option value="Anuncio">Anuncio / Publicidad</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tipo de Proyecto (Debajo de Información del Cliente) */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--accent)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>📋</span>
              <p style={{ ...sectionTitleStyle, margin: 0, borderBottom: 'none', paddingBottom: 0 }}>¿Tipo de Proyecto?</p>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', padding: '2px 10px', borderRadius: '12px', fontWeight: '700' }}>
              Opción múltiple
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {PROJECT_TYPES.map(pt => {
              const selectedList = formData.project_type ? formData.project_type.split(', ').filter(Boolean) : [];
              const isChecked = selectedList.includes(pt.id);

              return (
                <div
                  key={pt.id}
                  onClick={() => handleProjectTypeToggle(pt.id)}
                  style={{
                    border: isChecked ? '2px solid var(--accent, #f97316)' : '1px solid #e2e8f0',
                    backgroundColor: isChecked ? '#fff7ed' : '#ffffff',
                    borderRadius: '10px',
                    padding: '0.75rem 0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    boxShadow: isChecked ? '0 0 0 3px rgba(249,115,22,0.16), 0 3px 8px rgba(0,0,0,0.05)' : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{pt.icon}</span>
                      <span style={{ fontWeight: '800', fontSize: '0.86rem', color: isChecked ? '#c2410c' : '#1e293b' }}>
                        {pt.label}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div onClick
                      style={{ cursor: 'pointer', accentColor: '#f97316', transform: 'scale(1.15)' }}
                    />
                  </div>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.68rem', color: '#64748b', lineHeight: '1.25' }}>
                    {pt.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Medidas para Puerta Sólida si está seleccionada */}
          {formData.project_type && formData.project_type.includes('PUERTA SÓLIDA') && (
            <div style={{ marginTop: '0.85rem', padding: '0.75rem 0.95rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span>📏</span> Medidas de Puerta Sólida:
              </label>
              <input required
                type="text"
                name="door_solid_measurements"
                value={formData.door_solid_measurements}
                onChange={handleChange}
                placeholder="Ej. Ancho: 0.95 m, Alto: 2.15 m, Grosor: 4.5 cm (o medidas de vano)"
                style={{ ...inputStyle, margin: 0, backgroundColor: '#ffffff' }}
              />
            </div>
          )}

          {/* Medidas para Puerta de Tambor si está seleccionada */}
          {formData.project_type && formData.project_type.includes('PUERTA DE TAMBOR') && (
            <div style={{ marginTop: '0.85rem', padding: '0.75rem 0.95rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span>📏</span> Medidas de Puerta de Tambor:
              </label>
              <input required
                type="text"
                name="door_tambor_measurements"
                value={formData.door_tambor_measurements}
                onChange={handleChange}
                placeholder="Ej. 3 piezas de 0.85 m x 2.10 m y 1 pieza de 0.70 m x 2.10 m"
                style={{ ...inputStyle, margin: 0, backgroundColor: '#ffffff' }}
              />
            </div>
          )}

          {/* Medidas para Restauraciones si está seleccionada */}
          {formData.project_type && formData.project_type.includes('RESTAURACIONES') && (
            <div style={{ marginTop: '0.85rem', padding: '0.75rem 0.95rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                <span>🔧</span> Seleccione los muebles a restaurar:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {['Cocina', 'Clóset / Vestidor', 'Puerta Sólida', 'Puerta de Tambor', 'Mueble de Baño', 'Centro de TV', 'Otros'].map(type => {
                  const isSelected = formData.restorations?.some(r => r.type === type);
                  return (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', background: isSelected ? '#fed7aa' : '#e2e8f0', padding: '0.3rem 0.6rem', borderRadius: '20px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => {
                          let newRests = [...(formData.restorations || [])];
                          if (e.target.checked) {
                            newRests.push({ type, measurements: '' });
                          } else {
                            newRests = newRests.filter(r => r.type !== type);
                          }
                          setFormData({...formData, restorations: newRests});
                        }}
                        style={{ display: 'none' }}
                      />
                      {type}
                    </label>
                  )
                })}
              </div>

              {formData.restorations && formData.restorations.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {formData.restorations.map((rest, idx) => (
                    <div key={idx}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Detalles para {rest.type}:</label>
                      <input required
                        type="text"
                        value={rest.measurements}
                        onChange={(e) => {
                          const newRests = [...formData.restorations];
                          newRests[idx].measurements = e.target.value;
                          setFormData({...formData, restorations: newRests});
                        }}
                        placeholder={`Detalles de ${rest.type.toLowerCase()}...`}
                        style={{ ...inputStyle, margin: 0, backgroundColor: '#ffffff' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Campo para especificar en caso de OTROS */}
          {formData.project_type && formData.project_type.includes('OTROS') && (
            <div style={{
              marginTop: '0.85rem',
              padding: '0.85rem 1rem',
              backgroundColor: '#fafafa',
              borderRadius: '10px',
              border: '1px dashed #cbd5e1'
            }}>
              <label style={{ ...labelStyle, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>✏️</span> Especificar qué tipo de proyecto (Otros):
              </label>
              <input required
                type="text"
                name="project_type_other"
                value={formData.project_type_other}
                onChange={handleChange}
                placeholder="Ej. Mueble de baño flotante, Centro de entretenimiento TV, Cantina, Escritorio ejecutivo..."
                style={{ ...inputStyle, marginTop: '0.4rem', backgroundColor: '#ffffff' }}
              />

              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.7rem', marginBottom: '0.35rem' }}>
                <span>📏</span> Medidas del Proyecto (Otros):
              </label>
              <input required
                type="text"
                name="other_measurements"
                value={formData.other_measurements}
                onChange={handleChange}
                placeholder="Ej. 2.40 m largo x 1.80 m alto x 0.40 m fondo"
                style={{ ...inputStyle, margin: 0, backgroundColor: '#ffffff' }}
              />
            </div>
          )}

          {/* OPCIONES DE DISEÑO DE COCINA */}
          {formData.project_type && formData.project_type.includes('COCINA') && (
            <div style={{
              marginTop: '1.1rem',
              padding: '1.1rem 1.2rem',
              backgroundColor: '#fffaf5',
              borderRadius: '12px',
              border: '1.5px solid #fed7aa',
              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', borderBottom: '1.5px dashed #fed7aa', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🍳</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#9a3412' }}>
                      Diseño y Distribución de Cocina
                    </h4>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#7c2d12' }}>
                      Selecciona la distribución principal y complementos de isla o península.
                    </p>
                  </div>
                </div>
              </div>

              {/* Distribución Base */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '0.55rem' }}>
                  1. Distribución Base (Elige 1)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                  {KITCHEN_LAYOUTS.map(item => {
                    const isSelected = formData.kitchen_layout === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setFormData(prev => ({ ...prev, kitchen_layout: prev.kitchen_layout === item.id ? '' : item.id }))}
                        style={{
                          border: isSelected ? '2px solid #ea580c' : '1px solid #fed7aa',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#ffffff' : '#ffffff',
                          padding: '0.45rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          boxShadow: isSelected ? '0 0 0 3px rgba(234, 88, 12, 0.2), 0 3px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ height: '75px', overflow: 'hidden', borderRadius: '5px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={item.img} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ fontWeight: '800', fontSize: '0.82rem', color: isSelected ? '#ea580c' : '#1e293b', marginTop: '0.35rem' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '0.1rem' }}>
                          {item.desc}
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: '4px', right: '4px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            backgroundColor: '#ea580c', color: 'white',
                            fontSize: '0.65rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                          }}>✓</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Medidas de la Distribución de Cocina elegida */}
                {formData.kitchen_layout && (
                  <div style={{ marginTop: '0.75rem', padding: '0.7rem 0.9rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fed7aa', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span>📏</span> Medidas de Distribución de Cocina ({formData.kitchen_layout}):
                    </label>
                    <input required
                      type="text"
                      name="kitchen_measurements"
                      value={formData.kitchen_measurements}
                      onChange={handleChange}
                      placeholder={
                        formData.kitchen_layout === 'LINEAL' ? 'Ej. Muro principal: 3.60 m largo, Alto: 2.40 m, Fondo: 0.60 m' :
                        formData.kitchen_layout === 'EN L' ? 'Ej. Muro A: 3.20 m, Muro B: 2.40 m, Alto: 2.40 m' :
                        formData.kitchen_layout === 'PARALELO' ? 'Ej. Frente A: 3.00 m, Frente B: 2.80 m, Pasillo: 1.10 m' :
                        'Ej. Muro A: 2.50 m, Muro B: 3.20 m, Muro C: 2.50 m, Alto: 2.40 m'
                      }
                      style={{ ...inputStyle, margin: 0, backgroundColor: '#fffaf5' }}
                    />
                  </div>
                )}
              </div>

              {/* Complementos Isla y Península */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '0.55rem' }}>
                  2. Complementos Opcionales (Isla / Península)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                  {KITCHEN_ADDONS.map(item => {
                    const currentAddons = formData.kitchen_addons ? formData.kitchen_addons.split(', ').filter(Boolean) : [];
                    const isSelected = currentAddons.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          let updated;
                          if (isSelected) updated = currentAddons.filter(a => a !== item.id);
                          else updated = [...currentAddons, item.id];
                          setFormData(prev => ({ ...prev, kitchen_addons: updated.join(', ') }));
                        }}
                        style={{
                          border: isSelected ? '2px solid #ea580c' : '1px solid #fed7aa',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                          padding: '0.55rem 0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          boxShadow: isSelected ? '0 0 0 3px rgba(234, 88, 12, 0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <img src={item.img} alt={item.label} style={{ width: '55px', height: '46px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#f8fafc' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '0.84rem', color: isSelected ? '#ea580c' : '#1e293b' }}>
                            {item.icon} {item.label}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                            {item.desc}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', accentColor: '#ea580c', transform: 'scale(1.15)' }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Medidas de Isla si está seleccionada */}
                {formData.kitchen_addons && formData.kitchen_addons.includes('CON ISLA') && (
                  <div style={{ marginTop: '0.75rem', padding: '0.7rem 0.9rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fed7aa', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span>📏</span> Medidas de la Isla:
                    </label>
                    <input required
                      type="text"
                      name="kitchen_island_measurements"
                      value={formData.kitchen_island_measurements}
                      onChange={handleChange}
                      placeholder="Ej. Largo: 2.00 m, Ancho: 0.90 m, Alto: 0.90 m (o con barra volada de 30 cm)"
                      style={{ ...inputStyle, margin: 0, backgroundColor: '#fffaf5' }}
                    />
                  </div>
                )}

                {/* Medidas de Península si está seleccionada */}
                {formData.kitchen_addons && formData.kitchen_addons.includes('CON PENÍNSULA') && (
                  <div style={{ marginTop: '0.75rem', padding: '0.7rem 0.9rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fed7aa', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span>📏</span> Medidas de la Península:
                    </label>
                    <input required
                      type="text"
                      name="kitchen_peninsula_measurements"
                      value={formData.kitchen_peninsula_measurements}
                      onChange={handleChange}
                      placeholder="Ej. Largo: 1.80 m, Ancho: 0.80 m, Alto: 0.90 m"
                      style={{ ...inputStyle, margin: 0, backgroundColor: '#fffaf5' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OPCIONES DE DISEÑO DE CLÓSET / VESTIDOR */}
          {formData.project_type && formData.project_type.includes('CLÓSET') && (
            <div style={{
              marginTop: '1.1rem',
              padding: '1.1rem 1.2rem',
              backgroundColor: '#fbf8f5',
              borderRadius: '12px',
              border: '1.5px solid #e7dcd1',
              boxShadow: '0 2px 8px rgba(124, 74, 30, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', borderBottom: '1.5px dashed #e7dcd1', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🚪</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#633b18' }}>
                      Diseño y Distribución de Clóset / Vestidor
                    </h4>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#7c4a1e' }}>
                      Selecciona la distribución principal y complementos de isla central o vanity.
                    </p>
                  </div>
                </div>
              </div>

              {/* Distribución Base Clóset */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#633b18', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '0.55rem' }}>
                  1. Distribución Base (Elige 1)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.65rem' }}>
                  {CLOSET_LAYOUTS.map(item => {
                    const isSelected = formData.closet_layout === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setFormData(prev => ({ ...prev, closet_layout: prev.closet_layout === item.id ? '' : item.id }))}
                        style={{
                          border: isSelected ? '2px solid #7c4a1e' : '1px solid #e7dcd1',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#ffffff' : '#ffffff',
                          padding: '0.45rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          boxShadow: isSelected ? '0 0 0 3px rgba(124, 74, 30, 0.2), 0 3px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ height: '75px', overflow: 'hidden', borderRadius: '5px', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={item.img} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ fontWeight: '800', fontSize: '0.8rem', color: isSelected ? '#7c4a1e' : '#1e293b', marginTop: '0.35rem' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: '#64748b', marginTop: '0.1rem', lineHeight: '1.2' }}>
                          {item.desc}
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: '4px', right: '4px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            backgroundColor: '#7c4a1e', color: 'white',
                            fontSize: '0.65rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                          }}>✓</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Medidas de la Distribución de Clóset elegida */}
                {formData.closet_layout && (
                  <div style={{ marginTop: '0.75rem', padding: '0.7rem 0.9rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e7dcd1', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#633b18', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span>📏</span> Medidas de Distribución de Clóset ({formData.closet_layout}):
                    </label>
                    <input required
                      type="text"
                      name="closet_measurements"
                      value={formData.closet_measurements}
                      onChange={handleChange}
                      placeholder={
                        formData.closet_layout === 'LINEAL' ? 'Ej. Ancho frente: 2.60 m, Alto: 2.50 m, Profundidad: 0.60 m' :
                        formData.closet_layout === 'EN L' ? 'Ej. Muro A: 2.40 m, Muro B: 2.00 m, Alto: 2.50 m, Fondo: 0.60 m' :
                        formData.closet_layout === 'PARALELO' ? 'Ej. Muro A: 2.50 m, Muro B: 2.50 m, Pasillo: 1.00 m' :
                        formData.closet_layout === 'EN U' ? 'Ej. Muro A: 2.00 m, Muro B: 3.00 m, Muro C: 2.00 m, Fondo: 0.60 m' :
                        'Ej. Habitación vestidor 3.40 m x 2.80 m, Alto: 2.60 m'
                      }
                      style={{ ...inputStyle, margin: 0, backgroundColor: '#fbf8f5' }}
                    />
                  </div>
                )}
              </div>

              {/* Complementos Isla Central y Vanity */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#633b18', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '0.55rem' }}>
                  2. Complementos Opcionales (Isla Central / Vanity)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                  {CLOSET_ADDONS.map(item => {
                    const currentAddons = formData.closet_addons ? formData.closet_addons.split(', ').filter(Boolean) : [];
                    const isSelected = currentAddons.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          let updated;
                          if (isSelected) updated = currentAddons.filter(a => a !== item.id);
                          else updated = [...currentAddons, item.id];
                          setFormData(prev => ({ ...prev, closet_addons: updated.join(', ') }));
                        }}
                        style={{
                          border: isSelected ? '2px solid #7c4a1e' : '1px solid #e7dcd1',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#f5ede4' : '#ffffff',
                          padding: '0.55rem 0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          boxShadow: isSelected ? '0 0 0 3px rgba(124, 74, 30, 0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <img src={item.img} alt={item.label} style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#FAF7F2' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '0.84rem', color: isSelected ? '#7c4a1e' : '#1e293b' }}>
                            {item.icon} {item.label}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                            {item.desc}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', accentColor: '#7c4a1e', transform: 'scale(1.15)' }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Medidas de Isla Central de Clóset si está seleccionada */}
                {formData.closet_addons && formData.closet_addons.includes('CON ISLA CENTRAL') && (
                  <div style={{ marginTop: '0.75rem', padding: '0.7rem 0.9rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e7dcd1', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#633b18', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span>📏</span> Medidas de Isla Central:
                    </label>
                    <input required
                      type="text"
                      name="closet_island_measurements"
                      value={formData.closet_island_measurements}
                      onChange={handleChange}
                      placeholder="Ej. Largo: 1.20 m, Ancho: 0.80 m, Alto: 0.90 m (con cajonera doble vista)"
                      style={{ ...inputStyle, margin: 0, backgroundColor: '#fbf8f5' }}
                    />
                  </div>
                )}

                {/* Medidas de Vanity si está seleccionado */}
                {formData.closet_addons && formData.closet_addons.includes('CON VANITY') && (
                  <div style={{ marginTop: '0.75rem', padding: '0.7rem 0.9rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e7dcd1', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#633b18', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span>📏</span> Medidas del Vanity / Tocador:
                    </label>
                    <input required
                      type="text"
                      name="closet_vanity_measurements"
                      value={formData.closet_vanity_measurements}
                      onChange={handleChange}
                      placeholder="Ej. Ancho: 1.10 m, Fondo: 0.50 m, Alto: 0.80 m (con espejo iluminado)"
                      style={{ ...inputStyle, margin: 0, backgroundColor: '#fbf8f5' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Diseño y Fotos */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Diseño y Fotografías</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="has_design" checked={formData.has_design} onChange={handleChange} />
            <span style={labelStyle}>¿Ya cuenta con el diseño o fotos del espacio?</span>
          </label>
          {formData.has_design && (
            <div style={{ display: 'grid', gap: '1.2rem', marginTop: '0.8rem' }}>
              <div>
                <label style={labelStyle}>Descripción del diseño / notas del espacio</label>
                <textarea required name="design_details" rows="2" value={formData.design_details} onChange={handleChange}
                  placeholder="Describe el bosquejo, requerimientos o detalles del espacio..." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Contenedor de 2 Fotos: Espacio y Referencia */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                
                {/* 1. Imagen del Espacio */}
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>🏠</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#1e293b' }}>Imagen del Espacio</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Lugar a instalar (paredes, medidas, área)</div>
                      </div>
                    </div>
                    {spaceImagePreview && spaceImagePreview.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpaceImageFile([]);
                          setSpaceImagePreview([]);
                        }}
                        style={{
                          background: '#fee2e2', border: 'none', color: '#ef4444',
                          padding: '3px 8px', borderRadius: '5px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '600'
                        }}
                      >Quitar</button>
                    )}
                  </div>

                  <div onClick={() => spaceFileRef.current.click()}
                    style={{
                      marginTop: '0.4rem', padding: '1rem', border: '2px dashed #cbd5e1',
                      borderRadius: '8px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#f8fafc',
                      transition: 'border-color 0.2s ease', minHeight: '130px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent, #f97316)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                    {spaceImagePreview && spaceImagePreview.length > 0 ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {spaceImagePreview.map((src, idx) => (
                          <img key={idx} src={src} alt="Espacio" style={{ maxHeight: '140px', borderRadius: '6px', maxWidth: '100%', objectFit: 'contain' }} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ fontSize: '1.6rem' }}>📸</span>
                        <span style={{ fontWeight: '600', color: '#334155' }}>Subir foto del espacio</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Haz clic para seleccionar (JPG, PNG)</span>
                      </div>
                    )}
                  </div>
                  <input ref={spaceFileRef} type="file" accept="image/*" multiple onChange={handleSpaceImageChange} style={{ display: 'none' }} />
                </div>

                {/* 2. Imagen de Referencia */}
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>💡</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#1e293b' }}>Imagen de Referencia</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Bosquejo, plano, Pinterest o catálogo</div>
                      </div>
                    </div>
                    {refImagePreview && refImagePreview.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRefImageFile([]);
                          setRefImagePreview([]);
                        }}
                        style={{
                          background: '#fee2e2', border: 'none', color: '#ef4444',
                          padding: '3px 8px', borderRadius: '5px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '600'
                        }}
                      >Quitar</button>
                    )}
                  </div>

                  <div onClick={() => refFileRef.current.click()}
                    style={{
                      marginTop: '0.4rem', padding: '1rem', border: '2px dashed #cbd5e1',
                      borderRadius: '8px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#f8fafc',
                      transition: 'border-color 0.2s ease', minHeight: '130px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent, #f97316)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                    {refImagePreview && refImagePreview.length > 0 ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {refImagePreview.map((src, idx) => (
                          <img key={idx} src={src} alt="Referencia" style={{ maxHeight: '140px', borderRadius: '6px', maxWidth: '100%', objectFit: 'contain' }} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ fontSize: '1.6rem' }}>📐</span>
                        <span style={{ fontWeight: '600', color: '#334155' }}>Subir foto de referencia</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Haz clic para seleccionar (JPG, PNG)</span>
                      </div>
                    )}
                  </div>
                  <input ref={refFileRef} type="file" accept="image/*" multiple onChange={handleRefImageChange} style={{ display: 'none' }} />
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Prioridades */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}> Prioridades y Expectativas</p>
          <div>
            <label style={labelStyle}>Prioridades del proyecto</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {['tiempo', 'calidad', 'precio'].map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                  <input type="checkbox" name={key} checked={formData.priorities[key]} onChange={handleCheckboxChange} /> {key}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Qué esperas de nosotros?</label>
            <textarea required name="expectations" rows="3" value={formData.expectations} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        {/* Especificaciones */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Especificaciones</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Tipo de material</label>
              <MaterialSelector value={formData.material_type} value2={formData.material_type_2} value3={formData.material_type_interior} value4={formData.material_type_exterior} onChange={handleChange} />
              <WoodTonesSelector woodType={formData.material_type} value={formData.wood_tone} onChange={handleChange} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Tipo de encimera</label>
              <select required name="countertop_type" value={formData.countertop_type} onChange={handleChange} style={{ ...inputStyle, backgroundColor: 'white' }}>
                <option value="">Selecciona...</option>
                <option value="Sin considerar encimera">Sin considerar encimera</option>
                <option value="Formaica">Formaica</option>
                <option value="Cuarzo">Cuarzo</option>
                <option value="Granito">Granito</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Herrajes</label>
              <select required name="hardware_details" value={formData.hardware_details} onChange={handleChange} style={{ ...inputStyle, backgroundColor: 'white' }}>
                <option value="">Selecciona...</option>
                <option value="Normal">Normal</option>
                <option value="Cierre Lento">Cierre Lento</option>
              </select>
            </div>
          </div>
        </div>

        {/* Colores del Mueble */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Colores del Mueble</p>
          <ColorSelector 
            title="Interior" 
            typeName="interior_color_type" typeValue={formData.interior_color_type}
            codeName="interior_color_code" codeValue={formData.interior_color_code}
            onChange={handleChange} 
            showPrefinish={true}
          />
          <ColorSelector 
            title="Exterior - Parte Inferior" 
            typeName="exterior_inf_color_type" typeValue={formData.exterior_inf_color_type}
            codeName="exterior_inf_color_code" codeValue={formData.exterior_inf_color_code}
            onChange={handleChange} 
          />
          <ColorSelector 
            title="Exterior - Parte Superior" 
            typeName="exterior_sup_color_type" typeValue={formData.exterior_sup_color_type}
            codeName="exterior_sup_color_code" codeValue={formData.exterior_sup_color_code}
            onChange={handleChange} 
          />
        </div>



        {/* Fechas â€” al final */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}> Fechas del Proyecto</p>
          {/* Plazo del Proyecto */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.6rem' }}>Plazo del Proyecto</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.7rem' }}>
              {[
                { value: 'corto', label: 'Corto Plazo', sublabel: '1 semana', icon: '⚡', color: '#f97316', bg: '#fff7ed', border: '#fed7aa', badge: '🎁 ¡Bonificación!' },
                { value: 'mediano', label: 'Mediano Plazo', sublabel: '2 semanas', icon: '📅', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', badge: null },
                { value: 'largo', label: 'Largo Plazo', sublabel: 'Más de 1 mes', icon: '🗓️', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', badge: null },
              ].map(opt => {
                const isSelected = formData.project_timeline === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleChange({ target: { name: 'project_timeline', value: opt.value } })}
                    style={{
                      border: isSelected ? `2px solid ${opt.color}` : `1px solid ${opt.border}`,
                      borderRadius: '10px',
                      padding: '0.75rem 0.9rem',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? opt.bg : 'white',
                      boxShadow: isSelected ? `0 0 0 3px ${opt.color}22` : '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{opt.icon}</div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: isSelected ? opt.color : '#1e293b' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                      {opt.sublabel}
                    </div>
                    {opt.badge && (
                      <div style={{
                        marginTop: '0.4rem', fontSize: '0.7rem', fontWeight: '700',
                        backgroundColor: '#f97316', color: 'white',
                        padding: '2px 8px', borderRadius: '20px', display: 'inline-block'
                      }}>
                        {opt.badge}
                      </div>
                    )}
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '18px', height: '18px', borderRadius: '50%',
                        backgroundColor: opt.color, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 'bold'
                      }}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* -- Precio Estimado -- */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Precio Estimado</label>
            <input required
              type="text"
              name="estimated_price"
              value={formData.estimated_price}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Ej. $15,000"
            />
          </div>

          {/* -- Tiempo de produccion -- */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Tiempo de Producción (días hábiles)</label>
            <input required
              type="number"
              name="production_days"
              value={formData.production_days}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Ej. 35"
              min="1"
            />
          </div>

          {/* -- Fecha de inicio + Fecha estimada automatica -- */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Fecha de Inicio</label>
              <input required type="date" name="start_date" value={formData.start_date} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fecha Estimada de Terminación</label>
              {(() => {
                let displayDate = '';
                let displayLabel = '';
                if (formData.start_date && formData.production_days) {
                  const start = new Date(formData.start_date + 'T12:00:00');
                  let days = parseInt(formData.production_days, 10);
                  let count = 0;
                  let current = new Date(start);
                  while (count < days) {
                    current.setDate(current.getDate() + 1);
                    const dow = current.getDay();
                    if (dow !== 0 && dow !== 6) count++;
                  }
                  displayDate = current.toISOString().split('T')[0];
                  displayLabel = current.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                }
                return (
                  <>
                    <input required
                      type="date"
                      readOnly
                      value={displayDate}
                      style={{ ...inputStyle, backgroundColor: '#f1f5f9', color: displayDate ? '#15803d' : '#94a3b8', fontWeight: displayDate ? '700' : '400', cursor: 'default' }}
                    />
                    {displayLabel ? (
                      <p style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '0.3rem', fontWeight: '600' }}>
                        📅 {displayLabel}
                      </p>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                        Ingresa fecha de inicio y días de producción
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" style={{ flex: 1, backgroundColor: 'var(--accent)', color: 'white', padding: '0.9rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            {editingId ? 'Guardar Cambios' : 'Guardar Prospecto'}
          </button>
          <button type="button" onClick={onCancel} style={{ padding: '0.9rem 1.5rem', backgroundColor: '#eee', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Volver</button>
        </div>
      </form>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4. ConfirmModal
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={onConfirm} style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Sí, eliminar
          </button>
          <button onClick={onCancel} style={{ backgroundColor: '#eee', color: '#333', padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5. ProspectDetail
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProspectDetail({ prospect, onEdit, onDelete, onBack, onRestore }) {
  const chip = (label, value) => value ? (
    <div style={{ padding: '0.4rem 0.55rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
      <p style={{ fontSize: '0.64rem', color: '#94a3b8', margin: '0 0 0.1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontWeight: '600', fontSize: '0.82rem', color: '#1e293b', margin: 0, lineHeight: '1.3' }}>{value}</p>
    </div>
  ) : null;

  const colorChip = (label, type, code) => (type && code) ? (
    <div style={{ padding: '0.4rem 0.55rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
      <p style={{ fontSize: '0.64rem', color: '#94a3b8', margin: '0 0 0.15rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {getColorHex(type, code) && (
          <div style={{ width: '13px', height: '13px', borderRadius: '3px', backgroundColor: getColorHex(type, code), border: '1px solid #cbd5e1', flexShrink: 0 }}></div>
        )}
        <span style={{ fontWeight: '600', fontSize: '0.82rem', color: '#1e293b' }}>{type} · {code}</span>
      </div>
    </div>
  ) : null;

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.2rem' }}>Ficha Técnica</h2>
          <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.25rem' }}>{prospect.name}</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button onClick={onBack} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Volver</button>
          {prospect.is_papelera ? (
            <button onClick={onRestore} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>♻️ Restaurar a Prospectos</button>
          ) : (
            <>
              <button onClick={onEdit} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Editar</button>
              <button onClick={onDelete} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar</button>
            </>
          )}
        </div>
      </div>
      <ProjectTracking prospect={prospect} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
        {chip('ID', prospect.public_id)}
        {chip('Fecha Captura', prospect.capture_date ? new Date(prospect.capture_date + (prospect.capture_date.endsWith('Z') ? '' : 'Z')).toLocaleString('es-MX', { timeZone: 'America/Tijuana', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : null)}
        {chip('Contacto', prospect.contact_info)}
        {chip('Ubicación', prospect.location)}
        {chip('Casa habitada', prospect.inhabited_house)}
        {chip('Tipo de Proyecto', prospect.project_type + (prospect.project_type_other ? ` (${prospect.project_type_other})` : ''))}
        {prospect.kitchen_layout && chip('Diseño Cocina', prospect.kitchen_layout + (prospect.kitchen_addons ? ` (${prospect.kitchen_addons})` : ''))}
        {prospect.closet_layout && chip('Diseño Clóset', prospect.closet_layout + (prospect.closet_addons ? ` (${prospect.closet_addons})` : ''))}
        {chip('Inicio', prospect.start_date)}
        {chip('Entrega', prospect.delivery_date)}
        {chip('Precio Estimado', prospect.estimated_price)}
        {chip('Material 1 (Principal)', prospect.material_type)}
          {prospect.material_type_2 && chip('Material 2 (Secundario)', prospect.material_type_2)}
        {chip('Encimera', prospect.countertop_type)}
        {chip('Herrajes', prospect.hardware_details)}
        {chip('Medidas', prospect.measurements)}
        {chip('Estado', prospect.status)}
        {chip('Prioridades', prospect.project_priorities)}
        {colorChip('Color Interior', prospect.interior_color_type, prospect.interior_color_code)}
        {colorChip('Color Ext. Inferior', prospect.exterior_inf_color_type, prospect.exterior_inf_color_code)}
        {colorChip('Color Ext. Superior', prospect.exterior_sup_color_type, prospect.exterior_sup_color_code)}
      </div>

      {prospect.expectations && (
        <div style={{ marginTop: '0.4rem', padding: '0.4rem 0.55rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <p style={{ fontSize: '0.64rem', color: '#94a3b8', margin: '0 0 0.1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expectativas</p>
          <p style={{ fontSize: '0.82rem', margin: 0 }}>{prospect.expectations}</p>
        </div>
      )}
      {prospect.has_design && (
        <div style={{ marginTop: '0.6rem' }}>

          {/* ── MOTIVO DE RECHAZO — arriba de las fotos ── */}
          {prospect.papelera_reason && (
            <div style={{ marginBottom:'0.75rem', padding:'0.75rem 1rem', backgroundColor:'#fef2f2', border:'2px solid #fca5a5', borderRadius:'12px' }}>
              <p style={{ fontSize:'0.7rem', color:'#dc2626', margin:'0 0 0.3rem', textTransform:'uppercase', fontWeight:'900', letterSpacing:'0.06em' }}>❌ Motivo de Rechazo</p>
              <p style={{ fontSize:'0.88rem', color:'#7f1d1d', margin:0, lineHeight:'1.5' }}>{prospect.papelera_reason}</p>
            </div>
          )}

          {/* ── FOTOS ── */}
          <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '0 0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
              Diseño y Fotos del Proyecto
            </p>
            {prospect.design_details && <p style={{ marginBottom: '0.6rem', fontSize: '0.82rem', color: '#334155' }}>{prospect.design_details}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

              {/* Foto del Espacio */}
              {prospect.space_image_path && (
                <div style={{ border: '2px solid #bfdbfe', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'white' }}>
                  <div style={{ padding: '10px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#1d4ed8', backgroundColor: '#dbeafe', textAlign: 'center', letterSpacing: '0.02em' }}>
                    🏠 Foto del Espacio
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '6px' }}>
                    {prospect.space_image_path.split(',').map((imgPath, idx) => (
                      <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`} alt={`Espacio ${idx + 1}`} style={{ flex: '1 1 45%', width: '100%', height: 'auto', borderRadius: '6px', minWidth: '80px', objectFit: 'cover' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Foto de Referencia */}
              {(prospect.reference_image_path || prospect.design_image_path) && (
                <div style={{ border: '2px solid #fed7aa', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'white' }}>
                  <div style={{ padding: '10px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#c2410c', backgroundColor: '#fff7ed', textAlign: 'center', letterSpacing: '0.02em' }}>
                    💡 Foto de Referencia
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '6px' }}>
                    {(prospect.reference_image_path || prospect.design_image_path).split(',').map((imgPath, idx) => (
                      <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`} alt={`Referencia ${idx + 1}`} style={{ flex: '1 1 45%', width: '100%', height: 'auto', borderRadius: '6px', minWidth: '80px', objectFit: 'cover' }} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Motivo de rechazo fuera de has_design (para cuando no hay fotos) */}
      {!prospect.has_design && prospect.papelera_reason && (
        <div style={{ marginTop:'0.6rem', padding:'0.75rem 1rem', backgroundColor:'#fef2f2', border:'2px solid #fca5a5', borderRadius:'12px' }}>
          <p style={{ fontSize:'0.7rem', color:'#dc2626', margin:'0 0 0.3rem', textTransform:'uppercase', fontWeight:'900', letterSpacing:'0.06em' }}>❌ Motivo de Rechazo</p>
          <p style={{ fontSize:'0.88rem', color:'#7f1d1d', margin:0, lineHeight:'1.5' }}>{prospect.papelera_reason}</p>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6. Main Prospects component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── PDF PRINT HELPER ───────────────────────────────────────────
function printProspect(p) {
  // Helpers
  const hex = (type, code) => getColorHex(type, code);
  
  const getMaterialImg = (mat) => {
    const allMaterials = MATERIAL_CATEGORIES.flatMap(c => c.items);
    const found = allMaterials.find(m => m.id === mat || m.label === mat || (mat && mat.includes(m.label)));
    return found ? `${window.location.origin}${found.img}` : null;
  };

  const getDesignImg = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `${path}`;
  };

  const field = (label, val) => `
    <div class="field">
      <div class="field-label">${label}</div>
      <div class="field-value">${val || '-'}</div>
    </div>
  `;

  const dateStr = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Prospecto - ${p.name}</title>
  <style>
    @page { margin: 15mm; }
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      font-size: 13px; 
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .letterhead {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 25px; border-bottom: 2px solid #b45309; padding-bottom: 15px;
    }
    .letterhead-logo { height: 80px; object-fit: contain; }
    .letterhead-text {
      text-align: right; font-size: 11px; color: #475569; line-height: 1.5;
    }
    .letterhead-text strong { color: #1e293b; font-size: 12px; }

    .header-container {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-bottom: 20px;
    }
    h1 { font-size: 24px; color: #b45309; margin: 0; }
    .header-meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.4; }
    .header-meta strong { font-size: 13px; color: #1e293b; }
    
    .card {
      background: white; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 15px; margin-bottom: 20px; page-break-inside: avoid;
    }
    .card-title {
      font-size: 14px; font-weight: bold; color: #b45309; margin: 0 0 15px 0;
    }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
    
    .field {
      border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #fff;
    }
    .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; }
    .field-value { font-size: 13px; font-weight: 600; color: #0f172a; }
    
    .material-box {
      display: flex; align-items: center; gap: 12px;
      border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #fff;
    }
    .material-img {
      width: 60px; height: 60px; border-radius: 4px; object-fit: cover; border: 1px solid #e2e8f0;
    }
    
    .color-box {
      border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #fff;
      margin-bottom: 10px;
    }
    .color-box-header { font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 6px; }
    .color-box-value { display: flex; align-items: center; gap: 8px; }
    .color-swatch { width: 24px; height: 24px; border-radius: 4px; border: 1px solid #cbd5e1; }
    
    .design-img { max-width: 100%; max-height: 300px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 10px; object-fit: contain; }

    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="letterhead">
    <img src="data:image/png;base64,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" class="letterhead-logo" onerror="this.style.display='none'" />
    <div class="letterhead-text">
      <strong>Tijuana, Baja California</strong><br/>
      ${dateStr}<br/>
      Vicente Guerrero #5341, Pedregal de Santa Julia 3ra Secci&oacute;n<br/>
      Tel&eacute;fono: 664 217 5633<br/>
      Correo electr&oacute;nico: rdcarpinteriatj@gmail.com
    </div>
  </div>

  <div class="header-container">
    <h1>${p.name}</h1>
    <div class="header-meta">
      <strong>ID: ${p.public_id || 'N/A'}</strong><br/>
      Capturado: ${p.capture_date ? new Date(p.capture_date + (p.capture_date.endsWith('Z') ? '' : 'Z')).toLocaleString('es-MX', { timeZone: 'America/Tijuana', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A'}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Informaci&oacute;n del Cliente y Proyecto</div>
    <div class="grid-2">
      ${field('Contacto', p.contact_info)}
      ${field('Ubicaci&oacute;n', p.location)}
      ${field('Casa habitada', p.inhabited_house)}
      ${field('Tipo de Proyecto', (p.project_type ? p.project_type + (p.project_type_other ? ` &bull; ${p.project_type_other}` : '') : '-'))}
      ${p.kitchen_layout ? field('Diseño de Cocina', `${p.kitchen_layout}${p.kitchen_addons ? ` &bull; ${p.kitchen_addons}` : ''}`) : ''}
      ${p.closet_layout ? field('Diseño de Clóset', `${p.closet_layout}${p.closet_addons ? ` &bull; ${p.closet_addons}` : ''}`) : ''}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Prioridades y Expectativas</div>
    <div style="margin-bottom: 12px;">${field('Prioridades del proyecto', p.project_priorities)}</div>
    <div>${field('¿Qu&eacute; esperas de nosotros?', p.expectations)}</div>
  </div>

  <div class="card">
    <div class="card-title">Especificaciones</div>
    <div style="margin-bottom: 15px;">
      <div class="field-label" style="margin-bottom:6px;">Material Principal</div>
      <div class="material-box">
        ${getMaterialImg(p.material_type) ? `<img src="${getMaterialImg(p.material_type)}" class="material-img" />` : ''}
        <div class="field-value">${p.material_type || '-'}</div>
      </div>
      ${p.material_type_2 ? `
      <div class="field-label" style="margin-top:10px; margin-bottom:6px;">Material Secundario / Acento</div>
      <div class="material-box">
        ${getMaterialImg(p.material_type_2) ? `<img src="${getMaterialImg(p.material_type_2)}" class="material-img" />` : ''}
        <div class="field-value">${p.material_type_2}</div>
      </div>` : ''}
    </div>
    <div class="grid-3">
      ${field('Medidas', p.measurements)}
      ${field('Tipo de encimera', p.countertop_type)}
      ${field('Herrajes', p.hardware_details)}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Colores del Mueble</div>
    ${(p.interior_color_type && p.interior_color_code) ? `
    <div class="color-box">
      <div class="color-box-header">Interior</div>
      <div class="color-box-value">
        ${hex(p.interior_color_type, p.interior_color_code) ? `<div class="color-swatch" style="background-color: ${hex(p.interior_color_type, p.interior_color_code)}"></div>` : ''}
        <span style="font-weight: 600; font-size: 13px;">${p.interior_color_type} &middot; ${p.interior_color_code}</span>
      </div>
    </div>` : ''}
    
    ${(p.exterior_inf_color_type && p.exterior_inf_color_code) ? `
    <div class="color-box">
      <div class="color-box-header">Exterior - Parte Inferior</div>
      <div class="color-box-value">
        ${hex(p.exterior_inf_color_type, p.exterior_inf_color_code) ? `<div class="color-swatch" style="background-color: ${hex(p.exterior_inf_color_type, p.exterior_inf_color_code)}"></div>` : ''}
        <span style="font-weight: 600; font-size: 13px;">${p.exterior_inf_color_type} &middot; ${p.exterior_inf_color_code}</span>
      </div>
    </div>` : ''}
    
    ${(p.exterior_sup_color_type && p.exterior_sup_color_code) ? `
    <div class="color-box">
      <div class="color-box-header">Exterior - Parte Superior</div>
      <div class="color-box-value">
        ${hex(p.exterior_sup_color_type, p.exterior_sup_color_code) ? `<div class="color-swatch" style="background-color: ${hex(p.exterior_sup_color_type, p.exterior_sup_color_code)}"></div>` : ''}
        <span style="font-weight: 600; font-size: 13px;">${p.exterior_sup_color_type} &middot; ${p.exterior_sup_color_code}</span>
      </div>
    </div>` : ''}
  </div>

  ${(p.design_details || p.space_image_path || p.reference_image_path || p.design_image_path) ? `
  <div class="card">
    <div class="card-title">Dise&ntilde;o y Fotograf&iacute;as</div>
    ${p.design_details ? `<div class="field" style="margin-bottom: 10px;">${p.design_details}</div>` : ''}
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      ${p.space_image_path ? (() => {
        const imgs = p.space_image_path.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2);
        return imgs.map((src, i) => `
          <div style="flex: 1; min-width: 200px;">
            <div style="font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 4px;">FOTO DEL ESPACIO${imgs.length > 1 ? ' ' + (i+1) : ''}</div>
            <img src="${getDesignImg(src)}" class="design-img" style="max-height: 220px; width: 100%; object-fit: contain; border: 1px solid #ddd; border-radius: 6px;" />
          </div>`).join('');
      })() : ''}
      ${(p.reference_image_path || p.design_image_path) ? (() => {
        const refPath = p.reference_image_path || p.design_image_path;
        const imgs = refPath.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2);
        return imgs.map((src, i) => `
          <div style="flex: 1; min-width: 200px;">
            <div style="font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 4px;">FOTO DE REFERENCIA${imgs.length > 1 ? ' ' + (i+1) : ''}</div>
            <img src="${getDesignImg(src)}" class="design-img" style="max-height: 220px; width: 100%; object-fit: contain; border: 1px solid #ddd; border-radius: 6px;" />
          </div>`).join('');
      })() : ''}
    </div>
  </div>` : ''}

  <div class="card" style="border: 2px solid #b45309;">
    <div class="card-title">Fechas y Precio</div>
    <div class="grid-3">
      ${field('Fecha de inicio', p.start_date)}
      ${field('Fecha de entrega', p.delivery_date)}
      ${field('Precio Estimado', p.estimated_price ? `$${p.estimated_price}` : '-')}
    </div>
  </div>

  <div class="footer">Documento Oficial &bull; RD Carpinter&iacute;a</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 800);
}

function PrintAskModal({ prospect, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '14px',
        maxWidth: '380px', width: '90%', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>☕</div>
        <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>Prospecto guardado</h3>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {prospect.name} fue guardado exitosamente.<br/>
          &iquest;Desea imprimir el PDF del prospecto?
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => { printProspect(prospect); onClose(); }}
            style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.6rem 1.4rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
          >
            Imprimir PDF
          </button>
          <button
            onClick={onClose}
            style={{ backgroundColor: '#eee', color: '#333', padding: '0.6rem 1.4rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            No, gracias
          </button>
        </div>
      </div>
    </div>
  );
}
function Prospects() {
  const [prospects, setProspects] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'intro' | 'new' | 'edit' | 'detail' | 'quote'
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [approveModalFor, setApproveModalFor] = useState(null);
  const [printProspect_data, setPrintProspectData] = useState(null);
  const [viewingValuation, setViewingValuation] = useState(null);
  // ── Filtros del catálogo
  const [filterText,      setFilterText]      = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterMaterial,  setFilterMaterial]  = useState('');
  const [filterType,      setFilterType]      = useState('');
  const [showPapelera,    setShowPapelera]    = useState(false);

  const fetchProspects = () => {
    fetch(`${API}/api/prospects`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setProspects(data))
      .catch(err => console.error('Error:', err));
  };

  useEffect(() => { fetchProspects(); }, []);

  const handleSave = async (formData, imageFiles, editingId) => {
    const payload = formToPayload(formData);
    // Solo al crear un prospecto nuevo le asignamos estado 'Prospecto'
    if (!editingId) {
      payload.status = 'Prospecto';
    }
    const url = editingId ? `${API}/api/prospects/${editingId}` : `${API}/api/prospects`;
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const saved = await res.json();
    
    // Upload space image
    if (imageFiles?.spaceImageFile && imageFiles.spaceImageFile.length > 0) {
      const fd = new FormData();
      imageFiles.spaceImageFile.forEach(f => fd.append('files', f));
      await fetch(`${API}/api/prospects/${saved.id}/upload-space-image`, { method: 'POST', body: fd });
    }
    
    // Upload reference image
    if (imageFiles?.refImageFile && imageFiles.refImageFile.length > 0) {
      const fd = new FormData();
      imageFiles.refImageFile.forEach(f => fd.append('files', f));
      await fetch(`${API}/api/prospects/${saved.id}/upload-reference-image`, { method: 'POST', body: fd });
    }

    fetchProspects();
    setView('list');
    setSelectedProspect(null);
    setPrintProspectData(saved);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/prospects/${id}`, { method: 'DELETE' });
    fetchProspects();
    setConfirmDelete(null);
    setView('list');
    setSelectedProspect(null);
  };

  const handleQuoteSaved = async (id) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;
    try {
      await fetch(`${API}/api/prospects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prospect.name, has_quote: true })
      });
      fetchProspects(); // Refrescar lista para ver el botón verde
    } catch (err) {
      console.error('Error actualizando estado de cotización:', err);
    }
  };

  return (
    <div>
      {/* Approve Modal */}
      {approveModalFor && (
        <ApproveRejectModal
          key={approveModalFor.id}
          prospect={approveModalFor}
          fetchProspects={fetchProspects}
          onClose={() => setApproveModalFor(null)}
        />
      )}
      {printProspect_data && <PrintAskModal prospect={printProspect_data} onClose={() => setPrintProspectData(null)} />}
      {/* LIST */}
      {view === 'list' && (() => {
        const txt = filterText.toLowerCase().trim();
        const filtered = prospects.filter(p => {
          if (p.is_contract) return false;
          if (showPapelera ? !p.is_papelera : p.is_papelera) return false;
          if (txt && !(
            (p.name         || '').toLowerCase().includes(txt) ||
            (p.public_id    || '').toLowerCase().includes(txt) ||
            (p.contact_info || '').toLowerCase().includes(txt) ||
            (p.project_type || '').toLowerCase().includes(txt) ||
            (p.location     || '').toLowerCase().includes(txt)
          )) return false;
          if (filterStatus) {
            const s = p.status || '';
            if (filterStatus === 'Prospecto') {
              if (s !== 'Prospecto' && s !== 'New' && s !== '') return false;
            } else if (filterStatus === 'Valoración') {
              if (s !== 'Valoración' && s !== 'Valoracion') return false;
            } else if (filterStatus === 'Cotización') {
              if (s !== 'Cotización') return false;
            }
          }
          if (filterMaterial) {
            const mat = `${p.material_type || ''} ${p.material_type_2 || ''}`.toLowerCase();
            if (!mat.includes(filterMaterial.toLowerCase())) return false;
          }
          if (filterType && p.project_type !== filterType) return false;
          return true;
        });
        const statusOptions   = [...new Set(prospects.map(p => p.status).filter(Boolean))];
        const materialOptions = [...new Set(prospects.flatMap(p => [p.material_type, p.material_type_2]).filter(Boolean))];
        const typeOptions     = [...new Set(prospects.map(p => p.project_type).filter(Boolean))];
        const hasFilters = txt || filterStatus || filterMaterial || filterType;
        const clearFilters = () => { setFilterText(''); setFilterStatus(''); setFilterMaterial(''); setFilterType(''); };

        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <IconUsers style={{ width:'22px', height:'22px', marginRight:0 }} />
                {showPapelera ? 'Papelera de Prospectos' : 'Prospectos'}
              </h2>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                      <button onClick={() => setShowPapelera(!showPapelera)} style={{ backgroundColor: showPapelera ? '#94a3b8' : '#e2e8f0', color: showPapelera ? 'white' : '#334155', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        {showPapelera
                          ? <><IconUsers style={{ width:'16px', height:'16px', marginRight:0 }} /> Volver a Prospectos</>
                          : <><IconTrash style={{ width:'16px', height:'16px', marginRight:0 }} /> Ver Papelera</>}
                      </button>
                      <button onClick={() => setView('intro')} style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        <><IconPlusCircle style={{ width:'16px', height:'16px', marginRight:0 }} /> Nuevo Prospecto</>
                </button>
              </div>
            </div>

            {/* ── ETAPAS PIPELINE ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { key: '', label: 'Todos', count: prospects.filter(p => !p.is_contract && !p.is_papelera).length, color: '#475569', bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', icon: IconUsers },
                { key: 'Prospecto',  label: 'Prospecto',  count: prospects.filter(p => !p.is_contract && !p.is_papelera && (!p.status || p.status === 'New' || p.status === 'Prospecto')).length,  color: '#2563eb', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', icon: IconUsers },
                { key: 'Valoración', label: 'Valoración', count: prospects.filter(p => !p.is_contract && !p.is_papelera && (p.status === 'Valoración' || p.status === 'Valoracion')).length, color: '#d97706', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', icon: IconTrendingUp },
                { key: 'Cotización', label: 'Cotización', count: prospects.filter(p => !p.is_contract && !p.is_papelera && p.status === 'Cotización').length,  color: '#16a34a', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', icon: IconFileText },
              ].map(({ key, label, count, color, bg, icon }) => {
                const isActive = filterStatus === key;
                const StageIcon = icon;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key)}
                    style={{
                      background: isActive ? bg : 'white',
                      border: `1px solid ${isActive ? color : '#e2e8f0'}`,
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? `0 4px 12px ${color}22` : '0 1px 3px rgba(0,0,0,0.05)',
                      transform: isActive ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '10px', 
                        background: isActive ? 'rgba(255,255,255,0.5)' : '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                      }}>
                        <StageIcon style={{ width: '20px', height: '20px', marginRight: 0, opacity: 1 }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: isActive ? '700' : '600', color: isActive ? color : '#64748b' }}>{label}</span>
                    </div>
                    <span style={{
                      fontSize: '1.5rem', fontWeight: '800', color: isActive ? color : '#1e293b'
                    }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* ── BARRA DE FILTROS ── */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.2rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '2 1 180px', minWidth: '150px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Buscar</label>
                  <div style={{ position: 'relative' }}>
                    <IconSearch style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', marginRight: 0, color: '#94a3b8', pointerEvents: 'none' }} />
                    <input type="text" value={filterText} onChange={e => setFilterText(e.target.value)}
                      placeholder="Nombre, ID, contacto..."
                      style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.87rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tipo de Proyecto</label>
                  <select required value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.87rem', cursor: 'pointer' }}>
                    <option value="">Todos</option>
                    {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {(txt || filterType) && (
                  <button onClick={() => { setFilterText(''); setFilterMaterial(''); setFilterType(''); }}
                    style={{ padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>
                    ✕ Limpiar
                  </button>
                )}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.77rem', color: '#94a3b8' }}>
                {(txt || filterStatus || filterType)
                  ? `Mostrando ${filtered.length} de ${prospects.length} prospectos`
                  : `${prospects.length} prospecto${prospects.length !== 1 ? 's' : ''} en total`}
              </div>
            </div>

            {/* ── TABLA ── */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#555' }}>Catálogo de Prospectos</h3>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
                  <p style={{ margin: 0 }}>{prospects.length === 0 ? 'No hay prospectos registrados aún.' : 'Ningún prospecto coincide con los filtros.'}</p>
                  {hasFilters && (
                    <button onClick={clearFilters}
                      style={{ marginTop: '12px', padding: '6px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', background: '#fafafa' }}>
                        {['ID','Nombre','Proyecto','Contacto','Captura','Inicio','Material','Estado','Acciones'].map((h, i) => (
                          <th key={h} style={{
                            padding: '0.6rem', fontSize: '0.82rem', color: '#64748b', fontWeight: '700',
                            ...(h === 'Nombre' ? { position: 'sticky', left: 0, background: '#fafafa', zIndex: 2, boxShadow: '2px 0 4px rgba(0,0,0,0.06)' } : {}),
                            ...(h === 'Acciones' ? { position: 'sticky', right: 0, background: '#fafafa', zIndex: 2, boxShadow: '-2px 0 4px rgba(0,0,0,0.06)' } : {})
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fffbf7'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                          <td style={{ padding: '0.6rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>{p.public_id || '-'}</td>
                          <td style={{ padding: '0.6rem', position: 'sticky', left: 0, background: 'white', zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.06)' }}>
                            <button onClick={() => { setSelectedProspect(p); setView('detail'); }}
                              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                              {p.name}
                            </button>
                          </td>
                          <td style={{ padding: '0.6rem', fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>
                            {p.project_type || '-'}
                          </td>
                          <td style={{ padding: '0.6rem', fontSize: '0.9rem' }}>{p.contact_info || '-'}</td>
                          <td style={{ padding: '0.6rem', fontSize: '0.85rem', color: '#64748b' }}>{p.capture_date ? new Date(p.capture_date + (p.capture_date.endsWith('Z') ? '' : 'Z')).toLocaleString('es-MX', { timeZone: 'America/Tijuana', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                          <td style={{ padding: '0.6rem', fontSize: '0.9rem' }}>{p.start_date || '-'}</td>
                          <td style={{ padding: '0.6rem', fontSize: '0.9rem' }}>{p.material_type_2 ? `${p.material_type} + ${p.material_type_2}` : (p.material_type || '-')}</td>
                          <td style={{ padding: '0.6rem' }}>
                            {(() => {
                              const s = p.status || 'Prospecto';
                              const isProspecto  = s === 'New' || s === 'Prospecto' || s === '';
                              const isValuacion  = s === 'Valoración' || s === 'Valoracion';
                              const isCotizacion = s === 'Cotización';
                              const tracking = getProjectTrackingProgress(p);
                              const label = isProspecto ? 'Prospecto' : isValuacion ? 'Valoración' : 'Cotización';
                              const bg    = isProspecto ? '#eff6ff' : isValuacion ? '#fef3c7' : '#dcfce7';
                              const color = isProspecto ? '#1e40af' : isValuacion ? '#92400e' : '#14532d';
                              const dot   = isProspecto ? '#3b82f6' : isValuacion ? '#f59e0b' : '#22c55e';
                              return (
                                <div style={{ display: 'grid', gap: 5, minWidth: 112 }}>
                                  <span style={{
                                    background: bg, color,
                                    padding: '0.2rem 0.65rem', borderRadius: '12px',
                                    fontSize: '0.8rem', fontWeight: '700',
                                    display: 'inline-flex', alignItems: 'center', gap: '5px', width: 'fit-content'
                                  }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                                    {label}
                                  </span>
                                  <span style={{ color: '#64748b', fontSize: '0.67rem', whiteSpace: 'nowrap' }}>{tracking.stageLabel}</span>
                                  <span style={{ height: 3, width: 92, overflow: 'hidden', background: '#e2e8f0', borderRadius: 999 }}>
                                    <span style={{ display: 'block', height: '100%', width: `${tracking.completion}%`, background: '#2563eb', borderRadius: 999 }} />
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '0.6rem', position: 'sticky', right: 0, background: 'white', zIndex: 1, boxShadow: '-2px 0 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                              
                              {/* 1. PROSPECTO (Editar) */}
                              <button onClick={() => { setSelectedProspect(p); setView('detail'); }}
                                style={{ padding: '0.2rem 0.4rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.15rem', whiteSpace: 'nowrap' }}
                                title="Ver hoja de rastreo del proyecto">
                                📦 Rastreo
                              </button>
                              <button onClick={() => { setSelectedProspect(p); setView('edit'); }}
                                style={{ padding: '0.2rem 0.4rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.15rem', whiteSpace: 'nowrap' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
                                <><IconEdit style={{ width: '12px', height: '12px', marginRight: 0 }} /> Prospecto</>
                              </button>

                              {/* 2. VALORACION */}
                              <button onClick={() => setViewingValuation(p)}
                                style={{ padding: '0.2rem 0.4rem', backgroundColor: p.valuation_data ? '#fef3c7' : '#f1f5f9', color: p.valuation_data ? '#d97706' : '#94a3b8', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.15rem', whiteSpace: 'nowrap' }}
                                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                                onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                                <>{p.valuation_data
                                  ? <IconTrendingUp style={{ width: '12px', height: '12px', marginRight: 0 }} />
                                  : <IconPlusCircle style={{ width: '12px', height: '12px', marginRight: 0 }} />}
                                  Valoración</>
                              </button>

                              {/* 3. COTIZACION */}
                              <button onClick={() => {
                                if (!p.valuation_data && !p.has_quote) {
                                  alert("⚠️ Primero debe agregar una valoración para poder cotizar.");
                                  return;
                                }
                                setSelectedProspect(p); setView('quote'); 
                              }}
                                style={{ padding: '0.2rem 0.4rem', backgroundColor: p.has_quote ? '#dcfce7' : (!p.valuation_data ? '#f1f5f9' : '#eff6ff'), color: p.has_quote ? '#16a34a' : (!p.valuation_data ? '#94a3b8' : '#2563eb'), border: 'none', borderRadius: '4px', cursor: (!p.valuation_data && !p.has_quote) ? 'not-allowed' : 'pointer', fontSize: '0.7rem', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.15rem', opacity: (!p.valuation_data && !p.has_quote) ? 0.6 : 1, whiteSpace: 'nowrap' }}
                                onMouseEnter={e => (!p.valuation_data && !p.has_quote) ? null : e.currentTarget.style.filter = 'brightness(0.95)'}
                                onMouseLeave={e => (!p.valuation_data && !p.has_quote) ? null : e.currentTarget.style.filter = 'none'}>
                                <>{p.has_quote
                                  ? <IconCheckCircle style={{ width: '12px', height: '12px', marginRight: 0 }} />
                                  : <IconFileText style={{ width: '12px', height: '12px', marginRight: 0 }} />}
                                  Cotización</>
                              </button>

                              {/* 4. APROBADO */}
                              {p.has_quote && p.valuation_data && !p.is_contract && !p.is_papelera && (
                                <button onClick={() => setApproveModalFor(p)}
                                  style={{ padding: '0.2rem 0.4rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.15rem', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10b981'}>
                                  <><IconCheckCircle style={{ width: '12px', height: '12px', marginRight: 0 }} /> Aprobar</>
                                </button>
                              )}

                              {/* 5. ELIMINAR */}
                              <button onClick={() => setConfirmDelete(p)}
                                style={{ padding: '0.2rem 0.4rem', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.15rem', whiteSpace: 'nowrap' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fecaca'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fee2e2'}>
                                <><IconTrash style={{ width: '12px', height: '12px', marginRight: 0 }} /> Eliminar</>
                              </button>

                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* INTRO â€” Guía de empatía */}
      {view === 'intro' && (
        <EmpathyGuide
          onContinue={() => setView('new')}
          onCancel={() => setView('list')}
        />
      )}

      {/* NEW */}
      {view === 'new' && (
        <ProspectForm initial={EMPTY_FORM} onSave={handleSave} onCancel={() => setView('list')} editingId={null} />
      )}

      {/* EDIT */}
      {view === 'edit' && selectedProspect && (
        <ProspectForm initial={dbToForm(selectedProspect)} onSave={handleSave} onCancel={() => setView('detail')} editingId={selectedProspect.id} />
      )}

      {/* DETAIL */}
      {view === 'detail' && selectedProspect && (
        <ProspectDetail
          prospect={prospects.find(p => p.id === selectedProspect.id) || selectedProspect}
          onEdit={() => setView('edit')}
          onDelete={() => setConfirmDelete(selectedProspect)}
          onBack={() => { setView('list'); setSelectedProspect(null); }}
          onRestore={async () => {
            try {
              await fetch(`${API}/api/prospects/${selectedProspect.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  is_papelera: false, 
                  papelera_reason: null, 
                  status: 'Prospecto',
                  is_contract: false,
                  estimation_data: null,
                  render_applies: null,
                  render_price: null,
                  render_total_price: null,
                  render_image_path: null,
                  render_pdf_path: null,
                  render_delivery_time: null,
                  render_comments: null,
                  quote_saludo: null,
                  quote_title: null,
                  quote_description: null,
                  quote_total_price: null,
                  quote_delivery_time: null,
                  quote_validez: null,
                  quote_anticipo: null,
                  quote_image_1: null,
                  quote_image_2: null,
                  quote_image_3: null,
                  quote_image_4: null
                })
              });
              fetchProspects();
              setView('list');
              setSelectedProspect(null);
            } catch(e) { console.error(e); }
          }}
        />
      )}

      {/* QUOTE */}
      {view === 'quote' && selectedProspect && (
        <CotizacionView
          prospect={prospects.find(p => p.id === selectedProspect.id) || selectedProspect}
          onBack={() => { setView('list'); setSelectedProspect(null); }}
          onSaved={handleQuoteSaved}
        />
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <ConfirmModal
          message={`Eliminar al prospecto "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <ConfirmModal
          message={`Eliminar al prospecto "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* VALUATION MODAL */}
      {viewingValuation && (
        <ValuationModal 
          prospect={viewingValuation}
          onClose={() => setViewingValuation(null)}
          onSave={async (updatedData) => {
            try {
              const payload = { 
                estimated_price: String(updatedData.totalToPay),
                valuation_data: JSON.stringify(updatedData) 
              };
              const res = await fetch(`${API}/api/prospects/${viewingValuation.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error('Error al guardar');
              alert('Valoración actualizada correctamente.');
              setViewingValuation(null);
              window.location.reload();
            } catch(e) {
              console.error(e);
              alert('Error al guardar valoración.');
            }
          }}
          onDelete={async () => {
            if(!window.confirm("¿Seguro que deseas eliminar la valoración de este prospecto?")) return;
            try {
              const updated = { 
                ...viewingValuation, 
                estimated_price: null, 
                valuation_data: null, 
                status: 'Prospecto',
                has_quote: false,
                quote_saludo: null,
                quote_title: null,
                quote_description: null,
                quote_total_price: null,
                quote_delivery_time: null,
                quote_validez: null,
                quote_anticipo: null,
                quote_image_1: null,
                quote_image_2: null,
                quote_image_3: null,
                quote_image_4: null
              };
              await fetch(`${API}/api/prospects/${viewingValuation.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
              });
              alert("Valoración eliminada.");
              setViewingValuation(null);
              window.location.reload(); 
            } catch(e) {
              console.error(e);
              alert("Error al eliminar valoración.");
            }
          }}
        />
      )}
    </div>
  );
}

// ─── MODAL DE VALORACIÓN MULTI-HOJA ─────────────────────────────────────────
function ValuationModal({ prospect, onClose, onDelete, onSave }) {
  if (!prospect.valuation_data) return null;
  let parsed;
  try { parsed = JSON.parse(prospect.valuation_data); } catch(e) { return <div>Error leyendo datos.</div>; }

  const formatCur = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);

  // ── Normalizar al formato multi-hoja ──────────────────────────────────────
  // Si es formato viejo (sin sheets[]), lo envolvemos en un array de una hoja
  const normalizeToSheets = (raw) => {
    if (raw.sheets && Array.isArray(raw.sheets)) return raw; // ya es nuevo formato
    // Formato viejo
    return {
      sheets: [{
        type: raw.projectType || 'Proyecto',
        materials: raw.materials || [],
        labor:     raw.labor     || [],
        concepts:  raw.concepts  || [],
      }],
      globalMargin: raw.margin || 30,
      grandTotal:   raw.totalToPay || 0,
    };
  };

  const [data,     setData]     = React.useState(() => normalizeToSheets(JSON.parse(JSON.stringify(parsed))));
  const [editing,  setEditing]  = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0); // tab activo

  const sheets = data.sheets || [];
  const margin = parseFloat(data.globalMargin) || 30;

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const sheetTotals = (sheet) => {
    const sum = (arr) => (arr || []).reduce((s, m) => s + (parseFloat(m.qty) || 0) * (parseFloat(m.price) || 0), 0);
    const mat  = sum(sheet.materials);
    const lab  = sum(sheet.labor);
    const con  = sum(sheet.concepts);
    const cost = mat + lab + con;
    return { mat, lab, con, cost, mg: cost * (margin / 100), total: cost + cost * (margin / 100) };
  };
  const grandCost  = sheets.reduce((s, sh) => s + sheetTotals(sh).cost, 0);
  const grandMg    = grandCost * (margin / 100);
  const grandTotal = grandCost + grandMg;

  // ── Edición: actualizar qty de un ítem ───────────────────────────────────
  const updateQty = (sheetIdx, section, id, value) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const row = next.sheets[sheetIdx][section]?.find(r => r.id === id);
      if (row) row.qty = value;
      return next;
    });
  };

  const updateMargin = (val) => setData(prev => ({ ...prev, globalMargin: val }));

  // ── Estilos ───────────────────────────────────────────────────────────────
  const thSt  = { textAlign: 'left', padding: '8px 10px', background: '#8b5a2b', color: 'white', fontSize: '0.82rem' };
  const tdSt  = { padding: '6px 10px', borderBottom: '1px solid #f0f0f0', fontSize: '0.88rem' };
  const subRw = { background: '#f5deb3', fontWeight: 'bold' };

  const renderSheetRows = (sheet, sheetIdx, section, label) => {
    const rows = (sheet[section] || []).filter(m => editing ? true : parseFloat(m.qty) > 0);
    if (rows.length === 0 && !editing) return null;
    const t = sheetTotals(sheet);
    const subtotal = section === 'materials' ? t.mat : section === 'labor' ? t.lab : t.con;
    return (
      <>
        <tr>
          <td colSpan="5" style={{ background: '#f1f5f9', fontWeight: '700', padding: '6px 10px', fontSize: '0.85rem', color: '#475569' }}>
            {label}
          </td>
        </tr>
        {rows.map(m => (
          <tr key={m.id}>
            <td style={tdSt}>{m.desc}</td>
            <td style={tdSt}>
              {editing
                ? <input required type="number" value={m.qty} min="0"
                    onChange={e => updateQty(sheetIdx, section, m.id, e.target.value)}
                    style={{ width: '72px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                : m.qty}
            </td>
            <td style={tdSt}>{m.unit || 'pza'}</td>
            <td style={tdSt}>{formatCur(m.price)}</td>
            <td style={{ ...tdSt, textAlign: 'right', fontWeight: '600' }}>
              {formatCur((parseFloat(m.qty) || 0) * (parseFloat(m.price) || 0))}
            </td>
          </tr>
        ))}
        <tr style={subRw}>
          <td colSpan="4" style={{ ...tdSt, textAlign: 'right', color: '#4a2c0a' }}>Subtotal {label}</td>
          <td style={{ ...tdSt, textAlign: 'right', color: '#4a2c0a' }}>{formatCur(subtotal)}</td>
        </tr>
      </>
    );
  };

  const activeSheet = sheets[activeIdx];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '14px', width: '92%', maxWidth: '860px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ color: '#8b5a2b', margin: 0, fontSize: '1.1rem' }}>
            📋 Valoración: {prospect.name}
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '10px', fontWeight: '400' }}>
              {sheets.length} hoja{sheets.length !== 1 ? 's' : ''}
            </span>
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
        </div>

        {editing && (
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.83rem', color: '#92400e' }}>
            ✏️ Modo edición activo. Puedes modificar las cantidades de cada ítem.
          </div>
        )}

        {/* ── TABS DE HOJAS ── */}
        {sheets.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #8b5a2b', marginBottom: '0', overflowX: 'auto' }}>
            {sheets.map((sheet, idx) => {
              const t = sheetTotals(sheet);
              const isActive = activeIdx === idx;
              return (
                <div key={idx} onClick={() => setActiveIdx(idx)} style={{
                  padding: '8px 16px 10px 16px', cursor: 'pointer', fontWeight: '600', fontSize: '0.87rem',
                  borderRadius: '8px 8px 0 0', flexShrink: 0,
                  background: isActive ? '#8b5a2b' : '#f1f5f9',
                  color: isActive ? 'white' : '#475569',
                  border: `1px solid ${isActive ? '#8b5a2b' : '#e2e8f0'}`,
                  borderBottom: isActive ? '2px solid #8b5a2b' : '1px solid #e2e8f0',
                  marginBottom: isActive ? '-2px' : '0',
                  transition: 'all 0.12s',
                }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, marginRight: '4px' }}>#{idx + 1}</span>
                  {sheet.type}
                  <span style={{
                    marginLeft: '8px', padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700',
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: isActive ? 'white' : '#64748b',
                  }}>{formatCur(t.cost)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TABLA DE LA HOJA ACTIVA ── */}
        {activeSheet && (
          <div style={{ border: '1px solid #e2e8f0', borderTop: sheets.length > 1 ? 'none' : '1px solid #e2e8f0', borderRadius: sheets.length > 1 ? '0 0 8px 8px' : '8px', marginBottom: '1.5rem', overflow: 'hidden' }}>
            {sheets.length > 1 && (
              <div style={{ background: '#fff7ed', padding: '8px 12px', fontSize: '0.82rem', fontWeight: '700', color: '#92400e', borderBottom: '1px solid #fed7aa' }}>
                Hoja {activeIdx + 1}: {activeSheet.type}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  {['Concepto', 'Cantidad', 'Unidad', 'Precio Unit.', 'Total'].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderSheetRows(activeSheet, activeIdx, 'materials', 'Materiales')}
                {renderSheetRows(activeSheet, activeIdx, 'labor',     'Mano de Obra')}
                {renderSheetRows(activeSheet, activeIdx, 'concepts',  'Conceptos')}
                {/* Costo hoja */}
                <tr style={{ background: '#d18c4c', color: 'white', fontWeight: 'bold' }}>
                  <td colSpan="4" style={{ ...tdSt, textAlign: 'right', fontWeight: '800' }}>
                    Costo hoja {sheets.length > 1 ? `(${activeSheet.type})` : ''}
                  </td>
                  <td style={{ ...tdSt, textAlign: 'right', fontWeight: '800' }}>
                    {formatCur(sheetTotals(activeSheet).cost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── RESUMEN TOTAL (cuando hay varias hojas) ── */}
        {sheets.length > 1 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ background: '#1e40af', color: 'white', padding: '8px 14px', fontWeight: '700', fontSize: '0.9rem' }}>
              📊 Resumen de todas las hojas
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#dbeafe' }}>
                  {['Hoja', 'Materiales', 'Mano de Obra', 'Conceptos', 'Costo fabricación'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Hoja' ? 'left' : 'right', color: '#1e3a8a', fontWeight: '700', fontSize: '0.8rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheets.map((sheet, idx) => {
                  const t = sheetTotals(sheet);
                  return (
                    <tr key={idx} onClick={() => setActiveIdx(idx)}
                      style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: activeIdx === idx ? '#fff7ed' : '' }}>
                      <td style={{ ...tdSt, fontWeight: '700', color: '#8b5a2b' }}>#{idx + 1} {sheet.type}</td>
                      <td style={{ ...tdSt, textAlign: 'right' }}>{formatCur(t.mat)}</td>
                      <td style={{ ...tdSt, textAlign: 'right' }}>{formatCur(t.lab)}</td>
                      <td style={{ ...tdSt, textAlign: 'right' }}>{formatCur(t.con)}</td>
                      <td style={{ ...tdSt, textAlign: 'right', fontWeight: '700' }}>{formatCur(t.cost)}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#f5deb3', fontWeight: 'bold' }}>
                  <td colSpan="4" style={{ ...tdSt, textAlign: 'right', fontWeight: '800' }}>TOTAL FABRICACIÓN</td>
                  <td style={{ ...tdSt, textAlign: 'right', fontWeight: '800', fontSize: '1rem' }}>{formatCur(grandCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── PANEL FINAL: Ganancia + Total ── */}
        <div style={{ background: '#f8fafc', padding: '15px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#475569' }}>Costo total de fabricación:</span>
            <strong>{formatCur(grandCost)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '1rem' }}>
            <span style={{ color: '#475569' }}>Ganancia:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {editing
                ? <input required type="number" value={data.globalMargin} onChange={e => updateMargin(e.target.value)}
                    style={{ width: '60px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                : <span style={{ fontWeight: '600' }}>{margin}%</span>}
              <strong style={{ color: '#16a34a' }}>+ {formatCur(grandMg)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '10px', fontSize: '1.3rem' }}>
            <strong>TOTAL A PAGAR:</strong>
            <strong style={{ color: '#8b5a2b' }}>{formatCur(grandTotal)}</strong>
          </div>
        </div>

        {/* ── ACCIONES ── */}
        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onDelete}
            style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Eliminar valoración
          </button>
          {editing ? (
            <>
              <button onClick={() => { setData(normalizeToSheets(JSON.parse(JSON.stringify(parsed)))); setEditing(false); }}
                style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  const save = { ...data, grandTotal, globalMargin: margin, totalToPay: grandTotal };
                  onSave(save);
                }}
                style={{ backgroundColor: '#16a34a', color: 'white', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Guardar Cambios
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                style={{ backgroundColor: '#eab308', color: 'white', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                ✏️ Editar Cantidades
              </button>
              <button onClick={onClose}
                style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { printProspect };
export default Prospects;
