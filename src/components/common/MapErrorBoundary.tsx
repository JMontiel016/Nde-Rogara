import React from 'react';

type Props = { children: React.ReactNode };
type State = { failed: boolean };

/** Contiene un error de Leaflet sin cerrar el formulario ni perder la edición. */
export class MapErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Error de mapa de ubicación:', error); }
  render() {
    if (this.state.failed) return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      El mapa no pudo cargarse. Podés buscar una dirección arriba y seleccionar uno de los resultados, o volver a abrir el formulario.
    </div>;
    return this.props.children;
  }
}
