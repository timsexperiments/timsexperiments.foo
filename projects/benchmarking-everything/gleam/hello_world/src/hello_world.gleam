import gleam/bytes_builder
import gleam/erlang/process
import gleam/http/request.{type Request}
import gleam/http/response.{type Response}
import mist.{type Connection, type ResponseData}

pub fn main() {
  let assert Ok(_) =
    fn(_req: Request(Connection)) -> Response(ResponseData) {
      response.new(200)
      |> response.set_body(
        mist.Bytes(bytes_builder.from_string("Hello World!")),
      )
    }
    |> mist.new
    |> mist.port(8080)
    |> mist.start_http

  process.sleep_forever()
}
