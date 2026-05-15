use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{
    query::Query,
    sqlite::{SqliteArguments, SqliteConnectOptions, SqliteJournalMode, SqliteSynchronous},
    Connection, Sqlite, SqliteConnection,
};
use std::{
    backtrace::Backtrace,
    env, fs,
    panic,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, SubmenuBuilder},
    Emitter, Manager, WindowEvent, Wry,
};

const FLOWDESK_MENU_EVENT: &str = "flowdesk://menu";
const APP_MENU_COMMANDS: [&str; 11] = [
    "new_project",
    "new_note",
    "new_task",
    "import_files",
    "export_markdown",
    "save_workspace_backup",
    "restore_workspace_backup",
    "export_diagnostics",
    "open_workspace_settings",
    "open_command_palette",
    "search_projects",
];

#[derive(Debug, Deserialize)]
struct SqliteStatement {
    query: String,
    #[serde(default)]
    values: Vec<Value>,
}

#[derive(Debug, Serialize)]
struct ReleaseDiagnostics {
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
fn get_workspace_database_url() -> Result<String, String> {
    if let Ok(database_path) = env::var("FLOWDESK_DATABASE_PATH") {
        let database_path = database_path.trim();

        if !database_path.is_empty() {
            return Ok(format!("sqlite:{database_path}"));
        }
    }

    Ok("sqlite:flowdesk.db".into())
}

#[tauri::command]
async fn get_release_diagnostics(
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
        app_config_dir: resolve_app_path(&app, |path| path.app_config_dir()),
        app_data_dir: resolve_app_path(&app, |path| path.app_data_dir()),
        app_log_dir: resolve_app_path(&app, |path| path.app_log_dir()),
        database_path: database_path.to_string_lossy().into_owned(),
        database_exists,
        database_integrity,
    })
}

#[tauri::command]
async fn execute_workspace_transaction(
    app: tauri::AppHandle,
    database_url: String,
    statements: Vec<SqliteStatement>,
) -> Result<(), String> {
    let database_path = resolve_database_path(&app, &database_url)?;

    if let Some(parent_directory) = database_path.parent() {
        fs::create_dir_all(parent_directory).map_err(|error| error.to_string())?;
    }

    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal);

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
fn reset_workspace_database(app: tauri::AppHandle, database_url: String) -> Result<(), String> {
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

fn database_recovery_files(database_path: &Path) -> [PathBuf; 3] {
    let database_path = database_path.to_string_lossy();

    [
        PathBuf::from(database_path.as_ref()),
        PathBuf::from(format!("{database_path}-wal")),
        PathBuf::from(format!("{database_path}-shm")),
    ]
}

fn resolve_app_path(
    app: &tauri::AppHandle,
    resolver: impl FnOnce(&tauri::path::PathResolver<tauri::Wry>) -> tauri::Result<PathBuf>,
) -> Option<String> {
    resolver(&app.path())
        .ok()
        .map(|path| path.to_string_lossy().into_owned())
}

async fn check_database_integrity(database_path: &Path) -> DatabaseIntegrity {
    if !database_path.exists() {
        return DatabaseIntegrity::NotFound;
    }

    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal);

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

fn resolve_database_path(app: &tauri::AppHandle, database_url: &str) -> Result<PathBuf, String> {
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

fn install_panic_hook() {
    let default_hook = panic::take_hook();

    panic::set_hook(Box::new(move |panic_info| {
        log::error!(
            target: "flowdesk::panic",
            "Unhandled panic: {panic_info}\nBacktrace:\n{}",
            Backtrace::force_capture()
        );
        default_hook(panic_info);
    }));
}

fn build_flowdesk_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<Wry>> {
    let about_metadata = AboutMetadata {
        name: Some("FlowDesk".into()),
        version: Some(env!("CARGO_PKG_VERSION").into()),
        comments: Some("A local-first research and study workspace.".into()),
        ..Default::default()
    };

    let new_project = MenuItem::with_id(
        app,
        "new_project",
        "New Project",
        true,
        Some("CmdOrCtrl+Shift+N"),
    )?;
    let new_note = MenuItem::with_id(app, "new_note", "New Note", true, Some("CmdOrCtrl+N"))?;
    let new_task = MenuItem::with_id(app, "new_task", "New Task", true, Some("CmdOrCtrl+Shift+T"))?;
    let import_files = MenuItem::with_id(
        app,
        "import_files",
        "Import Files...",
        true,
        Some("CmdOrCtrl+Shift+I"),
    )?;
    let export_markdown = MenuItem::with_id(
        app,
        "export_markdown",
        "Export Markdown...",
        true,
        Some("CmdOrCtrl+E"),
    )?;
    let save_workspace_backup = MenuItem::with_id(
        app,
        "save_workspace_backup",
        "Back Up Workspace...",
        true,
        Some("CmdOrCtrl+Shift+B"),
    )?;
    let restore_workspace_backup = MenuItem::with_id(
        app,
        "restore_workspace_backup",
        "Restore Backup...",
        true,
        None::<&str>,
    )?;
    let export_diagnostics = MenuItem::with_id(
        app,
        "export_diagnostics",
        "Export Diagnostics...",
        true,
        None::<&str>,
    )?;
    let open_workspace_settings = MenuItem::with_id(
        app,
        "open_workspace_settings",
        "Settings...",
        true,
        Some("CmdOrCtrl+,"),
    )?;
    let open_command_palette = MenuItem::with_id(
        app,
        "open_command_palette",
        "Command Palette...",
        true,
        Some("CmdOrCtrl+Shift+P"),
    )?;
    let search_projects = MenuItem::with_id(
        app,
        "search_projects",
        "Search Projects",
        true,
        Some("CmdOrCtrl+K"),
    )?;

    let app_menu = SubmenuBuilder::new(app, "FlowDesk")
        .about(Some(about_metadata))
        .separator()
        .item(&open_workspace_settings)
        .item(&export_diagnostics)
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_project)
        .item(&new_note)
        .item(&new_task)
        .separator()
        .item(&import_files)
        .item(&export_markdown)
        .separator()
        .item(&save_workspace_backup)
        .item(&restore_workspace_backup)
        .separator()
        .close_window()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&open_command_palette)
        .item(&search_projects)
        .separator()
        .fullscreen()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .bring_all_to_front()
        .build()?;

    Menu::with_items(
        app,
        &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu],
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_panic_hook();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_workspace_database_url,
            get_release_diagnostics,
            execute_workspace_transaction,
            reset_workspace_database
        ])
        .menu(build_flowdesk_menu)
        .on_menu_event(|app, event| {
            let menu_id = event.id().as_ref();

            if APP_MENU_COMMANDS.contains(&menu_id) {
                let _ = app.emit(FLOWDESK_MENU_EVENT, menu_id);
            }
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(target_os = "macos")]
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("FlowDesk");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
