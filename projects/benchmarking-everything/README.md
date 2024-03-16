# Programming Languages Performance Comparison

## Overview

This repository is dedicated to a comprehensive and nuanced performance comparison of various programming languages and runtimes, specifically within the context of web server performance. Unlike typical benchmarks that often oversimplify comparisons by using basic "Hello World" examples, this project aims to present a more realistic and meaningful analysis. We compare the performance of several programming languages across two different scenarios: a simple web server that returns a "Hello World" response and a more complex web server that involves real-world operations, such as reading from a disk using an SQLite database, performing data transformations, and managing memory.

## Objective

The primary goal of this project is to challenge and expand the current narrative surrounding programming language benchmarking. Most benchmarks tout performance metrics that, while impressive on paper, fail to represent the complexities and nuances of real-world applications. By comparing a range of programming languages in both simplistic and complex scenarios, this project seeks to:

Illuminate the often overlooked aspects of language performance, especially under more realistic conditions.
Provide a more holistic view of how different programming languages handle tasks that are more indicative of actual application demands.
Encourage a broader discussion on what constitutes meaningful performance benchmarks in software development.

## Languages and Runtimes Included

The project includes benchmarks for the following programming languages and runtimes:

- Bun
- C#
- C++
- Elixir
- Gleam
- Go
- Java
- Node.js
- Python
- Rust
- Swift
- Zig

These languages were selected to cover a wide range of programming paradigms, runtime environments, and typical use cases in modern web development.

## Methodology

Each language/runtime is benchmarked in two different scenarios:

1. Hello World Server: A basic web server that responds with "Hello World" to every request.
1. "Real-World" Server: A more complex server that performs operations such as reading from an SQLite database, processing data, and engaging the garbage collector, before sending a response.

All benchmarks are conducted using wrk to simulate web request traffic and measure performance metrics. The servers are containerized using Docker to ensure consistency and reproducibility across different environments.

## Disclaimer

It is important to note that this project does not claim to provide an exhaustive evaluation of each language's capabilities. The examples and benchmarks are designed to highlight differences in a controlled setting and may not fully represent the performance characteristics of each language in all real-world scenarios. Additionally, the project's author is not an expert in all the included programming languages, and the code examples may not represent the optimal implementation for each language.

## Contributing

Have any ideas how to make the project easier to follow along with. Go ahead an submit a PR, I'll be happy to take a look to see if aligns with my vision for this repo.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
