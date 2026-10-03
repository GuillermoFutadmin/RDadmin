import React from 'react';

// ─────────────────────────────────────────────────────────────
// CotizacionView – Vista de cotización mejorada
// Archivo separado de Prospects.jsx para mejor organización
// ─────────────────────────────────────────────────────────────
export function CotizacionView({ prospect: p, onBack, onSaved }) {
  // Estado de guardado
  const [saved, setSaved] = React.useState(p.has_quote || false);
  let estData = {};
  if (p.estimation_data) {
    try { estData = JSON.parse(p.estimation_data); } catch(e) {}
  }
  const fieldPhotos = estData.photos || {};
  const croquisPhotos = estData.croquisPhotos || [];

  const [showPdfModal, setShowPdfModal] = React.useState(false);

  // Campos de cotización guardados en DB
  const getDefaultSaludo = () => {
    const nombre = p.name ? p.name.split(' ')[0] : 'estimado cliente';
    const proyecto = p.project_type ? p.project_type.toLowerCase() : 'el proyecto solicitado';
    return `Estimado Sr(a). ${nombre}, reciba un cordial saludo de parte de RD Carpintería.\nA continuación le presentamos la cotización correspondiente a su proyecto de ${proyecto}.`;
  };
  
  const initSaludo = () => {
    if (!p.quote_saludo) return '';
    const defNuevo = getDefaultSaludo().trim();
    const defViejo = `Reciba un cordial saludo de parte de RD Carpintería.
A continuación, presentamos la cotización correspondiente al proyecto solicitado.`;
    const defViejo2 = `Estimado/a ${p.name ? p.name.split(' ')[0] : 'estimado cliente'}, reciba un cordial saludo de parte de RD Carpintería.
Es un placer presentarle la cotización correspondiente a su proyecto de ${p.project_type ? p.project_type.toLowerCase() : 'el proyecto solicitado'}, la cual ha sido preparada especialmente para usted.`;
    const actual = p.quote_saludo.trim();
    if (actual === defNuevo || actual === defViejo || actual === defViejo2.trim() || actual.includes('Es un placer presentarle la cotización')) return '';
    return actual;
  };
  

  const [saludo, setSaludo] = React.useState(initSaludo());

  const getLayoutImages = () => {
    const imgs = [];
    const pushIf = (val, map) => { if (val && map[val]) imgs.push({ name: val, src: map[val] }); };
    pushIf(p.kitchen_layout, { 'LINEAL': '/layouts/cocina_lineal.png', 'EN L': '/layouts/cocina_l.png', 'PARALELO': '/layouts/cocina_paralelo.png', 'EN U': '/layouts/cocina_u.png' });
    pushIf(p.kitchen_addons, { 'CON ISLA': '/layouts/cocina_isla.png', 'CON PENÍNSULA': '/layouts/cocina_peninsula.png' });
    pushIf(p.closet_layout, { 'LINEAL': '/layouts/closet_lineal.png', 'EN L': '/layouts/closet_l.png', 'PARALELO': '/layouts/closet_paralelo.png', 'EN U': '/layouts/closet_u.png', 'WALK-IN CLÓSET': '/layouts/closet_walkin.png' });
    pushIf(p.closet_addons, { 'CON ISLA CENTRAL': '/layouts/closet_isla.png', 'CON VANITY': '/layouts/closet_vanity.png' });
    return imgs;
  };
  const layoutImages = getLayoutImages();
  const getDefaultTitle = () => {
    if (p.project_type) return `FABRICACIÓN DE ${p.project_type.toUpperCase()}`;
    return 'COTIZACIÓN DE PROYECTO';
  };

  const getDefaultDesc = () => {
    let desc = [];
    if (p.project_type) {
      desc.push(`• Proyecto: Fabricación de ${p.project_type.toLowerCase()}`);
      const types = p.project_type.split(',').map(s => s.trim().toUpperCase());
      types.forEach(pt => {
        let subItems = [];
        if (pt === 'PUERTA SÓLIDA' && p.door_solid_measurements) subItems.push(`- Medidas: ${p.door_solid_measurements}`);
        if (pt === 'PUERTA DE TAMBOR' && p.door_tambor_measurements) subItems.push(`- Medidas: ${p.door_tambor_measurements}`);
        if (pt === 'RESTAURACIONES' && p.restoration_details) {
          try {
            const parsedRests = JSON.parse(p.restoration_details);
            if (Array.isArray(parsedRests)) {
              parsedRests.forEach(r => {
                subItems.push(`- ${r.type}: ${r.measurements}`);
              });
            }
          } catch(e) {
            // Fallback for old data
            subItems.push(`- Tipo: ${p.restoration_details}`, `- Medidas: ${p.restoration_measurements || ''}`);
          }
        }
        if (pt === 'OTROS' && p.other_project_measurements) subItems.push(`- Medidas: ${p.other_project_measurements}`);
        
        if (pt === 'COCINA') {
          if (p.kitchen_layout) subItems.push(`- Distribución: ${p.kitchen_layout}`);
          if (p.kitchen_measurements) subItems.push(`- Medidas: ${p.kitchen_measurements}`);
          if (p.kitchen_addons) subItems.push(`- Complemento: ${p.kitchen_addons}`);
          if (p.kitchen_island_measurements) subItems.push(`- Medidas de Isla: ${p.kitchen_island_measurements}`);
          if (p.kitchen_peninsula_measurements) subItems.push(`- Medidas de Península: ${p.kitchen_peninsula_measurements}`);
        }
        if (pt === 'CLÓSET') {
          if (p.closet_layout) subItems.push(`- Distribución: ${p.closet_layout}`);
          if (p.closet_measurements) subItems.push(`- Medidas: ${p.closet_measurements}`);
          if (p.closet_addons) subItems.push(`- Complemento: ${p.closet_addons}`);
          if (p.closet_island_measurements) subItems.push(`- Medidas de Isla/Vanity: ${p.closet_island_measurements}`);
        }
        
        if (pt === 'MUEBLE DE BAÑO' && p.vanity_measurements) subItems.push(`- Medidas: ${p.vanity_measurements}`);
        if (pt === 'CENTRO DE TV' && p.tv_furniture_measurements) subItems.push(`- Medidas: ${p.tv_furniture_measurements}`);
        if (pt === 'LAMBRÍN' && p.wall_panel_measurements) subItems.push(`- Medidas: ${p.wall_panel_measurements}`);
        if (pt === 'ESCALERAS' && p.stairs_measurements) subItems.push(`- Medidas: ${p.stairs_measurements}`);
        if (pt === 'ZOCLO' && p.baseboard_measurements) subItems.push(`- Medidas: ${p.baseboard_measurements}`);
        if (pt === 'LIBRERO' && p.bookshelf_measurements) subItems.push(`- Medidas: ${p.bookshelf_measurements}`);
        if (pt === 'CANTINA' && p.bar_measurements) subItems.push(`- Medidas: ${p.bar_measurements}`);
        if (pt === 'CAMA' && p.bed_measurements) subItems.push(`- Medidas: ${p.bed_measurements}`);
        if (pt === 'BURÓ' && p.nightstand_measurements) subItems.push(`- Medidas: ${p.nightstand_measurements}`);
        if (pt === 'ESCRITORIO' && p.desk_measurements) subItems.push(`- Medidas: ${p.desk_measurements}`);
        if (pt === 'REPISAS' && p.shelf_measurements) subItems.push(`- Medidas: ${p.shelf_measurements}`);
        if (pt === 'ASADOR' && p.outdoor_kitchen_measurements) subItems.push(`- Medidas: ${p.outdoor_kitchen_measurements}`);
        
        if (subItems.length > 0) {
          desc.push(`\n${pt}:`);
          subItems.forEach(item => desc.push(`  ${item}`));
        }
      });
    }
    
    // Materiales, colores, encimera y herrajes se muestran en fichas visuales 
    // abajo de la descripción, no en el texto para evitar duplicados.
    
    return desc.join('\n');
  };

  const [quoteTitle, setQuoteTitle] = React.useState(p.quote_title || getDefaultTitle());
  const [quoteDesc, setQuoteDesc] = React.useState(p.quote_description || getDefaultDesc());

  // Precio: primero busca precio manual guardado, si no existe toma el de la valoración
  const getInitialPrice = () => {
    if (p.quote_total_price) return p.quote_total_price;
    if (p.estimated_price) {
      const num = parseFloat(p.estimated_price);
      return isNaN(num) ? p.estimated_price : new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(num);
    }
    return '';
  };
  const [quoteTotal, setQuoteTotal] = React.useState(getInitialPrice());
  
  const getInitialDelivery = () => {
    if (p.quote_delivery_time) return p.quote_delivery_time;
    if (p.production_days) return `${p.production_days} días hábiles`;
    return '35 días hábiles';
  };
  const [deliveryTime, setDeliveryTime] = React.useState(getInitialDelivery());
  const [validez, setValidez] = React.useState(p.quote_validez || '10');
  const [anticipo, setAnticipo] = React.useState(p.quote_anticipo || '60');

  // Imágenes: usa las de la cotización si existen, si no las del formulario del prospecto
  const API = ''; // Relativo al host actual
  // Helper: si la URL ya es absoluta (Cloudinary) no le agrega el prefijo
  const resolveUrl = (path) => !path ? null : (path.startsWith('http') ? path : `${API}${path}`);
  const [imagePreview, setImagePreview] = React.useState([
    p.quote_image_1 ? resolveUrl(p.quote_image_1)
      : (p.space_image_path ? resolveUrl(p.space_image_path.split(',')[0]) : null),
    p.quote_image_2 ? resolveUrl(p.quote_image_2)
      : (p.reference_image_path ? resolveUrl(p.reference_image_path.split(',')[0])
        : (p.design_image_path ? resolveUrl(p.design_image_path) : null)),
    p.quote_image_3 ? resolveUrl(p.quote_image_3) : null,
    p.quote_image_4 ? resolveUrl(p.quote_image_4) : null
  ]);

  const handleImageChange = async (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Mostrar preview inmediatamente
    const reader = new FileReader();
    reader.onload = ev => {
      const newPrev = [...imagePreview]; 
      newPrev[idx] = ev.target.result;
      setImagePreview(newPrev);
    };
    reader.readAsDataURL(file);

    // Subir imagen al servidor
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API}/api/prospects/${p.id}/upload-quote-image/${idx + 1}`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.image_path) {
        // Actualizamos el preview con la ruta real del servidor para asegurar persistencia
        const finalPrev = [...imagePreview];
        finalPrev[idx] = resolveUrl(data.image_path);
        setImagePreview(finalPrev);
      }
    } catch (err) {
      console.error('Error subiendo imagen:', err);
    }
  };

  const removeImage = (idx) => {
    const newPrev = [...imagePreview]; 
    newPrev[idx] = null; 
    setImagePreview(newPrev);
  };

  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  const infoRows = [
    ['Cliente', p.name],
    ['Contacto', p.contact_info],
    ['Ubicación', p.location],
    ['Tipo de Proyecto', p.project_type],
    ['Fecha de Inicio', p.start_date],
    ['Fecha de Entrega', p.delivery_date],
    ['Casa Habitada', p.inhabited_house],
    ['Prioridades', p.project_priorities],
    ['Expectativas', p.expectations],
  ].filter(([, v]) => v);

  const handleSaveAndPrint = async () => {
    setSaved(true);
    // Actualizar status a 'Cotización' y guardar datos de cotización
    try {
      const payload = {
        name: p.name,
        has_quote: true,
        status: 'Cotización',
        quote_saludo: saludo,
        quote_title: quoteTitle,
        quote_description: quoteDesc,
        quote_total_price: quoteTotal,
        quote_delivery_time: deliveryTime,
        quote_validez: validez,
        quote_anticipo: anticipo
      };
      await fetch(`${API}/api/prospects/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Error guardando cotización:', err);
    }
    if (onSaved) {
      // Notificar al componente padre (id del prospecto)
      await onSaved(p.id);
    }
    
    // Mostrar modal moderno en lugar de confirmación nativa
    setShowPdfModal(true);
  };

  const generatePDF = () => {
    const element = document.getElementById('cotizacion-doc');
    element.classList.add('pdf-exporting'); // Aplica reglas CSS de exportación
    
    // Guardar estilos originales para restaurarlos
    const originalBorder = element.style.border;
    const originalPadding = element.style.padding;
    const originalBoxShadow = element.style.boxShadow;
    
    // Aplicar estilos forzados para PDF limpio
    element.style.border = 'none';
    element.style.padding = '0.5rem';
    element.style.boxShadow = 'none';
    
    const opt = {
      margin:       [0.3, 0.3, 0.3, 0.3], // Márgenes reducidos
      filename:     `Cotizacion_${p.public_id || p.id}_${p.name}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    // Generar y descargar, al finalizar restaurar estilos
    window.html2pdf().set(opt).from(element).save().then(() => {
      element.classList.remove('pdf-exporting');
      element.style.border = originalBorder;
      element.style.padding = originalPadding;
      element.style.boxShadow = originalBoxShadow;
      setShowPdfModal(false);
    });
  };

  const inputDash = { border: '1px dashed #cbd5e1', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.85rem', outline: 'none', background: saved ? '#f8fafc' : 'white' };
  const secTitle = { fontSize: '1rem', fontWeight: '700', color: '#f97316', borderBottom: '1px solid #fed7aa', paddingBottom: '0.4rem', marginBottom: '1rem' };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

      {/* ── Toolbar ── */}
      <div className="no-print" style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>← Regresar</button>
        {!saved ? (
          <button onClick={handleSaveAndPrint} style={{ padding: '0.5rem 1.4rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💾</span> Guardar y Generar PDF
          </button>
        ) : (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.2rem', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontWeight: '700', border: '1.5px solid #86efac', fontSize: '0.95rem' }}>
              ✅ Cotización Guardada
            </span>
            <button onClick={() => setShowPdfModal(true)} style={{ padding: '0.5rem 1.4rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}>🖨️ Descargar PDF</button>
          </>
        )}
      </div>

      {/* Modal Moderno para generar PDF */}
      {showPdfModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <h3 style={{ fontSize: '1.3rem', color: '#1e293b', marginBottom: '0.5rem' }}>Cotización Guardada</h3>
            <p style={{ color: '#475569', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              La cotización se ha guardado exitosamente. ¿Deseas descargar el documento en formato PDF ahora?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setShowPdfModal(false)} style={{ padding: '0.6rem 1.2rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={generatePDF} style={{ padding: '0.6rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="no-print" style={{ background: 'linear-gradient(90deg,#16a34a,#15803d)', color: 'white', borderRadius: '10px', padding: '0.8rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '700', fontSize: '1rem', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <span>Cotización guardada correctamente — Folio {p.public_id || p.id}</span>
          <button onClick={() => setSaved(false)} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '6px', padding: '0.2rem 0.7rem', cursor: 'pointer', fontSize: '0.82rem' }}>Editar</button>
        </div>
      )}

      {/* ── DOCUMENTO ── */}
      <div id="cotizacion-doc" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', padding: '2.5rem', border: saved ? '2px solid #86efac' : '1px solid #e2e8f0', transition: 'border 0.4s' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '3px solid #f97316' }}>
          <div>
            <img src="/logo-orange.png" alt="RD Carpintería" style={{ height: '90px', objectFit: 'contain', border: 'none', outline: 'none', mixBlendMode: 'multiply', clipPath: 'inset(1px)' }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.4' }}>
            <div>Tijuana, Baja California {today}</div>
            <div>Vicente Guerrero #5341, Pedregal de Santa Julia 3ra Sección</div>
            <div><strong>Telefono:</strong> 664 217 5633</div>
            <div><strong>Correo electrónico:</strong> <a href="mailto:rdcarpinteriatj@gmail.com" style={{ color: '#2563eb', textDecoration: 'none' }}>rdcarpinteriatj@gmail.com</a></div>
          </div>
        </div>

        {/* Info de Folio y Validez */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
          <div>Folio: <strong style={{ color: '#1e293b' }}>{p.public_id || p.id}</strong></div>
          <div>Válida: <strong style={{ color: '#1e293b' }}>{validez} días</strong></div>
          {saved && <div className="no-print" style={{ color: '#16a34a', fontWeight: '700' }}>✅ Guardada</div>}
        </div>

        {/* Saludo Inicial */}
        <div className="no-print" style={{ marginBottom: '2rem', background: '#fff7ed', borderRadius: '10px', padding: '1.2rem 1.5rem', border: '1px solid #fed7aa' }}>
          <h3 style={{ ...secTitle, marginBottom: '0.7rem' }}><span className="no-print">👋 </span>Saludo Inicial</h3>
          {/* Preview con negritas */}
          <div style={{ background: 'white', borderRadius: '6px', border: '1px dashed #fbbf24', padding: '0.8rem 1rem', fontSize: '0.9rem', lineHeight: '1.7', color: '#1e293b', marginBottom: '0.6rem' }}>
            Estimado Sr(a). <strong style={{ color: '#8b5a2b' }}>{p.name ? p.name.split(' ')[0] : '[Nombre]'}</strong>, reciba un cordial saludo de parte de RD Carpintería.<br/>
            A continuación le presentamos la cotización correspondiente a su proyecto de <strong style={{ color: '#8b5a2b' }}>{p.project_type ? p.project_type.toLowerCase() : '[Proyecto]'}</strong>.
          </div>
          <textarea
            value={saludo}
            onChange={e => setSaludo(e.target.value)}
            placeholder="Agrega un mensaje adicional personalizado (opcional)..."
            rows={2}
            style={{ width: '100%', ...inputDash, resize: 'vertical', fontSize: '0.88rem', lineHeight: '1.5', boxSizing: 'border-box', color: '#475569' }}
          />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>↑ Espacio para nota adicional (opcional)</span>
        </div>
        
        {/* Saludo Inicial (Solo para impresión) */}
        <div className="print-only" style={{ marginBottom: '2rem', fontSize: '1rem', color: '#1e293b', lineHeight: '1.7' }}>
          <span>Estimado Sr(a). </span><strong>{p.name ? p.name.split(' ')[0] : ''}</strong><span>, reciba un cordial saludo de parte de RD Carpintería.<br/>
          A continuación le presentamos la cotización correspondiente a su proyecto de </span><strong>{p.project_type ? p.project_type.toLowerCase() : ''}</strong><span>.</span>
          {saludo && saludo !== '' && <><br/><br/><span style={{ whiteSpace: 'pre-wrap' }}>{saludo}</span></>}
        </div>

        {/* Datos del Proyecto */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={secTitle}><span className="no-print">📋 </span>Datos del Proyecto</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <tbody>
              {(() => {
                const half = Math.ceil(infoRows.length / 2);
                const col1 = infoRows.slice(0, half);
                const col2 = infoRows.slice(half);
                const maxRows = Math.max(col1.length, col2.length);
                return Array.from({ length: maxRows }).map((_, i) => {
                  const [l1, v1] = col1[i] || [];
                  const [l2, v2] = col2[i] || [];
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                      <td style={{ padding: '0.38rem 0.6rem', fontWeight: '700', color: '#475569', width: '16%', borderRight: '2px solid #f0f0f0', whiteSpace: 'nowrap' }}>{l1}</td>
                      <td style={{ padding: '0.38rem 0.6rem', color: '#1e293b', width: '34%', borderRight: '2px solid #e2e8f0' }}>{v1}</td>
                      <td style={{ padding: '0.38rem 0.6rem', fontWeight: '700', color: '#475569', width: '16%', borderRight: '2px solid #f0f0f0', whiteSpace: 'nowrap' }}>{l2}</td>
                      <td style={{ padding: '0.38rem 0.6rem', color: '#1e293b', width: '34%' }}>{v2}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

                {/* Detalles y Concepto Principal */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={secTitle}><span className="no-print">📝 </span>Descripción de la Cotización</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label className="no-print" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Título del Proyecto:</label>
            <input 
              value={quoteTitle} 
              onChange={e => setQuoteTitle(e.target.value)}
              placeholder="Ej. WALKIN CLOSETH"
              className="no-print"
              style={{ width: '100%', fontSize: '1.2rem', fontWeight: '800', textTransform: 'uppercase', ...inputDash, padding: '0.5rem' }} 
            />
            <div className="print-only" style={{ fontSize: '1.2rem', fontWeight: '800', textTransform: 'uppercase', padding: '0.5rem 0', color: '#1e293b' }}>
              {quoteTitle}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: layoutImages.length > 0 ? (layoutImages.length > 1 ? '1fr 280px' : '1fr 150px') : '1fr', gap: '2rem', alignItems: 'start' }}>
            <div>
              <label className="no-print" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Descripción detallada (Secciones, materiales, exclusiones):</label>
              <textarea 
                value={quoteDesc} 
                onChange={e => setQuoteDesc(e.target.value)}
                placeholder="Fabricación de walking closet en melamina...&#10;Seccion de nicho: ...&#10;Seccion frontal: ...&#10;No incluye: fondos y jaladeras."
                rows={8}
                className="no-print"
                style={{ width: '100%', ...inputDash, resize: 'vertical', lineHeight: '1.6', fontSize: '0.95rem', boxSizing: 'border-box', whiteSpace: 'pre-wrap' }} 
              />
              <div className="print-only">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#1e293b' }}>
                  <tbody>
                    {quoteDesc.split('\n').map((line, i) => {
                      if (!line.trim()) return null;
                      const isHeader = line.endsWith(':') && !line.startsWith(' ');
                      if (isHeader) {
                        return (
                          <tr key={i}>
                            <td colSpan={2} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#334155' }}>
                              {line}
                            </td>
                          </tr>
                        );
                      }
                      const parts = line.split(':');
                      if (parts.length > 1) {
                        return (
                          <tr key={i}>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontWeight: 'bold', width: '35%', background: '#f8fafc' }}>{parts[0].replace(/^- /g, '').trim()}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem' }}>{parts.slice(1).join(':').trim()}</td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={i}>
                          <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem' }}>{line}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {layoutImages.length > 0 && (
              <div>
                <h4 className="no-print" style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>Distribución</h4>
                <div style={{ display: 'grid', gridTemplateColumns: layoutImages.length > 1 ? '1fr 1fr' : '1fr', gap: '0.8rem' }}>
                  {layoutImages.map((img, i) => (
                    <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={img.src} alt={img.name} style={{ maxWidth: '100%', maxHeight: '110px', objectFit: 'contain' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        
        {/* ── Especificaciones de Acabados ── */}
        {(() => {
          const getSwatchStyle = (type, code) => {
            const s = `${type} ${code || ''}`.toLowerCase();
            const colorMap = {
              'blanco': '#f8f8f5', 'blanca': '#f8f8f5', 'white': '#f8f8f5',
              'negro': '#1a1a1a', 'negra': '#1a1a1a', 'black': '#1a1a1a',
              'gris': '#9e9e9e', 'gray': '#9e9e9e', 'grey': '#9e9e9e',
              'café': '#7b5e3e', 'cafe': '#7b5e3e', 'marrón': '#7b5e3e', 'brown': '#7b5e3e',
              'chocolate': '#3d1a00', 'beige': '#d4b896', 'crema': '#f5e9d3',
              'rojo': '#c0392b', 'red': '#c0392b', 'azul': '#2980b9', 'blue': '#2980b9',
              'verde': '#27ae60', 'green': '#27ae60', 'naranja': '#e67e22',
              'mancha': '#b8956a', 'nogal': '#5c3317', 'pino': '#c8a97a',
              'cerezo': '#9b4444', 'roble': '#b08060', 'maple': '#d4a56a', 'cedro': '#a0522d',
              'birch': '#e5c898', 'melamina': '#e2e8f0', 'mdf': '#d2b48c', 'triplay': '#d4a56a', 'solida': '#8b5a2b', 'sólida': '#8b5a2b'
            };
            let baseColor = '#c8a97a'; // Default warm wood tone
            for (const [k, c] of Object.entries(colorMap)) { 
              if (s.includes(k)) { baseColor = c; break; }
            }
            
            const isWood = /mancha|nogal|pino|roble|maple|cedro|cerezo|birch|triplay|mdf|melamina|solida/i.test(s);
            const isLight = ['#f8f8f5','#d4b896','#f5e9d3','#c8a97a','#d4a56a','#e5c898','#e2e8f0'].includes(baseColor);
            
            return {
              backgroundColor: baseColor,
              backgroundImage: isWood ? 'repeating-linear-gradient( 45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.04) 4px ), repeating-linear-gradient( 135deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.04) 10px )' : 'none',
              border: isLight ? '1px solid rgba(0,0,0,0.1)' : 'none'
            };
          };
          const getExactImage = (type, code) => {
            const s = `${type} ${code || ''}`.toLowerCase();
            if (code && code.toUpperCase().startsWith('TS-')) {
              const match = code.match(/TS-\d+/i);
              if (match) {
                return `/manchas/${match[0].toLowerCase().replace('-', '_')}.jpg`;
              }
            }
            if (s.includes('birch')) return '/enchapados/birch_natural.jpg';
            if (s.includes('hard maple')) return '/enchapados/hard_maple.jpg';
            if (s.includes('soft maple')) return '/enchapados/soft_maple.jpg';
            if (s.includes('maple')) return '/maderas/maple.jpg';
            if (s.includes('roble')) return '/maderas/roble.jpg';
            if (s.includes('cerezo')) return '/maderas/cerezo.jpg';
            if (s.includes('nogal')) return '/maderas/nogal.jpg';
            if (s.includes('caoba')) return '/maderas/caoba.jpg';
            if (s.includes('teca')) return '/maderas/teca.jpg';
            if (s.includes('pino')) return '/maderas/pino.jpg';
            if (s.includes('cedro')) return '/maderas/cedro.jpg';
            
            if (s.includes('espiga')) return '/melaminas/espiga.jpg';
            if (s.includes('chardonnay')) return '/melaminas/chardonnay.jpg';
            if (s.includes('encino polar')) return '/melaminas/encino_polar.jpg';
            if (s.includes('fresno bruma')) return '/melaminas/fresno_bruma.jpg';
            if (s.includes('roble santana')) return '/melaminas/roble_santana.jpg';
            if (s.includes('nogal britanico') || s.includes('nogal británico')) return '/melaminas/nogal_britanico.jpg';
            if (s.includes('malta')) return '/melaminas/malta.jpg';
            if (s.includes('latte')) return '/melaminas/latte.jpg';
            if (s.includes('monarca')) return '/melaminas/monarca.jpg';
            if (s.includes('durango')) return '/melaminas/durango.jpg';
            if (s.includes('rioja')) return '/melaminas/rioja.jpg';
            if (s.includes('dakota')) return '/melaminas/dakota.jpg';
            if (s.includes('roble merida') || s.includes('roble mérida')) return '/melaminas/roble_merida.jpg';
            if (s.includes('wengue') || s.includes('wengué')) return '/melaminas/wengue.jpg';
            if (s.includes('ebano indi') || s.includes('ébano indi')) return '/melaminas/ebano_indi.jpg';
            if (s.includes('nogal neo')) return '/melaminas/nogal_neo.jpg';
            if (s.includes('oporto')) return '/melaminas/oporto.jpg';
            if (s.includes('anahuac') || s.includes('anáhuac')) return '/melaminas/anahuac.jpg';
            
            return null;
          };

          const colorEntries = [
            p.interior_color_type && p.interior_color_type !== 'none' && { label: 'Interior', type: p.interior_color_type, code: p.interior_color_code },
            p.exterior_inf_color_type && p.exterior_inf_color_type !== 'none' && { label: 'Exterior Inferior', type: p.exterior_inf_color_type, code: p.exterior_inf_color_code },
            p.exterior_sup_color_type && p.exterior_sup_color_type !== 'none' && { label: 'Exterior Superior', type: p.exterior_sup_color_type, code: p.exterior_sup_color_code },
          ].filter(Boolean);
          const materials = [p.material_type, p.material_type_2].filter(Boolean);
          const hasInfo = colorEntries.length > 0 || materials.length > 0 || (p.countertop_type && p.countertop_type !== 'Sin considerar encimera' && p.countertop_type !== 'none') || (p.hardware_details && p.hardware_details !== 'none');
          if (!hasInfo) return null;
          return (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={secTitle}><span className="no-print">🎨 </span>Especificaciones de Acabados</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>

                {/* Materiales */}
                {materials.length > 0 && (
                  <div style={{ marginBottom: colorEntries.length > 0 ? '0.5rem' : 0 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Material Base</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                      {materials.map((m, i) => {
                        const exactImg = getExactImage(m);
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'stretch', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minWidth: '160px' }}>
                            {exactImg ? (
                              <div style={{ width: '56px', flexShrink: 0, backgroundImage: `url(${exactImg})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRight: '1px solid #e2e8f0' }}></div>
                            ) : (
                              <div style={{ width: '56px', flexShrink: 0, position: 'relative', ...getSwatchStyle(m) }}></div>
                            )}
                            <div style={{ padding: '0.55rem 0.8rem', background: 'white', display: 'flex', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{m}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Colores */}
                {colorEntries.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Colores seleccionados</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                      {colorEntries.map((c, i) => {
                        const exactImg = getExactImage(c.type, c.code);
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'stretch', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minWidth: '160px' }}>
                            {exactImg ? (
                              <div style={{ width: '56px', flexShrink: 0, backgroundImage: `url(${exactImg})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRight: '1px solid #e2e8f0' }}></div>
                            ) : (
                              <div style={{ width: '56px', flexShrink: 0, position: 'relative', ...getSwatchStyle(c.type, c.code) }}></div>
                            )}
                            <div style={{ padding: '0.55rem 0.8rem', background: 'white' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginTop: '0.1rem' }}>{c.type}</div>
                              {c.code && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.05rem' }}>{c.code}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Encimera y Herrajes */}
                {((p.countertop_type && p.countertop_type !== 'Sin considerar encimera' && p.countertop_type !== 'none') || (p.hardware_details && p.hardware_details !== 'none')) && (
                  <div style={{ display: 'flex', gap: '2.5rem', paddingTop: colorEntries.length > 0 ? '0.2rem' : 0 }}>
                    {p.countertop_type && p.countertop_type !== 'Sin considerar encimera' && p.countertop_type !== 'none' && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Encimera</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#1e293b', marginTop: '0.2rem' }}>{p.countertop_type}</div>
                      </div>
                    )}
                    {p.hardware_details && p.hardware_details !== 'none' && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Herrajes</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#1e293b', marginTop: '0.2rem' }}>{p.hardware_details}</div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })()}

{/* Imágenes del proyecto (Movidas debajo de conceptos) */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={secTitle}><span className="no-print">🖼️ </span>Imágenes del Proyecto</h3>
          {/* Fotos del Formulario (Medidas y Croquis) */}
          {(Object.keys(fieldPhotos).length > 0 || croquisPhotos.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
              {Object.entries(fieldPhotos).map(([key, src]) => (
                <div key={key} style={{ border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: '#f8fafc', padding: '4px', fontSize: '0.65rem', fontWeight: 'bold', textAlign: 'center', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Medida: {key}</div>
                  <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              {croquisPhotos.map((src, i) => (
                <div key={`croq-${i}`} style={{ border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: '#f8fafc', padding: '4px', fontSize: '0.65rem', fontWeight: 'bold', textAlign: 'center', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Croquis {i+1}</div>
                  <img src={src} style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'white' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem' }}>
            {[0, 1, 2, 3].map(idx => (
              <div key={idx} className={!imagePreview[idx] ? "no-print" : ""} style={{ position: 'relative', border: '2px dashed #e2e8f0', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {imagePreview[idx] ? (
                  <>
                    <img src={imagePreview[idx]} alt={`img-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button className="no-print" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </>
                ) : (
                  <label className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem', padding: '0.5rem' }}>
                    <span style={{ fontSize: '1.8rem' }}><span className="no-print">📷</span></span>
                    <span>Foto {idx + 1}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageChange(idx, e)} />
                  </label>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Totales y Entregas */}
        {(() => {
          // Parsear valoración si existe
          let valSheets = null;
          let valMargin = 30;
          if (p.valuation_data) {
            try {
              const raw = JSON.parse(p.valuation_data);
              if (raw.sheets && Array.isArray(raw.sheets) && raw.sheets.length > 0) {
                valSheets = raw.sheets;
                valMargin = parseFloat(raw.globalMargin) || 30;
              } else if (raw.materials || raw.labor || raw.concepts) {
                // Formato viejo: una sola hoja
                valSheets = [{ type: raw.projectType || 'Proyecto', materials: raw.materials || [], labor: raw.labor || [], concepts: raw.concepts || [] }];
                valMargin = parseFloat(raw.margin) || 30;
              }
            } catch(e) { /* no-op */ }
          }
          const fmtCur = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
          const sheetCost = (sh) => {
            const sum = arr => (arr || []).reduce((s, m) => s + (parseFloat(m.qty) || 0) * (parseFloat(m.price) || 0), 0);
            return sum(sh.materials) + sum(sh.labor) + sum(sh.concepts);
          };
          const sheetSections = (sh) => {
            const sum = arr => (arr || []).reduce((s, m) => s + (parseFloat(m.qty) || 0) * (parseFloat(m.price) || 0), 0);
            return { mat: sum(sh.materials), lab: sum(sh.labor), con: sum(sh.concepts) };
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '2rem', gap: '0.5rem', width: '100%' }}>
              <h3 style={{ ...secTitle, width: '100%', marginBottom: '1rem' }}><span className="no-print">💰 </span>Totales del Proyecto</h3>

              {/* ── Resumen Global (Ocultar detalles internos y ganancia) ── */}
              {valSheets && valSheets.length > 0 && (() => {
                const grandCost  = valSheets.reduce((s, sh) => s + sheetCost(sh), 0);
                const grandMg    = grandCost * (valMargin / 100);
                const grandTotal = grandCost + grandMg;
                return (
                  <div style={{ width: '100%', marginBottom: '1rem' }}>
                    <div style={{ border: '3px solid #8b5a2b', borderRadius: '10px', overflow: 'hidden', marginTop: '0.5rem' }}>
                      <div style={{ background: '#8b5a2b', color: 'white', padding: '8px 14px', fontWeight: '800', fontSize: '0.95rem' }}>
                        <span className="no-print">📊 </span>Resumen Global — {valSheets.length} proyecto{valSheets.length !== 1 ? 's' : ''}
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                        <tbody>
                          {valSheets.map((sh, i) => {
                            const sheetPrice = sheetCost(sh) * (1 + valMargin / 100);
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '8px 12px', fontSize: '0.9rem', fontWeight: '700', color: '#8b5a2b' }}>#{i+1} {sh.type}</td>
                                <td style={{ padding: '8px 12px', fontSize: '0.9rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                                  Precio: {fmtCur(sheetPrice)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{ background: '#f5deb3', borderTop: '2px solid #8b5a2b' }}>
                            <td style={{ padding: '10px 12px', fontWeight: '800', fontSize: '1rem', color: '#4a2c0a' }}>
                              TOTAL DEL PROYECTO
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: '800', fontSize: '1rem', textAlign: 'right', color: '#4a2c0a' }}>
                              {fmtCur(grandTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* ── Campo de precio editable (siempre visible) ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', flexWrap: 'wrap', marginTop: valSheets ? '0.5rem' : 0 }}>
                <strong style={{ fontWeight: '800' }}>PRECIO TOTAL:</strong>
                <input
                  type="text"
                  value={quoteTotal}
                  onChange={e => setQuoteTotal(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputDash, fontSize: '1.1rem', fontWeight: '700', width: '140px' }}
                />
                {(() => {
                  const numTotal = parseFloat(String(quoteTotal).replace(/[^\d.-]/g, '')) || 0;
                  const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
                  return (
                    <span style={{ fontSize: '0.88rem', color: '#475569' }}>
                      (+IVA del 8% en caso de requerir factura
                      {numTotal > 0 && <> &mdash; con factura: <strong style={{ color: '#1e293b' }}>{fmt(numTotal * 1.08)}</strong></>}
                      ).
                    </span>
                  );
                })()}
                {!p.quote_total_price && p.estimated_price && (
                  <span className="no-print" style={{ fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    <span className="no-print">📊 </span>Precio de Valoración
                  </span>
                )}
              </div>



              {/* Calendario Real */}
              {(() => {
                const match = deliveryTime.match(/\d+/);
                if (!match) return null;
                const totalDays = parseInt(match[0], 10);
                if (totalDays <= 0 || totalDays > 200) return null;

                const startDate = p.start_date ? new Date(p.start_date + 'T12:00:00') : new Date();
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + totalDays);

                const fmtDate = (d) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
                const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

                // Build set of highlighted days (start to end)
                const highlightSet = new Set();
                const cur = new Date(startDate);
                while (cur <= endDate) {
                  highlightSet.add(cur.toISOString().split('T')[0]);
                  cur.setDate(cur.getDate() + 1);
                }

                // Generate calendar months needed
                const calMonths = [];
                let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                while (d <= lastMonth) {
                  calMonths.push(new Date(d));
                  d.setMonth(d.getMonth() + 1);
                }

                return (
                  <div style={{ marginTop: '1.2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Tiempo de Entrega:
                      </span>
                      <input className="no-print" type="text" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} style={{ ...inputDash, fontSize: '0.85rem', fontWeight: '600', width: '120px', color: '#1e293b' }} />
                      <span className="print-only" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{deliveryTime}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.3rem' }}>
                        — {fmtDate(startDate)} al {fmtDate(endDate)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      {calMonths.map((monthStart, mIdx) => {
                        const year = monthStart.getFullYear();
                        const month = monthStart.getMonth();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const firstDow = (monthStart.getDay() + 6) % 7; // Monday=0
                        return (
                          <div key={mIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#334155', marginBottom: '4px', textAlign: 'center' }}>
                              {MONTHS_ES[month]} {year}
                            </div>
                            <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 16px)', gap: '1px', marginBottom: '2px' }}>
                                {['L','M','X','J','V','S','D'].map(d => (
                                  <div key={d} style={{ width: '16px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: '700', color: '#94a3b8' }}>{d}</div>
                                ))}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 16px)', gap: '1px' }}>
                                {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} style={{ width: '16px', height: '16px' }} />)}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                  const dayNum = i + 1;
                                  const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
                                  const isStart = iso === startDate.toISOString().split('T')[0];
                                  const isEnd = iso === endDate.toISOString().split('T')[0];
                                  const isInRange = highlightSet.has(iso);
                                  let bg = 'transparent';
                                  let color = '#475569';
                                  let fontWeight = '400';
                                  if (isStart || isEnd) { bg = '#334155'; color = 'white'; fontWeight = '700'; }
                                  else if (isInRange) { bg = '#e2e8f0'; color = '#1e293b'; }
                                  return (
                                    <div key={i} style={{ width: '16px', height: '16px', borderRadius: '2px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5px', color, fontWeight }}>
                                      {dayNum}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ paddingLeft: '0.8rem', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignSelf: 'center', fontSize: '0.8rem' }}>
                        <div style={{ color: '#1e293b' }}><span style={{ color: '#64748b', fontWeight: '600' }}>Inicio:</span> {fmtDate(startDate)}</div>
                        <div style={{ color: '#1e293b' }}><span style={{ color: '#64748b', fontWeight: '600' }}>Entrega:</span> {fmtDate(endDate)}</div>
                        <div style={{ color: '#1e293b' }}><span style={{ color: '#64748b', fontWeight: '600' }}>Semanas:</span> {(totalDays / 7).toFixed(1)}</div>
                        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#64748b' }}>
                          <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#334155', borderRadius: '1px', marginRight: '3px' }}></span>Inicio/Fin</span>
                          <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#e2e8f0', borderRadius: '1px', marginRight: '3px' }}></span>Producción</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Observaciones */}
        <div style={{ marginBottom: '2rem', fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.6' }}>
          <h3 style={secTitle}><span className="no-print">📌 </span>Observaciones</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.4rem' }}>
              {(() => {
                const fmtCur = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
                const numTotal = parseFloat(String(quoteTotal).replace(/[^\d.-]/g, '')) || 0;
                const perc = parseFloat(anticipo) || 0;
                const amt60 = numTotal * (perc / 100);
                const amt40 = numTotal * ((100 - perc) / 100);
                return (
                  <>
                    La producción de su pedido empezará a partir del pago del anticipo correspondiente al
                    <input type="number" value={anticipo} onChange={e => setAnticipo(e.target.value)} style={{ width: '40px', ...inputDash, textAlign: 'center', padding: '0.1rem 0.2rem', fontSize: '0.85rem', margin: '0 4px' }} />
                    % <strong style={{ color: '#ea580c' }}>({fmtCur(amt60)})</strong>, el {100 - perc}% restante <strong style={{ color: '#ea580c' }}>({fmtCur(amt40)})</strong> se entrega a la terminación o entrega de su proyecto.
                  </>
                );
              })()}
            </li>
            <li style={{ marginBottom: '0.3rem' }}>Un año de garantía por defectos de fabricación, sujeta a previa revisión.</li>
            <li style={{ marginBottom: '0.3rem' }}>Todo cambio una vez empezada la producción tendrá costo extra.</li>
            <li style={{ marginBottom: '0.3rem' }}><strong>No incluye:</strong> jaladeras y cubierta, instalación de aparatos eléctricos, trabajos eléctricos en mueblería, fontanería u otros servicios similares, nuestros servicios se limitan únicamente a la fabricación e instalación de muebles de carpintería.</li>
            <li style={{ marginBottom: '0.3rem' }}>No hay devolución del anticipo en caso de cancelación.</li>
            <li style={{ marginBottom: '0.3rem' }}>
              Cotización válida por 
              <input type="number" value={validez} onChange={e => setValidez(e.target.value)} style={{ width: '45px', ...inputDash, textAlign: 'center', padding: '0.1rem 0.2rem', fontSize: '0.85rem', margin: '0 4px' }} />
              días naturales.
            </li>
          </ul>
        </div>

        {/* Pie de página oficial */}
        <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
            Documento oficial de RD Carpintería
          </p>
          <a href="https://rdcarpinteria.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
            https://rdcarpinteria.com/
          </a>
        </div>

      </div>

      <style>{`
        /* Ocultar bordes de los inputs de la clase inputDash al imprimir */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body * { visibility: hidden; }
          body, html { background-color: white !important; }
          #cotizacion-doc, #cotizacion-doc * { visibility: visible; }
          #cotizacion-doc { position: absolute; left: 0; top: 0; width: 100%; background-color: white !important; box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; }
          
          input, textarea { 
            border: none !important; 
            background: transparent !important; 
            resize: none !important;
          }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default CotizacionView;
