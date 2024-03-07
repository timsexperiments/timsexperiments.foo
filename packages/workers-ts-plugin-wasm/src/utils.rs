/// Indents each line of the input string by the specified number of spaces.
///
/// # Example
///
/// ```
/// use std::string::ToString;
///
/// let input = "Hello\nWorld";
/// let indented = indent_lines(input, 4);
/// assert_eq!(indented, "    Hello\n    World");
/// ```
pub fn indent_lines<T: ToString>(input: T, indent_size: usize) -> String {
    let indent = " ".repeat(indent_size); // Generate the indentation string
    input
        .to_string()
        .lines() // Iterate over each line
        .map(|line| format!("{}{}", indent, line)) // Prepend the indent to each line
        .collect::<Vec<_>>() // Collect the results into a Vec<String>
        .join("\n") // Join the vector of strings into a single string with newlines
}
