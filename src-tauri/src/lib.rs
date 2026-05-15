mod database;
mod diagnostics;
mod menu;
mod runtime;

use database::{execute_workspace_transaction, get_workspace_database_url, reset_workspace_database};
use diagnostics::get_release_diagnostics;
use menu::{build_flowdesk_menu, APP_MENU_COMMANDS, FLOWDESK_MENU_EVENT};
use runtime::install_panic_hook;
use tauri::{Emitter, Manager, WindowEvent};

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
