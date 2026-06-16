import {
  workspaceSchemaMigrations,
  workspaceSchemaTableStatements,
  workspaceSchemaVersion,
} from "./workspaceMigrations";
import type { SqlDatabase } from "./workspaceRepositoryTypes";

interface SchemaVersionRow {
  user_version: number;
}

interface TableInfoRow {
  name?: string;
  Name?: string;
}

export async function initializeWorkspaceSchema(database: SqlDatabase): Promise<void> {
  await database.execute("PRAGMA foreign_keys = ON");
  await database.select("PRAGMA journal_mode = WAL");
  await database.execute("PRAGMA synchronous = NORMAL");
  const versionRows = await database.select<SchemaVersionRow[]>("PRAGMA user_version");
  const currentVersion = versionRows[0]?.user_version ?? 0;

  if (currentVersion > workspaceSchemaVersion) {
    throw new Error("This FlowDesk workspace was created by a newer version of the app.");
  }

  await database.execute("BEGIN TRANSACTION");

  try {
    for (const statement of workspaceSchemaTableStatements) {
      await database.execute(statement);
    }

    for (const migration of workspaceSchemaMigrations) {
      if (currentVersion >= migration.version) {
        continue;
      }

      for (const column of migration.columns) {
        await ensureColumn(database, column.tableName, column.columnName, column.sql);
      }
    }

    await database.execute(`PRAGMA user_version = ${workspaceSchemaVersion}`);
    await database.execute("COMMIT");
  } catch (error) {
    await rollbackTransaction(database);
    throw error;
  }
}

async function ensureColumn(
  database: SqlDatabase,
  tableName: string,
  columnName: string,
  migrationSql: string,
): Promise<void> {
  const columns = await database.select<TableInfoRow[]>(`PRAGMA table_info(${tableName})`);

  if (columns.some((column) => readTableInfoColumnName(column) === columnName)) {
    return;
  }

  await database.execute(migrationSql);
}

function readTableInfoColumnName(row: TableInfoRow): string | null {
  if (typeof row.name === "string") {
    return row.name;
  }

  if (typeof row.Name === "string") {
    return row.Name;
  }

  return null;
}

async function rollbackTransaction(database: SqlDatabase): Promise<void> {
  await database.execute("ROLLBACK").catch(() => undefined);
}
