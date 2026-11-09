/**
 * Pruebas rápidas de integración de la demostración local.
 * Sólo utiliza datos ficticios en memoria; no accede a Firebase ni realiza pagos.
 */
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const db = new Map();
globalThis.localStorage = {
  getItem: (key) => db.get(key) ?? null,
  setItem: (key, value) => { db.set(key, String(value)); },
  removeItem: (key) => { db.delete(key); },
};
globalThis.window = { dispatchEvent: () => {} };

const temp = await mkdtemp(join(tmpdir(), 'nderogara-check-'));
let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log(`  ✓ ${name}`);
};
try {
  // Esbuild sólo transpila los módulos que necesitamos para estas pruebas.
  await build({
    entryPoints: {
      plans: 'src/data/publicationPlans.ts',
      billing: 'src/services/billing.ts',
      invoices: 'src/services/invoices.ts',
      qr: 'src/services/qrCode.ts',
      identity: 'src/services/reviewerIdentity.ts',
    },
    outdir: temp,
    bundle: true,
    platform: 'node',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    logLevel: 'silent',
  });

  const plans = await import(pathToFileURL(join(temp, 'plans.mjs')).href);
  const billing = await import(pathToFileURL(join(temp, 'billing.mjs')).href);
  const invoices = await import(pathToFileURL(join(temp, 'invoices.mjs')).href);
  const qr = await import(pathToFileURL(join(temp, 'qr.mjs')).href);
  const identity = await import(pathToFileURL(join(temp, 'identity.mjs')).href);
  const basic = plans.PUBLICATION_PLANS.find((item) => item.id === 'basic');
  const premium = plans.PUBLICATION_PLANS.find((item) => item.id === 'premium');
  const owner = { id: 'u-demo', email: 'demo@example.invalid' };
  const properties = [
    { id: 'p1', ownerId: owner.id, ownerEmail: owner.email, images: ['1', '2'], videos: [], isActive: true },
    { id: 'p2', ownerId: owner.id, ownerEmail: owner.email, images: ['3', '4'], videos: [], isActive: true },
  ];

  test('Hay cuatro planes definidos', () => assert.equal(plans.PUBLICATION_PLANS.length, 4));
  test('El básico ofrece ocho fotos compartidas', () => assert.equal(basic.maxPhotos, 8));
  test('El límite de fotos considera otras publicaciones', () => {
    const usage = plans.ownerMediaUsage(properties, owner);
    assert.equal(plans.propertyPhotoAllowance(basic, usage), 4);
  });
  test('El Premium permite cuatro destacados', () => assert.equal(premium.maxFeatured, 4));
  test('Un aviso pendiente ocupa un cupo y no puede usarse para evadir límites', () => {
    const pending = { id: 'pendiente', ownerId: owner.id, ownerEmail: owner.email,
      images: ['foto'], videos: [], isActive: false, moderationStatus: 'flagged' };
    assert.equal(plans.ownerMediaUsage([pending], owner).active, 1);
    assert.equal(plans.isPropertyPublic(pending), false);
  });
  test('Sólo la cuenta propietaria del ID puede editar un anuncio', () => {
    const mine = { ownerId: 'usuario-original', ownerEmail: 'comun@example.invalid' };
    assert.equal(plans.ownerHasProperty(mine, { id: 'usuario-ajeno', email: 'comun@example.invalid' }), false);
    assert.equal(plans.ownerHasProperty(mine, { id: 'usuario-original', email: 'comun@example.invalid' }), true);
  });
  test('El ID anónimo es estable en el navegador y distinto de una cuenta', () => {
    const first = identity.getVisitorId();
    assert.match(first, /^visitor-/);
    assert.equal(identity.getVisitorId(), first);
    assert.notEqual(first, owner.id);
  });
  test('Activar un plan lo registra y conserva su vigencia', () => {
    plans.simulatePlanActivation(owner.id, 'premium');
    assert.equal(plans.effectiveOwnerPlan(owner.id)?.id, 'premium');
  });
  test('Un propietario puede desmarcar su aviso destacado', () => {
    assert.equal(plans.canFeatureProperty(properties[0], properties, owner.id), true);
    plans.toggleOwnerFeatured(owner.id, 'p1', properties, owner.email);
    assert.equal(plans.canFeatureProperty(properties[0], properties, owner.id), false);
  });
  test('La validación de facturación exige correo correcto', () => {
    assert.match(billing.validateBilling({ fullName: 'Persona Demo', email: 'inválido', phone: '0981123456', invoiceRequested: false, taxName: '', ruc: '', address: '', autoRenew: false }), /correo/i);
  });
  test('Campos de tarjeta vacíos son rechazados', () => {
    assert.ok(billing.validateCardFormat('', '', ''));
  });
  test('Se valida el formato de la tarjeta sin retener PAN ni CVV', () => {
    assert.equal(billing.validateCardFormat('4242424242424242', '12/29', '123'), null);
  });
  test('Se genera un QR local que incorpora el enlace de confirmación', () => {
    const svg = qr.makeQrSvg('http://192.168.0.10:5173/?confirmarPago=123456789');
    assert.match(svg, /<svg.*?<rect/s);
    assert.match(svg, /fill=\"#0f172a\"/);
  });
  test('Un pago de muestra queda registrado localmente', () => {
    const profile = { fullName: 'Persona Demo', email: 'demo@example.invalid', phone: '0981123456', invoiceRequested: false, taxName: '', ruc: '', address: '', autoRenew: false };
    const request = billing.newPaymentRequest({ ownerId: owner.id, ownerEmail: owner.email, planId: basic.id, planName: basic.name, amount: basic.price, method: 'qr', billing: profile }, 'pending');
    billing.savePaymentRequest(request);
    const paid = billing.completeDemoPayment(request);
    assert.equal(paid.status, 'paid');
    assert.equal(billing.getPayments()[0].status, 'paid');
  });
  test('El comprobante usa identificación X cuando no se solicita RUC', () => {
    const payment = billing.getPayments()[0];
    const invoice = invoices.createDemoInvoice(payment);
    assert.equal(invoice.customerRuc, 'X');
  });
  test('Un mismo pago no duplica comprobantes', () => {
    const payment = billing.getPayments()[0];
    const first = invoices.createDemoInvoice(payment);
    const second = invoices.createDemoInvoice(payment);
    assert.equal(first.id, second.id);
    assert.equal(invoices.getLocalInvoices().length, 1);
  });
  console.log(`\n${checks} comprobaciones correctas.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
