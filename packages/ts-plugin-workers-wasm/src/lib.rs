mod definitions;
mod error;
mod utils;
mod watcher;
mod workers;

use definitions::generate_typescript_definitions;
use error::ConfigError;
use std::fs::File;
use std::io::Write;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use watcher::on_file_mutations;
use workers::parse_toml;

/// Takes the wrangler `config_path` (traditionally `wrangler.toml``) and extracts the type
/// definitions of all the bindings into a `.d.ts` file in the `output_path` location.
#[wasm_bindgen]
pub fn write_definitions(config_path: String, output_path: String) -> Result<(), JsValue> {
    on_file_mutations(&config_path.clone(), move || {
        let config = parse_toml(&config_path)?;
        let definitions = generate_typescript_definitions(&config);

        let mut file = File::create(&output_path).map_err(ConfigError::from)?;
        file.write_all(definitions.to_string().as_bytes())
            .map_err(ConfigError::from)?;
        Ok(())
    })
    .map_err(ConfigError::from)
    .map_err(JsValue::from)?;
    Ok(())
}
