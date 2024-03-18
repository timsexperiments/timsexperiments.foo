#include <iostream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <cstring>
#include <thread>

using namespace std;

void handle_client(int client_socket);

int main()
{
    int server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket < 0)
    {
        cerr << "Error creating server socket" << endl;
        return 1;
    }

    sockaddr_in server_address;
    memset(&server_address, 0, sizeof(server_address));
    server_address.sin_family = AF_INET;
    server_address.sin_port = htons(8080);
    server_address.sin_addr.s_addr = INADDR_ANY;

    if (bind(server_socket, (sockaddr *)&server_address, sizeof(server_address)) < 0)
    {
        cerr << "Error binding server socket to port 8080" << endl;
        return 1;
    }

    if (listen(server_socket, 10) < 0)
    {
        cerr << "Error listening on socket" << endl;
        return 1;
    }

    while (true)
    {
        sockaddr_in client_address;
        socklen_t client_address_len = sizeof(client_address);
        int client_socket = accept(server_socket, (sockaddr *)&client_address, &client_address_len);
        if (client_socket < 0)
        {
            cerr << "Error accepting incoming connection" << endl;
            continue;
        }

        // Spawn a new thread to handle the request
        thread(handle_client, client_socket).detach();
    }

    close(server_socket);

    return 0;
}

void handle_client(int client_socket)
{
    string responseString = "Hello World!";
    string httpResponse = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: " + to_string(responseString.length()) + "\r\n\r\n" + responseString;

    write(client_socket, httpResponse.c_str(), httpResponse.length());
    close(client_socket);
}