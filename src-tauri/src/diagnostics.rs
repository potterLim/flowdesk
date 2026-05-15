use crate::database::{resolve_database_path, sqlite_connect_options};
use serde::Serialize;
use sqlx::{Connection, SqliteConnection};
use std::{env, path::Path};
use tauri::Manager;

#[derive(Debug, Serialize)]
pub(crate) struct ReleaseDiagnostics {
    product_name: &'static str,
    version: &'static str,
    build_profile: &'static str,
    operating_system: &'static str,
    architecture: &'static str,
    app_config_dir: Option<String>,
    app_data_dir: Option<String>,
    app_log_dir: Option<String>,
    database_path: String,
    database_exists: bool,
    database_integrity: DatabaseIntegrity,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", content = "detail")]
enum DatabaseIntegrity {
    Ok,
    NotFound,
    Error(String),
}

#[tauri::command]
pub(crate) async fn get_release_diagnostics(
    app: tauri::AppHandle,
    database_url: String,
) -> Result<ReleaseDiagnostics, String> {
    let database_path = resolve_database_path(&app, &database_url)?;
    let database_exists = database_path.exists();
    let database_integrity = check_database_integrity(&database_path).await;

    Ok(ReleaseDiagnostics {
        product_name: "FlowDesk",
        version: env!("CARGO_PKG_VERSION"),
        build_profile: if cfg!(debug_assertions) {
            "debug"
        } else {
            "release"
        },
        operating_system: env::consts::OS,
        architecture: env::consts::ARCH,
        app_config_dir: path_to_string(app.path().app_config_dir()),
        app_data_dir: path_to_string(app.path().app_data_dir()),
        app_log_dir: path_to_string(app.path().app_log_dir()),
        database_path: database_path.to_string_lossy().into_owned(),
        database_exists,
        database_integrity,
    })
}

async fn check_database_integrity(database_path: &Path) -> DatabaseIntegrity {
    if !database_path.exists() {
        return DatabaseIntegrity::NotFound;
    }

    let options = sqlite_connect_options(database_path);
    let mut connection = match SqliteConnection::connect_with(&options).await {
        Ok(connection) => connection,
        Err(error) => return DatabaseIntegrity::Error(error.to_string()),
    };

    match sqlx::query_scalar::<_, String>("PRAGMA integrity_check")
        .fetch_one(&mut connection)
        .await
    {
        Ok(result) if result.eq_ignore_ascii_case("ok") => DatabaseIntegrity::Ok,
        Ok(result) => DatabaseIntegrity::Error(result),
        Err(error) => DatabaseIntegrity::Error(error.to_string()),
    }
}

fn path_to_string(path: tauri::Result<std::path::PathBuf>) -> Option<String> {
    path.ok().map(|path| path.to_string_lossy().into_owned())
}
