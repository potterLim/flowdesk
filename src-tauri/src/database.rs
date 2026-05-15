use serde::Deserialize;
use serde_json::Value;
use sqlx::{
    query::Query,
    sqlite::{SqliteArguments, SqliteConnectOptions, SqliteJournalMode, SqliteSynchronous},
    Connection, Sqlite, SqliteConnection,
};
use std::{
    env, fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

#[derive(Debug, Deserialize)]
pub(crate) struct SqliteStatement {
    query: String,
    #[serde(default)]
    values: Vec<Value>,
}

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
    let database_path = resolve_database_path(&app, &database_url)?;

    if let Some(parent_directory) = database_path.parent() {
        fs::create_dir_all(parent_directory).map_err(|error| error.to_string())?;
    }

    let options = sqlite_connect_options(&database_path).create_if_missing(true);
    let mut connection = SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| error.to_string())?;
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| error.to_string())?;

    for statement in statements {
        let query = statement
            .values
            .into_iter()
            .try_fold(sqlx::query(&statement.query), bind_sqlite_value)?;

        query
            .execute(&mut *transaction)
            .await
            .map_err(|error| error.to_string())?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub(crate) fn reset_workspace_database(app: tauri::AppHandle, database_url: String) -> Result<(), String> {
    let database_path = resolve_database_path(&app, &database_url)?;
    let recovery_directory = database_path
        .parent()
        .ok_or_else(|| "FlowDesk could not resolve the database directory.".to_string())?
        .join("database-recovery");
    let recovery_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();

    fs::create_dir_all(&recovery_directory).map_err(|error| error.to_string())?;

    for database_file in database_recovery_files(&database_path) {
        if !database_file.exists() {
            continue;
        }

        let file_name = database_file
            .file_name()
            .ok_or_else(|| "FlowDesk could not resolve a database file name.".to_string())?
            .to_string_lossy();
        let recovery_path = recovery_directory.join(format!("{recovery_timestamp}-{file_name}"));

        fs::rename(&database_file, recovery_path).map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub(crate) fn resolve_database_path(app: &tauri::AppHandle, database_url: &str) -> Result<PathBuf, String> {
    let database_file = database_url
        .strip_prefix("sqlite:")
        .ok_or_else(|| "FlowDesk expected a sqlite database URL.".to_string())?;

    if database_file.trim().is_empty() {
        return Err("FlowDesk expected a sqlite database file path.".into());
    }

    let database_path = Path::new(database_file);

    if database_path.is_absolute() {
        return Ok(database_path.to_path_buf());
    }

    Ok(app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(database_path))
}

pub(crate) fn sqlite_connect_options(database_path: &Path) -> SqliteConnectOptions {
    SqliteConnectOptions::new()
        .filename(database_path)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
}

fn database_recovery_files(database_path: &Path) -> [PathBuf; 3] {
    let database_path = database_path.to_string_lossy();

    [
        PathBuf::from(database_path.as_ref()),
        PathBuf::from(format!("{database_path}-wal")),
        PathBuf::from(format!("{database_path}-shm")),
    ]
}

fn bind_sqlite_value<'query>(
    query: Query<'query, Sqlite, SqliteArguments<'query>>,
    value: Value,
) -> Result<Query<'query, Sqlite, SqliteArguments<'query>>, String> {
    Ok(match value {
        Value::Null => query.bind(Option::<String>::None),
        Value::Bool(value) => query.bind(value),
        Value::Number(value) => {
            if let Some(integer) = value.as_i64() {
                query.bind(integer)
            } else if let Some(unsigned_integer) = value.as_u64() {
                if unsigned_integer > i64::MAX as u64 {
                    return Err("SQLite integer bind value is out of range.".into());
                }

                query.bind(unsigned_integer as i64)
            } else if let Some(float) = value.as_f64() {
                query.bind(float)
            } else {
                return Err("Unsupported SQLite numeric bind value.".into());
            }
        }
        Value::String(value) => query.bind(value),
        Value::Array(_) | Value::Object(_) => query.bind(value.to_string()),
    })
}
