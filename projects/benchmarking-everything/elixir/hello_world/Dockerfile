FROM elixir:latest

WORKDIR /app

COPY . .

RUN mix local.hex --force && \
    mix local.rebar --force && \
    mix deps.get

RUN ELIXIR_ENV=prod mix compile

CMD ["mix", "run"]
