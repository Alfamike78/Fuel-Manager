export const FUEL_TYPES = [
  { value: "Jet-A1",      label: "Jet-A1",       color: "#1f2937" },
  { value: "AvGas 100LL", label: "AvGas 100LL",  color: "#2563eb" },
  { value: "Avgas UL91",  label: "Avgas UL91",   color: "#a3b518" },
  { value: "Diesel",      label: "Diesel",        color: "#eab308" },
  { value: "Benzina",     label: "Benzina",       color: "#16a34a" },
  { value: "Altro",       label: "Altro",         color: "#6b7280" },
] as const;

export type FuelType = typeof FUEL_TYPES[number]["value"];

export function getFuelColor(type: string): string {
  return FUEL_TYPES.find((f) => f.value === type)?.color ?? "#6b7280";
}

export const AVIATION_TYPES = ["Elicottero", "Aereo"] as const;
export const GROUND_TYPES = ["Auto", "Furgone", "Van", "Camion", "Ruspa", "Ragno", "Trattore", "Altro"] as const;
