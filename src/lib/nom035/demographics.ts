/** Opciones de datos generales (mismas cadenas que los formularios de Google para que lo importado y lo capturado se agrupen igual). */
export const TIEMPOS = ["Menos de 6 meses", "Entre 6 meses y 1 año", "Entre 1 y 4 años", "Entre 5 y 9 años", "Entre 10 y 14 años", "Entre 15 y 19 años", "Entre 20 y 24 años", "25 años o más"];
export const DEMO_QUESTIONS: { key: string; label: string; options?: string[]; fromEvaluation?: "departments" | "positions" }[] = [
  { key: "sexo", label: "Sexo", options: ["Hombre", "Mujer"] },
  { key: "edad", label: "Edad (años)", options: ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70 o más"] },
  { key: "estadoCivil", label: "Estado civil", options: ["Casado", "Soltero", "Unión Libre", "Divorciado", "Viudo"] },
  { key: "estudios", label: "Nivel de estudios (el último que cursó)", options: [
    "Sin Formación", "Primaria", "Secundaria", "Preparatoria o Bachillerato", "Técnico Superior", "Licenciatura", "Maestría", "Doctorado",
    "Primaria (incompleta)", "Secundaria (incompleta)", "Preparatoria o Bachillerato (incompleta)", "Técnico Superior (incompleta)", "Licenciatura (incompleta)", "Maestría (incompleta)", "Doctorado (incompleta)",
  ] },
  { key: "departamento", label: "Departamento / sección / área", fromEvaluation: "departments" },
  { key: "puesto", label: "Tipo de puesto", fromEvaluation: "positions" },
  { key: "contratacion", label: "Tipo de contratación", options: ["Por obra o proyecto", "Por tiempo determinado (Temporal)", "Tiempo Indeterminado", "Honorarios"] },
  { key: "jornada", label: "Tipo de jornada de trabajo", options: ["Fijo Nocturno (Entre las 20:00 y 6:00 horas)", "Fijo Mixto (Combinación de Nocturno y Diurno)", "Fijo Diurno (Entre las 6:00 y 20:00 horas)"] },
  { key: "rotacion", label: "¿Realiza rotación de turnos?", options: ["Sí", "No"] },
  { key: "tiempoPuesto", label: "Tiempo en el puesto actual", options: TIEMPOS },
  { key: "experiencia", label: "Tiempo de experiencia laboral", options: TIEMPOS },
];
export const PHYSICAL_OPTIONS = ["Muy Bien", "Bien", "Regular", "Mal", "Muy Mal"];
export const PHYSICAL_ITEMS = ["Temperatura", "Humedad", "Iluminación", "Ventilación", "Higiene", "Ruido"];
