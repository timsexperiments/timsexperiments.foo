use crate::error::ConfigError;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs};

/// Parses a wrangler config (typically `wrangler.toml`) for cloudflare workers into an Object.
pub fn parse_toml(file_path: String) -> Result<WranglerConfig, ConfigError> {
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
    #[serde(default, rename = "queues")]
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
    pub binding: String,
}

#[cfg(test)]
impl std::fmt::Display for WranglerConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "WranglerConfig {{")?;
        writeln!(
            f,
            "{},",
            crate::utils::indent_lines(
                format!(
                    "name: \"{}\"",
                    self.name.as_ref().unwrap_or(&String::from(""))
                ),
                2
            )
        )?;
        writeln!(
            f,
            "{},",
            crate::utils::indent_lines(format!("main: \"{}\"", ""), 2)
        )?;
        writeln!(
            f,
            "{},",
            crate::utils::indent_lines(format!("compatibility_date: \"{}\"", ""), 2)
        )?;
        writeln!(f, "{}", crate::utils::indent_lines("env {{", 2))?;
        for (key, value) in &self.env {
            writeln!(
                f,
                "{},",
                crate::utils::indent_lines(format!("{}: {}", key, value), 4)
            )?;
        }
        writeln!(f, "{},", crate::utils::indent_lines("}}", 2))?;

        writeln!(
            f,
            "{},",
            crate::utils::indent_lines(format!("bindings: {}", self.bindings), 2)
        )?;

        write!(f, "}}")?;
        Ok(())
    }
}

#[cfg(test)]
impl std::fmt::Display for WranglerBindings {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "WranglerBindings {{")?;
        writeln!(f, "{}", crate::utils::indent_lines("bindings: [", 2))?;
        for binding in &self.bindings {
            writeln!(
                f,
                "{},",
                crate::utils::indent_lines(format!("{}", binding), 4)
            )?;
        }
        writeln!(f, "{}", crate::utils::indent_lines("]", 2))?;

        writeln!(f, "{}", crate::utils::indent_lines("d1_databases: [", 2))?;
        for binding in &self.d1_databases {
            writeln!(
                f,
                "{},",
                crate::utils::indent_lines(format!("{}", binding), 4)
            )?;
        }
        writeln!(f, "{}", crate::utils::indent_lines("]]", 2))?;

        writeln!(
            f,
            "{}",
            crate::utils::indent_lines("dispatch_namespaces: [", 2)
        )?;
        for binding in &self.dispatch_namespaces {
            writeln!(
                f,
                "{},",
                crate::utils::indent_lines(format!("{}", binding), 4)
            )?;
        }
        writeln!(f, "{}", crate::utils::indent_lines("]]", 2))?;

        writeln!(f, "{}", crate::utils::indent_lines("durable_objects: [", 2))?;
        for binding in &self.durable_objects {
            writeln!(
                f,
                "{},",
                crate::utils::indent_lines(format!("{}", binding), 4)
            )?;
        }
        writeln!(f, "{}", crate::utils::indent_lines("]]", 2))?;

        writeln!(f, "{}", crate::utils::indent_lines("email_senders: [", 2))?;
        for binding in &self.email {
            writeln!(
                f,
                "{},",
                crate::utils::indent_lines(format!("{}", binding), 4)
            )?;
        }
        writeln!(f, "{}", crate::utils::indent_lines("]]", 2))?;

        writeln!(f, "{}", crate::utils::indent_lines("kv_namespaces: [", 2))?;
        for binding in &self.kv_namespaces {
            writeln!(
                f,
                "{},",
                crate::utils::indent_lines(format!("{}", binding), 4)
            )?;
        }
        writeln!(f, "{}", crate::utils::indent_lines("]]", 2))?;

        writeln!(
            f,
            "{}",
            crate::utils::indent_lines("mtls_certificates: [", 2)
        )?;
        for binding in &self.mtls_certificates {
            writeln!(
                f,
                "{},",
                crate::utils::indent_lines(format!("{}", binding), 4)
            )?;
        }
        writeln!(f, "{}", crate::utils::indent_lines("]]", 2))?;

        writeln!(
            f,
            "{}",
            crate::utils::indent_lines(format!("queues: {}", self.queue), 2)
        )?;

        write!(f, "}}")?;
        Ok(())
    }
}

#[cfg(test)]
impl std::fmt::Display for Binding {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Binding {{")?;
        writeln!(f, "name: \"{}\",", self.name)?;
        writeln!(f, "binding_type: \"{}\",", self.binding_type)?;
        write!(f, "}}")?;
        Ok(())
    }
}

#[cfg(test)]
impl std::fmt::Display for NamedBinding {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "NamedBinding {{")?;
        writeln!(
            f,
            "{},",
            crate::utils::indent_lines(format!("binding: \"{}\"", self.binding), 2)
        )?;
        write!(f, "}}")?;
        Ok(())
    }
}

#[cfg(test)]
impl std::fmt::Display for Queue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Queue {{")?;
        writeln!(f, "{},", crate::utils::indent_lines("producers: [", 2))?;
        for producer in &self.producers {
            writeln!(f, "{},", crate::utils::indent_lines(producer, 4))?;
        }
        writeln!(f, "{},", crate::utils::indent_lines("]", 2))?;
        write!(f, "}}")?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_toml_with_various_bindings() {
        let toml_file = String::from("testdata/wrangler.toml");

        let parsed_toml = parse_toml(toml_file);

        assert!(parsed_toml.is_ok());
        let config = parsed_toml.unwrap();
        assert_eq!(config.name.clone().unwrap(), "Comprehensive Worker");
        assert_eq!(
            config.bindings.vars.get("GLOBAL_VAR"),
            Some(&"global_value".to_string())
        );
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
