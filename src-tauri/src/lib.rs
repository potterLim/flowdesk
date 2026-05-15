use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, SubmenuBuilder},
    Emitter, Manager, WindowEvent, Wry,
};

const FLOWDESK_MENU_EVENT: &str = "flowdesk://menu";
const APP_MENU_COMMANDS: [&str; 7] = [
    "new_project",
    "new_note",
    "new_task",
    "import_files",
    "export_markdown",
    "open_command_palette",
    "search_projects",
];

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
