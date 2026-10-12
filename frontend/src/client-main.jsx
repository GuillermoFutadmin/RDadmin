import React from 'react';
import { createRoot } from 'react-dom/client';
import ClientPortal from './ClientPortal';
import ErrorBoundary from './ErrorBoundary';
import './client-portal.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClientPortal />
    </ErrorBoundary>
  </React.StrictMode>
);
