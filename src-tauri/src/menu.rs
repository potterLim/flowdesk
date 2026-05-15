use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, SubmenuBuilder},
    Wry,
};

pub(crate) const FLOWDESK_MENU_EVENT: &str = "flowdesk://menu";
pub(crate) const APP_MENU_COMMANDS: [&str; 11] = [
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

pub(crate) fn build_flowdesk_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<Wry>> {
    let about_metadata = AboutMetadata {
        name: Some("FlowDesk".into()),
        version: Some(env!("CARGO_PKG_VERSION").into()),
        comments: Some("A research and study desktop workspace.".into()),
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
        None::<&str>,
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
