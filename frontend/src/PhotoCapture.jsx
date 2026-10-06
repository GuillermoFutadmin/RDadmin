import React, { useRef, useState } from 'react';

export function PhotoCapture({ onSave, onCancel, title }) {
  const [photo, setPhoto] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to draw image and stamp
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        
        // Resize if too big
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Draw Timestamp stamp
        const now = new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
        const stampText = `FECHA: ${now}`;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, height - 50, width, 50);
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(stampText, 20, height - 18);
        
        setPhoto(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
      {title && <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>{title}</h4>}
      
      {!photo ? (
        <div style={{ padding: '20px', border: '2px dashed #94a3b8', background: '#fff', borderRadius: '4px', textAlign: 'center' }}>
          <label style={{ cursor: 'pointer', display: 'inline-block', padding: '10px 20px', background: '#0284c7', color: 'white', borderRadius: '6px', fontWeight: 'bold' }}>
            📷 Tomar Foto / Elegir Archivo
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      ) : (
        <div>
          <img src={photo} alt="Evidencia" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <button onClick={() => setPhoto(null)} style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Tomar de nuevo</button>
            <button onClick={() => onSave(photo)} style={{ padding: '6px 12px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Foto</button>
          </div>
        </div>
      )}
      
      {onCancel && !photo && (
        <div style={{ marginTop: '12px' }}>
          <button onClick={onCancel} style={{ padding: '6px 12px', background: '#cbd5e1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}
    </div>
  );
}
