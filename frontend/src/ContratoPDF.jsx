import React, { useState } from 'react';

const formatCurrency = (val) => {
  const num = Number(val);
  return isNaN(num) ? '$0.00' : '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getDateStr = () => {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const d = new Date();
  return `${d.getDate()} de ${months[d.getMonth()]} del ${d.getFullYear()}`;
};

// Encode img to base64 for embedding in HTML string
async function toBase64(url) {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

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

      // Load logo as base64
      const logoBase64 = await toBase64('/logo-leather.png');

      const descLines = description
        .split('\n')
        .map(l => l.trim() ? `<p style="margin:0 0 4px">${l}</p>` : '<br/>')
        .join('');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Contrato RD Carpintería - ${prospect.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #000; background: white; }

    /* ── Running header on ALL pages after page 1 ── */
    @page {
      size: A4;
      margin: 18mm 15mm 22mm 15mm;
    }

    /* Header shown only on page 2+ via @page top-center */
    .page-header {
      display: none; /* hidden in normal flow */
    }

    @media print {
      .page-header {
        display: flex;
        position: running(header);
        width: 100%;
        border-bottom: 1px solid #b45309;
        padding-bottom: 6px;
        margin-bottom: 10px;
        align-items: center;
        justify-content: space-between;
        font-size: 8pt;
        color: #555;
      }
      @page :first {
        @top-center { content: none; }
      }
      @page :left {
        @top-center { content: element(header); }
      }
      @page :right {
        @top-center { content: element(header); }
      }
      @page {
        @bottom-right {
          content: "Página " counter(page) " de " counter(pages);
          font-size: 8pt;
          color: #666;
        }
      }
    }

    .card { page-break-inside: avoid; break-inside: avoid; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    
    /* First page header */
    .header-first {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #b45309;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header-info { text-align: right; font-size: 9pt; line-height: 1.5; }
    .title { text-align: center; margin-bottom: 20px; }
    .title h2 { font-size: 13pt; font-weight: bold; line-height: 1.4; }
    .intro { font-size: 9.5pt; line-height: 1.65; margin-bottom: 14px; text-align: justify; }
    .section-title { font-size: 10.5pt; font-weight: bold; margin: 14px 0 8px; text-transform: uppercase; }
    .desc { font-size: 9.5pt; line-height: 1.6; margin-bottom: 14px; }
    .total-block { font-size: 9.5pt; line-height: 1.7; margin-bottom: 14px; }
    .bank-block { font-size: 9.5pt; line-height: 1.7; margin-bottom: 24px; }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      margin-bottom: 30px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-box { width: 42%; text-align: center; }
    .sig-line { border-top: 1px solid #000; margin-bottom: 6px; }
    .obs { font-size: 9pt; line-height: 1.6; page-break-inside: avoid; break-inside: avoid; margin-top: 10px; }
    .obs ul { padding-left: 18px; margin-top: 6px; }
    .footer {
      text-align: center;
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer img { width: 90px; height: 90px; object-fit: contain; margin-bottom: 6px; }
    .footer p { font-size: 8.5pt; color: #475569; margin: 2px 0; }
  </style>
</head>
<body>
  <!-- Running header (page 2+) -->
  <div class="page-header">
    ${logoBase64 ? `<img src="${logoBase64}" style="height:32px;object-fit:contain;"/>` : ''}
    <div>RD Carpintería · rdcarpinteria.com · 664 217 5633</div>
    <div>Contrato — ${prospect.name}</div>
  </div>

  <!-- Page 1 header -->
  <div class="header-first avoid-break">
    <div style="font-size:11pt;font-weight:bold;color:#b45309;">RD CARPINTERÍA</div>
    <div class="header-info">
      Tijuana, Baja California ${getDateStr()}<br/>
      Vicente Guerrero #5341, Pedregal de Santa Julia 3ra Sección<br/>
      <strong>Teléfono:</strong> 664 217 5633<br/>
      <strong>Correo electrónico:</strong> <span style="color:#2563eb;">rdcarpinteriatj@gmail.com</span>
    </div>
  </div>

  <!-- Title -->
  <div class="title avoid-break">
    <h2>CONTRATO DE PRESTACIÓN DE SERVICIOS<br/>DE RD CARPINTERÍA</h2>
  </div>

  <!-- Intro -->
  <div class="intro avoid-break">
    CONTRATO DE PRESTACIÓN DE SERVICIOS que celebran, por una parte el SR. <strong>ROGELIO DIAZ FLORES</strong>,
    como "EL PRESTADOR DEL SERVICIO REPRESENTANDO A <strong>RD CARPINTERIA</strong>" y, POR LA OTRA "LA SR(A).
    <strong>${prospect.name ? prospect.name.toUpperCase() : 'CLIENTE'}</strong>" como "EL CLIENTE",
    respecto del trabajo que se compromete a elaborar "EL PRESTADOR DEL SERVICIO" y que quedarán obligados,
    de acuerdo con las siguientes declaraciones y clausulas.
  </div>
  <div class="intro avoid-break">
    A continuación se establecen las especificaciones, características y condiciones correspondientes al proyecto contratado:
  </div>

  <!-- Project section -->
  <div class="avoid-break">
    <div class="section-title">FABRICACIÓN E INSTALACIÓN DE ${(prospect.project_type || 'PROYECTO').toUpperCase()}</div>
    <div class="desc">
      <strong>Descripción:</strong><br/>
      ${descLines}
    </div>
  </div>

  <!-- Totals -->
  <div class="total-block avoid-break">
    <strong>Total: ${formatCurrency(estimatedTotal)} MXN (+IVA del 8% en caso de requerir factura).</strong><br/>
    Para el inicio del proyecto se requiere un anticipo del <strong>${anticipoPct}%</strong>, el otro ${100 - Number(anticipoPct)}% restante se paga el día de la entrega/instalación.<br/>
    <strong>Tiempo de entrega:</strong> ${diasEntrega} días hábiles.
  </div>

  <!-- Bank -->
  <div class="bank-block avoid-break">
    Los pagos correspondientes serán efectuados a la cuenta bancaria previamente señalada<br/>
    <strong>Datos para realizar el pago:</strong><br/>
    Cuenta bancaria: 012 028 00484694082 4<br/>
    Titular: Silvia Denis Vergara Morales
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <strong>Firma: Rogelio Diaz Flores</strong>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <strong>Firma de cliente: ${prospect.name || ''}</strong>
    </div>
  </div>

  <!-- Observations -->
  <div class="obs avoid-break">
    <strong>Observaciones:</strong>
    <ul>
      ${obsItems.map(o => `<li>${o}</li>`).join('')}
    </ul>
  </div>

  <!-- Footer with logo -->
  <div class="footer avoid-break">
    ${logoBase64 ? `<img src="${logoBase64}" alt="RD Carpintería"/>` : ''}
    <p><strong>Documento Oficial de RD Carpintería</strong></p>
    <p>rdcarpinteria.com · rdcarpinteriatj@gmail.com · 664 217 5633</p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 600);
    };
  </script>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'width=900,height=1000');
      // Release blob URL after window opens
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error(e);
      alert('Error generando el contrato: ' + e.message);
    }
    setSaving(false);
  };

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
          {saving ? '⏳ Generando...' : '💾 Guardar y Generar PDF'}
        </button>
      </div>

      {/* Preview */}
      <div style={{ background: 'white', padding: '40px 48px', maxWidth: '860px', margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', borderRadius: '6px', color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '10.5pt' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #b45309', paddingBottom: '12px', marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#b45309' }}>RD CARPINTERÍA</div>
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

        {/* Bank */}
        <div style={{ fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '28px' }}>
          Los pagos correspondientes serán efectuados a la cuenta bancaria previamente señalada<br/>
          <strong>Datos para realizar el pago:</strong><br/>
          Cuenta bancaria: 012 028 00484694082 4<br/>
          Titular: Silvia Denis Vergara Morales
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', marginBottom: '28px' }}>
          <div style={{ textAlign: 'center', width: '44%' }}>
            <div style={{ borderTop: '1px solid #000', marginBottom: '6px' }}></div>
            <strong>Firma: Rogelio Diaz Flores</strong>
          </div>
          <div style={{ textAlign: 'center', width: '44%' }}>
            <div style={{ borderTop: '1px solid #000', marginBottom: '6px' }}></div>
            <strong>Firma de cliente: {prospect.name}</strong>
          </div>
        </div>

        {/* Observations */}
        <div style={{ fontSize: '0.87rem', lineHeight: '1.6' }}>
          <strong>Observaciones:</strong>
          <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
            {obsItems.map((obs, i) => <li key={i}>{obs}</li>)}
          </ul>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
          <img src="/logo-leather.png" alt="RD Carpintería" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '6px' }} />
          <p style={{ margin: '2px 0', fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>Documento Oficial de RD Carpintería</p>
          <p style={{ margin: '2px 0', fontSize: '0.78rem', color: '#64748b' }}>rdcarpinteria.com · rdcarpinteriatj@gmail.com · 664 217 5633</p>
        </div>
      </div>
    </div>
  );
}
