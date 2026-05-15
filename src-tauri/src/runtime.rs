use std::{backtrace::Backtrace, panic};

pub(crate) fn install_panic_hook() {
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
