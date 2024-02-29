mod definitions;
mod error;
mod workers;

use definitions::generate_typescript_definitions;
use error::ConfigError;
use std::fs::File;
use std::io::Write;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use workers::parse_toml;

#[wasm_bindgen]
pub fn write_definitions(file_path: String, definitions: String) -> Result<(), JsValue> {
    let _config = parse_toml(file_path.as_str()).map_err(JsValue::from)?;
    let _definitions = generate_typescript_definitions(&_config);

    let mut file = File::create("wrangler.d.ts")
        .map_err(ConfigError::from)
        .map_err(JsValue::from)?;
    file.write_all(definitions.as_bytes())
        .map_err(ConfigError::from)
        .map_err(JsValue::from)?;
    Ok(())
}
