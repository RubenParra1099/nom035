import { pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, index, uniqueIndex, date, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "./id";

export const roleEnum = pgEnum("role", ["SUPERADMIN", "CONSULTOR", "CLIENTE"]);
export const guideEnum = pgEnum("guide", ["GUIA_II", "GUIA_III"]);
export const statusEnum = pgEnum("evaluation_status", ["BORRADOR", "ABIERTA", "CERRADA"]);
export const sourceEnum = pgEnum("response_source", ["EN_LINEA", "IMPORTACION"]);

const id = () => text("id").primaryKey().$defaultFn(createId);
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const companies = pgTable("companies", {
  id: id(),
  name: text("name").notNull(),
  rfc: text("rfc"),
  contact: text("contact"),
  /** Giro o sector, para el comparativo entre clientes. */
  sector: text("sector"),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("CONSULTOR"),
  /** Para CLIENTE: empresa a la que pertenece. */
  companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const workplaces = pgTable("workplaces", {
  id: id(),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  headcount: integer("headcount").notNull().default(0),
  createdAt: createdAt(),
});

export const evaluations = pgTable("evaluations", {
  id: id(),
  workplaceId: text("workplace_id").notNull().references(() => workplaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  guide: guideEnum("guide").notNull(),
  includeGuideI: boolean("include_guide_i").notNull().default(true),
  status: statusEnum("status").notNull().default("BORRADOR"),
  token: text("token").notNull(),
  departments: text("departments").array().notNull().default([]),
  positions: text("positions").array().notNull().default([]),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("evaluations_token_idx").on(t.token)]);

export const responses = pgTable("responses", {
  id: id(),
  evaluationId: text("evaluation_id").notNull().references(() => evaluations.id, { onDelete: "cascade" }),
  source: sourceEnum("source").notNull().default("EN_LINEA"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  demographics: jsonb("demographics").$type<Record<string, string | null>>().notNull(),
  physical: jsonb("physical").$type<Record<string, string | null>>().notNull(),
  /** número de reactivo → índice 0..4 (0 = Siempre … 4 = Nunca) */
  items: jsonb("items").$type<Record<string, number | null>>().notNull(),
  servesClients: boolean("serves_clients"),
  isBoss: boolean("is_boss"),
  guideI: jsonb("guide_i").$type<(boolean | null)[]>(),
  atsEvent: boolean("ats_event").notNull().default(false),
  atsRequires: boolean("ats_requires").notNull().default(false),
  finalScore: integer("final_score").notNull(),
  finalLevel: text("final_level").notNull(),
  categories: jsonb("categories").$type<Record<string, number>>().notNull(),
  domains: jsonb("domains").$type<Record<string, number>>().notNull(),
  comment: text("comment"),
}, (t) => [index("responses_eval_idx").on(t.evaluationId)]);

/** Separado de la respuesta: solo SUPERADMIN/CONSULTOR lo consultan; nunca aparece en indicadores. */
export const confidentialContacts = pgTable("confidential_contacts", {
  id: id(),
  responseId: text("response_id").notNull().unique().references(() => responses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  attended: boolean("attended").notNull().default(false),
  notes: text("notes"),
  createdAt: createdAt(),
});

/** Plantilla por área del centro de trabajo (participación, representatividad y cobertura). */
export const workplaceAreas = pgTable("workplace_areas", {
  id: id(),
  workplaceId: text("workplace_id").notNull().references(() => workplaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  headcount: integer("headcount").notNull().default(0),
}, (t) => [uniqueIndex("workplace_areas_name_idx").on(t.workplaceId, t.name)]);

/** Datos del informe de resultados de una evaluación (lo que no sale de las respuestas). */
export const evaluationReports = pgTable("evaluation_reports", {
  id: id(),
  evaluationId: text("evaluation_id").notNull().unique().references(() => evaluations.id, { onDelete: "cascade" }),
  activity: text("activity"),
  objective: text("objective"),
  activities: text("activities"),
  conclusions: text("conclusions"),
  responsibleName: text("responsible_name"),
  responsibleLicense: text("responsible_license"),
  reportDate: date("report_date", { mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Seguimiento de casos de Guía I que requieren valoración clínica (uno por respuesta). */
export const atsStatusEnum = pgEnum("ats_status", ["IDENTIFICADO", "CANALIZADO", "EN_ATENCION", "ATENDIDO", "NO_LOCALIZABLE"]);
export const atsFollowups = pgTable("ats_followups", {
  id: id(),
  responseId: text("response_id").notNull().unique().references(() => responses.id, { onDelete: "cascade" }),
  status: atsStatusEnum("status").notNull().default("IDENTIFICADO"),
  identifiedAt: date("identified_at", { mode: "string" }).notNull().defaultNow(),
  canalizedAt: date("canalized_at", { mode: "string" }),
  closedAt: date("closed_at", { mode: "string" }),
  institution: text("institution"),
  notes: text("notes"),
});

/** Buzón de quejas (mecanismo del numeral 8.1 b): solo datos del caso, sin identificar a quien se queja. */
export const complaintStatusEnum = pgEnum("complaint_status", ["RECIBIDA", "EN_INVESTIGACION", "CERRADA"]);
export const complaints = pgTable("complaints", {
  id: id(),
  workplaceId: text("workplace_id").notNull().references(() => workplaces.id, { onDelete: "cascade" }),
  receivedAt: date("received_at", { mode: "string" }).notNull(),
  category: text("category").notNull(), // VIOLENCIA | ENTORNO | CARGA | OTRO
  area: text("area"),
  channel: text("channel"),
  status: complaintStatusEnum("status").notNull().default("RECIBIDA"),
  closedAt: date("closed_at", { mode: "string" }),
  resolution: text("resolution"),
  createdAt: createdAt(),
}, (t) => [index("complaints_wp_idx").on(t.workplaceId)]);

/** Capacitaciones y sensibilización, con evaluación diagnóstica y final (0–100). */
export const trainings = pgTable("trainings", {
  id: id(),
  workplaceId: text("workplace_id").notNull().references(() => workplaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  topic: text("topic").notNull(), // POLITICA | VIOLENCIA | LIDERAZGO | CARGA | OTRO
  heldAt: date("held_at", { mode: "string" }).notNull(),
  area: text("area"),
  attendees: integer("attendees").notNull().default(0),
  preScore: doublePrecision("pre_score"),
  postScore: doublePrecision("post_score"),
  createdAt: createdAt(),
}, (t) => [index("trainings_wp_idx").on(t.workplaceId)]);

/** Acciones del Programa de intervención (numeral 8.4) derivadas de una evaluación. */
export const planActions = pgTable("plan_actions", {
  id: id(),
  evaluationId: text("evaluation_id").notNull().references(() => evaluations.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  action: text("action").notNull(),
  area: text("area"),
  owner: text("owner"),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  doneAt: date("done_at", { mode: "string" }),
  createdAt: createdAt(),
}, (t) => [index("plan_actions_eval_idx").on(t.evaluationId)]);

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  createdAt: createdAt(),
});

export const companiesRel = relations(companies, ({ many }) => ({ workplaces: many(workplaces), users: many(users) }));
export const workplacesRel = relations(workplaces, ({ one, many }) => ({
  company: one(companies, { fields: [workplaces.companyId], references: [companies.id] }),
  evaluations: many(evaluations),
}));
export const evaluationsRel = relations(evaluations, ({ one, many }) => ({
  workplace: one(workplaces, { fields: [evaluations.workplaceId], references: [workplaces.id] }),
  responses: many(responses),
}));
export const responsesRel = relations(responses, ({ one }) => ({
  evaluation: one(evaluations, { fields: [responses.evaluationId], references: [evaluations.id] }),
  confidential: one(confidentialContacts, { fields: [responses.id], references: [confidentialContacts.responseId] }),
  followup: one(atsFollowups, { fields: [responses.id], references: [atsFollowups.responseId] }),
}));
export const confidentialRel = relations(confidentialContacts, ({ one }) => ({
  response: one(responses, { fields: [confidentialContacts.responseId], references: [responses.id] }),
}));
export const usersRel = relations(users, ({ one }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
}));
export const atsRel = relations(atsFollowups, ({ one }) => ({
  response: one(responses, { fields: [atsFollowups.responseId], references: [responses.id] }),
}));
