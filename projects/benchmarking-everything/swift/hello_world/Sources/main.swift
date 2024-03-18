import Vapor

var env = try Environment.detect()
let app = Application(env)

defer {
    app.shutdown()
}

try configure(app)

try app.run()

func configure(_ app: Application) throws {
    app.http.server.configuration.hostname = "0.0.0.0"

    app.get { req in
        return "Hello, World!"
    }

    app.get("hello") { req -> String in
        return "Hello, world!"
    }
}
