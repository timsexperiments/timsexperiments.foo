package foo.timsexperiments.helloworld;

import java.io.IOException;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class HelloWorld {
    public static void main(String[] args) throws IOException {
        int port = 8080;
        ServerSocket serverSocket = new ServerSocket(port);
        System.out.println("Server is listening on port " + port);
        ExecutorService executor = Executors.newFixedThreadPool(12);
        try {
            while (true) {
                Socket clientSocket = serverSocket.accept();

                executor.submit(() -> {
                    String httpResponse = "HTTP/1.1 200 OK\r\n\r\nHello, World!";
                    try (OutputStream outputStream = clientSocket.getOutputStream()) {
                        outputStream.write(httpResponse.getBytes("UTF-8"));
                        outputStream.flush();
                        outputStream.close();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                });
                clientSocket.close();
            }
        } finally {
            serverSocket.close();
        }
    }
}
