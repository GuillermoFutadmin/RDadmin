import React, { useState } from 'react';
import { LOGO_LEATHER_B64 } from './logoLeatherB64.js';
import { SignaturePad } from './SignaturePad';
import { PhotoCapture } from './PhotoCapture';

const formatCurrency = (val) => {
  const num = Number(val);
  return isNaN(num) ? '$0.00' : '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getDateStr = () => {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const d = new Date();
  return `${d.getDate()} de ${months[d.getMonth()]} del ${d.getFullYear()}`;
};

export function ContratoPDFView({ prospect, onBack, onSaveStatus }) {
  let estData = {};
  if (prospect.estimation_data) {
    try { estData = JSON.parse(prospect.estimation_data); } catch(e) {}
  }
  const estimatedTotal = estData.totalWithMargin || 0;

  const [description, setDescription] = useState(
    `Se llevará a cabo la fabricación e instalación de ${prospect.project_type ? prospect.project_type.toLowerCase() : 'muebles'} en material de MDF con un acabado en poliuretano.\n\n• Incluye la visita a domicilio, donde se tomarán las medidas correspondientes.\n• Extracción de puertas previamente fabricadas.\n• Instalación de puertas y frentes nuevos.`
  );
  const [diasEntrega, setDiasEntrega] = useState('15');
  const [anticipoPct, setAnticipoPct] = useState('60');
  const [saving, setSaving] = useState(false);
  
  const [repSig, setRepSig] = useState(null);
  const [clientSig, setClientSig] = useState(null);
  const [repPhoto, setRepPhoto] = useState(null);
  const [clientPhoto, setClientPhoto] = useState(null);
  const [showCapture, setShowCapture] = useState(null);

  const renderSignatureBox = (title, sig, photo, type) => (
    <div style={{ textAlign: 'center', width: '44%', position: 'relative' }}>
      <div style={{ position: 'relative', height: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
        {sig ? (
          <img src={sig} alt={`Firma ${type}`} style={{ maxHeight: '70px', objectFit: 'contain', zIndex: 1 }} />
        ) : (
          <button onClick={() => setShowCapture(`${type}Sig`)} style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>
            ✏️ Firmar Digitalmente
          </button>
        )}
      </div>
      <div style={{ borderTop: '1px solid #000', marginBottom: '6px' }}></div>
      <strong>{title}</strong>
      <div style={{ marginTop: '10px' }}>
        {photo ? (
           <img src={photo} alt={`INE ${type}`} style={{ maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }} />
        ) : (
          <button onClick={() => setShowCapture(`${type}Photo`)} style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#cbd5e1', color: '#1e293b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            📷 Agregar Foto INE
          </button>
        )}
      </div>
    </div>
  );

  const obsItems = [
    'Fecha de entrega a partir de anticipo.',
    `Para el inicio del proyecto se requiere un anticipo del ${anticipoPct}%`,
    'Un año de garantía por defectos de fabricación, sujeta a previa revisión.',
    'No se aceptan cambios una vez iniciado el proceso de fabricación, todo cambio tendrá un precio extra.',
    'No incluye: jaladeras y cubierta, instalación de aparatos eléctricos, trabajos eléctricos en mueblería, fontanería u otros servicios similares, nuestros servicios se limitan únicamente a la fabricación e instalación de muebles de carpintería.',
    'No hay devolución del anticipo en caso de cancelación.',
    'Cotización válida por 10 días naturales.'
  ];

  const handleGeneratePDF = async () => {
    setSaving(true);
    try {
      await onSaveStatus();

      const element = document.getElementById('contrato-doc-export');
      const filename = `Contrato_${prospect.public_id || prospect.id}_${prospect.name || 'Cliente'}.pdf`;
      const folio = prospect.public_id || prospect.id;
      const clientName = prospect.name || '';
      
      const opt = {
        margin:       [0.55, 0.4, 0.5, 0.4], 
        filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      // Ensure the element is visible for html2canvas
      element.style.display = 'block';

      window.html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageW = pdf.internal.pageSize.getWidth();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          if (i > 1) {
            // -- Header line --
            pdf.setDrawColor(249, 115, 22);
            pdf.setLineWidth(0.018);
            pdf.line(0.4, 0.45, pageW - 0.4, 0.45);
            
            // -- Company name --
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(249, 115, 22);
            pdf.text('RD Carpintería', 0.4, 0.33);
            
            // -- Info --
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.text(`rdcarpinteria.com - 664 217 5633`, pageW / 2, 0.33, { align: 'center' });
            
            // -- Contract info --
            pdf.text(`Contrato — ${clientName}`, pageW - 0.4, 0.33, { align: 'right' });
          }

          // Footer info
          pdf.setDrawColor(226, 232, 240); // #e2e8f0
          pdf.setLineWidth(0.015);
          pdf.line(0.4, pdf.internal.pageSize.getHeight() - 0.5, pageW - 0.4, pdf.internal.pageSize.getHeight() - 0.5);
          
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139);
          pdf.text(getDateStr(), 0.4, pdf.internal.pageSize.getHeight() - 0.35);
          pdf.text(`Contrato — ${clientName}`, pageW / 2, pdf.internal.pageSize.getHeight() - 0.35, { align: 'center' });
          pdf.text(`Hoja ${i} / ${totalPages}`, pageW - 0.4, pdf.internal.pageSize.getHeight() - 0.35, { align: 'right' });
        }
      }).save().then(() => {
        element.style.display = 'none';
        setSaving(false);
      });

    } catch (e) {
      console.error(e);
      alert('Error generando el contrato: ' + e.message);
      setSaving(false);
    }
  };

  if (showCapture === 'repSig') return <div style={{padding:'20px'}}><SignaturePad title="Firma de Rogelio / RD Carpintería" onSave={img => { setRepSig(img); setShowCapture(null); }} onCancel={() => setShowCapture(null)} /></div>;
  if (showCapture === 'clientSig') return <div style={{padding:'20px'}}><SignaturePad title={`Firma de Cliente: ${prospect.name}`} onSave={img => { setClientSig(img); setShowCapture(null); }} onCancel={() => setShowCapture(null)} /></div>;
  if (showCapture === 'repPhoto') return <div style={{padding:'20px'}}><PhotoCapture title="Foto INE de Rogelio" onSave={img => { setRepPhoto(img); setShowCapture(null); }} onCancel={() => setShowCapture(null)} /></div>;
  if (showCapture === 'clientPhoto') return <div style={{padding:'20px'}}><PhotoCapture title={`Foto INE de Cliente: ${prospect.name}`} onSave={img => { setClientPhoto(img); setShowCapture(null); }} onCancel={() => setShowCapture(null)} /></div>;

  return (
    <div style={{ padding: '1rem', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '860px', margin: '0 auto 1.2rem', background: 'white', borderRadius: '12px', padding: '0.8rem 1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <button onClick={onBack} style={{ padding: '0.55rem 1.1rem', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
          ⬅ Regresar
        </button>
        <span style={{ fontWeight: '800', fontSize: '1rem', color: '#1e293b' }}>📄 Vista Previa del Contrato</span>
        <button
          onClick={handleGeneratePDF}
          disabled={saving}
          style={{ padding: '0.55rem 1.4rem', background: saving ? '#94a3b8' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {saving ? '⏳ Generando PDF...' : '💾 Guardar y Descargar PDF'}
        </button>
      </div>

      {/* Preview View (Editable) */}
      <div style={{ background: 'white', padding: '40px 48px', maxWidth: '860px', margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', borderRadius: '6px', color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '10.5pt' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #b45309', paddingBottom: '12px', marginBottom: '20px' }}>
          <div style={{ width: '160px' }}>
             <img src="/logo-rd-membrete.png" alt="RD Carpintería" style={{ width: '140px', objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.82rem', lineHeight: '1.5' }}>
            Tijuana, Baja California {getDateStr()}<br/>
            Vicente Guerrero #5341, Pedregal de Santa Julia 3ra Sección<br/>
            <strong>Teléfono:</strong> 664 217 5633<br/>
            <strong>Correo electrónico:</strong> <a href="mailto:rdcarpinteriatj@gmail.com" style={{color:'#2563eb'}}>rdcarpinteriatj@gmail.com</a>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', lineHeight: '1.5' }}>CONTRATO DE PRESTACIÓN DE SERVICIOS<br/>DE RD CARPINTERÍA</h2>
        </div>

        {/* Intro */}
        <p style={{ fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '12px', textAlign: 'justify' }}>
          CONTRATO DE PRESTACIÓN DE SERVICIOS que celebran, por una parte el SR. <strong>ROGELIO DIAZ FLORES</strong>, como "EL PRESTADOR DEL SERVICIO REPRESENTANDO A <strong>RD CARPINTERIA</strong>" y, POR LA OTRA "LA SR(A). <strong>{prospect.name ? prospect.name.toUpperCase() : 'CLIENTE'}</strong>" como "EL CLIENTE", respecto del trabajo que se compromete a elaborar "EL PRESTADOR DEL SERVICIO" y que quedarán obligados, de acuerdo con las siguientes declaraciones y clausulas.
        </p>
        <p style={{ fontSize: '0.9rem', marginBottom: '14px' }}>A continuación se establecen las especificaciones, características y condiciones correspondientes al proyecto contratado:</p>

        {/* Project */}
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
          FABRICACIÓN E INSTALACIÓN DE {(prospect.project_type || 'PROYECTO').toUpperCase()}
        </h3>
        <div style={{ marginBottom: '14px' }}>
          <strong>Descripción:</strong>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ width: '100%', minHeight: '110px', padding: '0.5rem', marginTop: '6px', fontFamily: 'inherit', fontSize: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
          />
        </div>

        {/* Totals */}
        <div style={{ fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '14px' }}>
          <strong>Total: {formatCurrency(estimatedTotal)} MXN (+IVA del 8% en caso de requerir factura).</strong><br/>
          Para el inicio del proyecto se requiere un anticipo del{' '}
          <input value={anticipoPct} onChange={e => setAnticipoPct(e.target.value)}
            style={{ width: '44px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '1px 2px' }} />
          %, el otro {100 - Number(anticipoPct)}% restante se paga el día de la entrega/instalación.<br/>
          <strong>Tiempo de entrega:</strong>{' '}
          <input value={diasEntrega} onChange={e => setDiasEntrega(e.target.value)}
            style={{ width: '44px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '1px 2px' }} />{' '}
          días hábiles.
        </div>

        <div style={{ fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '28px' }}>
          Los pagos correspondientes serán efectuados a la cuenta bancaria previamente señalada<br/>
          <strong>Datos para realizar el pago:</strong><br/>
          Cuenta bancaria: 012 028 00484694082 4<br/>
          Titular: Silvia Denis Vergara Morales
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', marginBottom: '28px' }}>
          {renderSignatureBox("Firma: Rogelio Diaz Flores", repSig, repPhoto, 'rep')}
          {renderSignatureBox(`Firma de cliente: ${prospect.name}`, clientSig, clientPhoto, 'client')}
        </div>

        <div style={{ fontSize: '0.87rem', lineHeight: '1.6' }}>
          <strong>Observaciones:</strong>
          <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
            {obsItems.map((obs, i) => <li key={i}>{obs}</li>)}
          </ul>
        </div>

        {/* ── Official footer ── */}
        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <img src={LOGO_LEATHER_B64} alt="RD Carpintería" style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '50%' }} />
          <p style={{ margin: '10px 0 4px', fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b' }}>Documento oficial de RD Carpintería</p>
          <a href="https://rdcarpinteria.com/" style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none' }}>https://rdcarpinteria.com/</a>
        </div>
      </div>

      {/* Hidden container exclusively for PDF export to render pure HTML blocks */}
      <div id="contrato-doc-export" style={{ display: 'none', background: 'white', color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #b45309', paddingBottom: '12px', marginBottom: '20px' }}>
          <div style={{ width: '160px' }}>
             <img src="/logo-rd-membrete.png" alt="RD Carpintería" style={{ width: '140px', objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', lineHeight: '1.5' }}>
            Tijuana, Baja California {getDateStr()}<br/>
            Vicente Guerrero #5341, Pedregal de Santa Julia 3ra Sección<br/>
            <strong>Teléfono:</strong> 664 217 5633<br/>
            <strong>Correo electrónico:</strong> <span style={{color:'#2563eb'}}>rdcarpinteriatj@gmail.com</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.5' }}>CONTRATO DE PRESTACIÓN DE SERVICIOS<br/>DE RD CARPINTERÍA</h2>
        </div>

        <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '12px', textAlign: 'justify' }}>
          CONTRATO DE PRESTACIÓN DE SERVICIOS que celebran, por una parte el SR. <strong>ROGELIO DIAZ FLORES</strong>, como "EL PRESTADOR DEL SERVICIO REPRESENTANDO A <strong>RD CARPINTERIA</strong>" y, POR LA OTRA "LA SR(A). <strong>{prospect.name ? prospect.name.toUpperCase() : 'CLIENTE'}</strong>" como "EL CLIENTE", respecto del trabajo que se compromete a elaborar "EL PRESTADOR DEL SERVICIO" y que quedarán obligados, de acuerdo con las siguientes declaraciones y clausulas.
        </p>
        <p style={{ fontSize: '13px', marginBottom: '16px' }}>A continuación se establecen las especificaciones, características y condiciones correspondientes al proyecto contratado:</p>

        <div style={{ pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
            FABRICACIÓN E INSTALACIÓN DE {(prospect.project_type || 'PROYECTO').toUpperCase()}
          </h3>
          <div style={{ marginBottom: '16px', fontSize: '13px' }}>
            <strong>Descripción:</strong><br/>
            <div dangerouslySetInnerHTML={{ __html: description.split('\n').map(l => l.trim() ? `<p style="margin:0 0 4px">${l}</p>` : '<br/>').join('') }}></div>
          </div>
        </div>

        <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px', pageBreakInside: 'avoid' }}>
          <strong>Total: {formatCurrency(estimatedTotal)} MXN (+IVA del 8% en caso de requerir factura).</strong><br/>
          Para el inicio del proyecto se requiere un anticipo del <strong>{anticipoPct}%</strong>, el otro {100 - Number(anticipoPct)}% restante se paga el día de la entrega/instalación.<br/>
          <strong>Tiempo de entrega:</strong> {diasEntrega} días hábiles.
        </div>

        <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '24px', pageBreakInside: 'avoid' }}>
          Los pagos correspondientes serán efectuados a la cuenta bancaria previamente señalada<br/>
          <strong>Datos para realizar el pago:</strong><br/>
          Cuenta bancaria: 012 028 00484694082 4<br/>
          Titular: Silvia Denis Vergara Morales
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center', width: '42%' }}>
            <div style={{ position: 'relative', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
              {repSig && <img src={repSig} alt="Firma" style={{ maxHeight: '60px', objectFit: 'contain' }} />}
            </div>
            <div style={{ borderTop: '1px solid #000', marginBottom: '6px' }}></div>
            <strong>Firma: Rogelio Diaz Flores</strong>
          </div>
          <div style={{ textAlign: 'center', width: '42%' }}>
            <div style={{ position: 'relative', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
              {clientSig && <img src={clientSig} alt="Firma Cliente" style={{ maxHeight: '60px', objectFit: 'contain' }} />}
            </div>
            <div style={{ borderTop: '1px solid #000', marginBottom: '6px' }}></div>
            <strong>Firma de cliente: {prospect.name}</strong>
          </div>
        </div>

        <div style={{ fontSize: '13px', lineHeight: '1.5', pageBreakInside: 'avoid' }}>
          <strong>Observaciones:</strong>
          <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
            {obsItems.map((obs, i) => <li key={i} style={{marginBottom:'4px'}}>{obs}</li>)}
          </ul>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', pageBreakInside: 'avoid' }}>
          <img src={LOGO_LEATHER_B64} alt="RD Carpintería" style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '50%' }} />
          <p style={{ margin: '10px 0 4px', fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>Documento oficial de RD Carpintería</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#2563eb' }}>https://rdcarpinteria.com/</p>
        </div>

        {/* Anexo de Evidencias (Only included if photos are captured) */}
        {(repPhoto || clientPhoto) && (
          <div style={{ pageBreakBefore: 'always', paddingTop: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.5' }}>ANEXO I: EVIDENCIAS DE IDENTIFICACIÓN</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
              {repPhoto && (
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Evidencia de: Rogelio Diaz Flores (RD Carpintería)</h3>
                  <img src={repPhoto} alt="Evidencia Rogelio" style={{ maxWidth: '600px', maxHeight: '400px', border: '1px solid #cbd5e1' }} />
                </div>
              )}
              {clientPhoto && (
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Evidencia de Cliente: {prospect.name}</h3>
                  <img src={clientPhoto} alt="Evidencia Cliente" style={{ maxWidth: '600px', maxHeight: '400px', border: '1px solid #cbd5e1' }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
