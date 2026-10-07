import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const STORAGE_KEY = 'croquis3d_autosave';

const Croquis3D = forwardRef((props, ref) => {
  // props.contractId can be passed to namespace localStorage per contract
  const storageKey = props.contractId ? `${STORAGE_KEY}_${props.contractId}` : STORAGE_KEY;

  const canvasRef     = useRef(null);
  const gridCanvasRef = useRef(null);
  const containerRef  = useRef(null);
  const snapshotRef   = useRef(null);
  const startPosRef   = useRef(null);
  const historyRef    = useRef([]);
  const saveTimerRef  = useRef(null);

  const [color, setColor]         = useState('#1e293b');
  const [lineWidth, setLineWidth]  = useState(2);
  const [isDrawing, setIsDrawing]  = useState(false);
  const [mode, setModeState]       = useState('libre');
  const [grid3D, setGrid3D]        = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textInput, setTextInput]  = useState({ visible: false, x: 0, y: 0, text: '' });
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [measurePopup, setMeasurePopup] = useState({ visible: false, x1:0, y1:0, x2:0, y2:0, screenX:0, screenY:0, value:'', unit:'m' });
  const textInputRef = useRef(null);
  const measureValueRef = useRef(null);
  const drawCanvasRef = useRef(null); // alias for attaching passive touch listeners
  const [cursorPos, setCursorPos] = useState({ x: 1000, y: 750 }); // Always visible, initialized to center

  const erasing     = mode === 'erase';
  const lineMode    = mode === 'line';
  const arrowMode   = mode === 'arrow';
  const textMode    = mode === 'text';
  const circleMode  = mode === 'circle';
  const rectMode    = mode === 'rect';
  const measureMode = mode === 'measure';

  // ── Auto-save to localStorage ─────────────────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const data = canvas.toDataURL('image/png');
        localStorage.setItem(storageKey, data);
      } catch(e) {}
    }, 800);
  }, [storageKey]);

  // ── Load saved sketch on mount ────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = saved;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // ── Stable refs so touch listeners registered ONCE always see current handlers ──
  const startDrawingRef = useRef(null);
  const drawRef         = useRef(null);
  const stopDrawingRef  = useRef(null);

  // ── Register passive:false touch listeners ONCE on mount ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const opts = { passive: false };
    // Use ref-based wrappers so the same function reference is kept but
    // always delegates to the latest version of each handler.
    const onTouchStart  = (e) => startDrawingRef.current?.(e);
    const onTouchMove   = (e) => drawRef.current?.(e);
    const onTouchEnd    = (e) => stopDrawingRef.current?.(e);
    canvas.addEventListener('touchstart',  onTouchStart,  opts);
    canvas.addEventListener('touchmove',   onTouchMove,   opts);
    canvas.addEventListener('touchend',    onTouchEnd,    opts);
    canvas.addEventListener('touchcancel', onTouchEnd,    opts);
    return () => {
      canvas.removeEventListener('touchstart',  onTouchStart,  opts);
      canvas.removeEventListener('touchmove',   onTouchMove,   opts);
      canvas.removeEventListener('touchend',    onTouchEnd,    opts);
      canvas.removeEventListener('touchcancel', onTouchEnd,    opts);
    };
  }, []); // ← empty deps: register ONCE, never re-register mid-draw

  const initCanvas = () => {
    const c = canvasRef.current;
    if (c) {
      c.getContext('2d').clearRect(0, 0, c.width, c.height);
      localStorage.removeItem(storageKey);
    }
  };

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
      img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img, 0, 0); scheduleAutoSave(); };
      img.src = dataUrl;
    },
    clearCanvas: () => initCanvas()
  }));

  useEffect(() => {
    const gc = gridCanvasRef.current;
    if (!gc) return;
    const ctx = gc.getContext('2d');
    ctx.clearRect(0, 0, gc.width, gc.height);
    if (grid3D) {
      ctx.save(); ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 0.7; ctx.beginPath();
      const size = 40, dx = size * Math.cos(Math.PI / 6);
      const w = gc.width, h = gc.height;
      for (let x = -w; x < w * 2; x += dx) {
        ctx.moveTo(x, 0); ctx.lineTo(x + h * Math.tan(Math.PI / 3), h);
        ctx.moveTo(x, 0); ctx.lineTo(x - h * Math.tan(Math.PI / 3), h);
      }
      ctx.stroke(); ctx.restore();
    }
  }, [grid3D]);

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

  // Desplazamiento vertical en px de pantalla: el trazo aparece encima del dedo
  const TOUCH_OFFSET_Y = 55;

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    // touches[0] exists on touchstart/touchmove; on touchend use changedTouches[0]
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    if (touch) return {
      x: (touch.clientX - rect.left) * sx,
      y: (touch.clientY - rect.top - TOUCH_OFFSET_Y) * sy  // sube el punto sobre el dedo
    };
    return { x:(e.clientX-rect.left)*sx, y:(e.clientY-rect.top)*sy };
  };

  // ─── Isometric helpers ─────────────────────────────────────────────────────
  const isoProject = (x, y, z, ox, oy, sc) => {
    const a = Math.PI / 6;
    return { x: ox + (x - z) * Math.cos(a) * sc, y: oy + (x + z) * Math.sin(a) * sc - y * sc };
  };

  const drawIsoBox = (ctx, ox, oy, w, h, d, sc, cTop, cRight, cLeft, stroke) => {
    const pts = (xs, ys, zs) => xs.map((x, i) => isoProject(x, ys[i], zs[i], ox, oy, sc));
    const ftl=isoProject(0,0,0,ox,oy,sc), ftr=isoProject(w,0,0,ox,oy,sc);
    const fbr=isoProject(w,0,d,ox,oy,sc), fbl=isoProject(0,0,d,ox,oy,sc);
    const tl =isoProject(0,h,0,ox,oy,sc), tr =isoProject(w,h,0,ox,oy,sc);
    const br =isoProject(w,h,d,ox,oy,sc), bl =isoProject(0,h,d,ox,oy,sc);
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    const face = (p, fill) => {
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
      p.slice(1).forEach(v => ctx.lineTo(v.x, v.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    face([ftl,ftr,tr,tl], cTop);
    face([ftr,fbr,br,tr], cRight);
    face([ftl,fbl,bl,tl], cLeft);
    return { tl, tr, br, bl, ftl, ftr, fbr, fbl };
  };

  const drawDimArrow = (ctx, x1, y1, x2, y2, label, col = '#1e40af') => {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1), hs = 7;
    [[x1, y1, ang + Math.PI], [x2, y2, ang]].forEach(([ax, ay, a]) => {
      ctx.beginPath(); ctx.moveTo(ax, ay);
      ctx.lineTo(ax - hs * Math.cos(a - 0.4), ay - hs * Math.sin(a - 0.4));
      ctx.lineTo(ax - hs * Math.cos(a + 0.4), ay - hs * Math.sin(a + 0.4));
      ctx.closePath(); ctx.fill();
    });
    const mx = (x1+x2)/2, my = (y1+y2)/2;
    ctx.font = 'bold 11px Inter,Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'white'; ctx.fillRect(mx - tw/2, my - 9, tw, 18);
    ctx.fillStyle = col; ctx.fillText(label, mx, my);
  };

  // ─── 2D orthographic helpers ──────────────────────────────────────────────
  const dim2H = (ctx, x1, x2, y, label, col='#1e40af') => {
    const yL=y-22, hs=6; ctx.save();
    ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=1; ctx.setLineDash([]);
    [x1,x2].forEach(ax => { ctx.beginPath(); ctx.moveTo(ax,y); ctx.lineTo(ax,yL); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(x1,yL); ctx.lineTo(x2,yL); ctx.stroke();
    [[x1,1],[x2,-1]].forEach(([ax,d]) => { ctx.beginPath(); ctx.moveTo(ax,yL); ctx.lineTo(ax+d*hs,yL-4); ctx.lineTo(ax+d*hs,yL+4); ctx.closePath(); ctx.fill(); });
    const mx=(x1+x2)/2; ctx.font='bold 13px Inter,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const tw=ctx.measureText(label).width+10; ctx.fillStyle='#fff'; ctx.fillRect(mx-tw/2,yL-10,tw,20); ctx.fillStyle=col; ctx.fillText(label,mx,yL);
    ctx.restore();
  };
  const dim2V = (ctx, x, y1, y2, label, col='#7c3aed') => {
    const xL=x-22, hs=6; ctx.save();
    ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=1; ctx.setLineDash([]);
    [y1,y2].forEach(ay => { ctx.beginPath(); ctx.moveTo(x,ay); ctx.lineTo(xL,ay); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(xL,y1); ctx.lineTo(xL,y2); ctx.stroke();
    [[y1,1],[y2,-1]].forEach(([ay,d]) => { ctx.beginPath(); ctx.moveTo(xL,ay); ctx.lineTo(xL-4,ay+d*hs); ctx.lineTo(xL+4,ay+d*hs); ctx.closePath(); ctx.fill(); });
    ctx.save(); ctx.translate(xL,(y1+y2)/2); ctx.rotate(-Math.PI/2);
    ctx.font='bold 13px Inter,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const tw=ctx.measureText(label).width+10; ctx.fillStyle='#fff'; ctx.fillRect(-tw/2,-10,tw,20); ctx.fillStyle=col; ctx.fillText(label,0,0);
    ctx.restore(); ctx.restore();
  };
  const viewPanel = (ctx, x, y, w, h, title) => {
    ctx.fillStyle='#ffffff'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1; ctx.setLineDash([]); ctx.strokeRect(x,y,w,h);
    ctx.fillStyle='#475569'; ctx.font='bold 15px Inter,Arial'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(title, x+8, y+8);
  };
  const drawWireframe = (ctx, cx, cy, w, h, d, type) => {
    // Limpiar todo el lienzo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 3000, 2000);

    const PW = 900, PH = 600;
    const sc = Math.min(PW/(w+d), PH/(h+d)) * 0.8;
    const ox = cx;
    const oy = cy + (h*sc)/2 - 80;

    const iso = (x, y, z) => {
      const a = Math.PI / 6;
      return { x: ox + (x - z) * Math.cos(a) * sc, y: oy + (x + z) * Math.sin(a) * sc - y * sc };
    };

    const faces = [];
    const addSlab = (x1, y1, z1, x2, y2, z2, cTop, cFront, cSide) => {
      const p = (x,y,z) => ({ x3:x, y3:y, z3:z, ...iso(x,y,z) });
      const pushFace = (pts, fill) => {
        const depth = -(pts[0].x3 + pts[0].y3 + pts[0].z3 + pts[2].x3 + pts[2].y3 + pts[2].z3);
        faces.push({ pts, fill, depth });
      };
      
      // Caras en X (Izquierda / Derecha)
      pushFace([p(x1,y1,z1), p(x1,y2,z1), p(x1,y2,z2), p(x1,y1,z2)], cFront);
      pushFace([p(x2,y1,z1), p(x2,y2,z1), p(x2,y2,z2), p(x2,y1,z2)], cFront);
      
      // Caras en Z (Atrás / Frente)
      pushFace([p(x1,y1,z1), p(x2,y1,z1), p(x2,y2,z1), p(x1,y2,z1)], cSide);
      pushFace([p(x1,y1,z2), p(x2,y1,z2), p(x2,y2,z2), p(x1,y2,z2)], cSide);
      
      // Caras en Y (Abajo / Arriba)
      pushFace([p(x1,y1,z1), p(x2,y1,z1), p(x2,y1,z2), p(x1,y1,z2)], cTop);
      pushFace([p(x1,y2,z1), p(x2,y2,z1), p(x2,y2,z2), p(x1,y2,z2)], cTop);
    };

    const th = 0.25; // Grosor de la madera
    const cT = '#f8fafc', cF = '#f1f5f9', cS = '#e2e8f0';

    if (type === 'marco' || type === 'puerta') {
      // Vano orientado hacia X
      addSlab(w-th, 0, d-th, w, h, d, cT, cF, cS); // Pata izq
      addSlab(w-th, 0, 0, w, h, th, cT, cF, cS); // Pata der
      addSlab(w-th, h-th, 0, w, h, d, cT, cF, cS); // Dintel
      if (type === 'marco') addSlab(w-th, 0, 0, w, th, d, cT, cF, cS); // Umbral
    } else if (type === 'isla') {
      addSlab(0, 0, 0, w, h, d, cT, cF, cS);
    } else {
      // Caparazón / Carcasa orientado hacia X
      addSlab(0, 0, 0, w, th, d, cT, cF, cS); // Base
      addSlab(0, h-th, 0, w, h, d, cT, cF, cS); // Techo
      addSlab(0, th, 0, th, h-th, d, cT, cF, cS); // Fondo
      addSlab(th, th, d-th, w, h-th, d, cT, cF, cS); // Lateral izq
      addSlab(th, th, 0, w, h-th, th, cT, cF, cS); // Lateral der
    }

    // Ordenar de atrás hacia adelante (Painter's algorithm)
    faces.sort((a,b) => b.depth - a.depth);

    faces.forEach(f => {
      ctx.fillStyle = f.fill;
      ctx.strokeStyle = '#64748b'; // Líneas sutiles pero definidas
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      f.pts.slice(1).forEach(v => ctx.lineTo(v.x, v.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  };

  const TEMPLATES = [
    { id:'cocina',    label:'Cocina',         icon:'[K]', desc:'Caparazón Cocina', color:'#b45309', bg:'#fffbeb', draw:(ctx,cx,cy)=>drawWireframe(ctx,cx,cy,8,8,3.5,'carcasa') },
    { id:'closet',    label:'Closet',          icon:'[C]', desc:'Caparazón Closet', color:'#0369a1', bg:'#eff6ff', draw:(ctx,cx,cy)=>drawWireframe(ctx,cx,cy,10,9,3,'carcasa') },
    { id:'p_solida',  label:'Pta.Solida',      icon:'[P]', desc:'Vano Puerta', color:'#7c3aed', bg:'#faf5ff', draw:(ctx,cx,cy)=>drawWireframe(ctx,cx,cy,4,8,1,'puerta') },
    { id:'p_tambor',  label:'Pta.Tambor',      icon:'[T]', desc:'Vano Puerta', color:'#065f46', bg:'#f0fdf4', draw:(ctx,cx,cy)=>drawWireframe(ctx,cx,cy,4,8,1,'puerta') },
    { id:'cajonera',  label:'Cajonera',        icon:'[D]', desc:'Caparazón Cajonera', color:'#0891b2', bg:'#ecfeff', draw:(ctx,cx,cy)=>drawWireframe(ctx,cx,cy,5,8,3,'carcasa') },
    { id:'marco',     label:'Marco',           icon:'[M]', desc:'Caparazón Marco', color:'#6b7280', bg:'#f9fafb', draw:(ctx,cx,cy)=>drawWireframe(ctx,cx,cy,4.5,8,1,'marco') },
    { id:'isla',      label:'Isla Cocina',     icon:'[I]', desc:'Bloque Isla', color:'#d97706', bg:'#fffbeb', draw:(ctx,cx,cy)=>drawWireframe(ctx,cx,cy,10,4,6,'isla') },
    { id:'fregadero', label:'Fregadero',       icon:'[F]', desc:'Caparazón Fregadero', color:'#0284c7', bg:'#f0f9ff', draw:(ctx,cx,cy)=>drawWireframe(ctx,cx,cy,8,4,3.5,'carcasa') },
  ];



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

    if (lineMode || arrowMode || circleMode || rectMode || measureMode) {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      startPosRef.current = pos;
    } else {
      ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    }
    setIsDrawing(true);
    setCursorPos({ x: pos.x, y: pos.y });
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
    setCursorPos({ x: pos.x, y: pos.y });

    if ((lineMode || arrowMode || circleMode || rectMode || measureMode) && snapshotRef.current && startPosRef.current) {
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
      } else if (measureMode) {
        // Draw live preview line for measure mode
        ctx.save();
        ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 1.8; ctx.setLineDash([6,4]);
        ctx.beginPath(); ctx.moveTo(startPosRef.current.x, startPosRef.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
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

  // Draw a finalized measurement line with arrows + label on canvas
  const drawMeasureLine = (x1, y1, x2, y2, label) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    const col = '#16a34a';
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.setLineDash([]);
    // Main line
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // Arrowheads
    const ang = Math.atan2(y2-y1, x2-x1), hs = 10;
    [[x1,y1,ang+Math.PI],[x2,y2,ang]].forEach(([ax,ay,a]) => {
      ctx.beginPath(); ctx.moveTo(ax,ay);
      ctx.lineTo(ax - hs*Math.cos(a-0.4), ay - hs*Math.sin(a-0.4));
      ctx.lineTo(ax - hs*Math.cos(a+0.4), ay - hs*Math.sin(a+0.4));
      ctx.closePath(); ctx.fill();
    });
    // Tick marks perpendicular at ends
    const perp = ang + Math.PI/2, tk = 8;
    [x1,y1,x2,y2].forEach((_, i) => {
      if (i % 2 !== 0) return;
      const bx = [x1,x2][i/2], by = [y1,y2][i/2];
      ctx.beginPath();
      ctx.moveTo(bx + tk*Math.cos(perp), by + tk*Math.sin(perp));
      ctx.lineTo(bx - tk*Math.cos(perp), by - tk*Math.sin(perp));
      ctx.stroke();
    });
    // Label
    const mx=(x1+x2)/2, my=(y1+y2)/2;
    ctx.font = 'bold 13px Inter,Arial,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle='white'; ctx.fillRect(mx-tw/2, my-11, tw, 22);
    ctx.fillStyle=col; ctx.fillText(label, mx, my);
    ctx.restore();
  };

  const commitMeasure = (value, unit) => {
    if (!value.trim()) { setMeasurePopup(p => ({ ...p, visible: false })); scheduleAutoSave(); return; }
    const { x1, y1, x2, y2 } = measurePopup;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Restore clean state (line already drawn in preview), just paint on top
    drawMeasureLine(x1, y1, x2, y2, `${value} ${unit}`);
    setMeasurePopup(p => ({ ...p, visible: false }));
    scheduleAutoSave();
  };

  const stopDrawing = (e) => {
    if (textMode || !isDrawing) return;
    if (e) { try { e.preventDefault(); } catch {} }

    if ((lineMode || arrowMode || circleMode || rectMode || measureMode) && snapshotRef.current && startPosRef.current) {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);

        if (measureMode) {
          // Restore snapshot (clear preview dashes), commit solid line immediately
          ctx.putImageData(snapshotRef.current, 0, 0);
          drawMeasureLine(startPosRef.current.x, startPosRef.current.y, pos.x, pos.y, '?');
          // Compute screen coords for popup (near midpoint of line)
          const rect = canvas.getBoundingClientRect();
          const sx = rect.width / canvas.width;
          const sy = rect.height / canvas.height;
          const screenX = rect.left + ((startPosRef.current.x + pos.x) / 2) * sx;
          const screenY = rect.top  + ((startPosRef.current.y + pos.y) / 2) * sy;
          setMeasurePopup({ visible: true, x1: startPosRef.current.x, y1: startPosRef.current.y,
            x2: pos.x, y2: pos.y, screenX, screenY, value: '', unit: 'm' });
          setTimeout(() => measureValueRef.current?.focus(), 60);
        } else {
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
        }
      } catch {}
      snapshotRef.current = null; startPosRef.current = null;
    }
    setIsDrawing(false);
    // Cursor remains visible at last position to give constant visual reference
    if (!measureMode) scheduleAutoSave();
  };

  const handlePointerMove = (e) => {
    if (isDrawing) return; // Handled by draw()
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    setCursorPos({ x: pos.x, y: pos.y });
  };

  // \u2500\u2500 Keep refs pointing to the latest handler versions after every render \u2500\u2500
  startDrawingRef.current = startDrawing;
  drawRef.current         = draw;
  stopDrawingRef.current  = stopDrawing;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
  };

  const btn = (active, ac='#1d4ed8', ab='#dbeafe') => ({
    padding:'4px 10px', background:active?ab:'rgba(255,255,255,0.9)',
    border:`1.5px solid ${active?ac:'#e2e8f0'}`, borderRadius:'7px', cursor:'pointer',
    fontSize:'0.78rem', fontWeight:'700', color:active?ac:'#475569',
    display:'flex', alignItems:'center', gap:'3px', whiteSpace:'nowrap', backdropFilter:'blur(4px)',
  });

  const curStyle = textMode ? 'text' : erasing ? 'cell' : measureMode ? 'crosshair' : 'crosshair';

  return (
    <div ref={containerRef} style={{ position:'relative', background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', marginTop:'1rem', marginBottom:'1rem', overflow:'hidden' }}>

      {/* ── Top toolbar bar ── */}
      <div style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', padding:'6px 10px', display:'flex', gap:'0.3rem', flexWrap:'wrap', alignItems:'center' }}>
        {/* Color + size */}
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          style={{ width:'26px', height:'26px', padding:0, border:'2px solid #e2e8f0', borderRadius:'5px', cursor:'pointer', flexShrink:0 }} />
        <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
          style={{ padding:'2px 4px', borderRadius:'5px', border:'1px solid #e2e8f0', fontSize:'0.73rem', background:'white' }}>
          {[1,2,3,5,8,12].map(n => <option key={n} value={n}>{n}px</option>)}
        </select>
        <div style={{ width:'1px', height:'22px', background:'#e2e8f0', margin:'0 2px' }} />
        {/* Draw modes */}
        <button onClick={() => setModeState('libre')}  style={btn(mode==='libre')}>✍️ Libre</button>
        <button onClick={() => setModeState('line')}   style={btn(mode==='line')}>📏 Recta</button>
        <button onClick={() => setModeState('arrow')}  style={btn(mode==='arrow')}>➡️ Flecha</button>
        <button onClick={() => setModeState('circle')} style={btn(mode==='circle','#7c3aed','#ede9fe')}>⭕</button>
        <button onClick={() => setModeState('rect')}   style={btn(mode==='rect','#0369a1','#e0f2fe')}>▭</button>
        <button onClick={() => setModeState('text')}   style={btn(mode==='text','#065f46','#d1fae5')}>🔤 Texto</button>
        <button onClick={() => setModeState('measure')} style={btn(mode==='measure','#dc2626','#fef2f2')} title="Dibuja una línea y se abrirá un cuadro para anotar la medida">📐 Medida</button>
        <div style={{ width:'1px', height:'22px', background:'#e2e8f0', margin:'0 2px' }} />
        <button onClick={() => setGrid3D(!grid3D)} style={btn(grid3D,'#1d4ed8','#dbeafe')}>🧊 Iso</button>
        <button onClick={() => setModeState('erase')} style={btn(mode==='erase','#b45309','#fef9c3')}>🩹 Borrar</button>
        <button onClick={undo} style={btn(false)}>↩️</button>
        <button onClick={toggleFullscreen} style={btn(false)}>{isFullscreen?'↘️':'⛶'}</button>
        <button onClick={() => { if(window.confirm('¿Limpiar lienzo?')){ pushState(); initCanvas(); } }} style={{ ...btn(false), color:'#dc2626', borderColor:'#fca5a5', background:'#fff1f2' }}>🗑️</button>
        <div style={{ flex:1 }} />
        {/* auto-save indicator */}
        <span style={{ fontSize:'0.62rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:'3px' }}>
          <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
          Auto-guardado
        </span>
      </div>

      {/* ── Templates row ── */}
      <div style={{ background:'#ffffff', borderBottom:'1px solid #e2e8f0', padding:'5px 10px', display:'flex', gap:'0.3rem', flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:'0.65rem', fontWeight:'800', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.04em', marginRight:'4px' }}>📐 Croquis:</span>
        {TEMPLATES.map(tpl => (
          <button key={tpl.id} title={tpl.desc}
            onClick={() => {
              pushState();
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              ctx.save(); tpl.draw(ctx, canvas.width/2, canvas.height/2 - 30); ctx.restore();
              scheduleAutoSave();
            }}
            style={{ padding:'3px 9px', background:tpl.bg, border:`1.5px solid ${tpl.color}44`, borderRadius:'6px', cursor:'pointer', fontSize:'0.75rem', fontWeight:'700', color:tpl.color, display:'flex', alignItems:'center', gap:'4px', transition:'all 0.12s', whiteSpace:'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=tpl.color; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=`${tpl.color}44`; e.currentTarget.style.transform=''; }}
          >
            <span>{tpl.icon}</span> {tpl.label}
          </button>
        ))}
      </div>

      <div style={{ overflow:'hidden', width:'100%', position:'relative', height: isFullscreen ? '100vh' : '680px', background:'#ffffff' }}>
        <canvas ref={gridCanvasRef} width={2000} height={1500}
          style={{ position:'absolute', top:0, left:0, pointerEvents:'none', zIndex:1, width:'100%', height:'100%' }} />
        <canvas ref={canvasRef} width={2000} height={1500}
          style={{ position:'absolute', top:0, left:0, cursor:curStyle, touchAction:'none', zIndex:2, width:'100%', height:'100%' }}
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
          onPointerMove={handlePointerMove} />
        {cursorPos && (
          <div style={{
            position: 'absolute',
            left: `${(cursorPos.x / 2000) * 100}%`,
            top: `${(cursorPos.y / 1500) * 100}%`,
            width: '18px',
            height: '18px',
            border: '2px solid rgba(220, 38, 38, 0.7)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 0 6px rgba(255,255,255,0.9)'
          }}>
            <div style={{ position:'absolute', top:'50%', left:'50%', width:'4px', height:'4px', background:'#dc2626', transform:'translate(-50%,-50%)', borderRadius:'50%' }} />
          </div>
        )}
        {textInput.visible && (
          <textarea ref={textInputRef}
            value={textInput.text}
            onChange={e => setTextInput(p => ({ ...p, text: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); } }}
            onBlur={commitText}
            style={{ position:'absolute', left:`${(textInput.x/1400)*100}%`, top:`${(textInput.y/1050)*100}%`,
              minWidth:'200px', minHeight:'40px',
              background:'rgba(255,255,255,0.95)', color:color, border:'2px dashed #94a3b8', outline:'none',
              font:`bold ${lineWidth*6+12}px Inter,sans-serif`, lineHeight:1.25, padding:'2px 4px',
              resize:'both', overflow:'hidden', zIndex:10, borderRadius:'4px' }} />
        )}
        {/* ── Measure popup ── */}
        {measurePopup.visible && (() => {
          return (
            <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
              background:'white', border:'2px solid #16a34a', borderRadius:'12px', padding:'0.8rem 1rem',
              boxShadow:'0 8px 28px rgba(0,0,0,0.18)', zIndex:20, display:'flex', flexDirection:'column', gap:'0.5rem', minWidth:'200px' }}>
              <p style={{ margin:0, fontSize:'0.72rem', fontWeight:'800', color:'#16a34a', textTransform:'uppercase', letterSpacing:'0.06em' }}>📐 Medida de la línea</p>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input ref={measureValueRef} type="text" inputMode="decimal" placeholder="Ej. 2.35"
                  value={measurePopup.value}
                  onChange={e => setMeasurePopup(p => ({ ...p, value: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') commitMeasure(measurePopup.value, measurePopup.unit); if (e.key === 'Escape') { setMeasurePopup(p => ({ ...p, visible:false })); scheduleAutoSave(); } }}
                  style={{ flex:1, padding:'6px 8px', borderRadius:'6px', border:'1.5px solid #16a34a', fontSize:'0.95rem', fontWeight:'700', outline:'none', color:'#1e293b' }} />
                <select value={measurePopup.unit} onChange={e => setMeasurePopup(p => ({ ...p, unit: e.target.value }))}
                  style={{ padding:'6px 4px', borderRadius:'6px', border:'1.5px solid #16a34a', fontSize:'0.85rem', fontWeight:'700', color:'#16a34a', background:'#f0fdf4', cursor:'pointer' }}>
                  <option value="m">m</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="pulg">pulg</option>
                  <option value="pie">pie</option>
                </select>
              </div>
              <div style={{ display:'flex', gap:'0.4rem' }}>
                <button onClick={() => commitMeasure(measurePopup.value, measurePopup.unit)}
                  style={{ flex:1, padding:'6px', background:'#16a34a', color:'white', border:'none', borderRadius:'7px', fontWeight:'800', cursor:'pointer', fontSize:'0.85rem' }}>✔ Aplicar</button>
                <button onClick={() => { setMeasurePopup(p => ({ ...p, visible:false })); scheduleAutoSave(); }}
                  style={{ padding:'6px 10px', background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:'7px', fontWeight:'700', cursor:'pointer', fontSize:'0.85rem' }}>✕</button>
              </div>
              <p style={{ margin:0, fontSize:'0.65rem', color:'#94a3b8' }}>Enter para aplicar · Esc para cancelar</p>
            </div>
          );
        })()}
      </div>

    </div>
  );
});

export default Croquis3D;
