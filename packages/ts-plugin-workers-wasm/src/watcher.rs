use crate::error::ConfigError;
use notify::{Event, EventKind, RecursiveMode, Result, Watcher};
use std::path::Path;

pub fn on_file_mutations<TFn>(file: &str, func: TFn) -> Result<()>
where
    TFn: Fn() -> std::result::Result<(), ConfigError> + Send + 'static,
{
    let mut watcher = notify::recommended_watcher(move |res: Result<Event>| match res {
        Ok(event) => match event.kind {
            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {
                let _ = func();
            }
            _ => {} // Do nothing
        },
        Err(_) => {}
    })?;

    watcher.watch(Path::new(file), RecursiveMode::Recursive)?;

    Ok(())
}
