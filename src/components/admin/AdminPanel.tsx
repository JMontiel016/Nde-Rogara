import React, { useEffect, useMemo, useState } from 'react';
import { SiteContentEditor } from './SiteContentEditor';
import { AdminMailCenter } from './AdminMailCenter';
import { LocalVideoGallery } from '../properties/LocalVideoGallery';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileText,
  Home,
  LayoutDashboard,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  Settings2,
  Mail,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatGs } from '../../utils/formatters';
import { effectiveOwnerPlan, readOwnerPlan, revokeDemoPlan } from '../../data/publicationPlans';
import {
  emailNotificationLink,
  moderationEvents,
  moderationNotice,
  whatsAppNotificationLink,
} from '../../services/adminGovernance';
import { adminUserEvents } from '../../services/adminUsers';
import { getPayments } from '../../services/billing';
import { fetchFiscalInvoices, viewFiscalInvoice, type FiscalInvoice } from '../../services/invoices';
import { getReceiptMailLogs, resendReceiptFromAdmin, type ReceiptMailLog } from '../../services/adminReceiptMail';
import type { Property, UserProfile, PropertyReview } from '../../types';
import { firebaseAuth } from '../../services/firebaseAuth';

type Tab = 'overview' | 'owners' | 'alerts' | 'reviews' | 'invoices' | 'site' | 'mail';

type FirebaseDirectoryUser = {
  uid:string;name:string;email:string;emailVerified:boolean;disabled:boolean;
  provider:string;role:'admin'|'landlord';createdAt:string|null;lastSignInAt:string|null;
};

type OwnerRow = {
  key: string;
  user: UserProfile | null;
  name: string;
  email: string;
  phone: string;
  properties: Property[];
  planName: string;
  expiresAt: string | null;
  startsAt: string | null;
  activePlan: boolean;
  demo: boolean;
  state: string;
};

const shell = 'bg-white rounded-3xl border border-slate-200/90 shadow-sm';
const soft = 'bg-slate-50 rounded-2xl border border-slate-200';

const date = (value?: string | null) =>
  value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('es-PY') : '—';

const dateTime = (value?: string | null) =>
  value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('es-PY') : '—';

const propertyLabel = (property: Property) => {
  if (property.moderationStatus === 'removed') return { text: 'Retirada', color: 'red' as const };
  if (property.moderationStatus === 'flagged') return { text: 'En revisión', color: 'amber' as const };
  if (property.isActive === false) return { text: 'Pausada', color: 'slate' as const };
  return { text: 'Publicada', color: 'green' as const };
};

const Pill = ({ children, color = 'slate' }: { children: React.ReactNode; color?: 'slate' | 'green' | 'red' | 'amber' | 'blue' }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
      color === 'green'
        ? 'bg-emerald-50 text-emerald-700'
        : color === 'red'
          ? 'bg-rose-50 text-rose-700'
          : color === 'amber'
            ? 'bg-amber-50 text-amber-800'
            : color === 'blue'
              ? 'bg-sky-50 text-sky-700'
              : 'bg-slate-100 text-slate-600'
    }`}
  >
    {children}
  </span>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="px-5 py-12 text-center text-sm text-slate-500">{children}</p>
);

const StatCard = ({ icon: Icon, title, value, hint }: { icon: React.ElementType; title: string; value: string | number; hint: string }) => (
  <article className={`${shell} p-5`}>
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
        <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon size={22} />
      </div>
    </div>
  </article>
);

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    userRole,
    properties,
    registeredUsers,
    moderateProperty,
    deleteProperty,
    togglePropertyStatus,
    openPropertyDetail,
    reviews,
    reviewModeration,
    adminSetUserStatus,
    adminDeleteUser,
  } = useApp();

  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [confirmation, setConfirmation] = useState<{ property?: Property; user?: UserProfile; action: string } | null>(null);
  const [reason, setReason] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [actionError, setActionError] = useState('');
  const [adminActionNotice, setAdminActionNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [blockedReviews, setBlockedReviews] = useState<(PropertyReview & {moderationReason?:string})[]>([]);
  const [reviewIssue, setReviewIssue] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [receiptLogs, setReceiptLogs] = useState<ReceiptMailLog[]>([]);
  const [receiptLogLoading, setReceiptLogLoading] = useState(false);
  const [receiptLogError, setReceiptLogError] = useState('');
  const [receiptSending, setReceiptSending] = useState('');
  const [receiptSelected, setReceiptSelected] = useState('');
  const [receiptCopies, setReceiptCopies] = useState('');
  const [receiptActionStatus, setReceiptActionStatus] = useState('');
  const [firebaseUsers, setFirebaseUsers] = useState<FirebaseDirectoryUser[]>([]);
  const [firebaseUsersError, setFirebaseUsersError] = useState('');
  const [firebaseUsersLoading, setFirebaseUsersLoading] = useState(false);

  useEffect(() => {
    const cb = () => setRevision((v) => v + 1);
    ['storage', 'nderogara-plan-updated', 'nderogara-billing-updated', 'nderogara-moderation-changed', 'nderogara-admin-users-changed', 'nderogara-invoices-updated'].forEach((evt) =>
      window.addEventListener(evt, cb),
    );
    return () => {
      ['storage', 'nderogara-plan-updated', 'nderogara-billing-updated', 'nderogara-moderation-changed', 'nderogara-admin-users-changed', 'nderogara-invoices-updated'].forEach((evt) =>
        window.removeEventListener(evt, cb),
      );
    };
  }, []);

  useEffect(() => {
    let active = true;
    setInvoiceLoading(true);
    setInvoiceError('');
    fetchFiscalInvoices()
      .then((data) => {
        if (active) setInvoices(data);
      })
      .catch((err) => {
        if (active) {
          setInvoices([]);
          setInvoiceError(err instanceof Error ? err.message : 'No se pudo cargar la facturación.');
        }
      })
      .finally(() => {
        if (active) setInvoiceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const loadFirebaseUsers = async () => {
    setFirebaseUsersLoading(true);
    setFirebaseUsersError('');
    try {
      const token=await firebaseAuth.getFreshIdToken();
      if(!token) throw new Error('Iniciá sesión como administrador.');
      const response=await fetch('/api/admin/users',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      const data:{users?:FirebaseDirectoryUser[];error?:string;partial?:boolean}=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'No se pudo consultar Firebase Authentication.');
      setFirebaseUsers(data.users||[]);
      if(data.partial)setFirebaseUsersError('Se muestran las primeras 2000 cuentas. Hay más resultados en Firebase.');
    }catch(err){setFirebaseUsersError(err instanceof Error?err.message:'Error del directorio Firebase.');}
    finally{setFirebaseUsersLoading(false);}
  };
  useEffect(()=>{if(tab==='owners'&&userRole==='admin')void loadFirebaseUsers();},[tab,userRole]);

  const refreshReceiptLogs = async () => {
    setReceiptLogLoading(true);
    setReceiptLogError('');
    try { setReceiptLogs(await getReceiptMailLogs()); }
    catch (err) { setReceiptLogError(err instanceof Error ? err.message : 'No se pudo consultar el estado SMTP.'); }
    finally { setReceiptLogLoading(false); }
  };

  useEffect(() => {
    if (tab !== 'invoices' || userRole !== 'admin') return;
    void refreshReceiptLogs();
    const interval = window.setInterval(() => { if (!document.hidden) void refreshReceiptLogs(); }, 60000);
    return () => window.clearInterval(interval);
  }, [tab, userRole]);

  const lastReceiptLog = (invoice: FiscalInvoice): ReceiptMailLog | null => {
    const matches = receiptLogs.filter(log => log.paymentId === invoice.paymentId);
    // Aceptado SMTP tiene prioridad; un error posterior no implica pérdida del envío original.
    return matches.find(log => log.status === 'accepted') || matches[0] || null;
  };
  const resendInvoice = async (invoice: FiscalInvoice) => {
    if (receiptSending) return;
    setReceiptSending(invoice.id);
    setReceiptActionStatus('');
    try {
      const copies = receiptCopies.split(';').map(value => value.trim()).filter(Boolean);
      if (copies.length > 3 || copies.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
        throw new Error('Ingresá como máximo 3 direcciones válidas separadas por punto y coma (;).');
      }
      const destination = [invoice.customerEmail, ...copies].join('; ');
      if (!window.confirm(`¿Querés reenviar el comprobante ${invoice.documentNumber} a ${destination}?\n\nLa acción enviará nuevamente el PDF aunque el correo ya figure como aceptado.`)) {
        setReceiptSending('');
        return;
      }
      await resendReceiptFromAdmin(invoice, copies);
      setReceiptActionStatus(`Nuevo reenvío de ${invoice.documentNumber} aceptado por SMTP para ${invoice.customerEmail}${copies.length ? `; CC: ${copies.join('; ')}` : ''}.`);
      setReceiptSelected('');
      setReceiptCopies('');
      await refreshReceiptLogs();
    } catch (err) {
      setReceiptActionStatus(err instanceof Error ? err.message : 'No se pudo reenviar el comprobante.');
      await refreshReceiptLogs();
    } finally { setReceiptSending(''); }
  };

  const loadBlockedReviews = async () => {
    setReviewLoading(true);setReviewIssue('');
    try {
      const token=await firebaseAuth.getFreshIdToken();
      if(!token)throw new Error('Iniciá sesión con la cuenta de Firebase autorizada.');
      const response=await fetch('/api/admin/reviews',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      const data:{reviews?:(PropertyReview & {moderationReason?:string})[];error?:string}
        =await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'No se pudieron consultar reseñas.');
      setBlockedReviews(data.reviews||[]);
    }catch(err){setReviewIssue(err instanceof Error?err.message:'No fue posible cargar las alertas.');}
    finally{setReviewLoading(false);}
  };
  // Solo se consulta al abrir esta sección, nunca se hace polling cuando está vacía.
  useEffect(()=>{if(tab==='reviews' && userRole==='admin')void loadBlockedReviews();},[tab,userRole]);
  const resolveBlockedReview = async (id:string,action:'publish'|'hide') => {
    setReviewIssue('');
    try {
      const token=await firebaseAuth.getFreshIdToken();
      if(!token)throw new Error('Sesión de administrador no válida.');
      const response=await fetch('/api/admin/reviews',{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({id,action})});
      const data:{error?:string}=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'No se pudo moderar.');
      await loadBlockedReviews();
    }catch(err){setReviewIssue(err instanceof Error?err.message:'No se pudo procesar el caso.');}
  };

  const ownerRows = useMemo<OwnerRow[]>(() => {
    const rows = new Map<string, OwnerRow>();
    const users = registeredUsers.filter((u) => u.role === 'landlord');

    for (const user of users) {
      const key = user.email.trim().toLowerCase();
      const selection = readOwnerPlan(user.id);
      const plan = effectiveOwnerPlan(user.id);
      rows.set(key, {
        key,
        user,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        properties: [],
        planName: plan?.name || 'Sin plan vigente',
        expiresAt: selection?.expiresAt || null,
        startsAt: selection?.activatedAt || null,
        activePlan: !!plan,
        demo: !!selection,
        state: user.restrictionStage === 'blocked' ? 'Bloqueado' : user.status === 'inactive' ? 'Suspendido' : 'Activo',
      });
    }

    for (const property of properties) {
      const key = property.ownerEmail?.trim().toLowerCase() || `sin-correo-${property.ownerId || property.id}`;
      const existing = Array.from(rows.values()).find((row) => row.email.toLowerCase() === key || (property.ownerId && row.user?.id === property.ownerId));
      if (existing) {
        existing.properties.push(property);
      } else if (rows.has(key)) {
        rows.get(key)!.properties.push(property);
      } else {
        rows.set(key, {
          key,
          user: null,
          name: property.ownerName || 'Propietario sin identificar',
          email: property.ownerEmail || 'No informada',
          phone: property.ownerPhone || '',
          properties: [property],
          planName: 'No registrado',
          expiresAt: null,
          startsAt: null,
          activePlan: false,
          demo: false,
          state: 'Sin cuenta vinculada',
        });
      }
    }

    return Array.from(rows.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [properties, registeredUsers, revision]);

  const owner = ownerRows.find((row) => row.key === selected) || null;
  const searchTerm = search.trim().toLowerCase();
  const filteredOwners = ownerRows.filter((row) =>
    [row.name, row.email, row.phone, row.planName, ...row.properties.map((property) => property.title)].some((text) => text.toLowerCase().includes(searchTerm)),
  );

  // Priorizar los anuncios más antiguos en revisión para no dejarlos esperando.
  // La aprobación sigue necesitando comprobar el contenido de fotos y videos.
  const flaggedProperties = properties
    .filter((property) => property.moderationStatus === 'flagged')
    .sort((a, b) => Date.parse(a.createdAt||'') - Date.parse(b.createdAt||''));
  const pendingReviews = blockedReviews;
  const publishedProperties = properties.filter(
    (property) => property.moderationStatus !== 'removed' && property.isActive !== false,
  );
  const activePlans = ownerRows.filter((row) => row.activePlan);
  const approvedInvoices = invoices.filter((inv) => inv.status === 'approved');
  const pendingInvoices = invoices.filter((inv) => inv.status === 'pending');
  const rejectedInvoices = invoices.filter((inv) => inv.status === 'rejected');
  const simulatedMonthlyIncome=getPayments().filter(p=>p.status==='paid'&&new Date(p.createdAt).getMonth()===new Date().getMonth()&&new Date(p.createdAt).getFullYear()===new Date().getFullYear()).reduce((sum,p)=>sum+p.amount,0);

  const menu: { id: Tab; name: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', name: 'Resumen', icon: LayoutDashboard },
    { id: 'owners', name: 'Usuarios y propietarios', icon: Users, count: Math.max(ownerRows.length, firebaseUsers.length) },
    { id: 'alerts', name: 'Moderación', icon: ShieldAlert, count: flaggedProperties.length },
    { id: 'reviews', name: 'Reseñas', icon: Star, count: pendingReviews.length },
    { id: 'invoices', name: 'Facturas', icon: FileText, count: invoices.length },
    { id: 'site', name: 'Sitio y soporte', icon: Settings2 },
    { id: 'mail', name: 'Centro de correo', icon: Mail },
  ];

  const openTab = (next: Tab) => {
    setTab(next);
    setSelected(null);
    setSearch('');
    setPdfError('');
  };

  const ask = (data: { property?: Property; user?: UserProfile; action: string }) => {
    setConfirmation(data);
    setReason(data.action === 'approve' ? 'Fotografías, videos y descripción revisados. Publicación autorizada.' : '');
    setConfirmEmail('');
    setActionError('');
  };

  const apply = async () => {
    if (!confirmation || reason.trim().length < 12 || busy) return;
    if (confirmation.action === 'delete' && confirmEmail.trim().toLowerCase() !== confirmation.user?.email.toLowerCase()) return;

    setBusy(true);
    setActionError('');
    try {
      if (confirmation.property) {
        if (confirmation.action === 'delete-property') deleteProperty(confirmation.property.id);
        else {
          const action=confirmation.action === 'approve' ? 'approved' : 'removed';
          moderateProperty(confirmation.property.id, action, reason.trim());
          setAdminActionNotice('Decisión registrada en este navegador. Verificando notificación SMTP al propietario…');
          // El cliente es notificado dentro del navegador y, si SMTP funciona,
          // también por correo. El error SMTP no revierte la revisión ya realizada.
          const property=confirmation.property;
          if (property.ownerEmail && /@/.test(property.ownerEmail)) {
            try {
              const token=await firebaseAuth.getFreshIdToken();
              if (!token) throw new Error('La sesión Firebase caducó.');
              const subject=action==='approved'
                ? 'Nde Rogarã | Tu anuncio fue aprobado'
                : 'Nde Rogarã | Aviso sobre tu publicación';
              const body=action==='approved'
                ? `Hola, ${property.ownerName||'propietario'}:\n\nTu aviso «${property.title}» fue aprobado en Nde Rogarã.\nMotivo: ${reason.trim()}\n\nEntrá a tu cuenta para consultar su estado.\n\nEquipo Nde Rogarã`
                : moderationNotice(property.title,reason.trim());
              const response=await fetch('/api/admin/mail/send',{method:'POST',
                headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
                body:JSON.stringify({to:property.ownerEmail,subject,body})});
              const data:{sent?:boolean;error?:string}=await response.json().catch(()=>({}));
              if (!response.ok||!data.sent) throw new Error(data.error||'SMTP no confirmó el envío.');
              setAdminActionNotice('Decisión guardada. El correo de aviso fue aceptado por SMTP para '+property.ownerEmail+'.');
            }catch(err) {
              setAdminActionNotice('La revisión se guardó localmente, pero el correo NO fue aceptado por SMTP: '+
                (err instanceof Error?err.message:'Error del servidor.'));
            }
          }
        }
      }
      if (confirmation.user) {
        const user = confirmation.user;
        const result =
          confirmation.action === 'delete'
            ? await adminDeleteUser(user.id, reason.trim())
            : adminSetUserStatus(user.id, confirmation.action === 'suspend' ? 'inactive' : 'active', reason.trim());
        if (!result) throw new Error('No se pudo actualizar esta cuenta.');
        if (confirmation.action === 'delete') setSelected(null);
      }
      setConfirmation(null);
      setRevision((v) => v + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ocurrió un error.');
    } finally {
      setBusy(false);
    }
  };

  if (userRole !== 'admin' || !currentUser) {
    return <p className="p-8">Acceso exclusivo de administración.</p>;
  }

  const ownerDirectory = (
    <section className="space-y-5">
      <div className={`${shell} p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">Usuarios registrados en Firebase</h2>
            <p className="mt-1 text-xs text-slate-500">Todas las cuentas creadas, incluso si nunca publicaron. Último acceso reportado por Firebase Authentication.</p>
          </div>
          <button type="button" disabled={firebaseUsersLoading} onClick={()=>void loadFirebaseUsers()}
            className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-800 disabled:opacity-50">
            {firebaseUsersLoading?'Consultando…':'Actualizar usuarios'}
          </button>
        </div>
        {firebaseUsersError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{firebaseUsersError}</p>}
        <p className="text-xs font-bold text-slate-700">{firebaseUsers.length} cuentas verificadas en el directorio</p>
        {firebaseUsers.length===0 && !firebaseUsersLoading && !firebaseUsersError &&
          <p className="text-sm text-slate-500">Todavía no hay cuentas visibles. Utilizá Actualizar usuarios.</p>}
        <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-[650px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600"><tr>
              <th className="p-3">Cuenta</th><th className="p-3">Rol</th>
              <th className="p-3">Alta</th><th className="p-3">Último acceso</th><th className="p-3">Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{firebaseUsers.filter(item=>
              !search.trim() || (item.name+' '+item.email).toLowerCase().includes(search.toLowerCase())
            ).map(item=><tr key={item.uid}>
              <td className="p-3"><strong>{item.name}</strong><p className="text-slate-500">{item.email}</p></td>
              <td className="p-3">{item.role==='admin'?'Administrador':'Cuenta registrada'}</td>
              <td className="p-3">{date(item.createdAt)}</td>
              <td className="p-3">{dateTime(item.lastSignInAt)}</td>
              <td className="p-3"><Pill color={item.disabled?'red':'green'}>{item.disabled?'Deshabilitado':'Habilitado'}</Pill></td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">Las acciones de suspender/eliminar del panel inferior pertenecen al módulo local de demostración y no cambian por sí solas Firebase Authentication.</p>
      </div>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Propietarios, planes y publicaciones</h2>
          <p className="mt-1 text-sm text-slate-500">Cada propietario muestra su plan, vencimiento y todos los avisos cargados.</p>
        </div>
        <label className="flex min-w-[280px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Buscar por nombre, correo o inmueble"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </header>

      <div className="grid gap-5 xl:grid-cols-[380px,minmax(0,1fr)]">
        <aside className={`${shell} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-black text-slate-900">Lista de propietarios</h3>
            <Pill color="blue">{filteredOwners.length}</Pill>
          </div>
          <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
            {filteredOwners.length === 0 && <Empty>No se encontraron propietarios con esos datos.</Empty>}
            {filteredOwners.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => setSelected(row.key)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selected === row.key
                    ? 'border-brand-300 bg-brand-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{row.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.email}</p>
                  </div>
                  <ChevronRight size={18} className="mt-1 text-slate-400" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill color={row.activePlan ? 'green' : row.state === 'Suspendido' || row.state === 'Bloqueado' ? 'red' : 'slate'}>
                    {row.activePlan ? row.planName : row.state === 'Suspendido' || row.state === 'Bloqueado' ? row.state : row.planName}
                  </Pill>
                  <Pill color="blue">{row.properties.length} publicaciones</Pill>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div>
                    <span className="block font-semibold text-slate-700">Vence</span>
                    {date(row.expiresAt)}
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-700">Estado</span>
                    {row.state}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className={`${shell} p-6`}>
          {!owner ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center text-slate-500">
              <Users className="mb-4 text-slate-300" size={48} />
              <h3 className="text-lg font-black text-slate-800">Seleccioná un propietario</h3>
              <p className="mt-2 max-w-md text-sm">
                Desde aquí podés ver su plan, fecha de vencimiento, contacto, publicaciones y realizar acciones administrativas.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <button className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700" onClick={() => setSelected(null)}>
                    <ArrowLeft size={16} /> Volver a la lista
                  </button>
                  <h3 className="text-2xl font-black text-slate-900">{owner.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{owner.email}{owner.phone ? ` · ${owner.phone}` : ''}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Pill color={owner.activePlan ? 'green' : 'slate'}>{owner.planName}</Pill>
                    <Pill color="blue">Vence: {date(owner.expiresAt)}</Pill>
                    <Pill color={owner.state === 'Suspendido' || owner.state === 'Bloqueado' ? 'red' : 'green'}>{owner.state}</Pill>
                  </div>
                </div>
                {owner.user && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => ask({ user: owner.user!, action: owner.user?.status === 'inactive' ? 'activate' : 'suspend' })}
                    >
                      {owner.user.status === 'inactive' ? 'Reactivar usuario' : 'Suspender usuario'}
                    </button>
                    {owner.activePlan && (
                      <button
                        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                        onClick={() => {
                          revokeDemoPlan(owner.user!.id);
                          setRevision((v) => v + 1);
                        }}
                      >
                        Retirar plan
                      </button>
                    )}
                    <button
                      className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                      onClick={() => ask({ user: owner.user!, action: 'delete' })}
                    >
                      Eliminar usuario
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className={`${soft} p-4`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plan actual</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{owner.planName}</p>
                  <p className="mt-1 text-xs text-slate-500">Activado: {date(owner.startsAt)}</p>
                </div>
                <div className={`${soft} p-4`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Vencimiento</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{date(owner.expiresAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">Estado del plan: {owner.activePlan ? 'Vigente' : 'Sin cobertura activa'}</p>
                </div>
                <div className={`${soft} p-4`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Publicaciones</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{owner.properties.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Activas, pausadas o bajo revisión</p>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-900">Publicaciones del propietario</h4>
                  <Pill color="blue">{owner.properties.length} avisos</Pill>
                </div>
                <div className="space-y-4">
                  {owner.properties.length === 0 && <Empty>Este propietario todavía no tiene publicaciones registradas.</Empty>}
                  {owner.properties.map((property) => {
                    const status = propertyLabel(property);
                    return (
                      <article key={property.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 xl:flex-row">
                          <img
                            src={property.images?.[0] || '/default-avatar.png'}
                            alt={property.title}
                            className="h-32 w-full rounded-2xl object-cover xl:w-44"
                          />
                          <div className="flex-1">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <h5 className="text-lg font-black text-slate-900">{property.title}</h5>
                                <p className="mt-1 text-sm text-slate-500">{property.city} · {property.neighborhood} · {formatGs(property.priceMonth)}/mes</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Pill color={status.color}>{status.text}</Pill>
                                  <Pill color="slate">ID: {property.id}</Pill>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 md:min-w-[220px]">
                                <div>
                                  <span className="block font-semibold text-slate-700">Creado</span>
                                  {date(property.createdAt)}
                                </div>
                                <div>
                                  <span className="block font-semibold text-slate-700">Habitaciones</span>
                                  {property.bedrooms}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => openPropertyDetail(property.id)}
                              >
                                <Eye size={16} /> Ver aviso
                              </button>
                              <button
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => togglePropertyStatus(property.id)}
                              >
                                {property.isActive === false ? 'Reactivar' : 'Pausar'}
                              </button>
                              <button
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                                onClick={() => ask({ property, action: 'remove' })}
                              >
                                Retirar publicación
                              </button>
                              <button className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50" onClick={() => ask({ property, action: 'delete-property' })}><Trash2 size={15}/>Eliminar aviso</button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 xl:flex-row">
          <aside className="xl:w-72 xl:shrink-0">
            <div className={`${shell} sticky top-24 p-4`}>
              <div className="mb-5 border-b border-slate-200 pb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Nde Rogarã / Administración</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">Centro de operaciones</h1>
                <p className="mt-2 text-sm text-slate-500">Panel administrativo organizado por módulos clave.</p>
              </div>
              <nav className="space-y-2">
                {menu.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                        active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={18} />
                        {item.name}
                      </span>
                      {typeof item.count === 'number' && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <section className="min-w-0 flex-1 space-y-6">
            {tab === 'overview' && (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard icon={Users} title="Propietarios" value={ownerRows.length} hint={`${activePlans.length} con plan vigente`} />
                  <StatCard icon={Home} title="Publicaciones" value={publishedProperties.length} hint={`${properties.length} avisos registrados`} />
                  <StatCard icon={ShieldAlert} title="Moderación" value={flaggedProperties.length} hint="Anuncios pendientes de revisión" />
                  <StatCard icon={CircleDollarSign} title="Facturación simulada" value={formatGs(simulatedMonthlyIncome)} hint={`${approvedInvoices.length} comprobantes del sistema · sin ingresos reales`} />
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
                  <section className={`${shell} p-6`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-black text-slate-900">Propietarios con actividad reciente</h2>
                        <p className="mt-1 text-sm text-slate-500">Acceso rápido a perfiles, planes y publicaciones.</p>
                      </div>
                      <button className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => openTab('owners')}>
                        Ver todos
                      </button>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      {ownerRows.slice(0, 4).map((row) => (
                        <button
                          key={row.key}
                          type="button"
                          onClick={() => {
                            setSelected(row.key);
                            setTab('owners');
                          }}
                          className="rounded-2xl border border-slate-200 p-4 text-left hover:border-brand-300 hover:bg-brand-50/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-slate-900">{row.name}</p>
                              <p className="mt-1 text-xs text-slate-500">{row.email}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-400" />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Pill color={row.activePlan ? 'green' : 'slate'}>{row.planName}</Pill>
                            <Pill color="blue">{row.properties.length} avisos</Pill>
                          </div>
                          <p className="mt-3 text-xs text-slate-500">Vence: {date(row.expiresAt)}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className={`${shell} p-6`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-black text-slate-900">Actividad administrativa</h2>
                        <p className="mt-1 text-sm text-slate-500">Moderación, reseñas y facturación.</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-4">
                      <div className={`${soft} p-4`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-900">Reseñas pendientes</p>
                            <p className="mt-1 text-xs text-slate-500">Opiniones en espera de aprobación.</p>
                          </div>
                          <Pill color={pendingReviews.length > 0 ? 'amber' : 'green'}>{pendingReviews.length}</Pill>
                        </div>
                      </div>
                      <div className={`${soft} p-4`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-900">Publicaciones observadas</p>
                            <p className="mt-1 text-xs text-slate-500">Avisos marcados por moderación.</p>
                          </div>
                          <Pill color={flaggedProperties.length > 0 ? 'amber' : 'green'}>{flaggedProperties.length}</Pill>
                        </div>
                      </div>
                      <div className={`${soft} p-4`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-900">Facturas registradas</p>
                            <p className="mt-1 text-xs text-slate-500">Comprobantes visibles desde el panel.</p>
                          </div>
                          <Pill color="blue">{invoices.length}</Pill>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </>
            )}

            {adminActionNotice && <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-900">
              <span>{adminActionNotice}</span>
              <button type="button" aria-label="Cerrar aviso" onClick={()=>setAdminActionNotice('')}><X size={18}/></button>
            </div>}
            {tab === 'owners' && ownerDirectory}
            {tab === 'site' && <SiteContentEditor />}
            {tab === 'mail' && <AdminMailCenter />}

            {tab === 'alerts' && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Moderación de publicaciones</h2>
                  <p className="mt-1 text-sm text-slate-500">Se priorizan los avisos que llevan más tiempo esperando. Revisá las fotografías y videos antes de aprobar. La decisión notifica al propietario y solicita un correo automático desde el servidor SMTP.</p>
                </div>
                <div className={`${shell} divide-y`}>
                  {flaggedProperties.length === 0 ? (
                    <Empty>No hay publicaciones pendientes de revisión.</Empty>
                  ) : (
                    flaggedProperties.map((property) => (
                      <article key={property.id} className="p-5">
                        <div className="flex flex-col gap-4 md:flex-row">
                          <img src={property.images?.[0] || '/default-avatar.png'} alt={property.title} className="h-28 w-full rounded-2xl object-cover md:w-40" />
                          <div className="flex-1">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <h3 className="text-lg font-black text-slate-900">{property.title}</h3>
                                <p className="mt-1 text-sm text-slate-500">{property.ownerName} · {property.ownerEmail} · {property.images?.length || 0} fotos · {property.videos?.length || 0} videos · En espera desde {dateTime(property.createdAt)}</p>
                                <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                  {property.moderationReason || 'El anuncio necesita revisión por política interna.'}
                                </p>
                                {Boolean(property.images?.length) && (
                                  <div className="mt-3 flex max-w-2xl flex-wrap gap-2" aria-label="Fotografías para revisar">
                                    {property.images.slice(0,8).map((image,index)=>(
                                      <a key={index} href={image} target="_blank" rel="noopener noreferrer"
                                        title={`Abrir fotografía ${index+1}`}>
                                        <img src={image} alt={`Fotografía ${index+1} de ${property.title}`}
                                          className="h-20 w-24 rounded-lg border border-slate-200 bg-slate-100 object-cover"/>
                                      </a>
                                    ))}
                                    {property.images.length>8 && <p className="text-xs text-slate-600">+{property.images.length-8} fotografías adicionales en Ver anuncio</p>}
                                  </div>
                                )}
                                {Boolean(property.videos?.length) && <div className="mt-3 max-w-xl"><LocalVideoGallery videos={property.videos||[]}/></div>}
                                <p className="mt-2 text-[11px] text-slate-500">Revisá imágenes y video antes de aprobar. Los archivos guardados solo en otro navegador no estarán disponibles para su inspección.</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => openPropertyDetail(property.id)}>
                                  Ver anuncio
                                </button>
                                <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => ask({ property, action: 'approve' })}>
                                  Aprobar ahora
                                </button>
                                <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => ask({ property, action: 'remove' })}>
                                  Retirar por infracción
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <section className={`${shell} p-6`}>
                  <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <BookOpen size={18} /> Últimas decisiones
                  </h3>
                  <div className="mt-4 space-y-4">
                    {moderationEvents().slice(0, 8).map((event) => (
                      <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-black text-slate-900">{event.propertyTitle}</p>
                            <p className="mt-1 text-sm text-slate-600">{event.reason}</p>
                            <p className="mt-2 text-xs text-slate-500">{dateTime(event.createdAt)} · {event.ownerEmail}</p>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm font-semibold text-brand-700">
                            <a href={emailNotificationLink(event.ownerEmail, 'Aviso de publicación - Nde Rogarã', moderationNotice(event.propertyTitle, event.reason))}>Preparar correo</a>
                            {event.ownerPhone && (
                              <a href={whatsAppNotificationLink(event.ownerPhone, moderationNotice(event.propertyTitle, event.reason))} target="_blank" rel="noreferrer">
                                Preparar WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {moderationEvents().length === 0 && <Empty>No hay decisiones registradas todavía.</Empty>}
                  </div>
                </section>
              </section>
            )}

            {tab === 'reviews' && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Reseñas bloqueadas</h2>
                    <p className="mt-1 text-sm text-slate-500">Las reseñas permitidas se publican automáticamente en su inmueble. Aquí solo aparecen denuncias detectadas por el filtro.</p>
                  </div>
                  <button type="button" disabled={reviewLoading} onClick={()=>void loadBlockedReviews()}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">
                    {reviewLoading?'Consultando…':'Actualizar casos'}
                  </button>
                </div>
                {reviewIssue && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{reviewIssue}</p>}
                <div className={`${shell} divide-y`}>
                  {reviewLoading && <p className="p-5 text-sm text-slate-500">Verificando contenido bloqueado…</p>}
                  {!reviewLoading && blockedReviews.length===0 && <Empty>No hay reseñas bloqueadas. Las opiniones normales aparecen directamente en sus respectivas publicaciones.</Empty>}
                  {!reviewLoading && blockedReviews.map(review=>(
                    <article key={review.id} className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-black text-slate-900">{review.author}</p>
                            <span className="text-amber-500">{'★'.repeat(Math.min(5,Math.max(1,review.rating)))}</span>
                            <Pill color="red">Bloqueada</Pill>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">Publicación: {review.propertyTitle} · {dateTime(review.date)}</p>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{review.comment}</p>
                          <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                            Motivo: {review.moderationReason||'Contenido señalado por las políticas del portal.'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                            onClick={()=>openPropertyDetail(review.propertyId!)}>Ver publicación</button>
                          <button type="button" className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                            onClick={()=>void resolveBlockedReview(review.id,'hide')}>Descartar caso</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {tab === 'invoices' && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Facturas</h2>
                  <p className="mt-1 text-sm text-slate-500">Comprobantes de contratación y estado de envío SMTP. Al contratar se solicita automáticamente el envío del PDF; desde aquí podés revisar y reintentar únicamente si hay fallos o falta confirmación.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard icon={FileText} title="Emitidas" value={approvedInvoices.length} hint="Comprobantes registrados" />
                  <StatCard icon={AlertTriangle} title="Pendientes" value={pendingInvoices.length} hint="En espera de confirmación" />
                  <StatCard icon={X} title="Rechazadas" value={rejectedInvoices.length} hint="Con observación registrada" />
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-900">
                  El estado <strong>Registrada</strong> corresponde al comprobante local, no a su envío. «Aceptado por SMTP» confirma recepción por el proveedor de correo, no entrega en la bandeja del destinatario.
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="font-bold text-emerald-700">Aceptados: {invoices.filter(inv=>lastReceiptLog(inv)?.status==='accepted').length}</span>
                    <span className="font-bold text-rose-700">Fallidos: {invoices.filter(inv=>lastReceiptLog(inv)?.status==='failed').length}</span>
                    <span className="font-bold text-amber-800">Sin confirmación: {invoices.filter(inv=>!lastReceiptLog(inv)).length}</span>
                  </div>
                  <button type="button" onClick={()=>void refreshReceiptLogs()} disabled={receiptLogLoading}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">
                    {receiptLogLoading?'Consultando…':'Actualizar estado de correos'}
                  </button>
                </div>
                {receiptLogError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">No fue posible comprobar los envíos: {receiptLogError}. No se puede confirmar ningún envío hasta recuperar el historial del servidor.</p>}
                {receiptActionStatus && <p role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{receiptActionStatus}</p>}
                {invoiceLoading && <div className={`${shell} p-5 text-sm`}>Cargando facturas…</div>}
                {invoiceError && <div className={`${shell} p-5 text-sm text-rose-700`}>{invoiceError}</div>}
                {pdfError && <p className="text-xs text-rose-700">{pdfError}</p>}

                {!invoiceLoading && !invoiceError && (
                  <div className={`${shell} overflow-x-auto`}>
                    <table className="min-w-[1080px] w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          {['Emisión', 'Número', 'Cliente', 'Monto', 'Comprobante', 'Envío por correo', 'Documento'].map((heading) => (
                            <th key={heading} className="px-4 py-4 text-left font-bold">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-t border-slate-100 align-top">
                            <td className="px-4 py-4">{date(invoice.issueDate)}</td>
                            <td className="px-4 py-4 font-semibold text-slate-900">{invoice.documentNumber || '—'}</td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">{invoice.customerName}</p>
                              <p className="mt-1 text-xs text-slate-500">{invoice.customerRuc || invoice.customerEmail}</p>
                            </td>
                            <td className="px-4 py-4 font-black text-slate-900">{formatGs(invoice.amount)}</td>
                            <td className="px-4 py-4">
                              <Pill color={invoice.status === 'approved' ? 'green' : invoice.status === 'rejected' ? 'red' : 'amber'}>
                                {invoice.status === 'approved' ? 'Registrada' : invoice.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                              </Pill>
                              {invoice.reason && <p className="mt-2 max-w-[240px] text-xs text-slate-500">{invoice.reason}</p>}
                            </td>
                            <td className="px-4 py-4 min-w-[250px]">
                              {receiptLogError ? (
                                <Pill color="red">Servicio no disponible</Pill>
                              ) : !lastReceiptLog(invoice) ? (
                                <Pill color="amber">{receiptLogLoading ? 'Verificando…' : 'Sin confirmación SMTP'}</Pill>
                              ) : lastReceiptLog(invoice)?.status === 'accepted' ? (
                                <Pill color="green">Aceptado por SMTP</Pill>
                              ) : (
                                <Pill color="red">Error de envío</Pill>
                              )}
                              <p className="mt-2 max-w-[250px] break-all text-[11px] text-slate-600">{invoice.customerEmail}</p>
                              {lastReceiptLog(invoice)?.status==='failed' && <p className="mt-1 max-w-[260px] text-[11px] text-rose-700">
                                {lastReceiptLog(invoice)?.errorMessage || lastReceiptLog(invoice)?.errorCode || 'Error de SMTP'}
                              </p>}
                              {lastReceiptLog(invoice)?.createdAt && <p className="mt-1 text-[11px] text-slate-500">{dateTime(lastReceiptLog(invoice)?.createdAt)}</p>}
                              {lastReceiptLog(invoice)?.cc?.length ? <p className="mt-1 text-[11px] text-slate-500">CC: {lastReceiptLog(invoice)?.cc?.join(', ')}</p> : null}
                              {!receiptLogError && !receiptLogLoading && (
                                <div className="mt-2">
                                  <button type="button" onClick={()=>{setReceiptSelected(receiptSelected===invoice.id?'':invoice.id);setReceiptCopies('');setReceiptActionStatus('');}}
                                    className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">
                                    {receiptSelected===invoice.id?'Cancelar':lastReceiptLog(invoice)?.status==='accepted'?'Reenviar PDF':'Enviar manualmente'}
                                  </button>
                                  {receiptSelected===invoice.id && (
                                    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                      <p className="text-[11px] font-bold">Para: {invoice.customerEmail}</p>
                                      <label className="block text-[11px] font-semibold">Con copia (CC, opcional, hasta 3; separá con ;)
                                        <textarea rows={2} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                          placeholder="copia1@correo.com; copia2@correo.com" value={receiptCopies}
                                          onChange={event=>setReceiptCopies(event.target.value)}/>
                                      </label>
                                      <p className="text-[11px] text-slate-600">El destinatario principal permanece igual. Cada reenvío se registra por separado y requiere confirmación.</p>
                                      <button type="button" disabled={!!receiptSending} onClick={()=>void resendInvoice(invoice)}
                                        className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                                        {receiptSending===invoice.id?'Enviando…':'Confirmar reenvío PDF'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  setPdfError('');
                                  void viewFiscalInvoice(invoice.id).catch((error) => setPdfError(error.message));
                                }}
                              >
                                <FileText size={14} /> Ver PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {invoices.length === 0 && <Empty>No hay facturas registradas.</Empty>}
                  </div>
                )}
              </section>
            )}

            <div className="text-[11px] text-slate-400">
              {adminUserEvents().length > 0 ? `${adminUserEvents().length} actuaciones administrativas registradas.` : 'Sin actuaciones administrativas registradas aún.'}
            </div>
          </section>
        </div>
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-slate-900">Confirmar acción</h2>
              <button aria-label="Cerrar" onClick={() => setConfirmation(null)}>
                <X size={20} />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {confirmation.user?.email || confirmation.property?.title} ·{' '}
              {confirmation.action === 'delete'
                ? 'Eliminar cuenta'
                : confirmation.action === 'delete-property'
                  ? 'Eliminar permanentemente el aviso local'
                : confirmation.action === 'remove'
                  ? 'Retirar publicación'
                  : confirmation.action === 'approve'
                    ? 'Aprobar publicación'
                    : confirmation.action === 'suspend'
                      ? 'Suspender usuario'
                      : 'Reactivar usuario'}
            </p>

            <div className="mt-4 space-y-4">
              <label className="block text-sm font-bold text-slate-800">
                Motivo
                <textarea
                  className="mt-2 w-full rounded-2xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-brand-400"
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Describí claramente el motivo de esta acción"
                />
              </label>

              {confirmation.action === 'delete' && (
                <label className="block text-sm font-bold text-slate-800">
                  Confirmá el correo del usuario
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-brand-400"
                    value={confirmEmail}
                    onChange={(event) => setConfirmEmail(event.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </label>
              )}

              {actionError && <p className="text-xs text-rose-700">{actionError}</p>}

              <div className="flex justify-end gap-2">
                <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setConfirmation(null)}>
                  Cancelar
                </button>
                <button
                  disabled={busy || reason.trim().length < 12 || (confirmation.action === 'delete' && confirmEmail.toLowerCase() !== confirmation.user?.email.toLowerCase())}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  onClick={() => {
                    void apply();
                  }}
                >
                  {busy ? 'Procesando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
