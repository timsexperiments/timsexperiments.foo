FROM gcr.io/bazel-public/bazel:latest as builder

WORKDIR /app

COPY . .

RUN bazel build //src/main/java/foo/timsexperiments/helloworld

FROM openjdk:11-jre-slim

COPY --from=builder /app/bazel-bin/src/main/java/foo/timsexperiments/helloworld/helloworld.jar /app/helloworld.jar

CMD ["java", "-cp", "/app/helloworld.jar", "foo.timsexperiments.helloworld.HelloWorld"]
