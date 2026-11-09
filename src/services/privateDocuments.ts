// Los documentos están fuera del catálogo público y se guardan localmente en IndexedDB.
// NO constituyen almacenamiento seguro para producción: es obligatorio usar un backend
// con autenticación y reglas de autorización antes de publicar el sitio en Internet.
export interface PrivateDocumentRecord {
  id: string;
  ownerId: string;
  propertyId: string;
  name: string;
  mime: string;
  size: number;
  savedAt: string;
  blob: Blob;
}
const DB_NAME = 'nderogara-private-docs-local-demo';
const STORE = 'documents';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, ok: (result: T) => void) => void): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result: T;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    action(tx.objectStore(STORE), value => { result = value; });
  });
}
export async function listPrivateDocuments(ownerId: string, propertyId: string): Promise<PrivateDocumentRecord[]> {
  const all = await transact<PrivateDocumentRecord[]>('readonly', (store, ok) => { const req = store.getAll(); req.onsuccess = () => ok(req.result); });
  return all.filter(d => d.ownerId === ownerId && d.propertyId === propertyId);
}
export async function storePrivateDocument(ownerId: string, propertyId: string, file: File): Promise<void> {
  if (!file || file.size > 10 * 1024 * 1024) throw new Error('El archivo no puede superar los 10 MB.');
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) throw new Error('Solo se permiten PDF, JPG y PNG.');
  const doc: PrivateDocumentRecord = { id: crypto.randomUUID(), ownerId, propertyId, name: file.name, mime: file.type, size: file.size, savedAt: new Date().toISOString(), blob: file };
  await transact<void>('readwrite', (store, ok) => { store.put(doc); ok(undefined); });
}
export async function removePrivateDocument(ownerId: string, propertyId: string, docId: string): Promise<void> {
  const docs = await listPrivateDocuments(ownerId, propertyId);
  if (!docs.some(d => d.id === docId)) throw new Error('Documento no autorizado.');
  await transact<void>('readwrite', (store, ok) => { store.delete(docId); ok(undefined); });
}
export function downloadPrivateDocument(doc: PrivateDocumentRecord): void {
  const url = URL.createObjectURL(doc.blob);
  const a = document.createElement('a'); a.href = url; a.download = doc.name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Borrado local de documentos de todas las propiedades de un propietario eliminado. */
export async function removeAllOwnerPrivateDocuments(ownerId: string): Promise<void> {
  const docs = await transact<PrivateDocumentRecord[]>('readonly', (store, ok) => {
    const req = store.getAll(); req.onsuccess = () => ok(req.result);
  });
  const ownIds = docs.filter(d => d.ownerId === ownerId).map(d => d.id);
  if (!ownIds.length) return;
  await transact<void>('readwrite', (store, ok) => {
    ownIds.forEach(id => store.delete(id)); ok(undefined);
  });
}
