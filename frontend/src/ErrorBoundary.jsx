import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Fallo capturado por ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
          <img src="/logo-rd.png" alt="RD Carpintería" style={{ width: '200px', marginBottom: '2rem', objectFit: 'contain' }} />
          <h1 style={{ color: '#dc2626', fontSize: '2rem', marginBottom: '1rem', fontWeight: '800' }}>¡Ups! Se tuvo un fallo inesperado.</h1>
          <p style={{ color: '#475569', fontSize: '1.2rem', maxWidth: '600px', lineHeight: '1.6', marginBottom: '2rem' }}>
            La pantalla no pudo cargar correctamente debido a un error interno. <br/><br/>
            Por favor, intente recargar la página presionando <strong>F5</strong> o el botón de abajo. Si el problema persiste, contacte con el administrador del sistema.
          </p>
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '2rem', maxWidth: '800px', wordBreak: 'break-all', textAlign: 'left' }}>
            <strong>Detalle del error técnico:</strong> {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '1rem 2.5rem', background: '#ea580c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(234, 88, 12, 0.25)' }}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
