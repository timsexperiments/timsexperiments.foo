FROM ubuntu:latest

RUN apt-get update && apt-get install -y curl unzip

RUN curl -fsSL https://bun.sh/install | bash

ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY . .

CMD ["bun", "run", "."]
EXPOSE 8080
