import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const maps = pgTable("maps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").default("#E9A13B"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const points = pgTable("points", {
  id: uuid("id").primaryKey().defaultRandom(),
  mapId: uuid("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Unbenannter Punkt"),
  refNumber: text("ref_number").default(""),
  category: text("category").default(""),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  altitude: integer("altitude"),
  maxWomos: text("max_womos").default(""),
  equipment: text("equipment").default(""),
  description: text("description").default(""),
  prices: text("prices").default(""),
  directions: text("directions").default(""),
  phone: text("phone").default(""),
  notes: text("notes").default(""),
  rawGps: text("raw_gps").default(""),
  rawText: text("raw_text").default(""),
  source: text("source").notNull().default("ocr"),
  favorite: boolean("favorite").notNull().default(false),
  visited: boolean("visited").notNull().default(false),
  visitedAt: timestamp("visited_at", { withTimezone: true }),
  photoUrl: text("photo_url"), // Base64 oder URL
  address: text("address"), // Reverse-Geocoding Ergebnis
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MapRow = typeof maps.$inferSelect;
export type PointRow = typeof points.$inferSelect;
export type NewPoint = typeof points.$inferInsert;
