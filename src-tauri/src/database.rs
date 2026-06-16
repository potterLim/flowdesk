mod error;
mod statements;

pub(crate) use error::{DatabaseError, DatabaseResult};
pub(crate) use statements::SqliteStatement;

use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqliteSynchronous},
    Connection, SqliteConnection,
};
use std::{
    env, fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

#[tauri::command]
pub(crate) fn get_workspace_database_url() -> Result<String, String> {
    if let Ok(database_path) = env::var("FLOWDESK_DATABASE_PATH") {
        let database_path = database_path.trim();

        if !database_path.is_empty() {
            return Ok(format!("sqlite:{database_path}"));
        }
    }

    Ok("sqlite:flowdesk.db".into())
}

#[tauri::command]
pub(crate) async fn execute_workspace_transaction(
    app: tauri::AppHandle,
    database_url: String,
    statements: Vec<SqliteStatement>,
) -> Result<(), String> {
    execute_workspace_transaction_inner(app, database_url, statements)
        .await
        .map_err(|error| error.to_string())
}

async fn execute_workspace_transaction_inner(
    app: tauri::AppHandle,
    database_url: String,
    statements: Vec<SqliteStatement>,
) -> DatabaseResult<()> {
    let database_path = resolve_database_path(&app, &database_url)?;

    if let Some(parent_directory) = database_path.parent() {
        fs::create_dir_all(parent_directory)?;
    }

    let options = create_sqlite_connect_options(&database_path).create_if_missing(true);
    let mut connection = SqliteConnection::connect_with(&options).await?;
    let mut transaction = connection.begin().await?;

    for statement in statements {
        statement.into_query()?.execute(&mut *transaction).await?;
    }

    transaction.commit().await?;

    Ok(())
}

#[tauri::command]
pub(crate) fn reset_workspace_database(
    app: tauri::AppHandle,
    database_url: String,
) -> Result<(), String> {
    reset_workspace_database_inner(app, database_url).map_err(|error| error.to_string())
}

fn reset_workspace_database_inner(
    app: tauri::AppHandle,
    database_url: String,
) -> DatabaseResult<()> {
    let database_path = resolve_database_path(&app, &database_url)?;
    let recovery_directory = database_path
        .parent()
        .ok_or(DatabaseError::MissingDatabaseDirectory)?
        .join("database-recovery");
    let recovery_timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis();

    fs::create_dir_all(&recovery_directory)?;

    for database_file in get_database_recovery_files(&database_path) {
        if !database_file.exists() {
            continue;
        }

        let file_name = database_file
            .file_name()
            .ok_or(DatabaseError::MissingDatabaseFileName)?
            .to_string_lossy();
        let recovery_path = recovery_directory.join(format!("{recovery_timestamp}-{file_name}"));

        fs::rename(&database_file, recovery_path)?;
    }

    Ok(())
}

pub(crate) fn resolve_database_path(
    app: &tauri::AppHandle,
    database_url: &str,
) -> DatabaseResult<PathBuf> {
    let database_file = database_url
        .strip_prefix("sqlite:")
        .ok_or(DatabaseError::InvalidDatabaseUrl)?;

    if database_file.trim().is_empty() {
        return Err(DatabaseError::EmptyDatabasePath);
    }

    let database_path = Path::new(database_file);

    if database_path.is_absolute() {
        return Ok(database_path.to_path_buf());
    }

    Ok(app.path().app_config_dir()?.join(database_path))
}

pub(crate) fn create_sqlite_connect_options(database_path: &Path) -> SqliteConnectOptions {
    SqliteConnectOptions::new()
        .filename(database_path)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
}

fn get_database_recovery_files(database_path: &Path) -> [PathBuf; 3] {
    let database_path = database_path.to_string_lossy();

    [
        PathBuf::from(database_path.as_ref()),
        PathBuf::from(format!("{database_path}-wal")),
        PathBuf::from(format!("{database_path}-shm")),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_database_recovery_files_with_wal_and_shared_memory_sidecars() {
        let recovery_files = get_database_recovery_files(Path::new("workspace/flowdesk.db"));

        assert_eq!(recovery_files[0], PathBuf::from("workspace/flowdesk.db"));
        assert_eq!(
            recovery_files[1],
            PathBuf::from("workspace/flowdesk.db-wal")
        );
        assert_eq!(
            recovery_files[2],
            PathBuf::from("workspace/flowdesk.db-shm")
        );
    }
}
