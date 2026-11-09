import type { Property } from '../types';

/** Los planes de demostración definen cupos concretos y compartidos en el navegador. */
export interface PublicationPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  term: string;
  maxActive: number;
  maxPhotos: number;
  maxVideos: number;
  photoMode: 'pooled' | 'per-listing';
  maxFeatured: number;
  benefits: string[];
  featured: boolean;
}

export const PUBLICATION_PLANS: PublicationPlan[] = [
  { id:'basic', name:'Básico mensual', price:50000, durationDays:30, term:'30 días', maxActive:8, maxPhotos:8, maxVideos:1, photoMode:'pooled', maxFeatured:0, featured:false,
    benefits:['8 fotos para distribuir entre tus avisos', '1 video para mostrar el inmueble', 'Contacto directo por WhatsApp y llamada', 'Ubicación en el mapa de inmuebles'] },
  { id:'quarterly', name:'Trimestral', price:135000, durationDays:90, term:'90 días', maxActive:24, maxPhotos:24, maxVideos:2, photoMode:'pooled', maxFeatured:0, featured:false,
    benefits:['24 fotos compartidas entre tus avisos', '2 videos para tus publicaciones', 'Enlaces a Instagram y Facebook', 'Ahorro de Gs. 15.000 frente al mensual'] },
  { id:'premium', name:'Premium anual', price:450000, durationDays:365, term:'12 meses', maxActive:6, maxPhotos:25, maxVideos:4, photoMode:'per-listing', maxFeatured:4, featured:true,
    benefits:['Hasta 6 inmuebles y 25 fotos por inmueble', '4 videos en total', 'Elegí hasta 4 anuncios destacados por ciudad', 'Estadísticas de vistas y contactos', 'Difusión con enlaces a tus redes sociales'] },
  { id:'professional', name:'Profesional anual', price:900000, durationDays:365, term:'12 meses', maxActive:10, maxPhotos:30, maxVideos:8, photoMode:'per-listing', maxFeatured:10, featured:false,
    benefits:['Hasta 10 inmuebles y 30 fotos por inmueble', '8 videos en total', 'Todos tus anuncios pueden destacarse', 'Métricas ampliadas y soporte preferente', 'Enlaces para compartir en Facebook, Instagram y WhatsApp'] }
];

export interface OwnerPlanSelection { planId:string; activatedAt:string; expiresAt:string; mode:'demo'; autoRenew?:boolean; featuredIds?:string[]; featuredCustomized?:boolean; }
const ownerPlanKey = (userId:string) => `nderogara_publication_plan_${userId}`;
export const PLAN_UPDATED = 'nderogara-plan-updated';
const notify = () => { if(typeof window !== 'undefined') window.dispatchEvent(new Event(PLAN_UPDATED)); };
export function readOwnerPlan(userId?:string):OwnerPlanSelection|null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(ownerPlanKey(userId))||'null');
    return value?.mode==='demo' && PUBLICATION_PLANS.some(p=>p.id===value.planId) ? value as OwnerPlanSelection : null;
  } catch {return null;}
}
export function effectiveOwnerPlan(userId?:string):PublicationPlan|null {
  const selection = readOwnerPlan(userId);
  if (!selection || new Date(selection.expiresAt).getTime()<=Date.now()) return null;
  return PUBLICATION_PLANS.find(p=>p.id===selection.planId)||null;
}
/** Renovar desde el vencimiento vigente; cambiar a otro plan comienza hoy. */
export function simulatePlanActivation(userId:string, planId:string, autoRenew=false) {
  const plan = PUBLICATION_PLANS.find(p=>p.id===planId);
  if(!plan) throw new Error('El plan seleccionado no está disponible.');
  const now = new Date(); const previous = readOwnerPlan(userId);
  const from = previous && previous.planId===plan.id && new Date(previous.expiresAt).getTime()>now.getTime() ? new Date(previous.expiresAt) : now;
  const expiration = new Date(from);
  if(plan.durationDays===365)expiration.setFullYear(expiration.getFullYear()+1);
  else expiration.setDate(expiration.getDate()+plan.durationDays);
  const featuredIds = previous?.planId===planId ? (previous.featuredIds || []) : [];
  localStorage.setItem(ownerPlanKey(userId),JSON.stringify({planId,activatedAt:now.toISOString(),expiresAt:expiration.toISOString(),mode:'demo',autoRenew,featuredIds} satisfies OwnerPlanSelection));
  notify();
}
/** Solo una cuenta autenticada y propietaria del anuncio puede administrarlo. */
export function ownerHasProperty(property: {ownerId?:string;ownerEmail?:string},user:{id:string;email:string}|null):boolean {
  if(!user)return false;
  return property.ownerId ? property.ownerId===user.id : property.ownerEmail?.toLowerCase()===user.email.toLowerCase();
}
export function ownerMediaUsage(properties:Property[],user:{id:string;email:string}|null,excludeId?:string) {
  const others=properties.filter(p=>ownerHasProperty(p,user)&&p.id!==excludeId&&p.moderationStatus!=='removed');
  return { photos:others.reduce((n,p)=>n+(p.images?.length||0),0), videos:others.reduce((n,p)=>n+(p.videos?.length||0),0),// Los anuncios pendientes ocupan un cupo para impedir publicar infinitos avisos sin aprobar.
    active:others.filter(p=>p.isActive!==false || p.moderationStatus==='flagged').length };
}
export function propertyPhotoAllowance(plan:PublicationPlan,usage:{photos:number}):number {
  return plan.photoMode==='pooled' ? Math.max(0,plan.maxPhotos-usage.photos) : plan.maxPhotos;
}
export function canFeatureProperty(property:Property,properties:Property[],userId?:string):boolean {
  const plan=effectiveOwnerPlan(userId);
  if(!plan||plan.maxFeatured===0)return false;
  const selected=readOwnerPlan(userId)?.featuredIds||[];
  const own=properties.filter(p=>(p.ownerId===userId || (!p.ownerId && p.ownerEmail?.toLowerCase()===property.ownerEmail?.toLowerCase())) && p.isActive!==false && p.moderationStatus!=='removed');
  if(property.isActive===false || property.moderationStatus==='removed')return false;
  // De forma predeterminada se destacan los primeros avisos elegibles del propietario.
  const ids=readOwnerPlan(userId)?.featuredCustomized ? selected : own.slice(0,plan.maxFeatured).map(p=>p.id);
  return ids.slice(0,plan.maxFeatured).includes(property.id);
}
export function toggleOwnerFeatured(userId:string, propertyId:string, properties:Property[], ownerEmail='') {
  const plan=effectiveOwnerPlan(userId), selection=readOwnerPlan(userId);
  if(!plan||!selection||plan.maxFeatured===0)throw new Error('Tu plan no incluye publicaciones destacadas.');
  const own=properties.filter(p=>(p.ownerId===userId || (!p.ownerId && p.ownerEmail?.toLowerCase()===ownerEmail.toLowerCase())) && p.isActive!==false && p.moderationStatus!=='removed');
  if(!own.some(p=>p.id===propertyId))throw new Error('El aviso no puede destacarse.');
  const selected=selection.featuredCustomized ? [...(selection.featuredIds||[])] : own.slice(0,plan.maxFeatured).map(p=>p.id);
  const next=selected.includes(propertyId)?selected.filter(id=>id!==propertyId):[...selected,propertyId];
  if(next.length>plan.maxFeatured)throw new Error(`Tu plan permite hasta ${plan.maxFeatured} anuncios destacados.`);
  // Cuando el propietario desmarca el último, guardamos selección vacía explícita.
  localStorage.setItem(ownerPlanKey(userId),JSON.stringify({...selection,featuredIds:next,featuredCustomized:true}));
  notify();
}
export function revokeDemoPlan(userId:string) {
  const plan=readOwnerPlan(userId);
  if(!plan)throw new Error('No hay un plan de demostración para retirar.');
  localStorage.removeItem(ownerPlanKey(userId));notify();
}
export function clearOwnerPlanData(userId:string){localStorage.removeItem(ownerPlanKey(userId));notify();}
/** Avisos históricos de muestra siguen visibles; los creados con plan requieren plan vigente. */
export function isPropertyPublic(property:Property):boolean {
  return property.isActive!==false && (!property.moderationStatus||property.moderationStatus==='approved') &&
    (!property.requiresActivePlan || Boolean(effectiveOwnerPlan(property.ownerId)));
}
