// Formats numbers into Paraguayan Guaraníes style: Gs. 2.500.000
export function formatGs(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Gs. 0';
  }
  const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Gs. ${formatted}`;
}

// Simple date formatter
export function formatDate(dateString: string): string {
  return dateString;
}

// Generate printable receipt HTML
export function printReceiptElement(elementId: string) {
  const content = document.getElementById(elementId);
  if (!content) return;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Comprobante de Pago - Nde Rogarã</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .title { color: #0284c7; font-size: 24px; font-weight: bold; margin: 0; }
          .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .table th, .table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
          .table th { background-color: #f8fafc; color: #475569; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
          .badge-paid { background-color: #dcfce7; color: #166534; }
          .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
    </html>
  `);

  printWindow.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

/**
 * Normaliza cualquier número paraguayo o internacional a enlace directo de WhatsApp
 * Ejemplos: 0981 123 456, +595981123456, 981123456 -> https://wa.me/595981123456?text=...
 */
export function formatWhatsAppUrl(phone?: string, text?: string): string {
  if (!phone) return ''; // No inventar un teléfono del propietario
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '595' + clean.slice(1);
  } else if (!clean.startsWith('595') && (clean.length === 9 || clean.length === 8)) {
    clean = '595' + clean;
  }
  const encodedText = text ? encodeURIComponent(text) : '';
  return `https://wa.me/${clean}${encodedText ? `?text=${encodedText}` : ''}`;
}

/**
 * Lista exhaustiva de departamentos, ciudades y distritos del Paraguay
 * para búsqueda predictiva y autocompletado libre
 */
export const PARAGUAY_CITIES_LIST: string[] = [
  // Departamento Central y Capital
  'Asunción (Capital)',
  'San Lorenzo (Central)',
  'Luque (Central)',
  'Capiatá (Central)',
  'Lambaré (Central)',
  'Fernando de la Mora (Central)',
  'Limpio (Central)',
  'Mariano Roque Alonso (Central)',
  'Ñemby (Central)',
  'Villa Elisa (Central)',
  'Itauguá (Central)',
  'San Antonio (Central)',
  'Itá (Central)',
  'Ypané (Central)',
  'Areguá (Central)',
  'Villeta (Central)',
  'Guarambaré (Central)',
  'Ypacaraí (Central)',
  'J. Augusto Saldívar (Central)',
  'Nueva Italia (Central)',

  // Alto Paraná
  'Ciudad del Este (Alto Paraná)',
  'Hernandarias (Alto Paraná)',
  'Presidente Franco (Alto Paraná)',
  'Minga Guazú (Alto Paraná)',
  'Santa Rita (Alto Paraná)',
  'Santa Rosa del Monday (Alto Paraná)',
  'Dr. Juan León Mallorquín (Alto Paraná)',
  'Naranjal (Alto Paraná)',
  'San Cristóbal (Alto Paraná)',

  // Itapúa
  'Encarnación (Itapúa)',
  'Cambyretá (Itapúa)',
  'Fram (Itapúa)',
  'Hohenau (Itapúa)',
  'Obligado (Itapúa)',
  'Bella Vista (Itapúa)',
  'Coronel Bogado (Itapúa)',
  'Carmen del Paraná (Itapúa)',
  'Natalio (Itapúa)',
  'Mayor Otaño (Itapúa)',

  // Caaguazú
  'Coronel Oviedo (Caaguazú)',
  'Caaguazú (Caaguazú)',
  'Dr. J. Eulogio Estigarribia / Campo 9 (Caaguazú)',
  'Repatriación (Caaguazú)',
  'Yhú (Caaguazú)',

  // Cordillera
  'Caacupé (Cordillera)',
  'Piribebuy (Cordillera)',
  'Tobatí (Cordillera)',
  'Altos (Cordillera)',
  'San Bernardino (Cordillera)',
  'Eusebio Ayala (Cordillera)',
  'Itacurubí de la Cordillera (Cordillera)',
  'Atyrá (Cordillera)',

  // Guairá
  'Villarrica (Guairá)',
  'Independencia / Colonia Independencia (Guairá)',
  'Mbocayaty (Guairá)',
  'Paso Yobái (Guairá)',

  // Paraguarí
  'Paraguarí (Paraguarí)',
  'Carapeguá (Paraguarí)',
  'Yaguarón (Paraguarí)',
  'Quiindy (Paraguarí)',
  'Pirayú (Paraguarí)',
  'Acahay (Paraguarí)',

  // Concepción
  'Concepción (Concepción)',
  'Horqueta (Concepción)',
  'Belén (Concepción)',
  'Yby Yaú (Concepción)',

  // Amambay
  'Pedro Juan Caballero (Amambay)',
  'Bella Vista Norte (Amambay)',
  'Capitán Bado (Amambay)',

  // Canindeyú
  'Salto del Guairá (Canindeyú)',
  'Curuguaty (Canindeyú)',
  'Katueté (Canindeyú)',
  'La Paloma (Canindeyú)',

  // San Pedro
  'San Pedro de Ycuamandyyú (San Pedro)',
  'Santa Rosa del Aguaray (San Pedro)',
  'San Estanislao / Santaní (San Pedro)',
  'Guayaibí (San Pedro)',

  // Misiones
  'San Juan Bautista (Misiones)',
  'San Ignacio (Misiones)',
  'Ayolas (Misiones)',
  'Santa Rosa (Misiones)',

  // Ñeembucú
  'Pilar (Ñeembucú)',
  'Alberdi (Ñeembucú)',

  // Presidente Hayes (Chaco)
  'Villa Hayes (Presidente Hayes)',
  'Benjamín Aceval (Presidente Hayes)',
  'Nanawa (Presidente Hayes)',

  // Boquerón (Chaco)
  'Filadelfia (Boquerón)',
  'Loma Plata (Boquerón)',
  'Neuland (Boquerón)',

  // Alto Paraguay (Chaco)
  'Fuerte Olimpo (Alto Paraguay)',
  'Bahía Negra (Alto Paraguay)',

  // Caazapá
  'Caazapá (Caazapá)',
  'Yuty (Caazapá)',
  'San Juan Nepomuceno (Caazapá)'
];


