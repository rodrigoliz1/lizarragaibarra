import { practiceAreas } from "@/data/practice-areas";
import { lawyers } from "@/data/lawyers";
export const appointmentAreas = practiceAreas.map((area) => ({
  value: area.slug,
  label: area.title,
}));
export const appointmentLawyers = [
  { value: "", label: "Asignar al profesional adecuado" },
  ...lawyers.map((lawyer) => ({ value: lawyer.slug, label: lawyer.name })),
];
