use std::{fmt, io};

use wasm_bindgen::JsValue;

#[derive(Debug)]
pub enum ConfigError {
    Io(io::Error),
    Toml(toml::de::Error),
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match *self {
            ConfigError::Io(ref err) => write!(f, "IO error: {}", err),
            ConfigError::Toml(ref err) => write!(f, "TOML error: {}", err),
        }
    }
}

impl From<io::Error> for ConfigError {
    fn from(error: io::Error) -> ConfigError {
        ConfigError::Io(error)
    }
}

impl From<toml::de::Error> for ConfigError {
    fn from(error: toml::de::Error) -> ConfigError {
        ConfigError::Toml(error)
    }
}

impl From<ConfigError> for JsValue {
    fn from(error: ConfigError) -> JsValue {
        JsValue::from_str(&error.to_string())
    }
}
