const API = import.meta.env.VITE_API_URL || '';

// Campos pesados (imágenes base64) que el listado ligero no incluye.
export const HEAVY_PROSPECT_FIELDS = [
  'estimation_data',
  'contract_photo_rep',
  'contract_photo_client',
  'contract_signature_rep',
  'contract_signature_client',
];

export async function fetchFullProspect(id) {
  try {
    const res = await fetch(`${API}/api/prospects/${id}`);
    return res.ok ? await res.json() : null;
  } catch (error) {
    console.error('fetchFullProspect:', error);
    return null;
  }
}

// Si ya teníamos el registro completo, conserva sus campos pesados al refrescar con el listado ligero.
export function mergeHeavy(fresh, previous) {
  if (!fresh || !fresh.is_light || !previous || previous.is_light) return fresh;
  const merged = { ...fresh, is_light: false };
  HEAVY_PROSPECT_FIELDS.forEach(key => { merged[key] = previous[key]; });
  return merged;
}
