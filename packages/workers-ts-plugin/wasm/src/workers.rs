use crate::error::ConfigError;
use serde::{Deserialize, Serialize};
use std::fs;

pub fn parse_toml(file_path: &str) -> Result<WranglerConfig, ConfigError> {
    let contents = fs::read_to_string(file_path)?;
    let parsed_toml = toml::from_str(&contents).map_err(ConfigError::from)?;
    Ok(parsed_toml)
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub enum BindingType {
    AI,
    D1Database,
    DispatchNamespace,
    DurableObjectNamespace,
    KVNamespace,
    MTlsCertificate,
    Queue,
    R2Bucket,
    SendEmail,
    Service, // Fetcber
    Vectorize,
    Uknown,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WranglerConfig {
    pub bindings: Vec<Binding>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Binding {
    pub name: String,
    #[serde(rename = "type")]
    pub binding_type: BindingType,
    // Depending on the type, there may be additional fields here,
    // e.g., an identifier for the KV Namespace, a class name for Durable Objects, etc.
}
