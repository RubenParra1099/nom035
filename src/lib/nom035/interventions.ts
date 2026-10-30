import { D } from "./guides";

/**
 * Acciones de control sugeridas por dominio, alineadas al numeral 8 de la NOM-035-STPS-2018
 * (8.1 prevención, 8.2 acciones de control, 8.3 niveles de intervención) y a la política de prevención (5.1).
 * Son un punto de partida para el Programa de intervención; el responsable debe adaptarlas al centro de trabajo.
 */
export const INTERVENTIONS: Record<string, { focus: string; actions: string[]; level: "Primer nivel" | "Segundo nivel" | "Tercer nivel" }> = {
  [D.COND]: {
    focus: "Condiciones peligrosas, inseguras o deficientes del lugar de trabajo.",
    level: "Primer nivel",
    actions: [
      "Recorrido de verificación con la comisión de seguridad e higiene y atención de hallazgos (NOM-001, NOM-025, NOM-011 según aplique).",
      "Revisar el análisis de riesgos por puesto y la dotación de equipo de protección personal.",
      "Programa de orden y limpieza en áreas críticas, con responsables y fechas.",
      "Comunicar a los trabajadores las medidas de seguridad aplicadas y cómo reportar condiciones inseguras.",
    ],
  },
  [D.CARGA]: {
    focus: "Cargas cuantitativas, ritmo acelerado, carga mental, responsabilidad y demandas emocionales.",
    level: "Primer nivel",
    actions: [
      "Analizar cargas por puesto (volumen, tiempos estándar, plantilla) y redistribuir tareas en áreas con nivel alto.",
      "Establecer prioridades claras y eliminar tareas innecesarias o duplicadas.",
      "Pausas programadas durante la jornada, en especial en trabajo de alta concentración.",
      "Para atención a clientes: protocolos de atención difícil y apoyo del supervisor en situaciones de conflicto.",
    ],
  },
  [D.CONTROL]: {
    focus: "Poca autonomía, pocas posibilidades de desarrollo, manejo del cambio y capacitación insuficiente.",
    level: "Primer nivel",
    actions: [
      "Dar margen de decisión sobre orden, ritmo y pausas cuando el proceso lo permita.",
      "Plan de capacitación anual ligado al puesto y a las necesidades detectadas.",
      "Informar y consultar a los trabajadores antes de cambios en procesos, turnos o estructura.",
      "Definir rutas de crecimiento y criterios de promoción transparentes.",
    ],
  },
  [D.JORNADA]: {
    focus: "Jornadas extensas, horas extra frecuentes y trabajo en días de descanso.",
    level: "Primer nivel",
    actions: [
      "Monitorear horas extra por área y fijar un límite; revisar plantilla donde se excede.",
      "Respetar descansos semanales y vacaciones; programar coberturas con anticipación.",
      "Revisar la rotación de turnos para evitar cambios bruscos y jornadas nocturnas prolongadas.",
    ],
  },
  [D.INTERF]: {
    focus: "Interferencia del trabajo en la vida familiar y personal.",
    level: "Primer nivel",
    actions: [
      "Política de desconexión fuera de la jornada (mensajes y llamadas).",
      "Flexibilidad de horario o permisos para responsabilidades familiares cuando el puesto lo permita.",
      "Difundir apoyos disponibles (guardería, permisos, convenios) en la política de prevención.",
    ],
  },
  [D.LIDER]: {
    focus: "Escasa claridad de funciones y características del liderazgo.",
    level: "Primer nivel",
    actions: [
      "Descripciones de puesto actualizadas y objetivos comunicados por escrito.",
      "Capacitación de jefes y supervisores en liderazgo, retroalimentación y manejo de conflictos.",
      "Reuniones periódicas de seguimiento con el equipo para comunicar información a tiempo.",
    ],
  },
  [D.REL]: {
    focus: "Relaciones sociales en el trabajo y deficiente relación con los colaboradores que supervisa.",
    level: "Primer nivel",
    actions: [
      "Actividades de integración y trabajo en equipo; mecanismos de apoyo entre compañeros.",
      "Para quienes supervisan: herramientas para delegar, dar seguimiento y manejar desempeño.",
      "Canal para resolver conflictos de forma respetuosa antes de que escalen.",
    ],
  },
  [D.VIOL]: {
    focus: "Violencia laboral: hostigamiento, acoso, malos tratos.",
    level: "Segundo nivel",
    actions: [
      "Difundir la política de prevención y el mecanismo seguro y confidencial para recibir quejas (numeral 8.1 y 5.1).",
      "Investigar los casos reportados con imparcialidad y sin represalias; aplicar el procedimiento interno.",
      "Sensibilizar a todo el personal sobre conductas que constituyen violencia laboral.",
      "En niveles alto o muy alto: evaluación específica y atención psicológica a quien lo requiera.",
    ],
  },
  [D.RECON]: {
    focus: "Escasa o nula retroalimentación y reconocimiento del desempeño.",
    level: "Primer nivel",
    actions: [
      "Retroalimentación periódica y evaluaciones de desempeño con criterios claros.",
      "Programa de reconocimiento no solo económico (públicos, por logros, por antigüedad).",
      "Revisar que el pago sea puntual y la equidad salarial entre puestos similares.",
    ],
  },
  [D.PERT]: {
    focus: "Limitado sentido de pertenencia e inestabilidad laboral.",
    level: "Primer nivel",
    actions: [
      "Comunicar la situación y los planes de la organización para reducir incertidumbre.",
      "Analizar causas de rotación de personal y entrevistas de salida.",
      "Fortalecer la inducción y la identificación con los objetivos del centro de trabajo.",
    ],
  },
};

/** Acción obligatoria según el resultado de la Guía I (numeral 7.1 / 8.1 f). */
export const GUIA_I_ACTION =
  "Canalizar a los trabajadores que requieren valoración clínica a la institución de seguridad social o servicio médico privado, " +
  "y dar seguimiento confidencial hasta su atención.";
