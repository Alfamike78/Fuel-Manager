import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// ── COMPANIES ──────────────────────────────────────────────────────────────
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  brandName: text("brand_name"),
  primaryColor: text("primary_color").default("#1b3a5c"),
  bgColor: text("bg_color").default("#d6c4a0"),
  faviconUrl: text("favicon_url"),
  logoUrl: text("logo_url"),
  status: text("status").default("trial"), // trial|active|suspended|cancelled
  plan: text("plan").default("trial"),     // trial|starter|pro|business
  trialEndsAt: integer("trial_ends_at"),
  archivedAt: integer("archived_at"),
  isInternal: integer("is_internal").default(0),
  createdAt: integer("created_at").notNull(),
});

// ── BETTER-AUTH TABLES ─────────────────────────────────────────────────────
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified").notNull().default(0),
  image: text("image"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  role: text("role").default("operator"),        // superadmin|admin|operator
  companyId: text("company_id"),
  banned: integer("banned").default(0),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires"),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at"),
  refreshTokenExpiresAt: integer("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

// ── BASES ──────────────────────────────────────────────────────────────────
export const bases = sqliteTable("bases", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  companyId: text("company_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ── TANKS ──────────────────────────────────────────────────────────────────
export const tanks = sqliteTable("tanks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  capacity: real("capacity").notNull(),
  currentLevel: real("current_level").default(0),
  fuelType: text("fuel_type").default("Jet-A1"),
  baseId: text("base_id"),
  companyId: text("company_id").notNull(),
  alertThreshold: real("alert_threshold").default(1500),
  lastDrainCheckQuality: text("last_drain_check_quality"),
  lastDrainCheckDate: text("last_drain_check_date"),
  createdAt: integer("created_at").notNull(),
});

// ── FLEET (helicopters + ground vehicles) ─────────────────────────────────
export const helicopters = sqliteTable("helicopters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  identifier: text("identifier"),
  model: text("model"),
  capacity: real("capacity"),
  category: text("category").default("aviation"), // aviation|ground
  vehicleType: text("vehicle_type"),              // e.g. "Elicottero","Aereo","Furgone"...
  fuelType: text("fuel_type"),                    // carburante ammesso: Jet-A1|AvGas 100LL|Avgas UL91|Diesel|Benzina|Altro
  lastDrainCheckQuality: text("last_drain_check_quality"),
  lastDrainCheckDate: text("last_drain_check_date"),
  companyId: text("company_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ── MOVEMENTS ─────────────────────────────────────────────────────────────
export const movements = sqliteTable("movements", {
  id: text("id").primaryKey(),
  tankId: text("tank_id"),
  toTankId: text("to_tank_id"),       // for transfers
  helicopterId: text("helicopter_id"),
  type: text("type").notNull(),        // refuel|consumption|transfer|drain_check
  liters: real("liters").notNull(),
  date: text("date").notNull(),        // YYYY-MM-DD
  time: text("time").notNull(),        // HH:MM
  operatorId: text("operator_id"),
  notes: text("notes"),
  companyId: text("company_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ── DRAIN CHECKS ──────────────────────────────────────────────────────────
export const drainChecks = sqliteTable("drain_checks", {
  id: text("id").primaryKey(),
  tankId: text("tank_id"),
  helicopterId: text("helicopter_id"),
  liters: real("liters").notNull(),
  quality: text("quality").notNull(),  // ok|water|impurities
  notes: text("notes"),
  photoUrl: text("photo_url"),
  // ── Drain check su mezzo aereo: punto di prelievo + foto certificative ──
  targetType: text("target_type").default("tank"),   // tank | aircraft
  samplePoint: text("sample_point"),                 // serbatoio principale, sump ala sx, gascolator...
  photoCounterKey: text("photo_counter_key"),        // foto contalitri (storage key)
  photoSampleKey: text("photo_sample_key"),          // foto barattolo campione (storage key)
  isIncomplete: integer("is_incomplete").default(0), // 1 se manca almeno una foto
  // ── Firma digitale dell'operatore ──
  signatureKey: text("signature_key"),               // immagine SVG della firma su storage
  signaturePath: text("signature_path"),             // tratti vettoriali (per PDF e rendering)
  signedByName: text("signed_by_name"),
  signedByEmail: text("signed_by_email"),
  signedAt: integer("signed_at"),
  signedDevice: text("signed_device"),
  integrityHash: text("integrity_hash"),             // SHA-256 del contenuto sigillato
  // ── Annullamento (un record firmato non si modifica, si annulla) ──
  voidedAt: integer("voided_at"),
  voidedBy: text("voided_by"),
  voidReason: text("void_reason"),
  operatorId: text("operator_id"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  companyId: text("company_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ── FILTER CHANGES (registro filtri carburante per cisterna) ──────────────
export const filterChanges = sqliteTable("filter_changes", {
  id: text("id").primaryKey(),
  tankId: text("tank_id").notNull(),
  companyId: text("company_id").notNull(),
  model: text("model").notNull(),
  installedDate: text("installed_date").notNull(), // YYYY-MM-DD
  validityMonths: integer("validity_months").notNull().default(12), // 12 | 24
  expiresDate: text("expires_date").notNull(),      // calcolata: installedDate + validityMonths
  notes: text("notes"),
  operatorId: text("operator_id"),
  operatorName: text("operator_name"),
  createdAt: integer("created_at").notNull(),
});

// ── INVITE TOKENS ─────────────────────────────────────────────────────────
export const inviteTokens = sqliteTable("invite_tokens", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  companyId: text("company_id").notNull(),
  email: text("email"),
  role: text("role").default("operator"),
  usedAt: integer("used_at"),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});
