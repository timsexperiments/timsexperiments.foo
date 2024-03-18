FROM swift:5.10.0 as builder

WORKDIR /app

COPY . .

RUN swift build -c release

FROM swift:5.10.0-slim

WORKDIR /app

COPY --from=builder /app/.build/release .

EXPOSE 8080

ENTRYPOINT ["./hello_world"]
