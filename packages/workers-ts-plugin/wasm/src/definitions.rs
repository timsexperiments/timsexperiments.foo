use crate::workers::{BindingType, WranglerConfig};
use std::fmt;
use std::string::String;

pub fn generate_typescript_definitions(config: &WranglerConfig) -> Namespace {
    let fields: Vec<Field> = config
        .bindings
        .iter()
        .map(|binding| {
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
                BindingType::Uknown => "any", // Note: Consider correcting the typo to `Unknown`
            }
            .to_owned();

            Field {
                key: FieldKey::Name(binding.name.clone()),
                field_type: ts_type,
            }
        })
        .collect();

    Namespace {
        name: "global".to_owned(),
        typedefs: vec![TypeDef {
            struct_type: StructType::Interface,
            export: true,
            fields,
        }],
    }
}

fn indent_lines<T: ToString>(input: T, indent_size: usize) -> String {
    let indent = " ".repeat(indent_size); // Generate the indentation string
    input
        .to_string()
        .lines() // Iterate over each line
        .map(|line| format!("{}{}", indent, line)) // Prepend the indent to each line
        .collect::<Vec<_>>() // Collect the results into a Vec<String>
        .join("\n") // Join the vector of strings into a single string with newlines
}

pub struct Namespace {
    name: String,
    typedefs: Vec<TypeDef>,
}

struct TypeDef {
    struct_type: StructType,
    export: bool,
    fields: Vec<Field>,
}

enum StructType {
    Class,
    Type,
    Interface,
}

struct Field {
    key: FieldKey,
    field_type: String,
}

enum FieldKey {
    Name(String),
    Signature(IndexSignature),
}

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
        writeln!(f, "}}")
    }
}

impl fmt::Display for TypeDef {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(
            f,
            "{}{}",
            if self.export { "export " } else { "" },
            self.struct_type
        )?;
        for field in &self.fields {
            writeln!(f, "{}", indent_lines(field, 2))?;
        }
        Ok(())
    }
}

impl fmt::Display for Field {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {};", self.key, self.field_type)
    }
}

impl fmt::Display for FieldKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FieldKey::Name(name) => write!(f, "{}", name),
            FieldKey::Signature(signature) => write!(f, "{}", signature),
        }
    }
}

impl fmt::Display for IndexSignature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}: {}]", self.friendly_name, self.index_type)
    }
}

impl fmt::Display for StructType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match *self {
            StructType::Class => write!(f, "class"),
            StructType::Type => write!(f, "type"),
            StructType::Interface => write!(f, "interface"),
        }
    }
}
