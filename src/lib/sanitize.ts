const CONTROL = /[\u0000-\u001F\u007F]/g;

export function sanitizeText(value: string, max = 120) {
  return value.replace(CONTROL, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export const EQUIPMENT_TYPES = [
  "Chopeira a gelo",
  "Chopeira elétrica",
  "Chopeira naja",
  "Freezer horizontal",
  "Freezer vertical",
  "Visacooler",
  "Balcão refrigerado",
  "Câmara fria",
] as const;

export const VOLTAGES = ["110V", "220V", "Trifásico"] as const;

export const REFRIGERANTS = ["R134a", "R290", "R404a", "R600a", "R22", "Outro"] as const;
