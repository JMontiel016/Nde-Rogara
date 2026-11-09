/**
 * Publicación de inmuebles — Nde Rogarã.
 *
 * Los anuncios nuevos comienzan vacíos: no se introducen precios, fotos ni
 * servicios cercanos ficticios. Los límites provienen del plan vigente.
 * La consulta del entorno utiliza OpenStreetMap únicamente tras ubicar el
 * inmueble. Los datos obtenidos requieren revisión del propietario.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Building2, Camera, CheckCircle2, CircleAlert, FileText, ImagePlus,
  MapPin, Plus, Search, Trash2, Upload, Video,
} from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';
import type { City, Property, PropertyType } from '../../types';
import { Modal } from '../common/Modal';
import { LocalVideoGallery } from './LocalVideoGallery';
import { effectiveOwnerPlan, ownerHasProperty, ownerMediaUsage, propertyPhotoAllowance } from '../../data/publicationPlans';
import { getNearbyPlaces, formatNearbyDistance, type NearbyPlace } from '../../services/nearbyPlaces';
import { mapCenterForCity, matchCity, suggestParaguayCities } from '../../services/locationPreference';
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, uploadPropertyMedia, deletePropertyMedia, videoDuration } from '../../services/propertyMedia';
import { storeLocalVideo, removeLocalVideo, isStoredLocalVideo } from '../../services/videoMedia';
import { submitPhotoForModeration } from '../../services/photoModeration';
import { evaluateListing } from '../../services/adminGovernance';
import { MapErrorBoundary } from '../common/MapErrorBoundary';
import { formatGs } from '../../utils/formatters';

const sectionClass = 'rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4 shadow-sm';
const inputClass = 'w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100';
const labelClass = 'block space-y-1.5 text-xs font-bold text-slate-700';
const DETAILS = ['Departamento', 'Casa', 'Habitación', 'Dúplex', 'Local comercial', 'Oficina', 'Depósito'] as PropertyType[];
// «Otro» no se guarda como tipo: el propietario escribe la categoría real de su aviso.

/** Se usa separador de miles paraguayo pero se guarda un entero numérico. */
const parseMoney = (value: string) => Number(value.replace(/\D/g, '').slice(0, 12)) || 0;
const printMoney = (value: number) => value ? value.toLocaleString('es-PY', { maximumFractionDigits: 0 }) : '';
const uniqueItems = (items: string[]) => Array.from(new Set(items.map(item => item.trim()).filter(Boolean)));
const listText = (items: string[]) => items.join('\n');
const phoneValid = (value: string) => /^\+?[\d\s()\-]{8,22}$/.test(value.trim()) && value.replace(/\D/g, '').length >= 8;

const MoneyInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; required?: boolean }> = ({ label, value, onChange, required }) => (
  <label className={labelClass}>
    <span>{label}{required ? ' *' : ''}</span>
    <div className="relative">
      <input inputMode="numeric" type="text" autoComplete="off" value={printMoney(value)}
        onChange={event => onChange(parseMoney(event.target.value))} placeholder="0"
        className={`${inputClass} pr-14 font-bold tabular-nums`} aria-label={label} required={required} />
      <span className="pointer-events-none absolute right-3 top-3.5 text-xs font-bold text-slate-400">Gs.</span>
    </div>
  </label>
);

const BlockTitle: React.FC<{ number: string; icon: React.ElementType; title: string; description?: string }> = ({ number, icon: Icon, title, description }) => (
  <div className="border-b border-slate-100 pb-4">
    <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-700"><Icon size={18} /></span>
      <span>{number}. {title}</span>
    </h3>
    {description && <p className="mt-1 pl-11 text-xs leading-relaxed text-slate-500">{description}</p>}
  </div>
);

const precisionPin = L.divIcon({
  className: 'nd-publish-marker',
  html: '<div style="display:grid;place-items:center;width:31px;height:31px;border:3px solid white;border-radius:50%;background:#0284c7;box-shadow:0 3px 12px #0f172a50;color:white;font-size:16px">⌖</div>',
  iconSize: [31, 31], iconAnchor: [15, 15],
});
const LocationMarker: React.FC<{ position: [number, number]; onChange: (position: [number, number]) => void }> = ({ position, onChange }) => {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); map.setView(position, map.getZoom()); }, [map, position[0], position[1]]);
  useMapEvents({ click(event) { onChange([event.latlng.lat, event.latlng.lng]); } });
  return <Marker position={position} draggable icon={precisionPin}
    eventHandlers={{ dragend: event => { const next = event.target.getLatLng(); onChange([next.lat, next.lng]); } }} />;
};

type GeoResult = { lat: string; lon: string; display_name: string; address?: { country_code?: string } };
export const PublishModal: React.FC = () => {
  const {
    isPublishModalOpen, setIsPublishModalOpen, currentUser, userRole,
    properties, addProperty, updateProperty, editingProperty, setEditingProperty,
    setCurrentView,
  } = useApp();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<PropertyType>('Departamento');
  const [customType, setCustomType] = useState('');
  const [priceMonth, setPriceMonth] = useState(0);
  const [hasExpenses, setHasExpenses] = useState(false);
  const [expensesAmount, setExpensesAmount] = useState(0);
  const [depositWarranty, setDepositWarranty] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [water, setWater] = useState<'Incluida' | 'No incluida'>('No incluida');
  const [internet, setInternet] = useState<'Incluida' | 'No incluida'>('No incluida');
  const [electricity, setElectricity] = useState<'Medidor independiente' | 'Incluida' | 'Medidor trifásico'>('Medidor independiente');
  const [furnishingStatus, setFurnishingStatus] = useState('');
  const [petPolicy, setPetPolicy] = useState('');
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [parkingSpots, setParkingSpots] = useState(0);
  const [areaM2, setAreaM2] = useState(0);
  const [propertyFloors, setPropertyFloors] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [ownerInstagram, setOwnerInstagram] = useState('');
  const [ownerFacebook, setOwnerFacebook] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhoneName, setOwnerPhoneName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPhone2, setOwnerPhone2] = useState('');
  const [ownerPhone2Name, setOwnerPhone2Name] = useState('');
  const [ownerPublicEmail, setOwnerPublicEmail] = useState('');
  const [ownerTiktok, setOwnerTiktok] = useState('');
  const [ownerYoutube, setOwnerYoutube] = useState('');
  const [ownerWebsite, setOwnerWebsite] = useState('');
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [contactHours, setContactHours] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([-25.2854, -57.5759]);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [addressResults, setAddressResults] = useState<GeoResult[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState<string[]>([]);
  const [nearbyInput, setNearbyInput] = useState('');
  const [detectedNearby, setDetectedNearby] = useState<NearbyPlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [allowedRules, setAllowedRules] = useState<string[]>([]);
  const [prohibitedRules, setProhibitedRules] = useState<string[]>([]);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [checkingPhotos, setCheckingPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [photoAlert, setPhotoAlert] = useState('');
  const [photoInfo, setPhotoInfo] = useState('');
  const [success, setSuccess] = useState(false);
  const [reviewPending, setReviewPending] = useState(false);
  const autoNearbyRef = useRef<string[]>([]);

  const plan = effectiveOwnerPlan(currentUser?.id);
  const mediaUsage = ownerMediaUsage(properties, currentUser, editingProperty?.id);
  const planMaxPhotos = userRole === 'admin' ? 100 : plan ? propertyPhotoAllowance(plan, mediaUsage) : 0;
  const planMaxVideos = userRole === 'admin' ? 20 : Math.max(0, (plan?.maxVideos || 0) - mediaUsage.videos);
  const socialAllowed = userRole === 'admin' || (Boolean(plan) && plan?.id !== 'basic');
  const discountedPrice = hasDiscount ? Math.max(0, Math.round(priceMonth * (100 - discountPercent) / 100)) : priceMonth;

  // Una apertura para alta nunca hereda los datos de la última publicación.
  useEffect(() => {
    if (!isPublishModalOpen) return;
    const previous = editingProperty;
    setTitle(previous?.title || '');
    const savedType = previous?.type || 'Departamento';
    setType(DETAILS.includes(savedType) ? savedType : 'Otro');
    setCustomType(DETAILS.includes(savedType) ? '' : savedType);
    setPriceMonth(previous?.priceMonth || 0);
    setHasExpenses(Boolean(previous?.expenses?.buildingFees));
    setExpensesAmount(previous?.expenses?.buildingFees || 0);
    setDepositWarranty(previous?.depositWarranty || '');
    setAvailableFrom(previous?.availableFrom || '');
    setWater(previous?.expenses?.water || 'No incluida');
    setInternet(previous?.expenses?.internet || 'No incluida');
    setElectricity(previous?.expenses?.electricity || 'Medidor independiente');
    setFurnishingStatus(previous?.furnishingStatus || '');
    setPetPolicy(previous?.petPolicy || '');
    setBedrooms(previous?.bedrooms || 0);
    setBathrooms(previous?.bathrooms || 0);
    setParkingSpots(previous?.parkingSpots || 0);
    setAreaM2(previous?.areaM2 || 0);
    setPropertyFloors(previous?.propertyFloors || 1);
    setImages(previous?.images ? [...previous.images] : []);
    setVideos(previous?.videos ? [...previous.videos] : []);
    setOwnerInstagram(previous?.ownerInstagram ?? currentUser?.instagram ?? '');
    setOwnerFacebook(previous?.ownerFacebook ?? currentUser?.facebook ?? '');
    setOwnerName(previous?.ownerName || currentUser?.name || '');
    setOwnerPhoneName(previous?.ownerPhoneName ?? currentUser?.whatsapp1Name ?? currentUser?.name ?? '');
    setOwnerPhone(previous?.ownerPhone ?? currentUser?.phone ?? '');
    setOwnerPhone2(previous?.ownerPhone2 ?? currentUser?.whatsapp2 ?? '');
    setOwnerPhone2Name(previous?.ownerPhone2Name ?? currentUser?.whatsapp2Name ?? '');
    setOwnerPublicEmail(previous?.ownerPublicEmail ?? currentUser?.publicContactEmail ?? currentUser?.email ?? '');
    setOwnerTiktok(previous?.ownerTiktok ?? currentUser?.tiktok ?? '');
    setOwnerYoutube(previous?.ownerYoutube ?? currentUser?.youtube ?? '');
    setOwnerWebsite(previous?.ownerWebsite ?? currentUser?.website ?? '');
    setContactHours(previous?.contactHours || '');
    setCity(previous?.city || '');
    setNeighborhood(previous?.neighborhood || '');
    setAddress(previous?.address || '');
    setCoordinates(previous ? [previous.lat, previous.lng] : [-25.2854, -57.5759]);
    setLocationConfirmed(Boolean(previous));
    setShowLocationMap(false); // El mapa se activa bajo demanda para evitar fallos de renderizado al abrir el formulario.
    setNearbyPlaces(previous?.nearbyPlaces ? [...previous.nearbyPlaces] : []);
    setFeatures(previous?.features ? [...previous.features] : []);
    setDescription(previous?.description || '');
    setRequirements(previous?.requirements ? [...previous.requirements] : []);
    setAllowedRules(previous?.rentalAllowedRules ? [...previous.rentalAllowedRules] : []);
    setProhibitedRules(previous?.rentalProhibitedRules ? [...previous.rentalProhibitedRules] : []);
    setHasDiscount(Boolean(previous?.discountPercent));
    setDiscountPercent(previous?.discountPercent || 0);
    setAddressResults([]); setAddressError(''); setNearbyError(''); setDetectedNearby([]);
    setPhotoAlert(''); setPhotoInfo(''); setSaveError(''); setSuccess(false); setReviewPending(false);
    autoNearbyRef.current = [];
  }, [isPublishModalOpen, editingProperty?.id]);

  // Sólo se consultan servicios después de elegir una dirección o marcar el mapa.
  useEffect(() => {
    if (!isPublishModalOpen || !locationConfirmed) return;
    const controller = new AbortController();
    setLoadingNearby(true); setNearbyError(''); setDetectedNearby([]);
    setNearbyPlaces(prev => prev.filter(item => !autoNearbyRef.current.includes(item))); // No conservar servicios automáticos de otra dirección.
    const timer = window.setTimeout(() => {
      getNearbyPlaces(coordinates[0], coordinates[1], controller.signal)
        .then(places => {
          if (controller.signal.aborted) return;
          setDetectedNearby(places.filter(p => ['shopping', 'education', 'health'].includes(p.category)));
          // Autocompletar únicamente lugares publicados en OSM y próximos al pin.
          const suggestions = places.filter(p => ['shopping', 'education', 'health'].includes(p.category))
            .slice(0, 6).map(p => `${p.name} · ${formatNearbyDistance(p.distanceMeters)}`);
          setNearbyPlaces(prev => uniqueItems([
            ...prev.filter(entry => !autoNearbyRef.current.includes(entry)), ...suggestions,
          ]));
          autoNearbyRef.current = suggestions;
        })
        .catch(error => { if (!controller.signal.aborted) setNearbyError(error instanceof Error ? error.message : 'No se pudieron consultar los lugares cercanos.'); })
        .finally(() => { if (!controller.signal.aborted) setLoadingNearby(false); });
    }, 650);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isPublishModalOpen, locationConfirmed, coordinates[0], coordinates[1]]);

  const choosePosition = (position: [number, number]) => {
    setCoordinates(position); setLocationConfirmed(true); setAddressResults([]);
  };

  /** Geocodificación por solicitud explícita. Limitada exclusivamente a Paraguay. */
  const searchAddress = async () => {
    if (!city.trim()) { setAddressError('Primero indicá la ciudad de Paraguay donde se encuentra el inmueble.'); return; }
    setAddressError(''); setAddressResults([]); setSearchingAddress(true);
    try {
      const query = [address.trim(), neighborhood.trim(), city.trim(), 'Paraguay'].filter(Boolean).join(', ');
      const params = new URLSearchParams({ q: query, format: 'json', addressdetails: '1', countrycodes: 'py', limit: '5', 'accept-language': 'es' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('El buscador de direcciones no está disponible. Podés marcar la ubicación manualmente en el mapa.');
      const values = (await response.json()) as GeoResult[];
      const verified = values.filter(result => result.address?.country_code === 'py' && Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)));
      setAddressResults(verified);
      if (!verified.length) setAddressError('No se encontró una dirección en Paraguay. Revisá los datos o colocá el marcador sobre el mapa.');
    } catch (error) { setAddressError(error instanceof Error ? error.message : 'No se pudo buscar esta dirección.'); }
    finally { setSearchingAddress(false); }
  };

  const changeCity = (value: string) => {
    setCity(value); setLocationConfirmed(false); setAddressResults([]); setDetectedNearby([]);
    const center = mapCenterForCity(value, properties);
    if (center) setCoordinates(center);
  };

  const handlePhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []); event.currentTarget.value = '';
    if (!files.length || checkingPhotos) return;
    if (images.length + files.length > planMaxPhotos) { setSaveError(`Tu plan permite ${planMaxPhotos} fotos en este inmueble teniendo en cuenta las demás publicaciones.`); return; }
    setSaveError(''); setPhotoAlert(''); setPhotoInfo(''); setCheckingPhotos(true); setMediaProgress(0);
    try {
      for (const file of files) {
        const result = await submitPhotoForModeration(file, setMediaProgress);
        if (result.approved) {
          setImages(prev => prev.length < planMaxPhotos ? [...prev, result.url] : prev);
          if (result.pendingManualReview) setPhotoInfo(result.url.startsWith('data:') ? 'Foto guardada para demostración en este navegador; no será visible en otros dispositivos.' : 'Foto subida. Quedará pendiente de verificación antes de aparecer públicamente.');
        }
        else setPhotoAlert(result.reason);
      }
    } finally { setCheckingPhotos(false); setMediaProgress(0); }
  };

  const handleVideos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files=Array.from(event.target.files||[]);
    event.currentTarget.value='';
    if(!files.length||uploadingVideo)return;
    if(videos.length+files.length>planMaxVideos){
      setSaveError('Superaste el máximo de videos permitido por tu plan.');return;
    }
    setSaveError('');setUploadingVideo(true);setMediaProgress(0);
    for(const file of files){
      try{
        if (import.meta.env.VITE_MEDIA_STORAGE_MODE !== 'firebase') {
          const duration=await videoDuration(file);
          if(duration>MAX_VIDEO_SECONDS)throw new Error('El video no puede superar los 40 segundos.');
          const local=await storeLocalVideo(file);
          setVideos(prev=>prev.length<planMaxVideos?[...prev,local]:prev);
          setPhotoInfo('Video guardado en este navegador. Podés verlo o eliminarlo antes de publicar.');
          continue;
        }
        const url=await uploadPropertyMedia(file,'video',setMediaProgress);
        setVideos(prev=>prev.length<planMaxVideos?[...prev,url]:prev);
      }catch(error){
        const reason=error instanceof Error?error.message:'No se pudo subir.';
        if (/Firebase Storage|storage\\/|bucket|almacenamiento|permission|unauthorized|quota|not found|404|402|403|CORS|fetch|network/i.test(reason)) {
          try {
            const duration=await videoDuration(file);
            if(duration>MAX_VIDEO_SECONDS)throw new Error('El video debe durar como máximo 40 segundos.');
            const local=await storeLocalVideo(file);
            setVideos(prev=>[...prev,local]);
            setPhotoInfo('Video guardado en este navegador para demostración. No será visible desde otros dispositivos.');
          }catch(localError){
            setSaveError((prev)=>(prev?prev+' ':'')+file.name+': '+(localError instanceof Error?localError.message:'Error de video.'));
          }
        }else{
          setSaveError((prev)=>(prev?prev+' ':'')+file.name+': '+reason);
        }
      }
    }
    setMediaProgress(0);setUploadingVideo(false);
  };

  // Permitir borrar una imagen o video antes de publicar y al editar.
  // Storage solo permite borrar objetos del usuario que los subió.
  const removeMedia = async (kind:'image'|'video',value:string)=>{
    setSaveError('');
    try{
      if(kind==='video' && isStoredLocalVideo(value))await removeLocalVideo(value);
      else await deletePropertyMedia(value);
      if(kind==='image')setImages(prev=>prev.filter(x=>x!==value));
      else setVideos(prev=>prev.filter(x=>x!==value));
    }catch(error){setSaveError(error instanceof Error?error.message:'No se pudo eliminar el archivo.');}
  };

  const close = () => { setIsPublishModalOpen(false); setEditingProperty(null); };
  const addText = (raw: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const value = raw.trim(); if (value) setter(prev => uniqueItems([...prev, value]));
  };
  const removeAt = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => prev.filter((_, i) => i !== index));
  const changeAt = (index: number, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => prev.map((item, i) => i === index ? value : item));

  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setSaveError('');
    if (!currentUser || !['landlord', 'admin'].includes(userRole)) { setSaveError('Ingresá como propietario para publicar.'); return; }
    if (editingProperty && userRole !== 'admin' && !ownerHasProperty(editingProperty, currentUser)) { setSaveError('No tenés permiso para editar este aviso.'); return; }
    if (userRole !== 'admin' && !plan) { setSaveError('Elegí un plan vigente antes de publicar.'); return; }
    if (checkingPhotos || uploadingVideo) { setSaveError('Esperá a que finalice la carga de archivos.'); return; }
    if (title.trim().length < 8) { setSaveError('Ingresá un título descriptivo de al menos 8 caracteres.'); return; }
    if (type === 'Otro' && (customType.trim().length < 3 || customType.trim().length > 55)) { setSaveError('Escribí el tipo de inmueble (entre 3 y 55 caracteres).'); return; }
    if (priceMonth < 1) { setSaveError('Ingresá el precio mensual del alquiler.'); return; }
    if (!city.trim() || !neighborhood.trim() || !address.trim() || !locationConfirmed) { setSaveError('Completá la ciudad, barrio y dirección, y confirmá el punto en el mapa.'); return; }
    if (!matchCity(city, properties)) { setSaveError('Seleccioná una ciudad registrada de Paraguay en el buscador.'); return; }
    if (coordinates[0] > -19 || coordinates[0] < -28 || coordinates[1] > -54 || coordinates[1] < -63) { setSaveError('La ubicación seleccionada está fuera del territorio de Paraguay.'); return; }
    if (!Number.isFinite(areaM2) || areaM2 <= 0 || bathrooms < 1) { setSaveError('Completá la superficie y al menos un baño.'); return; }
    if (!images.length) { setSaveError('Subí al menos una fotografía real de tu inmueble.'); return; }
    if (images.length > planMaxPhotos || videos.length > planMaxVideos) { setSaveError('Superaste el cupo de fotos o videos de tu plan.'); return; }
    if (!phoneValid(ownerPhone)) { setSaveError('Ingresá un número de WhatsApp válido para recibir consultas.'); return; }
    if (ownerPhone2.trim() && (!phoneValid(ownerPhone2) || !ownerPhone2Name.trim())) { setSaveError('Completá correctamente el segundo WhatsApp y el nombre de quien atenderá.'); return; }
    if (ownerPublicEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerPublicEmail.trim())) { setSaveError('El correo público de consultas no es válido.'); return; }
    if (!ownerName.trim()) { setSaveError('Indicá el nombre de contacto del propietario.'); return; }
    if (!description.trim()) { setSaveError('Agregá una descripción del inmueble.'); return; }
    if (userRole !== 'admin' && !editingProperty && mediaUsage.active >= (plan?.maxActive || 0)) { setSaveError('Alcanzaste el número de avisos activos permitido por tu plan.'); return; }

    const data: Property = {
      ...(editingProperty || {}),
      id: editingProperty?.id || `prop-${crypto.randomUUID()}`,
      isVerified: editingProperty?.isVerified || false,
      title: title.trim(), type: type === 'Otro' ? customType.trim() : type, city: city.trim() as City, neighborhood: neighborhood.trim(), address: address.trim(),
      priceMonth, bedrooms, bathrooms, parkingSpots, areaM2, propertyFloors,
      images: [...images], videos: [...videos], ownerInstagram: socialAllowed ? ownerInstagram.trim() : '',
      ownerFacebook: socialAllowed ? ownerFacebook.trim() : '',
      ownerTiktok: socialAllowed ? ownerTiktok.trim() : '',
      ownerYoutube: socialAllowed ? ownerYoutube.trim() : '',
      ownerWebsite: socialAllowed ? ownerWebsite.trim() : '',
      ownerPhoneName: ownerPhoneName.trim() || ownerName.trim(),
      ownerPhone2: ownerPhone2.trim(), ownerPhone2Name: ownerPhone2Name.trim(),
      ownerPublicEmail: ownerPublicEmail.trim(),
      ownerAvatar: currentUser.avatar || editingProperty?.ownerAvatar || '',
      description: description.trim(),
      features: uniqueItems(features), expenses: { buildingFees: hasExpenses ? expensesAmount : 0, water, internet, electricity },
      availableFrom: availableFrom.trim(), requirements: uniqueItems(requirements),
      rentalAllowedRules: uniqueItems(allowedRules), rentalProhibitedRules: uniqueItems(prohibitedRules),
      lat: coordinates[0], lng: coordinates[1], ownerName: ownerName.trim(), ownerPhone: ownerPhone.trim(),
      ownerEmail: editingProperty?.ownerEmail || currentUser.email, ownerId: editingProperty?.ownerId || currentUser.id,
      nearbyPlaces: uniqueItems(nearbyPlaces), depositWarranty: depositWarranty.trim(),
      petPolicy: petPolicy.trim(), furnishingStatus: furnishingStatus.trim(), contactHours: contactHours.trim(),
      discountPercent: hasDiscount && discountPercent > 0 ? discountPercent : undefined,
      discountedPrice: hasDiscount && discountPercent > 0 ? discountedPrice : undefined,
      discountBadge: hasDiscount && discountPercent > 0 ? `-${discountPercent}%` : undefined,
      requiresActivePlan: editingProperty?.requiresActivePlan ?? (userRole !== 'admin'),
      createdAt: editingProperty?.createdAt || new Date().toISOString(),
    };
    // Una opinión limpia de texto se aprueba sola; si hay imágenes/videos aún
    // se requiere revisión visual, pues el filtro textual no revisa fotos.
    const reason=evaluateListing(data);
    setReviewPending(Boolean(reason || images.length || videos.length));
    try {
      if (editingProperty) updateProperty(data); else addProperty(data);
      setSuccess(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el aviso. Revisá el almacenamiento disponible.');
    }
  };

  const editableEntries = (items: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, title: string) => (
    <div className="space-y-2" aria-label={title}>
      {items.map((value, index) => <div className="flex items-center gap-2" key={index}>
        <input className={inputClass} value={value} onChange={event => changeAt(index, event.target.value, setter)} aria-label={`${title} ${index + 1}`} />
        <button type="button" onClick={() => removeAt(index, setter)} className="shrink-0 rounded-xl border border-rose-200 p-3 text-rose-700 hover:bg-rose-50" title="Quitar elemento"><Trash2 size={16} /></button>
      </div>)}
    </div>
  );

  return <Modal isOpen={isPublishModalOpen} onClose={close} title={editingProperty ? 'Editar inmueble' : 'Publicar inmueble en Nde Rogarã'} maxWidth="4xl">
    {success ? <div className="flex flex-col items-center gap-4 py-10 text-center">
      <CheckCircle2 size={48} className="text-emerald-600" />
      <h2 className="text-xl font-black text-slate-900">{reviewPending ? (editingProperty ? 'Cambios enviados a revisión' : 'Publicación enviada a revisión') : (editingProperty ? 'Cambios publicados' : 'Publicación registrada')}</h2>
      <p className="max-w-lg text-sm text-slate-600">{reviewPending ? 'El contenido bloqueado o las imágenes pendientes de verificación no serán visibles hasta su revisión.' : 'El aviso pasó el filtro de texto y está disponible según las condiciones de tu plan.'}</p>
      <button type="button" className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700" onClick={() => { close(); setSuccess(false); setCurrentView('search'); }}>Ver publicaciones</button>
    </div> : <form onSubmit={submit} className="max-h-[78vh] space-y-5 overflow-y-auto pr-1 sm:pr-2">
      {saveError && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-800"><CircleAlert size={18} />{saveError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4">
        <div><p className="text-sm font-black text-slate-900">{plan?.name || (userRole === 'admin' ? 'Administración' : 'Sin plan vigente')}</p>
          <p className="mt-1 text-xs text-slate-600">{userRole === 'admin' ? 'Administración de anuncios' : plan ? `${plan.photoMode === 'pooled' ? 'Fotos compartidas' : 'Fotos por aviso'}: ${images.length}/${planMaxPhotos} · Videos: ${videos.length}/${planMaxVideos} · Inmuebles activos: ${mediaUsage.active}/${plan.maxActive}` : 'Para publicar, contratá un plan.'}</p></div>
        <button type="button" className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100" onClick={() => { close(); setCurrentView('plans'); }}>Consultar planes</button>
      </div>

      <section className={sectionClass}>
        <BlockTitle number="1" icon={Building2} title="Datos del inmueble" description="Completá solamente la información correspondiente a esta propiedad." />
        <label className={labelClass}>Título del anuncio *<input className={inputClass} required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej.: Departamento de dos dormitorios en alquiler" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-3">
          <label className={labelClass}>Tipo de inmueble *
            <select className={inputClass} value={type} onChange={event => setType(event.target.value as PropertyType)}>
              {DETAILS.map(item => <option key={item} value={item}>{item}</option>)}
              <option value="Otro">Otro tipo de inmueble…</option>
            </select>
          </label>
          {type === 'Otro' && <label className={labelClass}>Especificá el tipo de inmueble *
            <input className={inputClass} type="text" maxLength={55} minLength={3} required
              value={customType} onChange={event => setCustomType(event.target.value)}
              placeholder="Ej.: Quinta, terreno, vivienda familiar" />
          </label>}
        </div>
          <MoneyInput label="Precio mensual" value={priceMonth} onChange={setPriceMonth} required />
          <label className={labelClass}>Disponibilidad<input className={inputClass} value={availableFrom} onChange={event => setAvailableFrom(event.target.value)} placeholder="Ej.: Disponible desde diciembre" /></label>
          <label className={labelClass}>Garantía del alquiler<input className={inputClass} value={depositWarranty} onChange={event => setDepositWarranty(event.target.value)} placeholder="Ej.: Un mes de garantía" /></label>
          <label className={labelClass}>Amoblamiento<input className={inputClass} value={furnishingStatus} onChange={event => setFurnishingStatus(event.target.value)} placeholder="Ej.: Semi amoblado" /></label>
          <label className={labelClass}>Mascotas<input className={inputClass} value={petPolicy} onChange={event => setPetPolicy(event.target.value)} placeholder="Ej.: Se permiten mascotas pequeñas" /></label>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={hasExpenses} onChange={event => setHasExpenses(event.target.checked)} />Expensas adicionales al alquiler</label>
        {hasExpenses && <MoneyInput label="Expensas mensuales" value={expensesAmount} onChange={setExpensesAmount} />}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>Agua<select className={inputClass} value={water} onChange={event => setWater(event.target.value as typeof water)}><option>Incluida</option><option>No incluida</option></select></label>
          <label className={labelClass}>Internet<select className={inputClass} value={internet} onChange={event => setInternet(event.target.value as typeof internet)}><option>Incluida</option><option>No incluida</option></select></label>
          <label className={labelClass}>Electricidad<select className={inputClass} value={electricity} onChange={event => setElectricity(event.target.value as typeof electricity)}><option>Medidor independiente</option><option>Incluida</option><option>Medidor trifásico</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([['Dormitorios', bedrooms, setBedrooms, 0], ['Baños', bathrooms, setBathrooms, 1], ['Cocheras', parkingSpots, setParkingSpots, 0], ['Superficie (m²)', areaM2, setAreaM2, 1], ['Niveles', propertyFloors, setPropertyFloors, 1]] as const).map(([label, value, setter, min]) => <label key={label} className={labelClass}>{label}
            <input type="number" inputMode="numeric" min={min} step="1" value={value || ''} onChange={event => setter(Number(event.target.value))} className={inputClass} placeholder="0" /></label>)}
        </div>
        <label className={labelClass}>Descripción detallada *<textarea className={inputClass} rows={4} required value={description} onChange={event => setDescription(event.target.value)} placeholder="Describí ambientes, distribución, iluminación, instalaciones y características importantes." /></label>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={hasDiscount} onChange={event => setHasDiscount(event.target.checked)} />Aplicar una rebaja al alquiler (opcional)</label>
          {hasDiscount && <div className="mt-3 flex flex-wrap items-center gap-4"><label className={labelClass}>Descuento (%)<input type="number" min="1" max="90" value={discountPercent || ''} onChange={event => setDiscountPercent(Math.max(0, Math.min(90, Number(event.target.value))))} className={inputClass} /></label><p className="text-sm font-bold text-emerald-800">Precio promocional: {formatGs(discountedPrice)}</p></div>}
        </div>
      </section>

      <section className={sectionClass}>
        <BlockTitle number="2" icon={MapPin} title="Dirección y ubicación" description="Buscá la dirección o elegí el punto exacto con el marcador. La ubicación del mapa es orientativa hasta que la confirmes." />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>Ciudad de Paraguay *<input className={inputClass} value={city} onChange={event => changeCity(event.target.value)} list="nd-paraguay-city-options" placeholder="Escribí la ciudad" required />
            <datalist id="nd-paraguay-city-options">{suggestParaguayCities(city, 12).map(item => <option key={item} value={item} />)}</datalist></label>
          <label className={labelClass}>Barrio o zona *<input className={inputClass} value={neighborhood} onChange={event => setNeighborhood(event.target.value)} placeholder="Escribí el barrio" required /></label>
          <label className={labelClass}>Dirección o intersección *<input className={inputClass} value={address} onChange={event => setAddress(event.target.value)} placeholder="Calle, número o esquina" required /></label>
        </div>
        <button type="button" disabled={searchingAddress || !city.trim()} onClick={() => void searchAddress()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"><Search size={17} />{searchingAddress ? 'Buscando dirección…' : 'Buscar dirección en Paraguay'}</button>
        {addressError && <p role="status" className="text-xs text-amber-800">{addressError}</p>}
        {addressResults.length > 0 && <div className="space-y-2 rounded-2xl border border-sky-100 bg-sky-50 p-3"><p className="text-xs font-bold text-sky-900">Seleccioná la dirección que corresponda:</p>{addressResults.map(result => <button key={`${result.lat}-${result.lon}`} type="button" onClick={() => { choosePosition([Number(result.lat), Number(result.lon)]); if (!address.trim()) setAddress(result.display_name); }} className="block w-full rounded-xl border border-white bg-white p-3 text-left text-xs text-slate-700 hover:border-sky-300">{result.display_name}</button>)}</div>}
        <button type="button" onClick={() => setShowLocationMap(visible => !visible)}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800">
          <MapPin size={16} />{showLocationMap ? 'Ocultar mapa de ubicación' : 'Elegir ubicación sobre el mapa'}
        </button>
        {showLocationMap && <MapErrorBoundary>
          <div className="h-72 overflow-hidden rounded-2xl border border-slate-200 shadow-inner sm:h-80">
            <MapContainer center={coordinates} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
              <LocationMarker position={coordinates} onChange={choosePosition} />
            </MapContainer>
          </div>
        </MapErrorBoundary>}
        <p className={`flex items-center gap-2 text-xs ${locationConfirmed ? 'text-emerald-700' : 'text-slate-600'}`}><MapPin size={16} />{locationConfirmed ? `Ubicación seleccionada: ${coordinates[0].toFixed(5)}, ${coordinates[1].toFixed(5)}` : 'Tocá el mapa para señalar el inmueble y confirmar su ubicación.'}</p>
        {city.trim() && !matchCity(city, properties) && <p className="text-xs text-amber-700">Si la ciudad no aparece en el catálogo, buscá la dirección para confirmar que pertenezca a Paraguay.</p>}
      </section>

      <section className={sectionClass}>
        <BlockTitle number="3" icon={MapPin} title="Servicios cerca del inmueble" description="Supermercados, hospitales, escuelas y facultades. Los resultados se consultan según el punto elegido en el mapa; podés corregirlos o agregar otros." />
        {loadingNearby && <p role="status" className="text-xs text-sky-700">Consultando lugares cercanos registrados en el mapa…</p>}
        {nearbyError && <p className="text-xs text-amber-700">{nearbyError} Podés agregar lugares manualmente.</p>}
        {locationConfirmed && !loadingNearby && !detectedNearby.length && !nearbyError && <p className="text-xs text-slate-500">No se encontraron lugares registrados alrededor de esta ubicación.</p>}
        {detectedNearby.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-slate-700">Lugares encontrados en OpenStreetMap</p><div className="grid gap-2 sm:grid-cols-2">{detectedNearby.slice(0, 14).map(place => {
          const label = `${place.name} · ${formatNearbyDistance(place.distanceMeters)}`;
          return <label key={place.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><input type="checkbox" checked={nearbyPlaces.includes(label)} onChange={event => setNearbyPlaces(prev => event.target.checked ? uniqueItems([...prev, label]) : prev.filter(item => item !== label))} /><span className="min-w-0 flex-1">{place.name} <span className="text-slate-400">({formatNearbyDistance(place.distanceMeters)})</span></span></label>;
        })}</div></div>}
        <p className="text-xs font-semibold text-slate-700">Referencias que aparecerán en la publicación (editables)</p>
        {editableEntries(nearbyPlaces, setNearbyPlaces, 'Lugar cercano')}
        <div className="flex flex-col gap-2 sm:flex-row"><input className={inputClass} value={nearbyInput} onChange={event => setNearbyInput(event.target.value)} placeholder="Agregar supermercado, hospital, escuela, facultad u otro servicio" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addText(nearbyInput, setNearbyPlaces); setNearbyInput(''); } }} /><button type="button" onClick={() => { addText(nearbyInput, setNearbyPlaces); setNearbyInput(''); }} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl bg-sky-700 px-4 py-3 text-sm font-bold text-white"><Plus size={16} />Agregar lugar</button></div>
      </section>

      <section className={sectionClass}>
        <BlockTitle number="4" icon={ImagePlus} title="Fotografías y recorridos en video" description="Los cupos se calculan automáticamente según el plan contratado y tus publicaciones existentes." />
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><Camera size={22} className="text-sky-700" /><p className="mt-2 text-sm font-bold">Fotografías · {images.length} de {planMaxPhotos}</p><p className="mt-1 text-xs text-slate-600">JPG, PNG o WEBP · hasta 50 MB por imagen. La primera foto será la portada.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white"><Upload size={16} />Subir fotografías<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={checkingPhotos || images.length >= planMaxPhotos} onChange={event => void handlePhotos(event)} className="hidden" /></label>{checkingPhotos && <p className="mt-2 text-xs text-sky-700">Subiendo imágenes… {mediaProgress}%</p>}</div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Video size={22} className="text-slate-700" /><p className="mt-2 text-sm font-bold">Videos · {videos.length} de {planMaxVideos}</p><p className="mt-1 text-xs text-slate-600">MP4 o WebM · hasta {Math.round(MAX_VIDEO_BYTES / (1024 * 1024))} MB y {MAX_VIDEO_SECONDS} segundos por video.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"><Upload size={16} />Subir videos<input type="file" multiple accept="video/mp4,video/webm" disabled={uploadingVideo || videos.length >= planMaxVideos} onChange={event => void handleVideos(event)} className="hidden" /></label>{uploadingVideo && <p className="mt-2 text-xs text-slate-600">Subiendo videos… {mediaProgress}%</p>}</div></div>
        {photoAlert && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">{photoAlert}</p>}
        {photoInfo && <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-800">{photoInfo}</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((src, index) => <div key={`${src}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200"><a href={src} target="_blank" rel="noopener noreferrer" title="Ver fotografía en tamaño completo"><img src={src} alt={`Foto ${index + 1}`} className="aspect-video w-full object-cover hover:opacity-90" /></a><div className="flex flex-wrap items-center justify-between gap-1 p-2 text-xs"><span>{index === 0 ? 'Portada' : `Foto ${index + 1}`}</span><div className="flex gap-1">{index > 0 && <button type="button" onClick={() => setImages(prev => [prev[index], ...prev.filter((_, i) => i !== index)])} className="rounded border px-1.5 py-1" title="Hacer portada">★</button>}<button type="button" onClick={() => void removeMedia('image',src)} title="Eliminar foto" className="text-rose-700"><Trash2 size={16} /></button></div></div></div>)}</div>
        {videos.length > 0 && <div className="space-y-2"><p className="text-xs font-bold">Videos cargados</p>{videos.map((reference, index) => <div key={reference} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs"><span>Recorrido {index + 1}</span><button type="button" onClick={() => void removeMedia('video',reference)} className="flex items-center gap-1 text-rose-700"><Trash2 size={15} />Quitar</button></div>)}</div>}
        {videos.length > 0 && <LocalVideoGallery videos={videos} />}
        <p className="text-xs text-slate-500">En el modo gratuito, los videos se guardan en este navegador. Podés verlos o eliminarlos, pero todavía no se comparten entre dispositivos.</p>
      </section>

      <section className={sectionClass}>
        <BlockTitle number="5" icon={FileText} title="Comodidades y condiciones del alquiler" description="Personalizá tanto las características como lo permitido y lo restringido en la vivienda." />
        <label className={labelClass}>Comodidades del inmueble</label>
        {editableEntries(features, setFeatures, 'Comodidad')}
        <div className="flex gap-2"><input className={inputClass} value={featureInput} onChange={event => setFeatureInput(event.target.value)} placeholder="Ej.: Patio, aire acondicionado, ascensor" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addText(featureInput, setFeatures); setFeatureInput(''); } }} /><button type="button" onClick={() => { addText(featureInput, setFeatures); setFeatureInput(''); }} className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white">Agregar</button></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>Requisitos para alquilar<textarea rows={5} className={inputClass} value={listText(requirements)} onChange={event => setRequirements(event.target.value.split('\n'))} placeholder="Un requisito por línea" /></label>
          <label className={labelClass}>Permitido en el inmueble<textarea rows={5} className={inputClass} value={listText(allowedRules)} onChange={event => setAllowedRules(event.target.value.split('\n'))} placeholder="Una condición permitida por línea" /></label>
          <label className={labelClass}>No permitido en el inmueble<textarea rows={5} className={inputClass} value={listText(prohibitedRules)} onChange={event => setProhibitedRules(event.target.value.split('\n'))} placeholder="Una restricción por línea" /></label>
        </div>
        <p className="text-xs text-slate-500">Estas condiciones son informativas y no constituyen un contrato certificado por la plataforma.</p>
      </section>

      <section className={sectionClass}>
        <BlockTitle number="6" icon={CheckCircle2} title="Contacto y redes sociales" description="Los visitantes podrán comunicarse directamente por WhatsApp y llamada y abrir tus perfiles sociales." />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Nombre del propietario o anunciante *<input className={inputClass} required value={ownerName} onChange={event => setOwnerName(event.target.value)} placeholder="Nombre para consultas" /></label>
          <label className={labelClass}>Nombre de atención por WhatsApp 1<input className={inputClass} value={ownerPhoneName} onChange={event => setOwnerPhoneName(event.target.value)} placeholder="Nombre de quien atiende" /></label>
          <label className={labelClass}>WhatsApp principal *<input type="tel" className={inputClass} required value={ownerPhone} onChange={event => setOwnerPhone(event.target.value)} placeholder="0981 123456" autoComplete="tel" /></label>
          <label className={labelClass}>WhatsApp adicional (opcional)<input type="tel" className={inputClass} value={ownerPhone2} onChange={event => setOwnerPhone2(event.target.value)} placeholder="0982 123456" /></label>
          <label className={labelClass}>Nombre del segundo contacto<input className={inputClass} value={ownerPhone2Name} onChange={event => setOwnerPhone2Name(event.target.value)} placeholder="Persona que atenderá" /></label>
          <label className={labelClass}>Correo para consultas (opcional)<input className={inputClass} type="email" value={ownerPublicEmail} onChange={event => setOwnerPublicEmail(event.target.value)} placeholder="consultas@dominio.com" /></label>
          <label className={labelClass}>Horario de consultas<input className={inputClass} value={contactHours} onChange={event => setContactHours(event.target.value)} placeholder="Días y horarios de atención" /></label>
          <label className={labelClass}>Instagram<input className={inputClass} disabled={!socialAllowed} value={ownerInstagram} onChange={event => setOwnerInstagram(event.target.value)} placeholder="@usuario o enlace" /></label>
          <label className={labelClass}>Facebook<input className={inputClass} disabled={!socialAllowed} value={ownerFacebook} onChange={event => setOwnerFacebook(event.target.value)} placeholder="Facebook de tu inmueble" /></label>
          <label className={labelClass}>TikTok<input className={inputClass} disabled={!socialAllowed} value={ownerTiktok} onChange={event => setOwnerTiktok(event.target.value)} placeholder="@usuario" /></label>
          <label className={labelClass}>YouTube<input className={inputClass} disabled={!socialAllowed} value={ownerYoutube} onChange={event => setOwnerYoutube(event.target.value)} placeholder="youtube.com/@canal" /></label>
          <label className={`${labelClass} sm:col-span-2`}>Sitio web<input className={inputClass} type="url" disabled={!socialAllowed} value={ownerWebsite} onChange={event => setOwnerWebsite(event.target.value)} placeholder="https://misitio.com.py" /></label>
        </div>
        <p className="text-xs text-slate-500">Los contactos y redes se completan desde tu perfil cuando creás un aviso. Podés cambiar cada campo sin modificar el perfil.</p>
        {!socialAllowed && <p className="text-xs text-slate-500">Los enlaces sociales se habilitan desde el plan Trimestral. WhatsApp está disponible en todos los planes.</p>}
      </section>

      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-3 py-4 backdrop-blur-sm">
        <button type="button" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700" onClick={close}>Cancelar</button>
        <button type="submit" disabled={checkingPhotos || uploadingVideo} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"><CheckCircle2 size={17} />{editingProperty ? 'Guardar cambios' : 'Publicar inmueble'}</button>
      </footer>
    </form>}
  </Modal>;
};
