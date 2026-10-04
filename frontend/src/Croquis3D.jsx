import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const Croquis3D = forwardRef((props, ref) => {
  const canvasRef     = useRef(null);
  const gridCanvasRef = useRef(null);
  const containerRef  = useRef(null);
  const snapshotRef   = useRef(null);
  const startPosRef   = useRef(null);
  const historyRef    = useRef([]);

  const [color, setColor]       = useState('#1e293b');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setModeState]    = useState('libre'); // libre|line|arrow|text|erase|circle|rect
  const [grid3D, setGrid3D]     = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: '' });
  const textInputRef = useRef(null);

  const erasing   = mode === 'erase';
  const lineMode  = mode === 'line';
  const arrowMode = mode === 'arrow';
  const textMode  = mode === 'text';
  const circleMode = mode === 'circle';
  const rectMode  = mode === 'rect';

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useImperativeHandle(ref, () => ({
    getSketchData: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width; tmp.height = canvas.height;
      const ctx = tmp.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(canvas, 0, 0);
      return tmp.toDataURL('image/png');
    },
    loadSketchData: (dataUrl) => {
      const canvas = canvasRef.current;
      if (!canvas || !dataUrl) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img, 0, 0); };
      img.src = dataUrl;
    },
    clearCanvas: () => initCanvas()
  }));

  useEffect(() => {
    const gc = gridCanvasRef.current;
    if (!gc) return;
    const ctx = gc.getContext('2d');
    ctx.clearRect(0, 0, gc.width, gc.height);
    if (grid3D) drawIsometricGrid(ctx, gc.width, gc.height);
  }, [grid3D]);

  const initCanvas = () => {
    const c = canvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  };

  const drawIsometricGrid = (ctx, w, h) => {
    ctx.save();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    const size = 40;
    const dx = size * Math.cos(Math.PI / 6);
    const dy = size * Math.sin(Math.PI / 6);
    for (let x = -w; x < w * 2; x += dx) {
      ctx.moveTo(x, 0); ctx.lineTo(x + h * Math.tan(Math.PI / 3), h);
      ctx.moveTo(x, 0); ctx.lineTo(x - h * Math.tan(Math.PI / 3), h);
    }
    ctx.stroke();
    ctx.restore();
  };

  const pushState = () => {
    if (canvasRef.current) historyRef.current.push(canvasRef.current.toDataURL('image/png'));
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (historyRef.current.length > 0) {
      const img = new Image();
      img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); };
      img.src = historyRef.current.pop();
    } else {
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  };

  const commitText = () => {
    if (!textInput.visible) return;
    const { text, x, y } = textInput;
    setTextInput({ visible: false, x: 0, y: 0, text: '' });
    if (!text.trim()) return;
    pushState();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const fs = lineWidth * 6 + 12;
    ctx.font = `bold ${fs}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    text.split('\n').forEach((line, i) => ctx.fillText(line, x, y + i * fs * 1.25));
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if (e.touches) return { x:(e.touches[0].clientX-rect.left)*sx, y:(e.touches[0].clientY-rect.top)*sy };
    return { x:(e.clientX-rect.left)*sx, y:(e.clientY-rect.top)*sy };
  };

  // Draw isometric cube at center of canvas
  const insertCube = () => {
    pushState();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const s = 120; // half size
    const dx = s * Math.cos(Math.PI / 6);
    const dy = s * Math.sin(Math.PI / 6);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth + 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Top face
    ctx.fillStyle = 'rgba(186,220,254,0.5)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + dx, cy - s + dy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - dx, cy - s + dy);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Right face
    ctx.fillStyle = 'rgba(147,197,253,0.4)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx, cy - s + dy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.lineTo(cx, cy + s);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Left face
    ctx.fillStyle = 'rgba(96,165,250,0.3)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - dx, cy - s + dy);
    ctx.lineTo(cx - dx, cy + dy);
    ctx.lineTo(cx, cy + s);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.restore();
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    if (textMode) {
      if (textInput.visible) commitText();
      setTextInput({ visible: true, x: pos.x, y: pos.y, text: '' });
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    pushState();

    if (lineMode || arrowMode || circleMode || rectMode) {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      startPosRef.current = pos;
    } else {
      ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    }
    setIsDrawing(true);
  };

  const drawArrowhead = (ctx, x1, y1, x2, y2) => {
    const hl = 18, dx = x2-x1, dy = y2-y1, angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hl*Math.cos(angle-Math.PI/6), y2 - hl*Math.sin(angle-Math.PI/6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hl*Math.cos(angle+Math.PI/6), y2 - hl*Math.sin(angle+Math.PI/6));
    ctx.stroke();
  };

  const applyStroke = (ctx) => {
    ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = erasing ? 24 : lineWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  };

  const draw = (e) => {
    if (textMode || !isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    if ((lineMode || arrowMode || circleMode || rectMode) && snapshotRef.current && startPosRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      applyStroke(ctx);

      if (circleMode) {
        const rx = Math.abs(pos.x - startPosRef.current.x) / 2;
        const ry = Math.abs(pos.y - startPosRef.current.y) / 2;
        const cx = (pos.x + startPosRef.current.x) / 2;
        const cy = (pos.y + startPosRef.current.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(rx,1), Math.max(ry,1), 0, 0, 2*Math.PI);
        ctx.stroke();
      } else if (rectMode) {
        ctx.beginPath();
        ctx.strokeRect(startPosRef.current.x, startPosRef.current.y,
          pos.x - startPosRef.current.x, pos.y - startPosRef.current.y);
      } else {
        ctx.beginPath();
        ctx.moveTo(startPosRef.current.x, startPosRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if (arrowMode && !erasing) drawArrowhead(ctx, startPosRef.current.x, startPosRef.current.y, pos.x, pos.y);
      }
    } else {
      applyStroke(ctx);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (textMode || !isDrawing) return;
    if (e) { try { e.preventDefault(); } catch {} }

    if ((lineMode || arrowMode || circleMode || rectMode) && snapshotRef.current && startPosRef.current) {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        ctx.putImageData(snapshotRef.current, 0, 0);
        applyStroke(ctx);

        if (circleMode) {
          const rx = Math.abs(pos.x - startPosRef.current.x) / 2;
          const ry = Math.abs(pos.y - startPosRef.current.y) / 2;
          const cx = (pos.x + startPosRef.current.x) / 2;
          const cy = (pos.y + startPosRef.current.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(rx,1), Math.max(ry,1), 0, 0, 2*Math.PI);
          ctx.stroke();
        } else if (rectMode) {
          ctx.beginPath();
          ctx.strokeRect(startPosRef.current.x, startPosRef.current.y,
            pos.x - startPosRef.current.x, pos.y - startPosRef.current.y);
        } else {
          ctx.beginPath();
          ctx.moveTo(startPosRef.current.x, startPosRef.current.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          if (arrowMode && !erasing) drawArrowhead(ctx, startPosRef.current.x, startPosRef.current.y, pos.x, pos.y);
        }
      } catch {}
      snapshotRef.current = null; startPosRef.current = null;
    }
    setIsDrawing(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
  };

  const btnStyle = (active, activeColor = '#1d4ed8', activeBg = '#dbeafe') => ({
    padding: '5px 11px',
    background: active ? activeBg : '#f8fafc',
    border: `1.5px solid ${active ? activeColor : '#e2e8f0'}`,
    borderRadius: '7px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: active ? activeColor : '#475569',
    display: 'flex', alignItems: 'center', gap: '4px',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  });

  const curStyle = textMode ? 'text' : (lineMode||arrowMode||circleMode||rectMode) ? 'crosshair' : erasing ? 'cell' : 'crosshair';

  return (
    <div ref={containerRef} style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'1.2rem', marginTop:'1.5rem', marginBottom:'1.5rem' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.8rem', gap:'1rem', flexWrap:'wrap' }}>
        <h3 style={{ margin:0, color:'#1e293b', fontSize:'0.95rem', fontWeight:'800', display:'flex', alignItems:'center', gap:'6px' }}>
          ✏️ <span>Croquis y Dibujo</span>
          <span style={{ background:'#e0e7ff', color:'#3730a3', fontSize:'0.65rem', padding:'2px 7px', borderRadius:'20px', fontWeight:'700' }}>2D / 3D Isométrico</span>
        </h3>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button onClick={() => setGrid3D(!grid3D)} style={btnStyle(grid3D, '#1d4ed8', '#dbeafe')}>
            🧊 {grid3D ? 'Ocultar Guía 3D' : 'Guía 3D'}
          </button>
          <button onClick={toggleFullscreen} style={btnStyle(false)}>
            {isFullscreen ? '↘️ Salir' : '⛶ Pantalla Completa'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:'0.35rem', alignItems:'center', marginBottom:'0.8rem', flexWrap:'wrap', background:'#f8fafc', padding:'8px 10px', borderRadius:'10px', border:'1px solid #e2e8f0' }}>
        {/* Color & size */}
        <input type="color" value={color} onChange={e => { setColor(e.target.value); setModeState('libre'); }}
          style={{ width:'30px', height:'30px', padding:0, border:'2px solid #e2e8f0', borderRadius:'6px', cursor:'pointer', flexShrink:0 }} />
        <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
          style={{ padding:'4px 6px', borderRadius:'6px', border:'1px solid #e2e8f0', fontSize:'0.78rem', background:'white' }}>
          {[1,2,3,5,8,12].map(n => <option key={n} value={n}>{n}px</option>)}
        </select>

        <div style={{ width:'1px', height:'26px', background:'#e2e8f0', margin:'0 2px' }} />

        {/* Draw modes */}
        <button onClick={() => setModeState('libre')} style={btnStyle(mode==='libre')}>✍️ Libre</button>
        <button onClick={() => setModeState('line')}  style={btnStyle(mode==='line')}>📏 Recta</button>
        <button onClick={() => setModeState('arrow')} style={btnStyle(mode==='arrow')}>➡️ Flecha</button>
        <button onClick={() => setModeState('circle')} style={btnStyle(mode==='circle', '#7c3aed', '#ede9fe')}>⭕ Círculo</button>
        <button onClick={() => setModeState('rect')}  style={btnStyle(mode==='rect', '#0369a1', '#e0f2fe')}>▭ Rectángulo</button>
        <button onClick={() => setModeState('text')}  style={btnStyle(mode==='text', '#065f46', '#d1fae5')}>🔤 Texto</button>

        <div style={{ width:'1px', height:'26px', background:'#e2e8f0', margin:'0 2px' }} />

        {/* Cube insert */}
        <button onClick={insertCube} style={{ ...btnStyle(false, '#92400e', '#fef3c7'), border:'1.5px solid #fcd34d', color:'#78350f', background:'#fef9c3' }}>
          🧊 Insertar Cubo
        </button>

        <div style={{ width:'1px', height:'26px', background:'#e2e8f0', margin:'0 2px' }} />

        <button onClick={() => setModeState('erase')} style={btnStyle(mode==='erase', '#b45309', '#fef9c3')}>🩹 Borrar</button>
        <button onClick={undo}         style={btnStyle(false)}>↩️ Deshacer</button>
        <button onClick={() => { pushState(); initCanvas(); }}
          style={{ ...btnStyle(false), color:'#dc2626', border:'1.5px solid #fca5a5', background:'#fff1f2' }}>
          🗑️ Limpiar
        </button>
      </div>

      {/* Canvas area */}
      <div style={{ overflow:'auto', width:'100%', position:'relative', height: isFullscreen ? 'calc(100vh - 120px)' : '780px', border:'1.5px solid #cbd5e1', borderRadius:'10px', background:'#fafafa' }}>
        <div style={{ position:'relative', width:'1400px', height:'1050px', flexShrink:0, background:'#ffffff', boxShadow: isFullscreen ? '0 4px 20px rgba(0,0,0,0.1)' : 'none' }}>
          <canvas ref={gridCanvasRef} width={1400} height={1050}
            style={{ position:'absolute', top:0, left:0, pointerEvents:'none', zIndex:1 }} />
          <canvas ref={canvasRef} width={1400} height={1050}
            style={{ position:'absolute', top:0, left:0, cursor:curStyle, touchAction:'none', zIndex:2 }}
            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
          {textInput.visible && (
            <textarea ref={textInputRef}
              value={textInput.text}
              onChange={e => setTextInput(p => ({ ...p, text: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); } }}
              onBlur={commitText}
              style={{ position:'absolute', left:textInput.x, top:textInput.y, minWidth:'220px', minHeight:'44px',
                background:'rgba(255,255,255,0.95)', color:color, border:'2px dashed #94a3b8', outline:'none',
                font:`bold ${lineWidth*6+12}px Inter, sans-serif`, lineHeight:1.25, padding:'2px 4px',
                resize:'both', overflow:'hidden', zIndex:10, borderRadius:'4px' }} />
          )}
        </div>
      </div>

      {/* Hint bar */}
      <div style={{ marginTop:'0.5rem', fontSize:'0.72rem', color:'#94a3b8', display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
        <span>💡 <b>Círculo:</b> arrastra para definir el tamaño</span>
        <span>🧊 <b>Insertar Cubo:</b> coloca un cubo isométrico en el centro — muévelo luego con Libre</span>
        <span>🔤 <b>Texto:</b> click donde quieres escribir, Enter para confirmar</span>
        <span>⛶ Pantalla Completa para más espacio</span>
      </div>
    </div>
  );
});

export default Croquis3D;
