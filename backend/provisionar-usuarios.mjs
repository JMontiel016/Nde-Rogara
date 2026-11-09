/**
 * Compatibilidad: el administrador principal ahora es 016.jmma@gmail.com.
 * Este script ya NO crea usuarios ni cambia contraseñas.
 *
 * Para asignar permisos a la cuenta Google existente, ejecutar:
 *   node backend/asignar-admin-existente.mjs
 * con Google Application Default Credentials en un entorno privado.
 */
console.error('Este procedimiento fue sustituido por backend/asignar-admin-existente.mjs.');
console.error('No se crearon usuarios ni se modificaron contraseñas.');
process.exitCode = 1;
