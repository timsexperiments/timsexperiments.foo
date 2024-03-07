use crate::utils::indent_lines;
use crate::workers::{Binding, NamedBinding, WranglerBindings, WranglerConfig};
use std::collections::HashSet;
use std::string::String;
use std::{fmt, vec};

/// Generates TypeScript definitions for bindings from a parsed `WranglerConfig` object.
pub fn generate_typescript_definitions(config: &WranglerConfig) -> Namespace {
    let mut fields = vec![];

    fields.append(&mut fields_from_wrangler_bindings(&config.bindings));
    config
        .env
        .iter()
        .for_each(|(_, bindings)| fields.append(&mut fields_from_wrangler_bindings(&bindings)));

    let mut seen = HashSet::new();
    fields = fields
        .into_iter()
        .filter(|field| {
            let seen_before = seen.contains(&field.key.to_string());
            seen.insert(field.key.to_string());
            !seen_before
        })
        .collect();

    Namespace {
        name: "global".to_owned(),
        typedefs: vec![TypeDef {
            struct_type: StructType::Interface,
            export: true,
            name: "Env".to_string(),
            fields,
        }],
    }
}

fn fields_from_wrangler_bindings(bindings: &WranglerBindings) -> Vec<Field> {
    let mut fields: Vec<Field> = bindings_to_fields(&bindings.bindings);

    fields.append(&mut named_bindings_to_fields(
        &bindings.d1_databases,
        "d1_databases",
    ));
    fields.append(&mut named_bindings_to_fields(
        &bindings.dispatch_namespaces,
        "dispatch_namespaces",
    ));
    fields.append(&mut named_bindings_to_fields(
        &bindings.durable_objects,
        "durable_objects",
    ));
    fields.append(&mut named_bindings_to_fields(&bindings.email, "send_email"));
    fields.append(&mut named_bindings_to_fields(
        &bindings.kv_namespaces,
        "kv_namespaces",
    ));
    fields.append(&mut named_bindings_to_fields(
        &bindings.mtls_certificates,
        "mtls_certificates",
    ));
    fields.append(&mut named_bindings_to_fields(
        &bindings.r2_buckets,
        "r2_buckets",
    ));
    fields.append(&mut named_bindings_to_fields(
        &bindings.services,
        "services",
    ));
    fields.append(&mut named_bindings_to_fields(
        &bindings.queue.producers,
        "queues.producers",
    ));
    fields.append(&mut named_bindings_to_fields(
        &bindings.workers_ai,
        "workers_ai",
    ));

    fields.append(
        &mut bindings
            .vars
            .iter()
            .map(|(key, _)| Field {
                key: FieldKey::Name(key.clone()),
                field_type: String::from("string"),
            })
            .collect::<Vec<Field>>(),
    );

    fields
}

fn bindings_to_fields(bindings: &[Binding]) -> Vec<Field> {
    bindings
        .iter()
        .map(|binding| {
            let binding_type = &binding.binding_type;
            let ts_type = binding_type_to_ts_type(binding_type);

            Field {
                key: FieldKey::Name(binding.name.to_owned()),
                field_type: ts_type,
            }
        })
        .collect::<Vec<Field>>()
}

fn named_bindings_to_fields(bindings: &[NamedBinding], binding_type: &str) -> Vec<Field> {
    bindings
        .iter()
        .map(|binding| Field {
            key: FieldKey::Name(binding.binding.to_owned()),
            field_type: binding_type_to_ts_type(&String::from(binding_type)),
        })
        .collect::<Vec<Field>>()
}

fn binding_type_to_ts_type(binding_type: &String) -> String {
    match binding_type.as_str() {
        "kv_namespaces" => "KVNamespace",
        "durable_objects" => "DurableObject",
        "r2_buckets" => "R2Bucket",
        "services" => "Fetcher",
        "queues.producers" => "Queue",
        "d1_databases" => "D1Database",
        "ai" => "any",
        "dispatch_namespaces" => "DispatchNamespace",
        "mtls_certificates" => "Fetcher",
        "send_email" => "Email",
        "vectorize" => "VectorizeIndex",
        _ => "any",
    }
    .to_owned()
}

#[derive(Debug)]
pub struct Namespace {
    name: String,
    typedefs: Vec<TypeDef>,
}

#[derive(Debug)]
struct TypeDef {
    struct_type: StructType,
    export: bool,
    name: String,
    fields: Vec<Field>,
}

#[derive(Debug)]
enum StructType {
    Class,
    Interface,
    Type,
}

#[derive(Debug)]
struct Field {
    key: FieldKey,
    field_type: String,
}

#[derive(Debug)]
enum FieldKey {
    Name(String),
    Signature(IndexSignature),
}

#[derive(Debug)]
struct IndexSignature {
    friendly_name: String,
    index_type: String,
}

impl fmt::Display for Namespace {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "declare {} {{", self.name)?;
        for typedef in &self.typedefs {
            writeln!(f, "{}", indent_lines(typedef, 2))?;
        }
        writeln!(f, "}}")?;
        Ok(())
    }
}

impl fmt::Display for TypeDef {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(
            f,
            "{}{} {} {{",
            if self.export { "export " } else { "" },
            self.struct_type,
            self.name,
        )?;
        for field in &self.fields {
            writeln!(f, "{}", indent_lines(field, 2))?;
        }
        write!(f, "}}")?;
        Ok(())
    }
}

impl fmt::Display for Field {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {};", self.key, self.field_type)?;
        Ok(())
    }
}

impl fmt::Display for FieldKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FieldKey::Name(name) => write!(f, "{}", name),
            FieldKey::Signature(signature) => write!(f, "{}", signature),
        }?;
        Ok(())
    }
}

impl fmt::Display for IndexSignature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}: {}]", self.friendly_name, self.index_type)?;
        Ok(())
    }
}

impl fmt::Display for StructType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match *self {
            StructType::Class => write!(f, "class"),
            StructType::Type => write!(f, "type"),
            StructType::Interface => write!(f, "interface"),
        }?;
        Ok(())
    }
}

#[cfg(test)]
impl PartialEq for StructType {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (StructType::Class, StructType::Class) => true,
            (StructType::Interface, StructType::Interface) => true,
            (StructType::Type, StructType::Type) => true,
            _ => false,
        }
    }

    fn ne(&self, other: &Self) -> bool {
        !self.eq(other)
    }
}

#[cfg(test)]
impl PartialEq for FieldKey {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Name(l0), Self::Name(r0)) => l0 == r0,
            (Self::Signature(l0), Self::Signature(r0)) => l0 == r0,
            _ => false,
        }
    }

    fn ne(&self, other: &Self) -> bool {
        !self.eq(other)
    }
}

#[cfg(test)]
impl PartialEq for IndexSignature {
    fn eq(&self, other: &Self) -> bool {
        self.friendly_name == other.friendly_name && self.index_type == other.index_type
    }

    fn ne(&self, other: &Self) -> bool {
        !self.eq(other)
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        definitions::{generate_typescript_definitions, StructType},
        workers::{Binding, NamedBinding, Queue, WranglerBindings, WranglerConfig},
    };
    use std::fs;

    #[test]
    fn should_handle_bindings_with_unknown_binding_type() {
        let config = WranglerConfig {
            name: Option::Some("test".to_owned()),
            main: Option::Some("src/main.ts".to_owned()),
            compatibility_date: Option::Some("test".to_owned()),
            bindings: WranglerBindings {
                bindings: vec![
                    Binding {
                        name: "BINDING_1".to_owned(),
                        binding_type: "unknown".to_owned(),
                    },
                    Binding {
                        name: "BINDING_2".to_owned(),
                        binding_type: "kv_namespaces".to_owned(),
                    },
                ],
                d1_databases: vec![NamedBinding {
                    binding: String::from("TEST_DB"),
                }],
                dispatch_namespaces: vec![NamedBinding {
                    binding: String::from("TEST_DISPATCH"),
                }],
                durable_objects: vec![NamedBinding {
                    binding: String::from("TEST_DO"),
                }],
                email: vec![NamedBinding {
                    binding: String::from("TEST_EMAIL"),
                }],
                kv_namespaces: vec![NamedBinding {
                    binding: String::from("TEST_KV"),
                }],
                mtls_certificates: vec![NamedBinding {
                    binding: String::from("TEST_MTLS"),
                }],
                r2_buckets: vec![NamedBinding {
                    binding: String::from("TEST_BUCKET"),
                }],
                services: vec![NamedBinding {
                    binding: String::from("TEST_SERVICE"),
                }],
                queue: Queue {
                    producers: vec![NamedBinding {
                        binding: String::from("TEST_QUEUE"),
                    }],
                },
                workers_ai: vec![NamedBinding {
                    binding: String::from("TEST_AI"),
                }],
                vars: [(String::from("TEST_VAR"), String::from("test value"))]
                    .into_iter()
                    .collect(),
            },
            env: [(
                String::from("staging"),
                WranglerBindings {
                    bindings: vec![
                        Binding {
                            name: "BINDING_1".to_owned(),
                            binding_type: "unknown".to_owned(),
                        },
                        Binding {
                            name: "BINDING_2".to_owned(),
                            binding_type: "unknown".to_owned(),
                        },
                        Binding {
                            name: "BINDING_3".to_owned(),
                            binding_type: "d1_databases".to_owned(),
                        },
                    ],
                    d1_databases: vec![NamedBinding {
                        binding: String::from("TEST_DB"),
                    }],
                    dispatch_namespaces: vec![NamedBinding {
                        binding: String::from("TEST_DISPATCH"),
                    }],
                    durable_objects: vec![NamedBinding {
                        binding: String::from("TEST_DO"),
                    }],
                    email: vec![NamedBinding {
                        binding: String::from("TEST_EMAIL"),
                    }],
                    kv_namespaces: vec![NamedBinding {
                        binding: String::from("TEST_KV"),
                    }],
                    mtls_certificates: vec![NamedBinding {
                        binding: String::from("TEST_MTLS"),
                    }],
                    r2_buckets: vec![NamedBinding {
                        binding: String::from("TEST_BUCKET"),
                    }],
                    services: vec![NamedBinding {
                        binding: String::from("TEST_SERVICE"),
                    }],
                    queue: Queue {
                        producers: vec![NamedBinding {
                            binding: String::from("TEST_QUEUE"),
                        }],
                    },
                    workers_ai: vec![NamedBinding {
                        binding: String::from("TEST_AI"),
                    }],
                    vars: [(String::from("TEST_VAR"), String::from("test value"))]
                        .into_iter()
                        .collect(),
                },
            )]
            .into_iter()
            .collect(),
        };
        let expected_result = fs::read_to_string("testdata/expected-env.d.ts");

        let result = generate_typescript_definitions(&config);

        assert_eq!(result.name, "global");
        assert_eq!(result.typedefs.len(), 1);
        assert_eq!(result.typedefs[0].struct_type, StructType::Interface);
        assert_eq!(result.typedefs[0].export, true);
        assert_eq!(result.typedefs[0].fields.len(), 14);
        assert_eq!(result.to_string(), expected_result.unwrap())
    }
}
