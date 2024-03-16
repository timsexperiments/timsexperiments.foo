FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

COPY . .

RUN dotnet build

ENTRYPOINT ["dotnet", "bin/Debug/net8.0/hello-world.dll"]
