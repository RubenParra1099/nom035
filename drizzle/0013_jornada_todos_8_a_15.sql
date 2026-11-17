-- Todo el personal trabaja de 8:00 a 15:00: todas las respuestas quedan con esa jornada.
-- Respaldo del valor anterior para poder revertir.
CREATE TABLE IF NOT EXISTS "respaldo_jornada_0013" AS
SELECT "id" AS "response_id", "demographics" ->> 'jornada' AS "jornada_anterior"
FROM "responses"
WHERE ("demographics" ->> 'jornada') IS DISTINCT FROM 'Fijo Diurno (De 8:00 a 15:00 horas)';
--> statement-breakpoint
UPDATE "responses"
SET "demographics" = jsonb_set("demographics", '{jornada}', to_jsonb('Fijo Diurno (De 8:00 a 15:00 horas)'::text))
WHERE ("demographics" ->> 'jornada') IS DISTINCT FROM 'Fijo Diurno (De 8:00 a 15:00 horas)';
