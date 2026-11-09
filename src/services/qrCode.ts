/**
 * Representación SVG descargable. La generación se realiza de forma local,
 * sin enviar enlaces de contratación a servicios de terceros.
 */
import { qrMatrix } from '../vendor/qr-engine.js';

export function makeQrSvg(link: string): string {
  const matrix: boolean[][] = qrMatrix(link);
  const border = 4;
  const size = matrix.length + border * 2;
  const pixels: string[] = [];
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix.length; col++) {
      if (matrix[row][col]) pixels.push(`<rect x="${col + border}" y="${row + border}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="480" height="480" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#0f172a">${pixels.join('')}</g></svg>`;
}

export function downloadQr(link: string, fileName: string): void {
  const blob = new Blob([makeQrSvg(link)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}
