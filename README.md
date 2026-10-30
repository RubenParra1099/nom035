# Plataforma NOM-035-STPS-2018

Captura, calificación e indicadores de los factores de riesgo psicosocial — **Guía I** (acontecimientos traumáticos severos), **Guía II** (46 reactivos) y **Guía III** (72 reactivos), para varios clientes.

**Stack:** Next.js 15 (App Router, TypeScript) · Drizzle ORM · PostgreSQL · Tailwind CSS · despliegue en Vercel.

## Funciones

| Módulo | Qué hace |
|---|---|
| Admin multi-cliente | Empresas → centros de trabajo (con nº de trabajadores) → evaluaciones. Sugiere la guía que corresponde y calcula la muestra mínima. |
| Usuarios y roles | `SUPERADMIN` (todo), `CONSULTOR` (captura y análisis), `CLIENTE` (solo lectura de su empresa, sin datos confidenciales). |
| Captura en línea | Enlace + QR por evaluación, cuestionario móvil por pasos: consentimiento, datos generales, factores físicos, Guía I con saltos, Guía II/III con preguntas filtro (clientes / jefe). |
| Calificación | Motor en `src/lib/nom035/` con las llaves oficiales (reactivos inversos), dominios, categorías y rangos de cada guía. Calificación individual + promedio del centro. |
| Indicadores | Semáforo final, por categoría y dominio, trabajadores por nivel, mapa por área, reactivos críticos, criterios de acción, datos generales, factores físicos, comentarios. Filtros por área, puesto, sexo, edad, jornada y contratación. Grupos < 5 personas se ocultan. Imprimible a PDF. |
| Guía I confidencial | Lista de trabajadores que requieren valoración clínica y quienes pidieron atención, con seguimiento (atendido / notas). Solo administradores y consultores. |
| Importador | Sube el Excel/CSV de Google Forms (formato “[n.- texto]”); detecta la guía, valida y recalcula con las reglas oficiales. Se procesa en el navegador. |
| Auditoría | Registro de accesos y cambios (`audit_logs`). |

## Desarrollo local

```bash
cp .env.example .env          # pon tu DATABASE_URL / DIRECT_URL y AUTH_SECRET
npm install
npm run db:migrate            # crea las tablas
npm run db:seed               # crea el administrador de SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run dev                   # http://localhost:3000
npm test                      # pruebas del motor de cálculo
```

Para validar el motor contra los archivos reales (no se versionan por confidencialidad):
`NOM035_FIXTURES=/carpeta/con/72.xlsx-y-46.xlsx npm test`

## Despliegue en Vercel

1. Sube el repositorio a GitHub e impórtalo en Vercel (framework: Next.js).
2. Crea la base de datos: **Vercel → Storage → Neon (Postgres)**, o una base en neon.tech. Usa la URL *pooled* en `DATABASE_URL` y la directa en `DIRECT_URL`.
3. Variables de entorno en Vercel (marca **Production** y **Preview**): `AUTH_SECRET` (`openssl rand -base64 32`). Si conectaste Neon desde Storage, la URL se toma sola (`DATABASE_URL`, `DATABASE_URL_UNPOOLED` o `POSTGRES_URL*`); si no, define `DATABASE_URL` y `DIRECT_URL` a mano.
4. Build command: `npm run vercel-build` (aplica migraciones y compila).
5. Abre `https://<tu-proyecto>.vercel.app/setup` y crea el primer administrador (la página solo funciona mientras no haya usuarios). Alternativa por terminal: `npm run db:seed`.

## Reglas de la norma implementadas

- **Qué guía aplicar:** ≤15 trabajadores: solo Guía I; 16–50: Guía II a todos; >50: Guía III con muestra `n = 0.9604·N / (0.0025·(N−1) + 0.9604)`.
- **Reactivos inversos (Siempre = 0):** Guía III 1, 4, 23–28, 30–53, 55–57 · Guía II 18–33.
- **Reactivos condicionados:** si el trabajador responde “No” a atender clientes o ser jefe, esos reactivos no se califican (aunque el formulario los haya recibido).
- **Guía I:** requiere valoración clínica si hay acontecimiento (sección I) y además: ≥1 en sección II, ≥3 en sección III o ≥2 en sección IV.
- **Niveles:** el límite inferior pertenece al nivel superior (p. ej. Guía III final 99 = Alto).

## Estructura

```
src/lib/nom035/   motor: guides.ts (catálogo y rangos), score.ts, guia1.ts, importer.ts, texts.ts
src/db/           esquema Drizzle y conexión
src/app/admin/    administración, indicadores, confidencial, usuarios
src/app/e/[token] cuestionario público
drizzle/          migraciones SQL
tests/            pruebas del motor
```
