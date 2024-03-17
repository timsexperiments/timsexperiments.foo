FROM rust:buster

RUN wget https://packages.erlang-solutions.com/erlang-solutions_2.0_all.deb \
    && dpkg -i erlang-solutions_2.0_all.deb \
    && apt-get update \
    && apt-get install -y esl-erlang

RUN cd /tmp \
    && git clone https://github.com/gleam-lang/gleam.git --branch v1.0.0 \
    && cd gleam \
    && make install

WORKDIR /app

COPY . .

RUN gleam update

RUN gleam build

CMD ["gleam", "run"]