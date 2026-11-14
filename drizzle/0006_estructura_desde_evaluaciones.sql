-- Estructura única: los centros que aún no tienen áreas las toman de su evaluación más reciente.
INSERT INTO "workplace_areas" ("id", "workplace_id", "name", "headcount")
SELECT substr(md5(random()::text || e."id" || d.name), 1, 21), e."workplace_id", d.name, COALESCE((e."area_headcount" ->> d.name)::int, 0)
FROM (SELECT DISTINCT ON ("workplace_id") * FROM "evaluations" ORDER BY "workplace_id", "created_at" DESC) e
CROSS JOIN LATERAL unnest(e."departments") AS d(name)
WHERE trim(d.name) <> ''
  AND NOT EXISTS (SELECT 1 FROM "workplace_areas" a WHERE a."workplace_id" = e."workplace_id")
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Si la evaluación no tenía áreas configuradas, se toman las que contestaron los trabajadores (sin número de personas).
INSERT INTO "workplace_areas" ("id", "workplace_id", "name", "headcount")
SELECT DISTINCT ON (e."workplace_id", r."demographics" ->> 'departamento')
  substr(md5(random()::text || e."id" || (r."demographics" ->> 'departamento')), 1, 21), e."workplace_id", r."demographics" ->> 'departamento', 0
FROM (SELECT DISTINCT ON ("workplace_id") * FROM "evaluations" ORDER BY "workplace_id", "created_at" DESC) e
JOIN "responses" r ON r."evaluation_id" = e."id"
WHERE coalesce(trim(r."demographics" ->> 'departamento'), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM "workplace_areas" a WHERE a."workplace_id" = e."workplace_id")
ON CONFLICT DO NOTHING;
