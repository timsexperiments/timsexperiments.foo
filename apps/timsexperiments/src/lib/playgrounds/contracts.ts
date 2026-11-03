export type Person = Readonly<{
  name: string;
  age: number;
  email: string;
  hobbies: readonly string[];
}>;

export type RoundTripCheck = Readonly<{
  id: "json-roundtrip" | "protobuf-roundtrip" | "encodings-agree";
  status: "pass" | "fail";
  detail: string;
}>;

export type SerializationResult = Readonly<{
  kind: "completed";
  protocolVersion: 1;
  challengeId: "json-vs-protobuf-person";
  challengeVersion: 1;
  schemaId: "article-person-proto3-v1";
  measurement: "browser-js-compact-json-vs-protobuf-binary";
  runId: number;
  input: Person;
  json: Readonly<{ byteLength: number; text: string; hex: string; decoded: Person }>;
  protobuf: Readonly<{ byteLength: number; hex: string; decoded: Person }>;
  checks: readonly RoundTripCheck[];
}>;

/** Dispatched on the component itself; null clears a now-stale result. */
export type SerializationResultDetail = SerializationResult | null;
