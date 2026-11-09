import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, X } from 'lucide-react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

/**
 * Último recurso ante errores de React. Mantiene los datos del navegador intactos.
 * En desarrollo informa la causa técnica para evitar diagnosticar a ciegas.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Error de renderizado desconocido' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error al cargar Nde Rogarã:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section role="alert" className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle size={28}/></div>
        <h1 className="text-2xl font-black text-slate-900">No se pudo cargar esta página</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Revisá el detalle del error o recargá para volver a intentar. Tus datos no se eliminarán automáticamente.</p>
        {import.meta.env.DEV && <div className="mt-4 rounded-xl bg-slate-100 p-3 text-left text-xs break-words text-slate-700"><strong>Detalle técnico:</strong> {this.state.message}</div>}
        <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800"><RefreshCw size={17}/>Recargar la página</button>
      </section>
    </main>;
  }
}

/**
 * Un error al abrir Publicar/Perfil no debe reemplazar Inicio, Planes y el mapa.
 * Se desmonta al cerrar la ventana y vuelve a crearse en la próxima apertura.
 */
export class SectionErrorBoundary extends React.Component<Props & { onRecover: () => void; label: string }, State> {
  state: State = { hasError: false, message: '' };
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Error inesperado del módulo' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`Fallo en ${this.props.label}:`, error, info.componentStack);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="relative z-[110] mx-auto my-6 max-w-xl rounded-3xl border border-amber-200 bg-white p-6 shadow-xl" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle size={21} className="mt-1 shrink-0 text-amber-700"/>
        <div className="flex-1"><h2 className="text-lg font-black text-slate-900">No se pudo abrir {this.props.label}</h2><p className="mt-2 text-sm text-slate-600">Cerrá esta sección y volvé a intentarlo. El resto de la web continuará funcionando.</p></div>
        <button type="button" aria-label="Cerrar sección" onClick={this.props.onRecover}><X size={19}/></button>
      </div>
      {import.meta.env.DEV && <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs break-words text-slate-700">{this.state.message}</p>}
      <button type="button" onClick={this.props.onRecover} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white"><ArrowLeft size={16}/>Volver</button>
    </div>;
  }
}
