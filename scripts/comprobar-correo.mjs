/** Pruebas ligeras de la cola local de avisos, sin conectarse a cuentas de correo. */
import { strict as assert } from 'node:assert';
import { build } from 'esbuild';

const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
};
globalThis.window = { dispatchEvent: () => true };
globalThis.Event = class Event { constructor(type) { this.type = type; } };

const result = await build({
  entryPoints: ['src/services/mailQueue.ts'],
  bundle: true, format: 'esm', platform: 'neutral', write: false,
  plugins: [{ name: 'mock-firebase-for-queue-tests', setup(build) {
    build.onResolve({ filter: /firebaseAuth$/ }, () => ({ path: 'firebase-mock', namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const firebaseAuth = { isConfigured:()=>false, getFreshIdToken:async()=>null };', loader: 'js' }));
  } }],
});
const dataUrl = 'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64');
const mail = await import(dataUrl);

assert.deepEqual(mail.getMailItems(), []);
assert.throws(() => mail.addMailItem({ reference: 'x', kind: 'general', to: 'invalid', subject: 'Hola', body: 'Texto' }));
const first = mail.addMailItem({ reference: 'general:1', kind: 'general', to: 'prueba@example.org', subject: 'Aviso', body: 'Información de contacto' });
assert.equal(first.status, 'prepared');
assert.equal(mail.getMailItems().length, 1);
assert.equal(mail.addMailItem({ reference: 'general:1', kind: 'general', to: 'prueba@example.org', subject: 'Aviso', body: 'Información de contacto' }).id, first.id);
assert.equal(mail.getMailItems().length, 1);
const plan = mail.preparePlanMail({ status: 'paid', id: 'op-123', planName: 'Premium anual', amount: 450000, billing: { fullName: 'Cliente', email: 'cliente@example.org' } });
assert.equal(plan.kind, 'plan');
assert.match(plan.body, /Premium anual/);
assert.equal(mail.getMailItems().length, 2);
const mod = mail.prepareModerationMail('cliente@example.org', 'prop-2', 'Inmueble', 'Imagen no permitida');
assert.equal(mod.kind, 'moderation');
assert.equal(mail.getMailItems().length, 3);
assert.match(mail.mailtoFor(mod), /^mailto:/);
mail.saveMailPreferences({senderName:'Nde Rogarã',replyTo:'soporte@example.org'});
assert.equal(mail.getMailPreferences().replyTo, 'soporte@example.org');
console.log('7 verificaciones de avisos y correo correctas.');
