using System.Net;

HttpListener listener = new HttpListener();

listener.Prefixes.Add("http://*:8080/");

listener.Start();

while (true)
{
    HttpListenerContext context = listener.GetContext();

    HttpListenerResponse response = context.Response;

    string responseString = "Hello World!";
    byte[] buffer = System.Text.Encoding.UTF8.GetBytes(responseString);

    response.ContentType = "text/plain";

    response.ContentLength64 = buffer.Length;

    Stream output = response.OutputStream;
    output.Write(buffer, 0, buffer.Length);

    output.Close();
}