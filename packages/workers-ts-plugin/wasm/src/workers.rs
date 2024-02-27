use serde::{Deserialize, Serialize};

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
    bindings: Vec<Binding>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Binding {
    name: String,
    #[serde(rename = "type")]
    binding_type: BindingType,
    // Depending on the type, there may be additional fields here,
    // e.g., an identifier for the KV Namespace, a class name for Durable Objects, etc.
}

fn generate_typescript_definitions(config: &WranglerConfig) -> String {
    let mut definitions = String::new();

    for binding in &config.bindings {
        let ts_type = match binding.binding_type {
            BindingType::KVNamespace => "KVNamespace",
            BindingType::DurableObjectNamespace => "DurableObjectNamespace",
            BindingType::R2Bucket => "R2Bucket",
            BindingType::Service => "Fetcher", // Assuming Fetcher is the type for services
            BindingType::Queue => "Queue",
            BindingType::D1Database => "D1Database",
            BindingType::AI => "any",
            BindingType::DispatchNamespace => "DispatchNamespace",
            BindingType::MTlsCertificate => "Fetcher",
            BindingType::SendEmail => "SendEmail",
            BindingType::Vectorize => "VectorizeIndex",
            BindingType::Uknown => "any",
        };

        definitions.push_str(&format!("// {}: {}\n", binding.name, ts_type));
    }

    definitions
}
