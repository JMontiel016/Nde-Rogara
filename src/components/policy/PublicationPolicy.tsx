import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, FileCheck2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Fuente única de las condiciones de Nde Rogarã.
 * La página completa y el cuadro compacto muestran los mismos apartados,
 * evitando duplicar textos que podrían quedar desactualizados.
 */
const POLICY_SECTIONS: { title: string; content: React.ReactNode }[] = [
  {
    title: 'Contenido permitido',
    content: <p>Se permiten avisos reales y verificables de casas, departamentos, habitaciones, oficinas, locales y otros inmuebles ofrecidos en alquiler. El propietario debe informar datos, precios, disponibilidad, imágenes y medios de contacto veraces, y tener autorización para publicarlos.</p>,
  },
  {
    title: 'Contenido no permitido',
    content: <p>Se prohíben anuncios ajenos al alquiler inmobiliario; fotos de desnudez explícita, actos sexuales, abuso o violencia gráfica; publicidad de apuestas, pornografía, armas o sustancias ilícitas; promociones engañosas; suplantación de identidad; enlaces maliciosos; fotos de terceros sin permiso y cualquier anuncio contrario a la ley. Tampoco se permiten datos falsos, duplicaciones abusivas, insultos, amenazas, discriminación ni mensajes ofensivos. Las fotografías podrán ser analizadas mediante un servicio externo de moderación automatizada antes de su publicación; si falla la comprobación o el sistema no responde, la carga se rechaza de manera preventiva. Se puede solicitar revisión de un posible falso positivo.</p>,
  },
  {
    title: 'Alertas y revisión',
    content: <p>El sistema puede detectar coincidencias sospechosas y ocultarlas preventivamente para revisión. Esa detección no equivale a una infracción comprobada. El administrador examina los casos y puede aprobar, pausar o retirar anuncios dejando constancia del motivo.</p>,
  },
  {
    title: 'Retiro del anuncio y comunicaciones',
    content: <p>Cuando se retire un aviso por infracción, se registrarán su identificador, titular, datos de contacto, fecha y motivo. Se preparará un aviso al propietario por los medios habilitados y podrá solicitar una revisión; el envío automático depende de los servicios que se habiliten. La plataforma no asume responsabilidad por la veracidad de las ofertas de terceros.</p>,
  },
  {
    title: 'Pagos y reembolsos',
    content: <p>El precio, duración y límites del plan se muestran antes de confirmar el pago. En esta versión de exhibición, el pago por tarjeta o QR es simulado y no genera cargos reales. Solo deben ingresarse números de tarjeta ficticios suministrados por el sistema; nunca datos bancarios personales. Se recuerda únicamente una referencia no sensible de tarjeta (marca y últimos cuatro dígitos). La preferencia de renovación automática se registra, pero no ejecuta cargos recurrentes. En producción se deberá integrar un proveedor bancario autorizado. Si una publicación incumple estas políticas, su retirada <strong>no origina por sí misma un reembolso automático</strong>. Cada solicitud de devolución, cancelación o retractación será analizada conforme a la legislación paraguaya y las condiciones aplicables; no se renuncia a derechos que la ley reconozca al consumidor.</p>,
  },
  {
    title: 'Reseñas y datos personales',
    content: <p>Las reseñas son opiniones de visitantes, no necesariamente de inquilinos comprobados, y están sujetas a moderación. Los datos personales, incluido nombre, RUC, dirección y correo de facturación cuando se solicite, se emplearán para administrar publicaciones, pagos, alertas y comunicaciones necesarias. Los comprobantes generados por la demostración pueden imprimirse como PDF y no tienen validez tributaria. Una factura electrónica real exigirá emisión y validación ante SIFEN, y su envío por correo requerirá un servicio configurado. Los registros de aceptación de las políticas, la protección de datos personales y los permisos de publicación deberán validarse en servidor antes del lanzamiento público.</p>,
  },
  {
    title: 'Cupos de imágenes, videos y difusión',
    content: <p>Los planes Básico y Trimestral comparten un cupo total de imágenes entre todos los inmuebles del propietario, contando las fotos almacenadas de los anuncios pausados. En Premium y Profesional, las fotografías se limitan por inmueble. Cada plan tiene su cupo total de videos. Los espacios destacados se limitan por plan, por ciudad y por vigencia. Los enlaces a redes sociales y botones para compartir no implican publicación automática de contenido ni contratación de publicidad en Meta.</p>,
  },
];

const POLICY_NOTICE = 'Versión propuesta de las políticas, pendiente de identificación legal del operador, medios de contacto, política de privacidad y revisión profesional antes de cobrar al público.';

/** Texto completo: utilizado en la página de políticas de la web. */
export const PublicationPolicyText: React.FC = () => (
  <div className="space-y-4 text-sm leading-relaxed text-slate-700">
    <p><strong>Objeto del servicio.</strong> Nde Rogarã es un portal de publicación de avisos de alquiler de inmuebles. Los planes son para difundir publicaciones durante un período y bajo límites específicos; no garantizan contactos, reservas, contratos ni ocupación.</p>
    {POLICY_SECTIONS.map(({ title, content }, index) => (
      <div key={title}>
        <h3 className="font-extrabold text-slate-900">{index + 1}. {title}</h3>
        {content}
      </div>
    ))}
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{POLICY_NOTICE}</p>
  </div>
);

/**
 * Presentación resumida para el pago. Solo se despliega una sección por vez.
 * Al abrir el cuadro, todas las secciones permanecen plegadas.
 */
export const PublicationPolicyCompact: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3 text-xs text-slate-700">
      <p className="rounded-xl bg-sky-50 p-3 leading-5 text-slate-700">
        Revisá las condiciones de publicación, los pagos y el uso de tus datos. Seleccioná un tema para leerlo.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        {POLICY_SECTIONS.map(({ title, content }, index) => {
          const expanded = openIndex === index;
          return (
            <div key={title} className={index > 0 ? 'border-t border-slate-100' : ''}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpenIndex(expanded ? null : index)}
                className="flex w-full items-center justify-between gap-3 bg-white px-3 py-2.5 text-left font-bold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
              >
                <span>{index + 1}. {title}</span>
                <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}/>
              </button>
              {expanded && <div className="border-t border-slate-100 bg-slate-50 px-3 py-3 leading-5 text-slate-600">{content}</div>}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] leading-4 text-slate-500">Las condiciones están sujetas a revisión antes de habilitar cobros reales.</p>
    </div>
  );
};

export const PublicationPolicyPage: React.FC = () => {
  const { setCurrentView } = useApp();
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-brand-700"><FileCheck2 size={16}/>Normativa del portal</p>
        <h1 className="text-3xl font-black">Política de publicaciones y contratación</h1>
        <p className="text-sm text-slate-500">Condiciones de uso de Nde Rogarã · borrador para validación jurídica.</p>
      </div>
      <div className="rounded-3xl border bg-white p-6 sm:p-8"><PublicationPolicyText /></div>
      <div className="flex items-center gap-3 text-xs text-slate-500"><ShieldCheck size={18}/>La revisión y comunicación protegen a los visitantes y propietarios.<AlertTriangle size={16}/></div>
      <button className="text-sm font-bold text-brand-700" onClick={() => setCurrentView('plans')}>Volver a los planes</button>
    </main>
  );
};
