use crate::error::ConfigError;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs};

pub fn parse_toml(file_path: &str) -> Result<WranglerConfig, ConfigError> {
    let contents = fs::read_to_string(file_path)?;
    let parsed_toml = toml::from_str(&contents).map_err(ConfigError::from)?;
    Ok(parsed_toml)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WranglerConfig {
    pub name: Option<String>,
    pub main: Option<String>,
    pub compatibility_date: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, WranglerBindings>,
    #[serde(flatten)]
    pub bindings: WranglerBindings,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WranglerBindings {
    #[serde(default)]
    pub vars: HashMap<String, String>,
    #[serde(default)]
    pub bindings: Vec<Binding>,
    #[serde(default)]
    pub kv_namespaces: Vec<NamedBinding>,
    #[serde(default)]
    pub durable_objects: Vec<NamedBinding>,
    #[serde(default)]
    pub r2_buckets: Vec<NamedBinding>,
    #[serde(default)]
    pub services: Vec<NamedBinding>,
    #[serde(default)]
    pub queue: Queue,
    #[serde(default)]
    pub d1_databases: Vec<NamedBinding>,
    #[serde(default)]
    pub dispatch_namespaces: Vec<NamedBinding>,
    #[serde(default)]
    pub mtls_certificates: Vec<NamedBinding>,
    #[serde(default, rename = "send_email")]
    pub email: Vec<NamedBinding>,
    #[serde(default, rename = "ai")]
    pub workers_ai: Vec<NamedBinding>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Queue {
    #[serde(default)]
    pub producers: Vec<NamedBinding>,
}

impl Default for Queue {
    fn default() -> Self {
        Queue { producers: vec![] }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Binding {
    pub name: String,
    pub binding_type: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NamedBinding {
    binding: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UnknownBinding {
    pub binding: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_toml_with_various_bindings() {
        let toml_file = "testdata/wrangler.toml";

        let parsed_toml = parse_toml(toml_file);
        assert!(parsed_toml.is_ok());
        let config = parsed_toml.unwrap();

        assert_eq!(config.name.unwrap(), "Comprehensive Worker");

        assert_eq!(
            config.bindings.vars.get("GLOBAL_VAR"),
            Some(&"global_value".to_string())
        );

        // Check bindings
        assert_eq!(config.bindings.bindings.len(), 1);
        assert_eq!(config.bindings.d1_databases.len(), 1);
        assert_eq!(config.bindings.dispatch_namespaces.len(), 1);
        assert_eq!(config.bindings.durable_objects.len(), 1);
        assert_eq!(config.bindings.email.len(), 1);
        assert_eq!(config.bindings.kv_namespaces.len(), 1);
        assert_eq!(config.bindings.mtls_certificates.len(), 1);
        assert_eq!(config.bindings.queue.producers.len(), 1);
        assert_eq!(config.bindings.r2_buckets.len(), 1);
        assert_eq!(config.bindings.services.len(), 1);
        assert_eq!(config.bindings.workers_ai.len(), 1);

        assert!(config.env.contains_key("test"));
        let test_env = config.env.get("test").unwrap();
        let test_vars = test_env.vars.to_owned();
        assert_eq!(test_vars.get("ENV_VAR"), Some(&"env_value".to_string()));
    }
}
