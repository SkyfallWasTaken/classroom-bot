import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
const db = drizzle(process.env.DB_FILE_NAME!);
migrate(db, { migrationsFolder: "./drizzle" });
export { db };
export { dataTable } from './schema';