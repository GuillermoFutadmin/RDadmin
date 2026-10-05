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
  const multiView = (ctx, cx, cy, W, H, D, fillColors, details, isoFn) => {
    const PW=600, PH=450, G=30;
    const x0=cx-PW-G/2, y0=cy-PH-G/2;
    const ps = { planta:{x:x0,y:y0}, iso:{x:x0+PW+G,y:y0}, lateral:{x:x0,y:y0+PH+G}, frontal:{x:x0+PW+G,y:y0+PH+G} };
    viewPanel(ctx,ps.planta.x, ps.planta.y, PW,PH,'[S]  PLANTA  (Vista Superior)');
    viewPanel(ctx,ps.iso.x,    ps.iso.y,    PW,PH,'[*]  ISOMETRICO 3D');
    viewPanel(ctx,ps.lateral.x,ps.lateral.y,PW,PH,'[>]  ALZADO LATERAL');
    viewPanel(ctx,ps.frontal.x,ps.frontal.y,PW,PH,'[F]  ALZADO FRONTAL');
    const ia = p => ({x:p.x+30, y:p.y+17, w:PW-35, h:PH-40});
    const fa = ia(ps.frontal);
    const sc2 = Math.min(fa.w/W, fa.h/H) * 0.86;
    const fw=W*sc2, fh=H*sc2, fd=D*sc2;
    const [cF,cP,cL] = fillColors;
    { const a=ia(ps.frontal), vx=a.x+(a.w-fw)/2, vy=a.y+(a.h-fh)/2;
      ctx.fillStyle=cF; ctx.strokeStyle='#334155'; ctx.lineWidth=1.5; ctx.setLineDash([]);
      ctx.fillRect(vx,vy,fw,fh); ctx.strokeRect(vx,vy,fw,fh);
      if(details.frontal) details.frontal(ctx,vx,vy,fw,fh);
      dim2H(ctx,vx,vx+fw,vy+fh,'ANCHO','#1e40af'); dim2V(ctx,vx,vy,vy+fh,'ALTO','#7c3aed'); }
    { const a=ia(ps.planta), vx=a.x+(a.w-fw)/2, vy=a.y+(a.h-fd)/2;
      ctx.fillStyle=cP; ctx.strokeStyle='#334155'; ctx.lineWidth=1.5; ctx.setLineDash([]);
      ctx.fillRect(vx,vy,fw,fd); ctx.strokeRect(vx,vy,fw,fd);
      if(details.planta) details.planta(ctx,vx,vy,fw,fd);
      dim2H(ctx,vx,vx+fw,vy+fd,'ANCHO','#1e40af'); dim2V(ctx,vx,vy,vy+fd,'PROF','#0f766e'); }
    { const a=ia(ps.lateral), vx=a.x+(a.w-fd)/2, vy=a.y+(a.h-fh)/2;
      ctx.fillStyle=cL; ctx.strokeStyle='#334155'; ctx.lineWidth=1.5; ctx.setLineDash([]);
      ctx.fillRect(vx,vy,fd,fh); ctx.strokeRect(vx,vy,fd,fh);
      if(details.lateral) details.lateral(ctx,vx,vy,fd,fh);
      dim2H(ctx,vx,vx+fd,vy+fh,'PROF','#0f766e'); dim2V(ctx,vx,vy,vy+fh,'ALTO','#7c3aed'); }
    { const p=ps.iso; if(isoFn) isoFn(ctx, p.x+PW/2+8, p.y+PH*0.62, PW-20, PH-25); }
  };
  // ─── Template draw functions ────────────────────────────────────────────────
  const tplCocina = (ctx, cx, cy) => {
    multiView(ctx,cx,cy, 8,7,2.8,
      ['rgba(209,213,219,.8)','rgba(226,232,240,.6)','rgba(203,213,225,.6)'],
      { frontal:(ctx,x,y,w,h)=>{
          ctx.fillStyle='rgba(219,234,254,.8)'; ctx.strokeStyle='#334155'; ctx.lineWidth=1.2;
          ctx.fillRect(x,y,w,h*0.38); ctx.strokeRect(x,y,w,h*0.38);
          ctx.fillStyle='rgba(248,250,252,.95)'; ctx.fillRect(x-1,y+h*0.38,w+2,h*0.05); ctx.strokeStyle='#475569'; ctx.strokeRect(x-1,y+h*0.38,w+2,h*0.05);
          ctx.fillStyle='rgba(209,213,219,.8)'; ctx.strokeStyle='#334155';
          ctx.fillRect(x,y+h*0.43,w,h*0.57); ctx.strokeRect(x,y+h*0.43,w,h*0.57);
          ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w/2,y+h*0.38); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x+w/2,y+h*0.43); ctx.lineTo(x+w/2,y+h); ctx.stroke();
          [[0.25*w,h*0.22],[0.75*w,h*0.22],[0.25*w,h*0.72],[0.75*w,h*0.72]].forEach(([hx,hy])=>{
            ctx.fillStyle='#6b7280'; ctx.beginPath(); ctx.arc(x+hx,y+hy,2.5,0,2*Math.PI); ctx.fill();
          });
        },
        planta:(ctx,x,y,w,h)=>{ ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.7; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(x,y+h*0.35); ctx.lineTo(x+w,y+h*0.35); ctx.stroke(); ctx.setLineDash([]); },
        lateral:(ctx,x,y,w,h)=>{ ctx.fillStyle='rgba(248,250,252,.9)'; ctx.strokeStyle='#475569'; ctx.lineWidth=1; ctx.fillRect(x,y+h*0.43,w,h*0.05); ctx.strokeRect(x,y+h*0.43,w,h*0.05); },
      },
      (ctx,icx,icy,pw,ph)=>{
        const sc=Math.min(pw/13,ph/12), ox=icx-sc, oy=icy, s='#334155';
        drawIsoBox(ctx,ox,oy,8,3.5,2.8,sc,'rgba(209,213,219,.85)','rgba(156,163,175,.7)','rgba(175,180,190,.7)',s);
        drawIsoBox(ctx,ox,oy,8.2,0.3,2.95,sc,'rgba(248,250,252,.95)','rgba(226,232,240,.8)','rgba(226,232,240,.8)','#475569');
        const ux=icx-sc, uy=icy-sc*5;
        drawIsoBox(ctx,ux,uy,8,3,1.8,sc,'rgba(219,234,254,.85)','rgba(191,219,254,.7)','rgba(147,197,253,.6)',s);
      }
    );
  };
  const tplCloset = (ctx, cx, cy) => {
    multiView(ctx,cx,cy, 7,9,2.5,
      ['rgba(207,250,254,.7)','rgba(219,234,254,.5)','rgba(186,230,253,.5)'],
      { frontal:(ctx,x,y,w,h)=>{
          ctx.strokeStyle='#0369a1'; ctx.lineWidth=1.2; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w/2,y+h); ctx.stroke();
          ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.8; ctx.setLineDash([4,3]);
          ctx.beginPath(); ctx.moveTo(x,y+h*0.5); ctx.lineTo(x+w,y+h*0.5); ctx.stroke(); ctx.setLineDash([]);
          [[0.25*w,0.55*h],[0.75*w,0.55*h]].forEach(([hx,hy])=>{ ctx.fillStyle='#0369a1'; ctx.beginPath(); ctx.arc(x+hx,y+hy,3,0,2*Math.PI); ctx.fill(); });
        },
        planta:(ctx,x,y,w,h)=>{
          ctx.strokeStyle='#334155'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w/2,y+h); ctx.stroke();
          ctx.strokeStyle='#0369a1'; ctx.lineWidth=0.7; ctx.setLineDash([3,3]);
          ctx.beginPath(); ctx.arc(x,y+h,w/2,Math.PI*1.5,0); ctx.stroke();
          ctx.beginPath(); ctx.arc(x+w,y+h,w/2,Math.PI,Math.PI*1.5); ctx.stroke(); ctx.setLineDash([]);
        },
        lateral:(ctx,x,y,w,h)=>{ ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.8; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(x,y+h*0.5); ctx.lineTo(x+w,y+h*0.5); ctx.stroke(); ctx.setLineDash([]); },
      },
      (ctx,icx,icy,pw,ph)=>{
        const sc=Math.min(pw/11,ph/13), ox=icx-sc*2, oy=icy+sc*3, s='#334155';
        drawIsoBox(ctx,ox,oy,7,9,2.5,sc,'rgba(236,254,255,.85)','rgba(207,250,254,.7)','rgba(165,243,252,.6)',s);
        const shL=isoProject(.2,4.5,.2,ox,oy,sc),shR=isoProject(6.8,4.5,.2,ox,oy,sc),shRb=isoProject(6.8,4.5,2.3,ox,oy,sc),shLb=isoProject(.2,4.5,2.3,ox,oy,sc);
        ctx.fillStyle='rgba(186,230,253,.5)'; ctx.strokeStyle='#0ea5e9'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(shL.x,shL.y); ctx.lineTo(shR.x,shR.y); ctx.lineTo(shRb.x,shRb.y); ctx.lineTo(shLb.x,shLb.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        const fTL=isoProject(0,9,0,ox,oy,sc),fBL=isoProject(0,0,0,ox,oy,sc),fTM=isoProject(0,9,1.25,ox,oy,sc),fBM=isoProject(0,0,1.25,ox,oy,sc),fTR=isoProject(0,9,2.5,ox,oy,sc),fBR=isoProject(0,0,2.5,ox,oy,sc);
        ctx.fillStyle='rgba(224,242,254,.75)'; ctx.strokeStyle='#0369a1'; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.moveTo(fTL.x,fTL.y); ctx.lineTo(fTM.x,fTM.y); ctx.lineTo(fBM.x,fBM.y); ctx.lineTo(fBL.x,fBL.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='rgba(186,230,253,.75)';
        ctx.beginPath(); ctx.moveTo(fTM.x,fTM.y); ctx.lineTo(fTR.x,fTR.y); ctx.lineTo(fBR.x,fBR.y); ctx.lineTo(fBM.x,fBM.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    );
  };
  const tplPuerta = (ctx, cx, cy, tipo) => {
    multiView(ctx,cx,cy, 4,7,0.5,
      [tipo==='tambor'?'rgba(209,250,229,.75)':'rgba(254,243,199,.75)','rgba(226,232,240,.6)','rgba(203,213,225,.5)'],
      { frontal:(ctx,x,y,w,h)=>{
          const col=tipo==='tambor'?'#065f46':'#b45309';
          if(tipo==='tambor'){ ctx.strokeStyle=col; ctx.lineWidth=1; ctx.strokeRect(x+w*0.1,y+h*0.08,w*0.8,h*0.84); ctx.beginPath(); ctx.moveTo(x+w*0.1,y+h*0.5); ctx.lineTo(x+w*0.9,y+h*0.5); ctx.stroke(); }
          else { ctx.strokeStyle=col; ctx.lineWidth=0.8; ctx.setLineDash([3,3]); ctx.strokeRect(x+w*0.08,y+h*0.06,w*0.84,h*0.88); ctx.setLineDash([]); ctx.strokeStyle='#b45309'; ctx.lineWidth=0.8; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(x,y,w*0.84,0,Math.PI/2); ctx.stroke(); ctx.setLineDash([]); }
          ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x+w*0.82,y+h*0.5,4,0,2*Math.PI); ctx.fill();
        },
        planta:(ctx,x,y,w,h)=>{
          ctx.fillStyle='rgba(148,163,184,.4)'; ctx.strokeStyle='#334155'; ctx.lineWidth=1.2; ctx.fillRect(x,y,w*0.12,h); ctx.strokeRect(x,y,w*0.12,h);
          ctx.fillStyle=tipo==='tambor'?'rgba(209,250,229,.7)':'rgba(254,243,199,.7)'; ctx.fillRect(x+w*0.12,y,w*0.88,h*0.1); ctx.strokeRect(x+w*0.12,y,w*0.88,h*0.1);
          if(tipo==='solida'){ ctx.strokeStyle='#b45309'; ctx.lineWidth=0.8; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.arc(x+w*0.12,y,w*0.88,0,Math.PI/2); ctx.stroke(); ctx.setLineDash([]); }
        },
        lateral:(ctx,x,y,w,h)=>{ ctx.fillStyle=tipo==='tambor'?'rgba(209,250,229,.6)':'rgba(254,243,199,.6)'; ctx.strokeStyle='#334155'; ctx.lineWidth=1.2; ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h); },
      },
      (ctx,icx,icy,pw,ph)=>{
        const sc=Math.min(pw/6,ph/9), ox=icx-sc*2, oy=icy+sc*2, s='#334155';
        drawIsoBox(ctx,ox,oy,.6,7,.5,sc,'rgba(226,232,240,.7)','rgba(203,213,225,.6)','rgba(203,213,225,.6)',s);
        const dPts=[isoProject(.6,7,0,ox,oy,sc),isoProject(.6,0,0,ox,oy,sc),isoProject(4,0,0,ox,oy,sc),isoProject(4,7,0,ox,oy,sc)];
        ctx.fillStyle=tipo==='tambor'?'rgba(209,250,229,.85)':'rgba(254,243,199,.85)'; ctx.strokeStyle=tipo==='tambor'?'#065f46':'#b45309'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(dPts[0].x,dPts[0].y); dPts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
        const hPos=isoProject(3.5,3.5,0,ox,oy,sc); ctx.beginPath(); ctx.arc(hPos.x,hPos.y,6,0,2*Math.PI); ctx.fillStyle=tipo==='tambor'?'#065f46':'#78350f'; ctx.fill();
      }
    );
  };
  const tplCajonera = (ctx, cx, cy) => {
    multiView(ctx,cx,cy, 5,8,2.2,
      ['rgba(226,232,240,.8)','rgba(241,245,249,.6)','rgba(203,213,225,.6)'],
      { frontal:(ctx,x,y,w,h)=>{ [0,1,2,3].forEach(i=>{ const dy=h*0.04+i*(h*0.24), dh=h*0.2; ctx.fillStyle='rgba(248,250,252,.9)'; ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1; ctx.fillRect(x+w*0.04,y+dy,w*0.92,dh); ctx.strokeRect(x+w*0.04,y+dy,w*0.92,dh); ctx.fillStyle='#475569'; ctx.fillRect(x+w*0.3,y+dy+dh*0.42,w*0.4,3); }); },
        planta:(ctx,x,y,w,h)=>{ ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.7; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.stroke(); ctx.setLineDash([]); },
        lateral:(ctx,x,y,w,h)=>{ [0,1,2,3].forEach(i=>{ const dy=h*0.04+i*(h*0.24); ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(x,y+dy); ctx.lineTo(x+w,y+dy); ctx.stroke(); }); },
      },
      (ctx,icx,icy,pw,ph)=>{
        const sc=Math.min(pw/9,ph/12), ox=icx-sc*0.5, oy=icy+sc*2.5, s='#334155';
        drawIsoBox(ctx,ox,oy,5,8,2.2,sc,'rgba(226,232,240,.85)','rgba(203,213,225,.7)','rgba(203,213,225,.7)',s);
        [1.5,3,4.5,6].forEach(yOff=>{ const dTL=isoProject(0.15,yOff+1.2,0.1,ox,oy,sc),dTR=isoProject(4.85,yOff+1.2,0.1,ox,oy,sc),dBL=isoProject(0.15,yOff,0.1,ox,oy,sc),dBR=isoProject(4.85,yOff,0.1,ox,oy,sc); ctx.fillStyle='rgba(248,250,252,.9)'; ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(dTL.x,dTL.y); ctx.lineTo(dTR.x,dTR.y); ctx.lineTo(dBR.x,dBR.y); ctx.lineTo(dBL.x,dBL.y); ctx.closePath(); ctx.fill(); ctx.stroke(); const hL=isoProject(1.8,yOff+0.65,0.1,ox,oy,sc),hR=isoProject(3.2,yOff+0.65,0.1,ox,oy,sc); ctx.strokeStyle='#64748b'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(hL.x,hL.y); ctx.lineTo(hR.x,hR.y); ctx.stroke(); });
      }
    );
  };
  const tplMarco = (ctx, cx, cy) => {
    multiView(ctx,cx,cy, 4.5,7.5,0.4,
      ['rgba(241,245,249,.8)','rgba(226,232,240,.6)','rgba(209,213,219,.5)'],
      { frontal:(ctx,x,y,w,h)=>{ const fw=w*0.11; ctx.fillStyle='rgba(209,213,219,.9)'; ctx.strokeStyle='#334155'; ctx.lineWidth=1.2; ctx.fillRect(x,y,fw,h); ctx.strokeRect(x,y,fw,h); ctx.fillRect(x+w-fw,y,fw,h); ctx.strokeRect(x+w-fw,y,fw,h); ctx.fillRect(x,y,w,fw); ctx.strokeRect(x,y,w,fw); ctx.fillStyle='rgba(248,250,252,.4)'; ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=0.5; ctx.fillRect(x+fw,y+fw,w-fw*2,h-fw); ctx.strokeRect(x+fw,y+fw,w-fw*2,h-fw); },
        planta:(ctx,x,y,w,h)=>{ const fw2=w*0.11; ctx.fillStyle='rgba(209,213,219,.9)'; ctx.strokeStyle='#334155'; ctx.lineWidth=1.2; ctx.fillRect(x,y,fw2,h); ctx.strokeRect(x,y,fw2,h); ctx.fillRect(x+w-fw2,y,fw2,h); ctx.strokeRect(x+w-fw2,y,fw2,h); },
        lateral:(ctx,x,y,w,h)=>{ ctx.fillStyle='rgba(209,213,219,.9)'; ctx.strokeStyle='#334155'; ctx.lineWidth=1.2; ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h); },
      },
      (ctx,icx,icy,pw,ph)=>{
        const sc=Math.min(pw/7,ph/10), ox=icx-sc*2, oy=icy+sc*2, s='#334155';
        drawIsoBox(ctx,ox,oy,0.5,7.5,0.4,sc,'rgba(209,213,219,.8)','rgba(156,163,175,.65)','rgba(175,180,190,.65)',s);
        const rx=isoProject(4,0,0,ox,oy,sc),orig=isoProject(0,0,0,ox,oy,sc),rox=ox+(rx.x-orig.x),roy=oy+(rx.y-orig.y);
        drawIsoBox(ctx,rox,roy,0.5,7.5,0.4,sc,'rgba(209,213,219,.8)','rgba(156,163,175,.65)','rgba(175,180,190,.65)',s);
        const htL=isoProject(0,7.5,0,ox,oy,sc),htR=isoProject(4.5,7.5,0,ox,oy,sc),hbL=isoProject(0,7,0,ox,oy,sc),hbR=isoProject(4.5,7,0,ox,oy,sc),htLd=isoProject(0,7.5,0.4,ox,oy,sc),hbLd=isoProject(0,7,0.4,ox,oy,sc);
        ctx.fillStyle='rgba(226,232,240,.85)'; ctx.strokeStyle=s; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.moveTo(htL.x,htL.y); ctx.lineTo(htR.x,htR.y); ctx.lineTo(hbR.x,hbR.y); ctx.lineTo(hbL.x,hbL.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(htL.x,htL.y); ctx.lineTo(htLd.x,htLd.y); ctx.lineTo(hbLd.x,hbLd.y); ctx.lineTo(hbL.x,hbL.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    );
  };
  const tplIsla = (ctx, cx, cy) => {
    multiView(ctx,cx,cy, 10,3.5,4,
      ['rgba(241,245,249,.8)','rgba(226,232,240,.6)','rgba(203,213,225,.6)'],
      { frontal:(ctx,x,y,w,h)=>{ ctx.fillStyle='rgba(248,250,252,.95)'; ctx.strokeStyle='#475569'; ctx.lineWidth=1; ctx.fillRect(x-1,y,w+2,h*0.08); ctx.strokeRect(x-1,y,w+2,h*0.08); ctx.strokeStyle='#334155'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x+w/2,y+h*0.08); ctx.lineTo(x+w/2,y+h); ctx.stroke(); [[0.25*w,0.55*h],[0.75*w,0.55*h]].forEach(([hx,hy])=>{ ctx.fillStyle='#64748b'; ctx.fillRect(x+hx-w*0.06,y+hy,w*0.12,3); }); },
        planta:(ctx,x,y,w,h)=>{ ctx.fillStyle='rgba(248,250,252,.95)'; ctx.strokeStyle='#475569'; ctx.lineWidth=1; ctx.fillRect(x-2,y-2,w+4,h+4); ctx.strokeRect(x-2,y-2,w+4,h+4); ctx.fillStyle='rgba(241,245,249,.8)'; ctx.strokeStyle='#334155'; ctx.lineWidth=1.2; ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h); ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w/2,y+h); ctx.stroke(); },
        lateral:(ctx,x,y,w,h)=>{ ctx.fillStyle='rgba(248,250,252,.95)'; ctx.strokeStyle='#475569'; ctx.lineWidth=1; ctx.fillRect(x-1,y,w+2,h*0.08); ctx.strokeRect(x-1,y,w+2,h*0.08); },
      },
      (ctx,icx,icy,pw,ph)=>{ const sc=Math.min(pw/16,ph/7), ox=icx-sc*3, oy=icy+sc*0.5, s='#334155'; drawIsoBox(ctx,ox,oy,10,3.5,4,sc,'rgba(241,245,249,.9)','rgba(226,232,240,.75)','rgba(203,213,225,.75)',s); drawIsoBox(ctx,ox,oy,10.2,0.3,4.2,sc,'rgba(255,255,255,.95)','rgba(241,245,249,.85)','rgba(241,245,249,.85)','#475569'); }
    );
  };
  const tplFregadero = (ctx, cx, cy) => {
    multiView(ctx,cx,cy, 7,3.5,2.8,
      ['rgba(241,245,249,.8)','rgba(226,232,240,.6)','rgba(203,213,225,.6)'],
      { frontal:(ctx,x,y,w,h)=>{ ctx.fillStyle='rgba(248,250,252,.95)'; ctx.strokeStyle='#475569'; ctx.lineWidth=1; ctx.fillRect(x-1,y,w+2,h*0.08); ctx.strokeRect(x-1,y,w+2,h*0.08); ctx.strokeStyle='#0369a1'; ctx.lineWidth=1; ctx.setLineDash([3,3]); ctx.strokeRect(x+w*0.2,y+h*0.08,w*0.6,h*0.42); ctx.setLineDash([]); ctx.fillStyle='#94a3b8'; ctx.fillRect(x+w*0.47,y+h*0.02,4,h*0.1); ctx.beginPath(); ctx.arc(x+w*0.5+10,y+h*0.04,4,Math.PI*1.5,Math.PI*0.5); ctx.fill(); ctx.strokeStyle='#334155'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x+w/2,y+h*0.5); ctx.lineTo(x+w/2,y+h); ctx.stroke(); },
        planta:(ctx,x,y,w,h)=>{ ctx.fillStyle='rgba(186,230,253,.6)'; ctx.strokeStyle='#0369a1'; ctx.lineWidth=1.2; ctx.fillRect(x+w*0.2,y+h*0.15,w*0.6,h*0.7); ctx.strokeRect(x+w*0.2,y+h*0.15,w*0.6,h*0.7); ctx.fillStyle='#0369a1'; ctx.beginPath(); ctx.arc(x+w*0.5,y+h*0.5,3,0,2*Math.PI); ctx.fill(); },
        lateral:(ctx,x,y,w,h)=>{ ctx.fillStyle='rgba(248,250,252,.95)'; ctx.strokeStyle='#475569'; ctx.lineWidth=1; ctx.fillRect(x,y,w,h*0.08); ctx.strokeRect(x,y,w,h*0.08); ctx.strokeStyle='#0369a1'; ctx.lineWidth=0.8; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(x+w*0.2,y); ctx.lineTo(x+w*0.2,y+h*0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+w*0.8,y); ctx.lineTo(x+w*0.8,y+h*0.5); ctx.stroke(); ctx.setLineDash([]); },
      },
      (ctx,icx,icy,pw,ph)=>{ const sc=Math.min(pw/12,ph/6), ox=icx-sc*2, oy=icy, s='#334155'; drawIsoBox(ctx,ox,oy,7,3.5,2.8,sc,'rgba(241,245,249,.85)','rgba(226,232,240,.7)','rgba(226,232,240,.7)',s); drawIsoBox(ctx,ox,oy,7.2,0.25,3,sc,'rgba(248,250,252,.95)','rgba(241,245,249,.85)','rgba(241,245,249,.85)','#475569'); const bsnTL=isoProject(1.5,0.25,0.6,ox,oy,sc),bsnTR=isoProject(5.5,0.25,0.6,ox,oy,sc),bsnBL=isoProject(1.5,0.25,2.4,ox,oy,sc),bsnBR=isoProject(5.5,0.25,2.4,ox,oy,sc); ctx.fillStyle='rgba(186,230,253,.6)'; ctx.strokeStyle='#0369a1'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(bsnTL.x,bsnTL.y); ctx.lineTo(bsnTR.x,bsnTR.y); ctx.lineTo(bsnBR.x,bsnBR.y); ctx.lineTo(bsnBL.x,bsnBL.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    );
  };
  const TEMPLATES = [
    { id:'cocina',    label:'Cocina',         icon:'[K]', desc:'Mueble alto+bajo+encimera', color:'#b45309', bg:'#fffbeb', draw:(ctx,cx,cy)=>tplCocina(ctx,cx,cy) },
    { id:'closet',    label:'Closet',          icon:'[C]', desc:'Nicho + puertas',           color:'#0369a1', bg:'#eff6ff', draw:(ctx,cx,cy)=>tplCloset(ctx,cx,cy) },
    { id:'p_solida',  label:'Pta.Solida',      icon:'[P]', desc:'Vano + hoja + abatimiento', color:'#7c3aed', bg:'#faf5ff', draw:(ctx,cx,cy)=>tplPuerta(ctx,cx,cy,'solida') },
    { id:'p_tambor',  label:'Pta.Tambor',      icon:'[T]', desc:'Vano + hoja liviana',       color:'#065f46', bg:'#f0fdf4', draw:(ctx,cx,cy)=>tplPuerta(ctx,cx,cy,'tambor') },
    { id:'cajonera',  label:'Cajonera',        icon:'[D]', desc:'4 cajones + jaladores',     color:'#0891b2', bg:'#ecfeff', draw:(ctx,cx,cy)=>tplCajonera(ctx,cx,cy) },
    { id:'marco',     label:'Marco',           icon:'[M]', desc:'Marco + vano + cotas',      color:'#6b7280', bg:'#f9fafb', draw:(ctx,cx,cy)=>tplMarco(ctx,cx,cy) },
    { id:'isla',      label:'Isla Cocina',     icon:'[I]', desc:'Isla + encimera',            color:'#d97706', bg:'#fffbeb', draw:(ctx,cx,cy)=>tplIsla(ctx,cx,cy) },
    { id:'fregadero', label:'Fregadero',       icon:'[F]', desc:'Tarja + gabinete',          color:'#0284c7', bg:'#f0f9ff', draw:(ctx,cx,cy)=>tplFregadero(ctx,cx,cy) },
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
    if (!measureMode) scheduleAutoSave();
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
        {/* ── Measure popup ── */}
        {measurePopup.visible && (() => {
          const rect = containerRef.current?.getBoundingClientRect() || { left:0, top:0 };
          const popX = measurePopup.screenX - rect.left;
          const popY = measurePopup.screenY - rect.top;
          return (
            <div style={{ position:'absolute', left:`${popX}px`, top:`${popY}px`, transform:'translate(-50%,-110%)',
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
