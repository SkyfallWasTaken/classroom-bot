import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const dataTable = sqliteTable("data", {
  id: int().primaryKey({ autoIncrement: true }),
  timestamp: int().notNull(),
  data: text('', { mode: 'json' }).notNull(),
});