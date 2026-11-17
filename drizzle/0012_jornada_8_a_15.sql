-- La jornada diurna del cliente es de 8:00 a 15:00: las respuestas ya guardadas como "Fijo Diurno …" toman el texto nuevo.
UPDATE "responses"
SET "demographics" = jsonb_set("demographics", '{jornada}', to_jsonb('Fijo Diurno (De 8:00 a 15:00 horas)'::text))
WHERE "demographics" ->> 'jornada' ~* '^\s*fijo\s+diurno'
  AND "demographics" ->> 'jornada' <> 'Fijo Diurno (De 8:00 a 15:00 horas)';
