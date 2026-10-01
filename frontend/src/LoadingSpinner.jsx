import React, { useState, useEffect } from 'react';

export default function LoadingSpinner({ size = 140, text = 'Cargando...' }) {
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => f === 1 ? 2 : 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.2rem',
      padding: '3rem',
    }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <img
          src="/logo-rd-frame1.png"
          alt="Cargando..."
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: size,
            height: size,
            objectFit: 'contain',
            opacity: frame === 1 ? 1 : 0,
            transition: 'opacity 0.1s ease-in-out',
            filter: 'drop-shadow(0 8px 20px rgba(186,75,36,0.35))',
          }}
        />
        <img
          src="/logo-rd-frame2.png"
          alt="Cargando..."
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: size,
            height: size,
            objectFit: 'contain',
            opacity: frame === 2 ? 1 : 0,
            transition: 'opacity 0.1s ease-in-out',
            filter: 'drop-shadow(0 8px 20px rgba(186,75,36,0.35))',
          }}
        />
      </div>
      {text && (
        <p style={{
          margin: 0,
          color: '#8b5a2b',
          fontSize: '0.95rem',
          fontWeight: '700',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {text}
        </p>
      )}
    </div>
  );
}

/** Full-screen loading overlay, e.g. for page transitions or heavy fetches */
export function LoadingOverlay({ text = 'Procesando...' }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <LoadingSpinner size={160} text={text} />
    </div>
  );
}
