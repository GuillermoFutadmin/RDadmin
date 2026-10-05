import React, { useState } from 'react';

// Format currency
const formatCurrency = (val) => {
  const num = Number(val);
  return isNaN(num) ? '$0.00' : '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Date formatter
const getDateStr = () => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
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
  
  const [obsItems, setObsItems] = useState([
    'Fecha de entrega a partir de anticipo.',
    `Para el inicio del proyecto se requiere un anticipo del 60%`,
    'Un año de garantía por defectos de fabricación, sujeta a previa revisión.',
    'No se aceptan cambios una vez iniciado el proceso de fabricación, todo cambio tendrá un precio extra.',
    'No incluye: jaladeras y cubierta, instalación de aparatos eléctricos, trabajos eléctricos en mueblería, fontanería u otros servicios similares, nuestros servicios se limitan únicamente a la fabricación e instalación de muebles de carpintería.',
    'No hay devolución del anticipo en caso de cancelación.',
    'Cotización válida por 10 días naturales.'
  ]);

  const handlePrint = async () => {
    // Primero marcamos como contrato en BD
    await onSaveStatus();
    // Luego disparamos la impresión
    window.print();
  };

  return (
    <div style={{ padding: '1rem', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #contrato-print-area, #contrato-print-area * { visibility: visible; }
          #contrato-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
      
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', maxWidth: '800px', margin: '0 auto 1rem' }}>
        <button onClick={onBack} style={{ padding: '0.6rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          ⬅ Regresar
        </button>
        <button onClick={handlePrint} style={{ padding: '0.6rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          🖨️ Guardar e Imprimir Contrato
        </button>
      </div>

      <div id="contrato-print-area" style={{ background: 'white', padding: '40px', maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: '#000' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #b45309', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <img src="/logo-leather.png" alt="RD Carpintería" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
          <div style={{ textAlign: 'right', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <div>Tijuana, Baja California {getDateStr()}</div>
            <div>Vicente Guerrero #5341, Pedregal de Santa Julia 3ra Sección</div>
            <div><strong>Teléfono:</strong> 664 217 5633</div>
            <div><strong>Correo electrónico:</strong> <a href="mailto:rdcarpinteriatj@gmail.com" style={{color: '#2563eb'}}>rdcarpinteriatj@gmail.com</a></div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>CONTRATO DE PRESTACIÓN DE SERVICIOS<br/>DE RD CARPINTERÍA</h2>
        </div>

        {/* Introduction */}
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem', textAlign: 'justify' }}>
          CONTRATO DE PRESTACIÓN DE SERVICIOS que celebran, por una parte el SR. <strong>ROGELIO DIAZ FLORES</strong>, como "EL PRESTADOR DEL SERVICIO REPRESENTANDO A <strong>RD CARPINTERIA</strong>" y, POR LA OTRA "LA SR(A). <strong>{prospect.name ? prospect.name.toUpperCase() : 'CLIENTE'}</strong>" como "EL CLIENTE", respecto del trabajo que se compromete a elaborar "EL PRESTADOR DEL SERVICIO" y que quedarán obligados, de acuerdo con las siguientes declaraciones y clausulas.
        </div>
        
        <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          A continuación se establecen las especificaciones, características y condiciones correspondientes al proyecto contratado:
        </div>

        {/* Project Title */}
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', textTransform: 'uppercase' }}>
          FABRICACIÓN E INSTALACIÓN DE {prospect.project_type || 'PROYECTO'}
        </h3>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <strong>Descripción:</strong><br/>
          <textarea className="no-print" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', minHeight: '120px', padding: '0.5rem', marginTop: '0.5rem', fontFamily: 'inherit', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.5' }} className="print-only">
            {description}
          </div>
        </div>

        {/* Totals and Terms */}
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '3rem' }}>
          <strong>Total: {formatCurrency(estimatedTotal)} MXN (+IVA del 8% en caso de requerir factura).</strong><br/>
          Para el inicio del proyecto se requiere un anticipo del <input className="no-print" value={anticipoPct} onChange={e => setAnticipoPct(e.target.value)} style={{width:'40px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '2px'}}/> <span className="print-only">{anticipoPct}</span>%, el otro {100 - Number(anticipoPct)}% restante se paga el día de la entrega/instalación.<br/>
          <strong>Tiempo de entrega:</strong> <input className="no-print" value={diasEntrega} onChange={e => setDiasEntrega(e.target.value)} style={{width:'40px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '2px'}}/> <span className="print-only">{diasEntrega}</span> días hábiles.
        </div>

        <div style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '3rem' }}>
          Los pagos correspondientes serán efectuados a la cuenta bancaria previamente señalada<br/>
          <strong>Datos para realizar el pago:</strong><br/>
          Cuenta bancaria: 012 028 00484694082 4<br/>
          Titular: Silvia Denis Vergara Morales
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', fontSize: '0.9rem', marginTop: '50px' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderBottom: '1px solid black', marginBottom: '0.5rem' }}></div>
            <strong>Firma: Rogelio Diaz Flores</strong>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderBottom: '1px solid black', marginBottom: '0.5rem' }}></div>
            <strong>Firma de cliente: {prospect.name}</strong>
          </div>
        </div>

        {/* Observations */}
        <div style={{ fontSize: '0.85rem' }}>
          <strong>Observaciones:</strong>
          <ul style={{ paddingLeft: '20px', margin: '0.5rem 0 0 0', lineHeight: '1.5' }}>
            {obsItems.map((obs, i) => (
              <li key={i}>{obs}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
