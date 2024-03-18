FROM python:3.12

RUN apt-get update && apt-get install -y --no-install-recommends curl

RUN curl -sSL https://install.python-poetry.org | python3 -

ENV PATH "$PATH:/root/.local/bin"

WORKDIR /app

COPY . /app

RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

EXPOSE 8080

CMD ["python", "src/hello_world/main.py"]
