/**
 * Catálogo de centros de trabajo, áreas de adscripción y puestos
 * (fuente: "listado asistencia por áreas NOM 035.docx"). Al elegir un centro de trabajo
 * solo se muestran sus áreas y puestos; el trabajador puede escribir otro si no aparece.
 */
export type CentroTrabajo = { centro: string; areas: string[]; puestos: string[] };

export const TIPOS_PLAZA = ["CONFIANZA", "SINDICALIZADO", "HONORARIOS"];

/** Datos de identificación: etiqueta en cuestionario, formato impreso y encabezado de la plantilla de Excel. */
export const IDENT_FIELDS = [
  { key: "workCenter", label: "Centro de trabajo", header: "Centro de Trabajo", match: /^centro de trabajo$/i },
  { key: "positionType", label: "Tipo de plaza", header: "Tipo de Plaza", match: /^tipo de plaza$/i },
  { key: "fullName", label: "Nombre completo", header: "Nombre Completo", match: /^nombre completo$/i },
  { key: "position", label: "Puesto", header: "Puesto", match: /^puesto$/i },
  { key: "area", label: "Área de adscripción", header: "Área de Adscripción", match: /^[áa]rea de adscripci[óo]n$/i },
] as const;
export type IdentKey = (typeof IDENT_FIELDS)[number]["key"];

export const CATALOGO: CentroTrabajo[] = [
  {
    centro: "SECRETARÍA DEL AYUNTAMIENTO",
    areas: ["SECRETARÍA DEL AYUNTAMIENTO"],
    puestos: ["ASESOR DEL SECRETARIO", "AUXILIAR ADMINISTRATIVO", "COORDINADOR", "INTENDENTE", "SECRETARIA PARTICULAR", "SECRETARIO DEL AYUNTAMIENTO", "TÉCNICO EN ARCHIVO"],
  },
  {
    centro: "SUBSECRETARÍA DEL AYUNTAMIENTO",
    areas: ["SUBSECRETARÍA DEL AYUNTAMIENTO"],
    puestos: ["AUXILIAR ADMINISTRATIVO", "AUXILIAR GENERAL", "AUXILIAR JURÍDICO", "AUXILIAR UNIVERSAL DE OFICINA", "COORDINADOR", "RECEPCIÓN ATENCIÓN PÚBLICO", "SECRETARIA", "SUBSECRETARIO DEL R. AYUNTAMIENTO"],
  },
  {
    centro: "SUBSECRETARÍA DE ASUNTOS JURÍDICOS",
    areas: ["SUBSECRETARÍA DE ASUNTOS JURÍDICOS", "DIRECCIÓN GENERAL DE ORDENAMIENTO TERRITORIAL Y URBANISMO", "OFICIALÍA DE PARTES", "SUBSECRETARÍA DEL AYUNTAMIENTO", "UNIDAD MUNICIPAL DE DERECHOS HUMANOS"],
    puestos: ["AUXILIAR GENERAL", "AUXILIAR JURÍDICO", "AUXILIAR UNIVERSAL DE OFICINA", "COORDINADOR", "DIRECTOR", "SECRETARIA", "SECRETARIO ABOGADO"],
  },
  {
    centro: "SUBSECRETARÍA DE ASUNTOS POLÍTICOS",
    areas: ["SUBSECRETARÍA DE ASUNTOS POLÍTICOS"],
    puestos: ["AUXILIAR ADMINISTRATIVO"],
  },
  {
    centro: "SUBSECRETARÍA DE ADMINISTRACIÓN",
    areas: ["SUBSECRETARÍA DE ADMINISTRACIÓN"],
    puestos: ["AUXILIAR ADMINISTRATIVO", "AUXILIAR GENERAL", "AUXILIAR UNIVERSAL DE OFICINA", "SUBSECRETARIO DE ADMINISTRACIÓN"],
  },
  {
    centro: "DIRECCIÓN DE INSPECCIÓN Y VERIFICACIÓN",
    areas: ["DIRECCIÓN DE INSPECCIÓN Y VERIFICACIÓN"],
    puestos: ["AUXILIAR ADMINISTRATIVO", "AUXILIAR GENERAL", "AUXILIAR JURÍDICO", "AUXILIAR UNIVERSAL DE OFICINA", "CAPTURISTA", "COORDINADOR", "DIRECTOR", "ENCARGADO", "INSPECTOR", "JEFE", "SUPERVISOR"],
  },
  {
    centro: "DIRECCIÓN MUNICIPAL DE PROTECCIÓN CIVIL",
    areas: ["PROTECCIÓN CIVIL Y BOMBEROS", "H. CUERPO DE BOMBEROS TORREÓN"],
    puestos: ["ADMINISTRATIVO", "ALMACÉN", "ÁREA TÉCNICA", "ASISTENTE", "AUXILIAR ADMINISTRATIVO", "AUXILIAR GENERAL", "BOMBERO", "CAPITÁN", "COMANDANTE", "COORDINADOR ADMINISTRATIVO", "COORDINADOR JURÍDICO", "COORDINADOR OPERATIVO", "DIRECTOR", "INSPECTOR", "MECÁNICO", "OPERADOR", "RADIO-OPERADOR", "SECRETARIA", "TENIENTE"],
  },
  {
    centro: "COORDINACIÓN GENERAL",
    areas: ["COORDINACIÓN GENERAL"],
    puestos: ["AUXILIAR ADMINISTRATIVO", "AUXILIAR JURÍDICO", "COORDINADOR GENERAL"],
  },
  {
    centro: "COORDINACIÓN MUNICIPAL DEL SUBSIDIO PARA LA SEGURIDAD EN LOS MUNICIPIOS",
    areas: ["COORDINACIÓN MUNICIPAL DEL SUBSIDIO PARA LA SEGURIDAD EN LOS MUNICIPIOS"],
    puestos: ["ASISTENTE DE DIRECCIÓN", "AUXILIAR ADMINISTRATIVO", "AUXILIAR GENERAL", "COORDINADOR MUNICIPAL DEL SUBSIDIO PARA LA SEGURIDAD EN LOS MUNICIPIOS", "PROFESIONISTA"],
  },
  {
    centro: "UNIDAD MUNICIPAL DE DERECHOS HUMANOS",
    areas: ["UNIDAD MUNICIPAL DE DERECHOS HUMANOS"],
    puestos: ["ADMINISTRATIVO", "DIRECTOR", "ENLACE CIUDADANO", "MEDIADOR"],
  },
  {
    centro: "UNIDAD DE PREVENCIÓN SOCIAL DE LA VIOLENCIA",
    areas: ["UNIDAD DE PREVENCIÓN SOCIAL DE LA VIOLENCIA"],
    puestos: ["AUXILIAR ADMINISTRATIVO", "AUXILIAR GENERAL", "COORDINADOR GENERAL", "DIRECTOR"],
  },
  {
    centro: "JUNTA MUNICIPAL DE RECLUTAMIENTO",
    areas: ["JUNTA MUNICIPAL DE RECLUTAMIENTO"],
    puestos: ["ASISTENTE", "ATENCIÓN AL PÚBLICO", "ATENCIÓN AL PÚBLICO Y ARCHIVISTA", "ATENCIÓN AL PÚBLICO Y CAPTURISTA", "ATENCIÓN AL PÚBLICO Y SECRETARIA", "AUXILIAR", "AUXILIAR GENERAL", "JEFE", "SECRETARIA"],
  },
  {
    centro: "ARCHIVO MUNICIPAL",
    areas: ["ARCHIVO MUNICIPAL", "OFICIALÍA DE PARTES"],
    puestos: ["ARCHIVISTA", "AUXILIAR ADMINISTRATIVO", "AUXILIAR GENERAL", "CAPTURISTA", "COORDINADOR ADMINISTRATIVO", "COORDINADOR DE DIFUSIÓN", "DIRECTOR", "DISEÑADORA GRÁFICA", "INTENDENCIA", "MENSAJERO", "TÉCNICO EN ARCHIVO"],
  },
];
