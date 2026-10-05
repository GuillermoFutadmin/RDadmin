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

  // ─── Template draw functions ────────────────────────────────────────────────
  const tplCocina = (ctx, cx, cy) => {
    const sc=25, ox=cx-20, oy=cy+40, s='#334155';
    drawIsoBox(ctx,ox,oy,8,3.5,2.8,sc,'rgba(209,213,219,.85)','rgba(156,163,175,.7)','rgba(175,180,190,.7)',s);
    const d0=isoProject(8,3.5,0,ox,oy,sc),d1=isoProject(8,0,0,ox,oy,sc);
    const d2=isoProject(8,0,2.8,ox,oy,sc),d3=isoProject(8,3.5,2.8,ox,oy,sc);
    const mT={x:(d0.x+d2.x)/2,y:(d0.y+d2.y)/2},mB={x:(d1.x+d3.x)/2,y:(d1.y+d3.y)/2};
    ctx.strokeStyle=s; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(mT.x,mT.y); ctx.lineTo(mB.x,mB.y); ctx.stroke();
    [0.3,0.7].forEach(t => { const hx=d0.x+(d3.x-d0.x)*t,hy=d0.y+(d3.y-d0.y)*t; ctx.beginPath(); ctx.arc(hx,hy,3,0,2*Math.PI); ctx.fillStyle='#94a3b8'; ctx.fill(); });
    drawIsoBox(ctx,ox,oy,8.2,0.3,2.95,sc,'rgba(248,250,252,.95)','rgba(226,232,240,.8)','rgba(226,232,240,.8)','#475569');
    const ux=cx-20,uy=cy-70;
    drawIsoBox(ctx,ux,uy,8,3,1.8,sc,'rgba(219,234,254,.85)','rgba(191,219,254,.7)','rgba(147,197,253,.6)',s);
    const u0=isoProject(8,3,0,ux,uy,sc),u2=isoProject(8,0,1.8,ux,uy,sc);
    const u1=isoProject(8,0,0,ux,uy,sc),u3=isoProject(8,3,1.8,ux,uy,sc);
    const umT={x:(u0.x+u2.x)/2,y:(u0.y+u2.y)/2},umB={x:(u1.x+u3.x)/2,y:(u1.y+u3.y)/2};
    ctx.strokeStyle=s; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(umT.x,umT.y); ctx.lineTo(umB.x,umB.y); ctx.stroke();
    const bL=isoProject(0,0,0,ox,oy,sc),bR=isoProject(8,0,0,ox,oy,sc);
    const bD=isoProject(0,0,2.8,ox,oy,sc),bT=isoProject(0,3.5,0,ox,oy,sc);
    drawDimArrow(ctx,bL.x-22,bL.y,bR.x-22,bR.y,'ANCHO','#1e40af');
    drawDimArrow(ctx,bL.x-12,bL.y,bD.x-12,bD.y,'PROF','#0f766e');
    drawDimArrow(ctx,bL.x-38,bL.y,bT.x-38,bT.y,'ALTO BAJO','#7c3aed');
    const uTp=isoProject(0,0,0,ux,uy,sc),uBt=isoProject(0,3,0,ux,uy,sc);
    drawDimArrow(ctx,uTp.x-38,uTp.y,uBt.x-38,uBt.y,'ALTO ALTO','#7c3aed');
    ctx.font='bold 12px Inter,Arial,sans-serif'; ctx.fillStyle='#1e293b'; ctx.textAlign='center';
    ctx.fillText('MUEBLE BAJO',cx-20,cy+108); ctx.fillText('MUEBLE ALTO',cx-20,cy-122);
  };

  const tplCloset = (ctx, cx, cy) => {
    const sc=25,ox=cx-40,oy=cy+80,s='#334155';
    drawIsoBox(ctx,ox,oy,7,9,2.5,sc,'rgba(236,254,255,.85)','rgba(207,250,254,.7)','rgba(165,243,252,.6)',s);
    const shL=isoProject(.2,4.5,.2,ox,oy,sc),shR=isoProject(6.8,4.5,.2,ox,oy,sc);
    const shRb=isoProject(6.8,4.5,2.3,ox,oy,sc),shLb=isoProject(.2,4.5,2.3,ox,oy,sc);
    ctx.fillStyle='rgba(186,230,253,.6)'; ctx.strokeStyle='#0ea5e9'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(shL.x,shL.y); ctx.lineTo(shR.x,shR.y); ctx.lineTo(shRb.x,shRb.y); ctx.lineTo(shLb.x,shLb.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    const fTL=isoProject(0,9,0,ox,oy,sc),fBL=isoProject(0,0,0,ox,oy,sc);
    const fTM=isoProject(0,9,1.25,ox,oy,sc),fBM=isoProject(0,0,1.25,ox,oy,sc);
    const fTR=isoProject(0,9,2.5,ox,oy,sc),fBR=isoProject(0,0,2.5,ox,oy,sc);
    ctx.fillStyle='rgba(224,242,254,.75)'; ctx.strokeStyle='#0369a1'; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(fTL.x,fTL.y); ctx.lineTo(fTM.x,fTM.y); ctx.lineTo(fBM.x,fBM.y); ctx.lineTo(fBL.x,fBL.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(186,230,253,.75)';
    ctx.beginPath(); ctx.moveTo(fTM.x,fTM.y); ctx.lineTo(fTR.x,fTR.y); ctx.lineTo(fBR.x,fBR.y); ctx.lineTo(fBM.x,fBM.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    [[fTL,fBL,fTM,fBM],[fTM,fBM,fTR,fBR]].forEach(pts => {
      const hx=(pts[0].x+pts[1].x+pts[2].x+pts[3].x)/4,hy=(pts[0].y+pts[1].y+pts[2].y+pts[3].y)/4;
      ctx.beginPath(); ctx.arc(hx,hy,3.5,0,2*Math.PI); ctx.fillStyle='#0369a1'; ctx.fill();
    });
    const bL=isoProject(0,0,0,ox,oy,sc),bR=isoProject(7,0,0,ox,oy,sc);
    const bD=isoProject(0,0,2.5,ox,oy,sc),bT=isoProject(0,9,0,ox,oy,sc);
    drawDimArrow(ctx,bL.x-22,bL.y,bR.x-22,bR.y,'ANCHO','#1e40af');
    drawDimArrow(ctx,bL.x-12,bL.y,bD.x-12,bD.y,'PROF','#0f766e');
    drawDimArrow(ctx,bL.x-40,bL.y,bT.x-40,bT.y,'ALTO','#7c3aed');
    ctx.font='bold 12px Inter,Arial,sans-serif'; ctx.fillStyle='#1e293b'; ctx.textAlign='center';
    ctx.fillText('CLÓSET / NICHO',cx-40,cy+142);
    ctx.fillText('Puerta 1',(fTL.x+fTM.x)/2-5,fTL.y-10); ctx.fillText('Puerta 2',(fTM.x+fTR.x)/2-5,fTM.y-10);
  };

  const tplPuerta = (ctx, cx, cy, tipo) => {
    const sc=28,ox=cx-70,oy=cy+90,s='#334155';
    drawIsoBox(ctx,ox,oy,.6,7,.5,sc,'rgba(226,232,240,.7)','rgba(203,213,225,.6)','rgba(203,213,225,.6)',s);
    const dPts=[isoProject(.6,7,0,ox,oy,sc),isoProject(.6,0,0,ox,oy,sc),isoProject(4,0,0,ox,oy,sc),isoProject(4,7,0,ox,oy,sc)];
    ctx.fillStyle=tipo==='tambor'?'rgba(209,250,229,.85)':'rgba(254,243,199,.85)';
    ctx.strokeStyle=tipo==='tambor'?'#065f46':'#b45309'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(dPts[0].x,dPts[0].y); dPts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    const ins=0.25;
    const ip=[isoProject(.6+ins,7-ins,0,ox,oy,sc),isoProject(.6+ins,ins,0,ox,oy,sc),isoProject(4-ins,ins,0,ox,oy,sc),isoProject(4-ins,7-ins,0,ox,oy,sc)];
    ctx.strokeStyle=tipo==='tambor'?'#065f46':'#92400e'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(ip[0].x,ip[0].y); ip.slice(1).forEach(p=>ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.stroke();
    if(tipo==='tambor'){ const mT=isoProject(.6+ins,3.5,0,ox,oy,sc),mR=isoProject(4-ins,3.5,0,ox,oy,sc); ctx.beginPath(); ctx.moveTo(mT.x,mT.y); ctx.lineTo(mR.x,mR.y); ctx.stroke(); }
    const hPos=isoProject(3.5,3.5,0,ox,oy,sc);
    ctx.beginPath(); ctx.arc(hPos.x,hPos.y,5,0,2*Math.PI); ctx.fillStyle=tipo==='tambor'?'#065f46':'#78350f'; ctx.fill();
    if(tipo==='solida'){
      const ht=isoProject(.6,7,0,ox,oy,sc),tt=isoProject(4,7,0,ox,oy,sc);
      const r=Math.hypot(tt.x-ht.x,tt.y-ht.y),a0=Math.atan2(tt.y-ht.y,tt.x-ht.x);
      ctx.strokeStyle='#b45309'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.arc(ht.x,ht.y,r,a0,a0+Math.PI/2); ctx.stroke(); ctx.setLineDash([]);
    }
    const bL=isoProject(.6,0,0,ox,oy,sc),bR=isoProject(4,0,0,ox,oy,sc);
    const bT=isoProject(.6,7,0,ox,oy,sc),bW0=isoProject(0,0,0,ox,oy,sc),bW=isoProject(0,0,.5,ox,oy,sc);
    drawDimArrow(ctx,bL.x-18,bL.y,bR.x-18,bR.y,'ANCHO VANO','#1e40af');
    drawDimArrow(ctx,bL.x-36,bL.y,bT.x-36,bT.y,'ALTO VANO','#7c3aed');
    drawDimArrow(ctx,bW0.x+8,bW0.y,bW.x+8,bW.y,'ESPESOR','#0f766e');
    ctx.setLineDash([]); ctx.font='bold 12px Inter,Arial,sans-serif'; ctx.fillStyle='#1e293b'; ctx.textAlign='center';
    ctx.fillText(tipo==='tambor'?'PUERTA TAMBOR':'PUERTA SÓLIDA',cx-30,cy+132);
  };

  const TEMPLATES = [
    { id:'cocina',   label:'Cocina',        icon:'🍳', desc:'Mueble alto + bajo + encimera', color:'#b45309', bg:'#fffbeb', draw:(ctx,cx,cy) => tplCocina(ctx,cx,cy) },
    { id:'closet',   label:'Clóset',         icon:'🚪', desc:'Nicho + puertas corredizas',  color:'#0369a1', bg:'#eff6ff', draw:(ctx,cx,cy) => tplCloset(ctx,cx,cy) },
    { id:'p_solida', label:'Puerta Sólida',  icon:'🪵', desc:'Vano + hoja + abatimiento',   color:'#7c3aed', bg:'#faf5ff', draw:(ctx,cx,cy) => tplPuerta(ctx,cx,cy,'solida') },
    { id:'p_tambor', label:'Puerta Tambor',  icon:'🟩', desc:'Vano + hoja liviana',          color:'#065f46', bg:'#f0fdf4', draw:(ctx,cx,cy) => tplPuerta(ctx,cx,cy,'tambor') },
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

      {/* Template Croquis gallery */}
      <div style={{ marginBottom:'0.75rem' }}>
        <p style={{ fontSize:'0.7rem', fontWeight:'800', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 0.45rem' }}>
          📐 Insertar Croquis Isométrico — 1 clic
        </p>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {TEMPLATES.map(tpl => (
            <button key={tpl.id} title={tpl.desc}
              onClick={() => {
                pushState();
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                ctx.save();
                tpl.draw(ctx, canvas.width/2, canvas.height/2 - 30);
                ctx.restore();
              }}
              style={{ padding:'7px 13px', background:tpl.bg, border:`2px solid ${tpl.color}44`, borderRadius:'10px', cursor:'pointer', fontSize:'0.8rem', fontWeight:'700', color:tpl.color, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', transition:'all 0.15s', minWidth:'95px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=tpl.color; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 6px 16px ${tpl.color}33`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=`${tpl.color}44`; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
            >
              <span style={{ fontSize:'1.35rem', lineHeight:1 }}>{tpl.icon}</span>
              <span>{tpl.label}</span>
              <span style={{ fontSize:'0.6rem', fontWeight:'500', color:`${tpl.color}99` }}>{tpl.desc}</span>
            </button>
          ))}
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
        <span>📐 <b>Croquis:</b> clic en una plantilla para insertar el dibujo isométrico con cotas</span>
        <span>🔤 <b>Texto:</b> clic donde quieres escribir la medida, Enter para confirmar</span>
        <span>➡️ <b>Flecha:</b> arrastra para marcar cotas adicionales</span>
        <span>⛶ Pantalla Completa para más espacio</span>
      </div>
    </div>
  );
});

export default Croquis3D;
