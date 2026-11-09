import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppProvider } from './context/AppContext';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Contener los errores de renderizado evita que un módulo deje toda la web vacía.
const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor principal de Nde Rogarã.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
