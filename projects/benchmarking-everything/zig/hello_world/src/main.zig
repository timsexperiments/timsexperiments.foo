const std = @import("std");
const net = std.net;

pub fn main() !void {
    var server = net.StreamServer.init(.{});
    defer server.deinit();

    const address = try net.Address.resolveIp("0.0.0.0", 8080);
    try server.listen(address);

    std.debug.print("Server listening on {}\n", .{address});

    while (true) {
        const connection = try server.accept();

        _ = try std.Thread.spawn(.{}, handleConnection, .{connection});
    }
}

fn handleConnection(connection: net.StreamServer.Connection) !void {
    var writer = connection.stream.writer();
    _ = try writer.writeAll("HTTP/1.1 200 OK\r\nContent-Length: 13\r\n\r\nHello, World!");
}
