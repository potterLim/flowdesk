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
use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, SubmenuBuilder},
    Emitter, Manager, WindowEvent, Wry,
};

const FLOWDESK_MENU_EVENT: &str = "flowdesk://menu";
const APP_MENU_COMMANDS: [&str; 10] = [
    "new_project",
    "new_note",
    "new_task",
    "import_files",
    "export_markdown",
    "save_workspace_backup",
    "restore_workspace_backup",
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
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_workspace_database_url,
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("FlowDesk");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
