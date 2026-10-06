import React, { useRef, useState, useEffect } from 'react';

export function SignaturePad({ onSave, onCancel, title }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    // Prevent scrolling while drawing on touch devices
    const canvas = canvasRef.current;
    const preventScroll = (e) => e.preventDefault();
    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX ?? e.touches[0].clientX;
    const clientY = e.clientY ?? e.touches[0].clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0000aa'; // Blue ink
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
      {title && <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>{title}</h4>}
      <div style={{ border: '2px dashed #94a3b8', background: '#fff', borderRadius: '4px', overflow: 'hidden', width: 'fit-content' }}>
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={200} 
          style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseOut={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
        <button onClick={clear} style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Limpiar</button>
        <button onClick={handleSave} style={{ padding: '6px 12px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
        {onCancel && <button onClick={onCancel} style={{ padding: '6px 12px', background: '#cbd5e1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>}
      </div>
    </div>
  );
}
