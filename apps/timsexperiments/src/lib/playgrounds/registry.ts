import type { Person } from "./contracts";

export const serializationChallenge = Object.freeze({
  id: "json-vs-protobuf-person",
  version: 1,
  schemaId: "article-person-proto3-v1",
  canonicalUrl: "/lab/json-vs-protobuf#challenge",
  title: "Serialization bench",
  limits: Object.freeze({ inputBytes: 16384, stringBytes: 1024, hobbies: 32, binaryBytes: 40000 }),
  schema: 'syntax = "proto3";\n\nmessage Person {\n  string name = 1;\n  int32 age = 2;\n  string email = 3;\n  repeated string hobbies = 4;\n}',
});

export const starterPerson: Person = Object.freeze({
  name: "Pixel 🐶",
  age: 3,
  email: "pixel@timsexperiments.foo",
  hobbies: Object.freeze(["sleeping", "eating", "playing"]),
});
export const starterJson = JSON.stringify(starterPerson, null, 2);
