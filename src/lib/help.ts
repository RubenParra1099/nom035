/**
 * Textos de ayuda de la plataforma (signo “?” junto a cada módulo, sección e indicador).
 * Un salto de línea separa párrafos. Mantener breves: qué es, para qué sirve y cómo usarlo.
 */
export const HELP = {
  /* ---------- Cartera ---------- */
  cartera: { title: "Cartera de clientes", text: "Vista general de todas las empresas que atiende: el resultado más reciente de cada una, el avance de la captura, los casos de Guía I pendientes y sus alertas.\nUse el buscador, el giro y los chips de nivel para filtrar, y “Ordenar” para ver primero las de mayor riesgo, más alertas o menor avance. “+ Nuevo cliente” abre el asistente de alta." },
  "cartera.empresas": { title: "Empresas", text: "Número de empresas registradas y total de centros de trabajo. La NOM-035 se evalúa por centro de trabajo." },
  "cartera.respuestas": { title: "Respuestas", text: "Cuestionarios recibidos en la evaluación más reciente de cada centro de trabajo, sumados para toda la cartera." },
  "cartera.capturas": { title: "Capturas abiertas", text: "Evaluaciones con estado “Abierta”: el enlace del cuestionario acepta respuestas en este momento." },
  "cartera.guia1": { title: "Guía I sin canalizar", text: "Trabajadores que según la Guía I requieren valoración clínica y cuyo caso aún no se marca como canalizado. La norma pide canalizarlos a atención (numerales 5.4 y 8.1)." },
  "cartera.criticas": { title: "Alertas críticas", text: "Incumplimientos directos de la norma o riesgos para un trabajador: Guía I sin canalizar, quejas de violencia sin atender, etc. Haga clic en “Alertas” del menú para verlas." },
  "cartera.tabla": { title: "Tabla de empresas", text: "Último resultado: el nivel más alto entre las evaluaciones recientes de los centros de la empresa (con al menos 5 respuestas).\nAlto+: porcentaje de trabajadores en nivel alto o muy alto.\nAvance: respuestas recibidas contra la muestra o plantilla requerida." },

  /* ---------- Empresa y centros ---------- */
  empresa: { title: "Empresa", text: "Ficha del cliente con cinco pestañas: Resumen, Estructura (centros y áreas), Evaluaciones, Gestión preventiva y Datos de la empresa.\nEmpiece por la Estructura: es el único lugar donde se capturan los centros de trabajo y sus áreas." },
  "emp.resumen": { title: "Resumen", text: "Totales de la empresa y la evaluación más reciente de cada centro con sus seis módulos. Abajo, los pasos para trabajar con el cliente; se marcan en verde al completarse." },
  "emp.estructura": { title: "Estructura", text: "Centros de trabajo con su número de trabajadores y sus áreas. Es la única fuente de áreas: el cuestionario, los filtros del tablero, la participación por área y la capacitación la toman de aquí.\nLas evaluaciones abiertas toman los cambios; las cerradas conservan la estructura del día en que se crearon." },
  "emp.evaluaciones": { title: "Evaluaciones", text: "Todas las evaluaciones de la empresa agrupadas por centro, con su avance, calificación final y accesos a los seis módulos." },
  "emp.gestion": { title: "Gestión preventiva", text: "Buzón de quejas y capacitación de cada centro. Haga clic en un centro para registrar o dar seguimiento." },
  "emp.datos": { title: "Datos de la empresa", text: "Razón social, RFC, giro y contacto. El giro permite comparar contra empresas del mismo sector. La zona de riesgo elimina centros o la empresa completa (solo administrador)." },
  "empresa.centro": { title: "Centro de trabajo", text: "La NOM-035 se aplica por centro de trabajo. El número de trabajadores define la guía: hasta 15 solo Guía I y política; de 16 a 50 Guía II a todo el personal; más de 50 Guía III a una muestra representativa." },
  "empresa.nuevocentro": { title: "Nuevo centro de trabajo", text: "Registre cada instalación (planta, oficina, sucursal) por separado con sus áreas. Así puede compararlas entre sí y la norma se cumple por centro." },
  wizard: { title: "Nuevo cliente", text: "Da de alta al cliente completo en cuatro pasos: datos de la empresa, centros con sus áreas, primera evaluación y enlaces listos para compartir.\nPuede pegar la estructura desde Excel en el paso 2." },
  "wz.empresa": { title: "Datos de la empresa", text: "Razón social, RFC, giro o sector y contacto. Solo el nombre es obligatorio; el giro permite compararla contra su sector." },
  "wz.centros": { title: "Centros y plantilla", text: "Cada planta, oficina o sucursal con su número de trabajadores y sus áreas. La guía y la muestra se calculan solas por centro. Use “Pegar desde Excel” con columnas Centro · Área · Trabajadores." },
  "wz.evaluacion": { title: "Primera evaluación", text: "Elija en qué centros crear la evaluación ahora. La guía se sugiere por el número de trabajadores; las áreas se toman de la estructura. Si la deja abierta, el enlace acepta respuestas desde hoy." },

  /* ---------- Nueva evaluación ---------- */
  nuevaeval: { title: "Nueva evaluación", text: "Configura una aplicación de los cuestionarios en este centro. Al crearla obtiene el enlace y el código QR para que el personal conteste, o puede importar respuestas desde Excel." },
  "ne.datos": { title: "Datos de la evaluación", text: "Un nombre que identifique el periodo (por ejemplo “Evaluación noviembre 2026”). Se usa en el tablero, el informe y para comparar periodos." },
  "ne.plantilla": { title: "Plantilla del centro", text: "Se toma de la Estructura de la empresa: total de trabajadores y áreas con su número de personas. Si algo cambió, corríjalo en la Estructura antes de crear la evaluación.\nQueda guardada como foto de esta evaluación." },
  "ne.cuestionario": { title: "Cuestionario", text: "Guía II (46 reactivos): centros de 16 a 50 trabajadores, se aplica a todos.\nGuía III (72 reactivos): más de 50 trabajadores, se aplica a una muestra y agrega el entorno organizacional.\nLa Guía I (acontecimientos traumáticos severos) se recomienda siempre." },
  "ne.puestos": { title: "Tipos de puesto", text: "Opciones que verá el trabajador en “Tipo de puesto”. También son filtros del tablero para comparar resultados entre niveles de puesto." },
  "ne.resumen": { title: "Resumen", text: "Se actualiza mientras captura: total de trabajadores, áreas, guía elegida y la meta de cuestionarios que debe alcanzar." },

  /* ---------- Módulo 1 · Evaluación ---------- */
  "mod.evaluacion": { title: "Módulo 1 · Evaluación", text: "Aquí se recolectan las respuestas: comparta el enlace o el QR, importe archivos de Excel y revise el avance contra la muestra mínima. También se configuran las áreas y puestos del cuestionario." },
  "ev.enlace": { title: "Enlace del cuestionario", text: "Comparta este enlace o el código QR con el personal. Cada quien contesta desde su celular o computadora, de forma anónima.\nLa evaluación debe estar “Abierta” para recibir respuestas; ciérrela al terminar." },
  "ev.excel": { title: "Subir respuestas desde Excel", text: "Para cuestionarios aplicados en papel o en otra herramienta. Descargue la plantilla, capture una fila por trabajador y súbala aquí. La plataforma valida y califica cada fila." },
  "ev.config": { title: "Configuración", text: "Nombre, puestos y si incluye la Guía I. Las áreas vienen de la Estructura del centro: mientras la evaluación no esté cerrada, toma los cambios que haga ahí." },
  "ev.avance": { title: "Avance de la captura", text: "Respuestas recibidas contra la meta: en Guía III la muestra mínima representativa (95% de confianza); en Guía II toda la plantilla." },

  /* ---------- Módulo 2 · Tablero ---------- */
  "mod.tablero": { title: "Módulo 2 · Tablero e indicadores", text: "Análisis completo de los resultados: calificación final, niveles de riesgo, categorías, dominios, reactivos, grupos, KPIs y plan de acción.\nTodo el tablero se recalcula con los filtros (área, puesto, sexo, turno, antigüedad…). Grupos con menos de 5 respuestas se ocultan para proteger la confidencialidad." },
  "tab.filtros": { title: "Filtros", text: "Elija uno o varios valores para recalcular todo el tablero solo con esos trabajadores. Los filtros activos aparecen como chips; quítelos con la ×.\n“Comparar con” elige un periodo anterior para ver cambios." },
  "tab.resumen": { title: "Resumen ejecutivo", text: "Lo esencial en una pantalla: calificación final, distribución por nivel, hallazgos, categorías y comparación con el periodo anterior." },
  "tab.kpis": { title: "KPIs y KRIs", text: "27 indicadores agrupados en cuatro dimensiones con semáforo verde/amarillo/rojo, margen de error al 95% y cambio contra el periodo anterior." },
  "tab.analisis": { title: "Análisis avanzado", text: "Prioridades de intervención, cascada de cambios entre periodos, mapa demanda–control, distribución individual, Pareto de reactivos y relación entre dominios." },
  "tab.dominios": { title: "Categorías y dominios", text: "Semáforo de cada categoría y dominio según los puntos de corte de la norma." },
  "tab.grupos": { title: "Comparativo por grupos", text: "Compara áreas, puestos, sexo, edad, turno, etc. Muestra la calificación de cada grupo con su intervalo de confianza y un mapa de calor." },
  "tab.reactivos": { title: "Reactivos", text: "Cada pregunta con su puntaje y respuesta desfavorable. Haga clic en un reactivo para abrir su ficha técnica." },
  "tab.guia1": { title: "Guía I y entorno físico", text: "Resultados de la Guía I por grupo, seguimiento de casos y condiciones físicas del lugar de trabajo." },
  "tab.perfil": { title: "Perfil de participantes", text: "Quiénes respondieron: participación por área contra la plantilla, pirámide de edad y datos sociodemográficos." },
  "tab.plan": { title: "Plan de acción", text: "Criterios de la norma para la toma de acciones según el nivel de riesgo, y los dominios que conviene atender primero." },
  kpis: { title: "Cómo leer los KPIs", text: "KPI mide efectividad; KRI mide riesgo o impacto. El color sigue los umbrales de cada indicador.\n± es el margen de error al 95% (“censo” si respondió todo el personal). La flecha compara con el periodo seleccionado en “Comparar con”." },

  /* Paneles del tablero (por título) */
  "p.Calificación final del cuestionario": { title: "Calificación final", text: "Suma de los puntos de todos los reactivos, promediada entre los trabajadores. El color indica el nivel de riesgo según los puntos de corte de la guía (nulo, bajo, medio, alto, muy alto)." },
  "p.Trabajadores por nivel de riesgo": { title: "Trabajadores por nivel de riesgo", text: "Cuántos trabajadores quedan en cada nivel según su calificación individual. Lo que más importa es la proporción en alto y muy alto." },
  "p.Hallazgos principales": { title: "Hallazgos principales", text: "Conclusiones automáticas: los dominios y reactivos con más riesgo, los grupos más afectados y los cambios relevantes." },
  "p.Categorías": { title: "Categorías", text: "Calificación de cada categoría de la norma (ambiente, factores de la actividad, organización del tiempo, liderazgo y relaciones, entorno organizacional) con su nivel." },
  "p.Perfil de riesgo por dominio": { title: "Perfil de riesgo por dominio", text: "Radar con el nivel de cada dominio en escala común. Entre más hacia afuera, mayor riesgo. La línea punteada es el periodo anterior." },
  "p.Evolución entre evaluaciones": { title: "Evolución entre evaluaciones", text: "Calificación final y porcentaje en alto o muy alto en cada periodo, con su intervalo de confianza. Si los intervalos no se traslapan, el cambio es real y no efecto del muestreo." },
  "p.Reactivos con mayor riesgo": { title: "Reactivos con mayor riesgo", text: "Las preguntas con mayor puntaje promedio. Haga clic en una para ver su ficha técnica: distribución de respuestas, grupos y acciones sugeridas." },
  "p.Semáforo por categoría y dominio": { title: "Semáforo por categoría y dominio", text: "Nivel de riesgo de cada categoría y dominio, con barra contra los puntos de corte de la norma." },
  "p.Calificación final por": { title: "Calificación por grupo", text: "Punto: calificación promedio del grupo. Línea: intervalo de confianza al 95%. Línea punteada: promedio general. Barra inferior: composición por nivel. Haga clic en un grupo para filtrarlo." },
  "p.Mapa de calor": { title: "Mapa de calor", text: "Cada celda es el nivel de una categoría o dominio en un grupo. Permite ubicar dónde se concentra el riesgo. Las celdas vacías son grupos con menos de 5 respuestas." },
  "p.Análisis por reactivo": { title: "Análisis por reactivo", text: "Todas las preguntas con su puntaje promedio y la proporción de respuestas desfavorables. Ordene o haga clic para abrir la ficha técnica." },
  "p.Guía I por grupo": { title: "Guía I por grupo", text: "Proporción de trabajadores que vivieron un acontecimiento traumático severo y de quienes requieren valoración clínica, por grupo." },
  "p.Seguimiento de casos": { title: "Seguimiento de casos", text: "Estado de los casos de Guía I: identificados, canalizados y concluidos. La norma exige canalizar a quien lo requiere." },
  "p.Condiciones físicas del lugar de trabajo": { title: "Condiciones físicas", text: "Cómo califica el personal la temperatura, ruido, iluminación, ventilación, higiene y otros factores del entorno físico." },
  "p.Criterio general para la toma de acciones": { title: "Criterio para la toma de acciones", text: "Lo que pide la norma según el nivel de riesgo: desde no requerir acciones (nulo) hasta un programa de intervención con evaluación específica (muy alto)." },
  "p.En observación": { title: "En observación", text: "Indicadores y dominios que aún no están en rojo pero se acercan al umbral o empeoraron. Conviene vigilarlos." },
  "p.¿Qué cambió entre": { title: "Cascada de cambios", text: "Cómo contribuye cada dominio al cambio de la calificación final entre los dos periodos. Barras rojas suben el riesgo; verdes lo bajan." },
  "p.Mapa demanda–control": { title: "Mapa demanda–control", text: "Ubica a cada grupo según la carga de trabajo (demanda) y la falta de control. Alta demanda con poco control es la combinación de mayor riesgo (modelo de Karasek)." },
  "p.Distribución de calificaciones individuales": { title: "Distribución individual", text: "Histograma de la calificación de cada trabajador sobre las bandas de nivel. Muestra si el riesgo es general o se concentra en pocas personas." },
  "p.Pareto de reactivos": { title: "Pareto de reactivos", text: "Reactivos ordenados por puntos de riesgo y su acumulado. Pocos reactivos suelen explicar la mayor parte del riesgo: empiece por ellos." },
  "p.Relación entre dominios": { title: "Relación entre dominios", text: "Correlación entre dominios. Valores altos indican que suelen ir juntos; atender uno puede mejorar el otro." },
  "p.Dónde intervenir primero": { title: "Dónde intervenir primero", text: "Dominios ordenados por prioridad: combina el nivel de riesgo, cuántos trabajadores afecta y si empeoró." },
  "p.Participación y representatividad por área": { title: "Participación por área", text: "Respuestas de cada área contra su número de trabajadores. Un área con baja participación puede no estar bien representada en los resultados." },
  "p.Pirámide de edad por sexo": { title: "Pirámide de edad por sexo", text: "Distribución de participantes por edad y sexo, con la proporción en riesgo alto o muy alto. Haga clic en una barra para filtrar." },


  /* Indicadores del resumen */
  "k.Respuestas analizadas": { title: "Respuestas analizadas", text: "Cuestionarios incluidos con los filtros actuales, y su proporción respecto a la plantilla del centro." },
  "k.Avance contra la muestra": { title: "Avance contra la muestra", text: "Respuestas recibidas contra la muestra mínima representativa que pide la Guía III (95% de confianza). Arriba de 100% el resultado es representativo." },
  "k.Avance contra plantilla": { title: "Avance contra plantilla", text: "En Guía II se evalúa a todo el personal: respuestas recibidas contra el total de trabajadores del centro." },
  "k.Nivel alto o muy alto": { title: "Nivel alto o muy alto", text: "Porcentaje de trabajadores cuya calificación individual cae en nivel alto o muy alto. Es el indicador principal de exposición al riesgo." },
  "k.Categoría más crítica": { title: "Categoría más crítica", text: "La categoría con mayor nivel de riesgo en relación con sus puntos de corte. Es la primera candidata para el programa de intervención." },
  "k.Dominio más crítico": { title: "Dominio más crítico", text: "El dominio con mayor nivel de riesgo en relación con sus puntos de corte." },
  "k.Guía I: requieren valoración": { title: "Guía I: requieren valoración", text: "Trabajadores que, según la Guía I, deben canalizarse a valoración clínica. Se les da seguimiento en el módulo Seguimiento Guía I." },
  "k.Requieren valoración clínica": { title: "Requieren valoración clínica", text: "Respondieron “Sí” a un acontecimiento traumático severo y cumplen el criterio en las secciones II, III o IV de la Guía I." },

  /* Ficha técnica del reactivo */
  "is.ficha": { title: "Ficha técnica del reactivo", text: "Todo sobre una pregunta: cómo respondió el personal, en qué grupos se concentra el riesgo, quién respondió y qué acciones se sugieren. Se puede imprimir en PDF." },
  "is.Distribución de respuestas": { title: "Distribución de respuestas", text: "Cuántos eligieron cada opción. El color indica el riesgo que representa cada opción en este reactivo (algunos se califican al revés)." },
  "is.Por grupo": { title: "Por grupo", text: "Respuesta desfavorable y puntos promedio de este reactivo en cada grupo. Grupos con menos de 5 respuestas se ocultan." },
  "is.Respuestas individuales": { title: "Respuestas individuales", text: "Cada encuesta con su folio, área y respuesta. Haga clic en un folio para abrir la ficha completa del trabajador (solo administradores y consultores)." },
  "is.Acciones sugeridas": { title: "Acciones sugeridas", text: "Acciones de intervención recomendadas para el dominio de este reactivo, según su nivel de riesgo." },

  /* ---------- Módulo 3 · Informe ---------- */
  "mod.informe": { title: "Módulo 3 · Informe PDF", text: "Documento con el contenido que pide la NOM-035 para el informe de resultados. Se genera con los mismos datos del tablero.\nComplete “Datos del informe” (responsable, actividad, objetivo…) y use “Imprimir / PDF”." },
  "inf.datos": { title: "Datos del informe", text: "Información que no sale de las respuestas: responsable de la evaluación, actividad principal, objetivo, método y conclusiones. Se guarda con la evaluación." },

  /* ---------- Módulo 4 · Programa ---------- */
  "mod.programa": { title: "Módulo 4 · Programa de intervención", text: "Obligatorio cuando el resultado es medio, alto o muy alto. Registre acciones con responsable y fecha compromiso, y márquelas como concluidas para dar seguimiento." },
  "pr.sugeridas": { title: "Acciones sugeridas", text: "Propuestas automáticas para los dominios con mayor riesgo. Agréguelas al programa con un clic y ajuste responsable y fechas." },
  "pr.acciones": { title: "Acciones del programa", text: "Lista de acciones registradas con su estado: en curso, vencida o concluida. Use “+ Nueva acción” y “Marcar concluida”." },
  "pr.cronograma": { title: "Cronograma", text: "Cada barra va de la fecha de alta a la fecha compromiso; el rombo marca la fecha de conclusión. Las barras rojas están vencidas." },

  /* ---------- Módulo 5 · Quejas y capacitación ---------- */
  "mod.gestion": { title: "Módulo 5 · Quejas y capacitación", text: "Gestión preventiva del centro de trabajo: plantilla por área, buzón de quejas y registro de capacitaciones. Alimenta los KPIs de centro." },
  "ge.plantilla": { title: "Plantilla por área", text: "Número de trabajadores de cada área, tomado de la Estructura de la empresa. Permite medir la participación por área y la cobertura de capacitación. Para cambiarla use “Editar en Estructura”." },
  "ge.quejas": { title: "Buzón de quejas", text: "Registro de quejas de prácticas opuestas al entorno favorable o actos de violencia laboral (numeral 8.1). Dé seguimiento hasta cerrarlas; las quejas abiertas por más de 30 días generan alerta." },
  "ge.capacitacion": { title: "Capacitación y sensibilización", text: "Sesiones impartidas, área, asistentes y, si aplica, evaluación antes y después. Sirve para demostrar la difusión de la política (numeral 5.7) y medir su efectividad." },

  /* ---------- Módulo 6 · Seguimiento Guía I ---------- */
  "mod.guia1": { title: "Módulo 6 · Seguimiento Guía I", text: "Casos de trabajadores que, según la Guía I, requieren valoración clínica. Registre la canalización, la institución y las notas. Información confidencial: solo administradores y consultores." },
  "g1.estados": { title: "Estados del caso", text: "Identificado: la Guía I indica que requiere valoración.\nCanalizado: se envió a atención médica o psicológica.\nConcluido: se cerró el seguimiento.\nLos casos identificados por más de 15 días se marcan en rojo." },
  "g1.solicitudes": { title: "Solicitudes sin acontecimiento", text: "Trabajadores que pidieron atención aunque no reportaron un acontecimiento traumático severo. Conviene darles seguimiento." },
  ficha: { title: "Ficha del trabajador", text: "Todas las respuestas de una encuesta: datos generales, Guía I, calificación por categoría y dominio, y cada reactivo. Abrirla queda registrado en la bitácora." },
  "fi.datos": { title: "Datos generales", text: "Datos sociodemográficos y laborales que el trabajador indicó en el cuestionario." },
  "fi.categorias": { title: "Categorías y dominios", text: "Calificación individual de este trabajador en cada categoría y dominio, con su nivel de riesgo." },
  "fi.guia1": { title: "Guía I", text: "Respuestas a las cuatro secciones. Requiere valoración si responde “Sí” en la sección I y cumple el criterio en las secciones II, III o IV." },
  "fi.reactivos": { title: "Respuestas a los reactivos", text: "Cada pregunta con la opción elegida y los puntos de riesgo que representa." },

  /* ---------- Otras secciones ---------- */
  alertas: { title: "Alertas", text: "Se calculan al momento con los datos de toda la cartera: Guía I sin canalizar, quejas abiertas, acciones vencidas, capturas incompletas y KPIs en rojo.\nHaga clic en una severidad para filtrar; cada alerta lleva directo a donde se atiende." },
  "al.severidad": { title: "Severidad", text: "Crítica: incumplimiento directo de la norma o riesgo para un trabajador.\nAlta: plazos vencidos.\nMedia: asuntos en seguimiento." },
  comparativo: { title: "Comparativo entre clientes", text: "Compara la evaluación más reciente de cada centro con 5 o más respuestas. Las categorías se convierten a un índice 0–5 para poner en la misma escala la Guía II y la Guía III." },
  "co.posicion": { title: "Posición del centro", text: "Barra gris: rango de la cartera. Bloque: cuartiles 2–3 (el 50% central). Raya: mediana. Punto: el centro elegido, verde si está mejor que el 75% y rojo si está peor." },
  "co.ranking": { title: "Ranking", text: "Porcentaje de trabajadores en nivel alto o muy alto en cada centro, con su margen de error. La línea vertical es el promedio de la cartera." },
  "co.heatmap": { title: "Mapa de calor del portafolio", text: "Todos los centros en filas y las categorías e indicadores en columnas, coloreados por nivel o semáforo. El glosario explica las siglas." },
  guias: { title: "Guías de referencia", text: "Las tres guías de la NOM-035 en sus tres modalidades: como la ve el trabajador, en vista de especialista (con puntos y dominios) y en formato para imprimir. También descarga la plantilla de Excel." },
  usuarios: { title: "Usuarios", text: "Solo el administrador crea y edita usuarios.\nAdministrador: acceso total.\nConsultor: gestiona evaluaciones de las empresas.\nCliente: consulta los resultados de su empresa, sin datos confidenciales." },
} as const satisfies Record<string, { title: string; text: string }>;

export type HelpId = keyof typeof HELP;

/** Ayuda de un panel del tablero por su título (los títulos dinámicos se buscan por prefijo). */
export function panelHelp(title: string): HelpId | undefined {
  const exact = `p.${title}` as HelpId;
  if (exact in HELP) return exact;
  return (Object.keys(HELP) as HelpId[]).find((k) => k.startsWith("p.") && title.startsWith(k.slice(2)));
}
