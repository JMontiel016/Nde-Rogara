/** Filtro preventivo de texto en el navegador. En producción debe ejecutarse también en el servidor. */
const fold = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[@4]/g,'a').replace(/[0]/g,'o').replace(/[1!]/g,'i').replace(/[$5]/g,'s').replace(/[^a-z0-9]+/g, ' ').trim();
const abusive = [
  /\b(?:puta|puto|mierda|pelotudo|pelotuda|boludo|boluda|idiota|imbecil|estupido|estupida|pendejo|pendeja|hijo de puta|hija de puta|malparido|malparida)\b/,
  /\b(?:matarte|te voy a matar|amenaza de muerte|te voy a golpear|violarte|violar)\b/,
  /\b(?:nazi|supremacia racial|exterminar|odio racial)\b/,
  /\b(?:pornografia|porno|xxx|contenido sexual|sexo explicito|prostitucion|escort)\b/,
  /\b(?:casino|apuesta|tragamonedas|cripto|estafa|vender droga)\b/
];
export function checkReviewText(author: string, comment: string): string | null {
  const value = fold(`${author} ${comment}`);
  if (/\b(?:https?|www|wa me|t me|bit ly|arroba)\b/.test(value)) return 'La reseña contiene publicidad, enlaces o datos de contacto no permitidos.';
  if (abusive.some(expr=>expr.test(value))) return 'Esta reseña contiene insultos, amenazas o contenido prohibido por la política del portal.';
  if (/(.)\1{12,}/.test(value)) return 'La reseña parece contener contenido repetitivo o no pertinente.';
  return null;
}
