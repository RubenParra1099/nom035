import { pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
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
}));
export const confidentialRel = relations(confidentialContacts, ({ one }) => ({
  response: one(responses, { fields: [confidentialContacts.responseId], references: [responses.id] }),
}));
export const usersRel = relations(users, ({ one }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
}));
