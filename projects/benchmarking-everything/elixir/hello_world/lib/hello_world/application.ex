defmodule HelloWorld.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    run()
  end

  def run(port \\ 8080) do
    {:ok, socket} =
      :gen_tcp.listen(port, [
        :binary,
        packet: :line,
        active: false,
        reuseaddr: true,
        ip: {0, 0, 0, 0}
      ])

    loop_accept(socket)
  end

  defp loop_accept(socket) do
    {:ok, client} = :gen_tcp.accept(socket)
    spawn_link(fn -> handle_request(client) end)
    loop_accept(socket)
  end

  defp handle_request(client) do
    :gen_tcp.recv(client, 0)
    response = "HTTP/1.1 200 OK\r\nContent-Length: 11\r\n\r\n#{HelloWorld.hello()}"
    :gen_tcp.send(client, response)
    :gen_tcp.close(client)
  end
end
