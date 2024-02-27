mod error;
mod workers;

use error::ConfigError;
use serde_json;
use std::fs::{self, File};
use std::io::Write;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use workers::WranglerConfig;

#[wasm_bindgen]
pub fn parse_toml(file_path: &str) -> Result<String, JsValue> {
    let contents = fs::read_to_string(file_path)
        .map_err(ConfigError::from)
        .map_err(JsValue::from)?; // Map std::io::Error to toml::de::Error
    let parsed_toml: WranglerConfig = toml::from_str(&contents).map_err(ConfigError::from)?;
    serde_json::to_string(&parsed_toml).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn write_definitions(file_path: &str, definitions: &str) -> Result<(), JsValue> {
    let mut file = File::create(file_path)
        .map_err(ConfigError::from)
        .map_err(JsValue::from)?;
    file.write_all(definitions.as_bytes())
        .map_err(ConfigError::from)
        .map_err(JsValue::from)?;
    Ok(())
}
