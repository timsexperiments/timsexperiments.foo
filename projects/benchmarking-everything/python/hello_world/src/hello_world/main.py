from http.server import BaseHTTPRequestHandler, HTTPServer


class Server(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Hello World!")

    def log_message(self, format, *args):
        # Override to prevent logging.
        pass


def run(server_class=HTTPServer, handler_class=Server, port=8080):
    server_address = ("0.0.0.0", port)
    httpd = server_class(server_address, handler_class)
    print(f"Listening on port: {port}")
    httpd.serve_forever()


if __name__ == "__main__":
    run()
