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
  const textInputRef = useRef(null);

  const erasing   = mode === 'erase';
  const lineMode  = mode === 'line';
  const arrowMode = mode === 'arrow';
  const textMode  = mode === 'text';
  const circleMode = mode === 'circle';
  const rectMode  = mode === 'rect';

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

  const tplCajonera = (ctx, cx, cy) => {
    const sc=32, ox=cx-30, oy=cy+60, s='#334155';
    // Body
    drawIsoBox(ctx,ox,oy,5,8,2.2,sc,'rgba(226,232,240,.85)','rgba(203,213,225,.7)','rgba(203,213,225,.7)',s);
    // 4 drawers
    [1.5,3,4.5,6].forEach(yOff => {
      const dTL=isoProject(0.15,yOff+1.2,0.1,ox,oy,sc), dTR=isoProject(4.85,yOff+1.2,0.1,ox,oy,sc);
      const dBL=isoProject(0.15,yOff,0.1,ox,oy,sc),    dBR=isoProject(4.85,yOff,0.1,ox,oy,sc);
      ctx.fillStyle='rgba(248,250,252,.9)'; ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(dTL.x,dTL.y); ctx.lineTo(dTR.x,dTR.y); ctx.lineTo(dBR.x,dBR.y); ctx.lineTo(dBL.x,dBL.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Handle
      const hL=isoProject(1.8,yOff+0.65,0.1,ox,oy,sc), hR=isoProject(3.2,yOff+0.65,0.1,ox,oy,sc);
      ctx.strokeStyle='#64748b'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(hL.x,hL.y); ctx.lineTo(hR.x,hR.y); ctx.stroke();
    });
    const bL=isoProject(0,0,0,ox,oy,sc),bR=isoProject(5,0,0,ox,oy,sc);
    const bD=isoProject(0,0,2.2,ox,oy,sc),bT=isoProject(0,8,0,ox,oy,sc);
    drawDimArrow(ctx,bL.x-22,bL.y,bR.x-22,bR.y,'ANCHO','#1e40af');
    drawDimArrow(ctx,bL.x-10,bL.y,bD.x-10,bD.y,'PROF','#0f766e');
    drawDimArrow(ctx,bL.x-38,bL.y,bT.x-38,bT.y,'ALTO','#7c3aed');
    ctx.font='bold 13px Inter,Arial,sans-serif'; ctx.fillStyle='#1e293b'; ctx.textAlign='center';
    ctx.fillText('CAJONERA',cx-30,cy+130);
  };

  const tplMarco = (ctx, cx, cy) => {
    const sc=32, ox=cx-80, oy=cy+60, s='#334155';
    // Left jamb
    drawIsoBox(ctx,ox,oy,0.5,7.5,0.4,sc,'rgba(209,213,219,.8)','rgba(156,163,175,.65)','rgba(175,180,190,.65)',s);
    // Right jamb
    drawIsoBox(ctx,ox,oy,0.5,7.5,0.4,sc,'rgba(209,213,219,.8)','rgba(156,163,175,.65)','rgba(175,180,190,.65)',s);
    const rx=isoProject(4,0,0,ox,oy,sc);
    const rox=ox+rx.x-isoProject(0,0,0,ox,oy,sc).x;
    const roy=oy+rx.y-isoProject(0,0,0,ox,oy,sc).y;
    drawIsoBox(ctx,rox,roy+isoProject(0,7.5,0,0,0,sc).y*-1,0.5,7.5,0.4,sc,'rgba(209,213,219,.8)','rgba(156,163,175,.65)','rgba(175,180,190,.65)',s);
    // Top header
    const htL=isoProject(0,7.5,0,ox,oy,sc), htR=isoProject(4.5,7.5,0,ox,oy,sc);
    const hbL=isoProject(0,7,0,ox,oy,sc),   hbR=isoProject(4.5,7,0,ox,oy,sc);
    const hbRd=isoProject(4.5,7,0.4,ox,oy,sc), hbLd=isoProject(0,7,0.4,ox,oy,sc);
    const htRd=isoProject(4.5,7.5,0.4,ox,oy,sc), htLd=isoProject(0,7.5,0.4,ox,oy,sc);
    ctx.fillStyle='rgba(226,232,240,.85)'; ctx.strokeStyle=s; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(htL.x,htL.y); ctx.lineTo(htR.x,htR.y); ctx.lineTo(hbR.x,hbR.y); ctx.lineTo(hbL.x,hbL.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(htL.x,htL.y); ctx.lineTo(htLd.x,htLd.y); ctx.lineTo(hbLd.x,hbLd.y); ctx.lineTo(hbL.x,hbL.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    const bL=isoProject(0,0,0,ox,oy,sc),bR=isoProject(4.5,0,0,ox,oy,sc);
    const bT=isoProject(0,7.5,0,ox,oy,sc);
    drawDimArrow(ctx,bL.x-20,bL.y,bR.x-20,bR.y,'ANCHO VANO','#1e40af');
    drawDimArrow(ctx,bL.x-38,bL.y,bT.x-38,bT.y,'ALTO VANO','#7c3aed');
    ctx.font='bold 13px Inter,Arial,sans-serif'; ctx.fillStyle='#1e293b'; ctx.textAlign='center';
    ctx.fillText('MARCO DE PUERTA',cx-30,cy+130);
  };

  const tplIsla = (ctx, cx, cy) => {
    const sc=22, ox=cx-50, oy=cy+70, s='#334155';
    // Island body
    drawIsoBox(ctx,ox,oy,10,3.5,4,sc,'rgba(241,245,249,.9)','rgba(226,232,240,.75)','rgba(203,213,225,.75)',s);
    // Countertop
    drawIsoBox(ctx,ox,oy,10.2,0.3,4.2,sc,'rgba(255,255,255,.95)','rgba(241,245,249,.85)','rgba(241,245,249,.85)','#475569');
    // Door lines on front face
    const f0=isoProject(0,3.5,0,ox,oy,sc), f1=isoProject(10,3.5,0,ox,oy,sc);
    const f2=isoProject(10,0,0,ox,oy,sc),  f3=isoProject(0,0,0,ox,oy,sc);
    const fm=isoProject(5,3.5,0,ox,oy,sc), fmb=isoProject(5,0,0,ox,oy,sc);
    ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(fm.x,fm.y); ctx.lineTo(fmb.x,fmb.y); ctx.stroke();
    // Handles
    [[1.5,3.5],[6.5,3.5]].forEach(([xp]) => {
      const h1=isoProject(xp,1.8,0,ox,oy,sc), h2=isoProject(xp+1,1.8,0,ox,oy,sc);
      ctx.strokeStyle='#64748b'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(h1.x,h1.y); ctx.lineTo(h2.x,h2.y); ctx.stroke();
    });
    const bL=isoProject(0,0,0,ox,oy,sc),bR=isoProject(10,0,0,ox,oy,sc);
    const bD=isoProject(0,0,4,ox,oy,sc),bT=isoProject(0,3.5,0,ox,oy,sc);
    drawDimArrow(ctx,bL.x-20,bL.y,bR.x-20,bR.y,'LARGO','#1e40af');
    drawDimArrow(ctx,bL.x-10,bL.y,bD.x-10,bD.y,'ANCHO','#0f766e');
    drawDimArrow(ctx,bL.x-36,bL.y,bT.x-36,bT.y,'ALTO','#7c3aed');
    ctx.font='bold 13px Inter,Arial,sans-serif'; ctx.fillStyle='#1e293b'; ctx.textAlign='center';
    ctx.fillText('ISLA DE COCINA',cx-20,cy+130);
  };

  const tplFregadero = (ctx, cx, cy) => {
    const sc=28, ox=cx-25, oy=cy+50, s='#334155';
    // Cabinet body
    drawIsoBox(ctx,ox,oy,7,3.5,2.8,sc,'rgba(241,245,249,.85)','rgba(226,232,240,.7)','rgba(226,232,240,.7)',s);
    // Countertop
    drawIsoBox(ctx,ox,oy,7.2,0.25,3,sc,'rgba(248,250,252,.95)','rgba(241,245,249,.85)','rgba(241,245,249,.85)','#475569');
    // Sink basin
    const bsnTL=isoProject(1.5,0.25,0.6,ox,oy,sc), bsnTR=isoProject(5.5,0.25,0.6,ox,oy,sc);
    const bsnBL=isoProject(1.5,0.25,2.4,ox,oy,sc), bsnBR=isoProject(5.5,0.25,2.4,ox,oy,sc);
    ctx.fillStyle='rgba(186,230,253,.6)'; ctx.strokeStyle='#0369a1'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(bsnTL.x,bsnTL.y); ctx.lineTo(bsnTR.x,bsnTR.y); ctx.lineTo(bsnBR.x,bsnBR.y); ctx.lineTo(bsnBL.x,bsnBL.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Faucet
    const fBase=isoProject(3.5,0.25,1.5,ox,oy,sc);
    ctx.fillStyle='#94a3b8'; ctx.beginPath(); ctx.arc(fBase.x,fBase.y-18,4,0,2*Math.PI); ctx.fill();
    ctx.strokeStyle='#94a3b8'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(fBase.x,fBase.y); ctx.lineTo(fBase.x,fBase.y-18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fBase.x,fBase.y-18); ctx.lineTo(fBase.x+12,fBase.y-18); ctx.stroke();
    // Doors
    const dm=isoProject(3.5,3.5,0,ox,oy,sc), dmb=isoProject(3.5,0,0,ox,oy,sc);
    ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(dm.x,dm.y); ctx.lineTo(dmb.x,dmb.y); ctx.stroke();
    const bL=isoProject(0,0,0,ox,oy,sc),bR=isoProject(7,0,0,ox,oy,sc);
    const bD=isoProject(0,0,2.8,ox,oy,sc),bT=isoProject(0,3.5,0,ox,oy,sc);
    drawDimArrow(ctx,bL.x-20,bL.y,bR.x-20,bR.y,'ANCHO','#1e40af');
    drawDimArrow(ctx,bL.x-10,bL.y,bD.x-10,bD.y,'PROF','#0f766e');
    drawDimArrow(ctx,bL.x-36,bL.y,bT.x-36,bT.y,'ALTO','#7c3aed');
    ctx.font='bold 13px Inter,Arial,sans-serif'; ctx.fillStyle='#1e293b'; ctx.textAlign='center';
    ctx.fillText('MUEBLE FREGADERO',cx-25,cy+120);
  };

  const TEMPLATES = [
    { id:'cocina',    label:'Cocina',           icon:'🍳', desc:'Mueble alto+bajo+encimera', color:'#b45309', bg:'#fffbeb', draw:(ctx,cx,cy) => tplCocina(ctx,cx,cy) },
    { id:'closet',    label:'Clóset',            icon:'🚪', desc:'Nicho + puertas corredizas', color:'#0369a1', bg:'#eff6ff', draw:(ctx,cx,cy) => tplCloset(ctx,cx,cy) },
    { id:'p_solida',  label:'Puerta Sólida',     icon:'🪵', desc:'Vano + hoja + abatimiento',  color:'#7c3aed', bg:'#faf5ff', draw:(ctx,cx,cy) => tplPuerta(ctx,cx,cy,'solida') },
    { id:'p_tambor',  label:'Puerta Tambor',     icon:'🟩', desc:'Vano + hoja liviana',         color:'#065f46', bg:'#f0fdf4', draw:(ctx,cx,cy) => tplPuerta(ctx,cx,cy,'tambor') },
    { id:'cajonera',  label:'Cajonera',          icon:'🗄️', desc:'4 cajones con jaladores',     color:'#0891b2', bg:'#ecfeff', draw:(ctx,cx,cy) => tplCajonera(ctx,cx,cy) },
    { id:'marco',     label:'Marco Puerta',      icon:'🖼️', desc:'Marco + vano con cotas',      color:'#6b7280', bg:'#f9fafb', draw:(ctx,cx,cy) => tplMarco(ctx,cx,cy) },
    { id:'isla',      label:'Isla Cocina',       icon:'🏝️', desc:'Isla + encimera + puertas',   color:'#d97706', bg:'#fffbeb', draw:(ctx,cx,cy) => tplIsla(ctx,cx,cy) },
    { id:'fregadero', label:'Mueble Fregadero',  icon:'🚿', desc:'Fregadero + gabinete',        color:'#0284c7', bg:'#f0f9ff', draw:(ctx,cx,cy) => tplFregadero(ctx,cx,cy) },
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
    scheduleAutoSave();
  };

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

  const curStyle = textMode ? 'text' : erasing ? 'cell' : 'crosshair';

  return (
    <div ref={containerRef} style={{ position:'relative', background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', marginTop:'1rem', marginBottom:'1rem', overflow:'hidden' }}>

      {/* ── Canvas area — sin barras de scroll ── */}
      <div style={{ overflow:'hidden', width:'100%', position:'relative', height: isFullscreen ? '100vh' : '680px', background:'#ffffff' }}>
        <canvas ref={gridCanvasRef} width={1400} height={1050}
          style={{ position:'absolute', top:0, left:0, pointerEvents:'none', zIndex:1, width:'100%', height:'100%' }} />
        <canvas ref={canvasRef} width={1400} height={1050}
          style={{ position:'absolute', top:0, left:0, cursor:curStyle, touchAction:'none', zIndex:2, width:'100%', height:'100%' }}
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
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
      </div>

      {/* ── Floating toggle button (top-right corner) ── */}
      <button
        onClick={() => setToolbarOpen(o => !o)}
        title={toolbarOpen ? 'Cerrar herramientas' : 'Abrir herramientas'}
        style={{
          position:'absolute', top:'10px', right:'10px', zIndex:20,
          width:'38px', height:'38px', borderRadius:'50%',
          background: toolbarOpen ? '#1d4ed8' : 'rgba(255,255,255,0.92)',
          border:`2px solid ${toolbarOpen ? '#1d4ed8' : '#e2e8f0'}`,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'1.1rem', boxShadow:'0 2px 10px rgba(0,0,0,0.12)', backdropFilter:'blur(6px)',
          transition:'all 0.2s',
        }}
      >
        {toolbarOpen ? '✕' : '🎨'}
      </button>

      {/* ── Auto-save indicator ── */}
      <div style={{ position:'absolute', bottom:'8px', left:'10px', zIndex:20, fontSize:'0.65rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:'4px', pointerEvents:'none' }}>
        <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
        Guardado automático
      </div>

      {/* ── Collapsible floating toolbar panel ── */}
      {toolbarOpen && (
        <div style={{
          position:'absolute', top:'10px', right:'56px', zIndex:19,
          background:'rgba(255,255,255,0.97)', border:'1px solid #e2e8f0',
          borderRadius:'12px', padding:'0.8rem', boxShadow:'0 8px 32px rgba(0,0,0,0.14)',
          backdropFilter:'blur(8px)', width:'360px', maxHeight:'82vh', overflowY:'auto',
        }}>

          {/* Croquis templates */}
          <p style={{ fontSize:'0.68rem', fontWeight:'800', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 0.4rem' }}>📐 Plantillas Isométricas</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.35rem', marginBottom:'0.75rem' }}>
            {TEMPLATES.map(tpl => (
              <button key={tpl.id} title={tpl.desc}
                onClick={() => {
                  pushState();
                  const canvas = canvasRef.current;
                  const ctx = canvas.getContext('2d');
                  ctx.save(); tpl.draw(ctx, canvas.width/2, canvas.height/2 - 30); ctx.restore();
                  scheduleAutoSave();
                }}
                style={{ padding:'6px 8px', background:tpl.bg, border:`1.5px solid ${tpl.color}44`, borderRadius:'8px', cursor:'pointer', fontSize:'0.78rem', fontWeight:'700', color:tpl.color, display:'flex', alignItems:'center', gap:'6px', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=tpl.color; e.currentTarget.style.transform='scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=`${tpl.color}44`; e.currentTarget.style.transform=''; }}
              >
                <span style={{ fontSize:'1.1rem' }}>{tpl.icon}</span>
                <div><div>{tpl.label}</div><div style={{ fontSize:'0.6rem', fontWeight:'500', color:`${tpl.color}88` }}>{tpl.desc}</div></div>
              </button>
            ))}
          </div>

          {/* Drawing tools */}
          <p style={{ fontSize:'0.68rem', fontWeight:'800', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 0.4rem' }}>✏️ Herramientas</p>
          <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap', marginBottom:'0.5rem' }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width:'28px', height:'28px', padding:0, border:'2px solid #e2e8f0', borderRadius:'5px', cursor:'pointer', flexShrink:0 }} />
            <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
              style={{ padding:'3px 5px', borderRadius:'5px', border:'1px solid #e2e8f0', fontSize:'0.75rem', background:'white' }}>
              {[1,2,3,5,8,12].map(n => <option key={n} value={n}>{n}px</option>)}
            </select>
            <button onClick={() => setModeState('libre')}  style={btn(mode==='libre')}>✍️ Libre</button>
            <button onClick={() => setModeState('line')}   style={btn(mode==='line')}>📏 Recta</button>
            <button onClick={() => setModeState('arrow')}  style={btn(mode==='arrow')}>➡️ Flecha</button>
            <button onClick={() => setModeState('circle')} style={btn(mode==='circle','#7c3aed','#ede9fe')}>⭕</button>
            <button onClick={() => setModeState('rect')}   style={btn(mode==='rect','#0369a1','#e0f2fe')}>▭</button>
            <button onClick={() => setModeState('text')}   style={btn(mode==='text','#065f46','#d1fae5')}>🔤 Texto</button>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap', borderTop:'1px solid #f1f5f9', paddingTop:'0.5rem' }}>
            <button onClick={() => setGrid3D(!grid3D)} style={btn(grid3D,'#1d4ed8','#dbeafe')}>🧊 Guía Iso</button>
            <button onClick={() => setModeState('erase')} style={btn(mode==='erase','#b45309','#fef9c3')}>🩹 Borrar</button>
            <button onClick={undo} style={btn(false)}>↩️ Deshacer</button>
            <button onClick={toggleFullscreen} style={btn(false)}>{isFullscreen?'↘️':'⛶'}</button>
            <button onClick={() => {
              if (window.confirm('¿Limpiar el lienzo? Se borrará el guardado automático.')) { pushState(); initCanvas(); }
            }} style={{ ...btn(false), color:'#dc2626', borderColor:'#fca5a5', background:'#fff1f2' }}>🗑️ Limpiar</button>
          </div>
        </div>
      )}
    </div>
  );
});

export default Croquis3D;
