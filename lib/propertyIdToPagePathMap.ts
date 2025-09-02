// lib/propertyIdToPagePathMap.ts

// Ajuste os valores conforme o seu GA4 (DE-PARA: propertyId -> pagepath)
const propertyIdToPagePathMap: Record<number, string> = {
  479563393: "Amig-Cartilha",
  447818866: "ControlF5",
  502012077: "IGB",
  // ...adicione outros se necessário
};

/**
 * Retorna o pagepath correspondente ao propertyid informado.
 * Se não encontrar, retorna undefined.
 */
export function getPagePathByPropertyId(propertyid: number): string | undefined {
  return propertyIdToPagePathMap[propertyid];
}
