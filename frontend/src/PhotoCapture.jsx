import React, { useRef, useState, useEffect } from 'react';

export function PhotoCapture({ onSave, onCancel, title }) {
  const [photo, setPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setHasCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraActive(false);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const stampImage = (imgSrc, callback) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const now = new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
      const stampText = `FOTO CON INE - FECHA: ${now}`;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, height - 70, width, 70);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 26px Arial';
      ctx.fillText(stampText, 20, height - 25);
      
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = imgSrc;
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    stopCamera();
    stampImage(dataUrl, setPhoto);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      stopCamera();
      stampImage(event.target.result, setPhoto);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setPhoto(null);
    startCamera();
  };

  return (
    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', maxWidth: '600px', margin: '0 auto' }}>
      {title && <h4 style={{ margin: '0 0 10px 0', color: '#334155', textAlign: 'center' }}>{title}</h4>}
      
      {!photo ? (
        <div style={{ textAlign: 'center' }}>
          {cameraActive && (
            <div style={{ marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} playsInline muted />
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {cameraActive && (
              <button onClick={takePhoto} style={{ padding: '10px 20px', background: '#10b981', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                📸 Capturar Foto
              </button>
            )}
            
            <label style={{ cursor: 'pointer', display: 'inline-block', padding: '10px 20px', background: '#0284c7', color: 'white', borderRadius: '6px', fontWeight: 'bold' }}>
              📁 {hasCamera ? 'Subir Archivo / Galería' : 'Abrir Cámara / Archivo'}
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>
          
          {!hasCamera && (
            <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b' }}>
              No se detectó cámara web. Usa el botón azul para abrir la cámara de tu dispositivo o elegir una foto.
            </p>
          )}
        </div>
      ) : (
        <div>
          <img src={photo} alt="Evidencia" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'block', margin: '0 auto' }} />
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={retake} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Tomar de nuevo</button>
            <button onClick={() => onSave(photo)} style={{ padding: '8px 16px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Evidencia</button>
          </div>
        </div>
      )}
      
      {onCancel && !photo && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button onClick={() => { stopCamera(); onCancel(); }} style={{ padding: '6px 12px', background: '#cbd5e1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}
    </div>
  );
}
