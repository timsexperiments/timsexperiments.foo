FROM ubuntu:latest as builder

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /build

RUN apt-get update && apt-get install -y curl xz-utils && \
    curl -L "https://ziglang.org/download/0.11.0/zig-linux-x86_64-0.11.0.tar.xz" | tar -xJ && \
    mv "zig-linux-x86_64-0.11.0" "/usr/local/zig"


ENV PATH "/usr/local/zig:$PATH"

COPY . .

RUN zig build

FROM debian:buster-slim

WORKDIR /app

COPY --from=builder /build/zig-out/bin/hello_world .

EXPOSE 8080

CMD ["./hello_world"]