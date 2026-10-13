import React from 'react';
import './production-stage.css';

export const PRODUCTION_STAGE_NAMES = [
  'Generando información',
  'Preparación de materiales',
  'Producción iniciada',
  'Avance 1',
  'Avance 2 / revisión',
  'Entrega del proyecto'
];

export const StageIcon = ({ stage, size = 54 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 54 54',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true
  };

  if (stage === 0) return (
    <svg {...common}>
      <rect x="13" y="8" width="29" height="40" rx="4" fill="#fff" stroke="#334155" strokeWidth="2.5" />
      <rect x="20" y="5" width="15" height="8" rx="3" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
      <path d="M19 22h17M19 29h17M19 36h12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m18 16 2 2 4-4" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (stage === 1) return (
    <svg {...common}>
      <path d="M18 18v-5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v5" fill="#fbbf24" stroke="#334155" strokeWidth="2.5" />
      <rect x="8" y="18" width="38" height="27" rx="5" fill="#ef4444" stroke="#334155" strokeWidth="2.5" />
      <path d="M8 28h38M23 25h8v7h-8z" fill="#fef3c7" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="15" cy="34" r="2" fill="#fecaca" />
      <circle cx="39" cy="34" r="2" fill="#fecaca" />
    </svg>
  );
  if (stage === 2) return (
    <svg {...common}>
      <path d="M9 37h37v7H9z" fill="#d6a76a" stroke="#475569" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m14 35 25-19 5 6-25 19z" fill="#cbd5e1" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m15 36 4 5m2-10 4 5m2-10 4 5m2-10 4 5m2-10 3 4" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 39 39 22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (stage === 3) return (
    <svg {...common}>
      <path d="m13 18 8-8 7 7-8 8z" fill="#fbbf24" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m24 21 16 16" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
      <path d="m24 21 16 16" stroke="#d6a76a" strokeWidth="3.5" strokeLinecap="round" />
      <path d="m9 42 7-7m3 10 7-7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  if (stage === 4) return (
    <svg {...common}>
      <circle cx="23" cy="23" r="15" fill="#bfdbfe" stroke="#334155" strokeWidth="2.5" />
      <circle cx="23" cy="23" r="9" fill="#e0f2fe" stroke="#60a5fa" strokeWidth="2" />
      <path d="m34 34 11 11" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
      <path d="m34 34 11 11" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
      <path d="m16 24 5 5 10-12" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg {...common}>
      <path d="M5 18h27v23H5z" fill="#fbbf24" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 25h10l7 8v8H32z" fill="#60a5fa" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M36 28v6h9l-5-6z" fill="#dbeafe" stroke="#334155" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="15" cy="42" r="5" fill="#475569" stroke="#fff" strokeWidth="2" />
      <circle cx="40" cy="42" r="5" fill="#475569" stroke="#fff" strokeWidth="2" />
      <path d="M9 23h14M9 29h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export default StageIcon;
