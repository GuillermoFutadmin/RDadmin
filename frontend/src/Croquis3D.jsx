import React, { useRef, useState, useEffect } from 'react';

export default function Croquis3D() {
  const canvasRef   = useRef(null);
  const snapshotRef = useRef(null);
  const startPosRef = useRef(null);

  const [color, setColor]         = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [erasing, setErasing]     = useState(false);
  const [lineMode, setLineMode]   = useState(false);
  const [textMode, setTextMode]   = useState(false);
  const [grid3D, setGrid3D]       = useState(false); // Isometric grid

  useEffect(() => {
    initCanvas();
  }, [grid3D]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (grid3D) {
      drawIsometricGrid(ctx, canvas.width, canvas.height);
    }
  };

  const drawIsometricGrid = (ctx, w, h) => {
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const size = 30; // grid size
    const dx = size * Math.cos(Math.PI / 6);
    const dy = size * Math.sin(Math.PI / 6);
    
    // Draw diagonal lines
    for (let x = -w; x < w * 2; x += dx) {
      ctx.moveTo(x, 0); ctx.lineTo(x + h * Math.tan(Math.PI / 3), h);
      ctx.moveTo(x, 0); ctx.lineTo(x - h * Math.tan(Math.PI / 3), h);
    }
    // Draw vertical lines
    for (let x = 0; x < w; x += dx) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.restore();
  };

  const getPos = (e, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) return { x:(e.touches[0].clientX-rect.left)*scaleX, y:(e.touches[0].clientY-rect.top)*scaleY };
    return { x:(e.clientX-rect.left)*scaleX, y:(e.clientY-rect.top)*scaleY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const pos    = getPos(e, canvas);
    
    if (textMode) {
      const txt = window.prompt("Escribe el texto a insertar:");
      if (txt) {
        ctx.font = `${lineWidth * 6 + 10}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(txt, pos.x, pos.y);
      }
      return;
    }
    
    if (lineMode) {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      startPosRef.current = pos;
    } else {
      ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    }
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (textMode) return;
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const pos    = getPos(e, canvas);

    if (lineMode && snapshotRef.current && startPosRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.beginPath();
      ctx.moveTo(startPosRef.current.x, startPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = erasing ? '#ffffff' : color;
      ctx.lineWidth   = erasing ? 20 : lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = erasing ? '#ffffff' : color;
      ctx.lineWidth   = erasing ? 20 : lineWidth;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (textMode) return;
    if (e) { try { e.preventDefault(); } catch {} }
    if (lineMode && isDrawing && snapshotRef.current && startPosRef.current) {
      try {
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        const pos    = getPos(e, canvas);
        ctx.putImageData(snapshotRef.current, 0, 0);
        ctx.beginPath();
        ctx.moveTo(startPosRef.current.x, startPosRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = erasing ? '#ffffff' : color;
        ctx.lineWidth   = erasing ? 20 : lineWidth;
        ctx.lineCap = 'round'; ctx.stroke();
      } catch {}
      snapshotRef.current = null; startPosRef.current = null;
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    initCanvas();
  };

  const curStyle = textMode ? 'text' : lineMode ? 'crosshair' : (erasing ? 'cell' : 'crosshair');

  return (
    <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.2rem', marginTop: '1.5rem' }}>
      <div style={{ display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'0.8rem' }}>
        <h3 style={{ margin:0, color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>✏️ Croquis y Dibujo (2D / 3D Isométrico)</h3>
        
        <button onClick={() => setGrid3D(!grid3D)}
          style={{ padding:'6px 12px', background: grid3D ? '#8b5a2b' : '#f1f5f9', color: grid3D ? 'white' : '#475569', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'700', fontSize:'0.85rem' }}>
          {grid3D ? '🧊 Ocultar Guía 3D' : '🧊 Activar Guía 3D Isométrica'}
        </button>
      </div>
        
      <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', marginBottom:'0.8rem', flexWrap:'wrap', background:'#f8fafc', padding:'8px 12px', borderRadius:'8px', border:'1px solid #e2e8f0' }}>
        <input type="color" value={color} onChange={e => { setColor(e.target.value); setErasing(false); }}
            style={{ width:'32px', height:'32px', padding:0, border:'none', borderRadius:'50%', cursor:'pointer' }} />
        <div style={{ width:'1px', height:'24px', background:'#cbd5e1', margin:'0 4px' }} />
        
        <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
          style={{ padding:'4px 8px', borderRadius:'6px', border:'1px solid #cbd5e1', fontSize:'0.82rem', outline:'none' }}>
          {[1,2,3,5,8,12].map(n => <option key={n} value={n}>{n}px</option>)}
        </select>

        <div style={{ width:'1px', height:'24px', background:'#cbd5e1', margin:'0 4px' }} />

        <button onClick={() => { setLineMode(false); setTextMode(false); setErasing(false); }}
          style={{ padding:'4px 10px', background:!lineMode&&!textMode&&!erasing?'#dbeafe':'transparent', border:`1px solid ${!lineMode&&!textMode&&!erasing?'#3b82f6':'transparent'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:!lineMode&&!textMode&&!erasing?'#1d4ed8':'#475569' }}>
          ✍️ Libre
        </button>
        <button onClick={() => { setLineMode(true); setTextMode(false); setErasing(false); }}
          style={{ padding:'4px 10px', background:lineMode?'#dbeafe':'transparent', border:`1px solid ${lineMode?'#3b82f6':'transparent'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:lineMode?'#1d4ed8':'#475569' }}>
          📏 Recta
        </button>
        <button onClick={() => { setTextMode(true); setLineMode(false); setErasing(false); }}
          style={{ padding:'4px 10px', background:textMode?'#dbeafe':'transparent', border:`1px solid ${textMode?'#3b82f6':'transparent'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:textMode?'#1d4ed8':'#475569' }}>
          🔤 Texto
        </button>
        
        <div style={{ width:'1px', height:'24px', background:'#cbd5e1', margin:'0 4px' }} />

        <button onClick={() => { setErasing(true); setLineMode(false); setTextMode(false); }}
          style={{ padding:'4px 10px', background:erasing?'#fef9c3':'transparent', border:`1px solid ${erasing?'#d97706':'transparent'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:erasing?'#b45309':'#475569' }}>
          🩹 Borrar
        </button>
        <button onClick={clearCanvas}
          style={{ padding:'4px 10px', background:'transparent', color:'#dc2626', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' }}>
          🗑 Limpiar Todo
        </button>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <canvas
          ref={canvasRef} width={1200} height={600}
          style={{ border:'1px solid #cbd5e1', cursor: curStyle, background:'#fff', minWidth: '900px', width:'100%', borderRadius:'8px', touchAction:'none' }}
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
}
