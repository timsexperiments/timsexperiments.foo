import type { Person, RoundTripCheck, SerializationResult } from "./contracts";
import { serializationChallenge } from "./registry";

const utf8 = new TextEncoder();
// ignoreBOM preserves a leading U+FEFF inside a string field.
const fromUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const limits = serializationChallenge.limits;
const keys = ["name", "age", "email", "hobbies"];

export class InputError extends Error {
  constructor(message: string, readonly path = "$") {
    super(message);
    this.name = "InputError";
  }
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new InputError(`${path} must be a string.`, path);
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new InputError(`${path} contains an unpaired Unicode surrogate.`, path);
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new InputError(`${path} contains an unpaired Unicode surrogate.`, path);
    }
  }
  if (value.length > limits.stringBytes || utf8.encode(value).length > limits.stringBytes) {
    throw new InputError(`${path} exceeds ${limits.stringBytes} UTF-8 bytes.`, path);
  }
  return value;
}

export function validatePerson(value: unknown): Person {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InputError("Enter one JSON object with name, age, email and hobbies.");
  }
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new InputError("Only name, age, email and hobbies are supported. Remove unknown keys.");
  }
  if (!("name" in value && "age" in value && "email" in value && "hobbies" in value) ||
      !keys.every((key) => Object.hasOwn(value, key))) {
    throw new InputError("Include all four fields: name, age, email and hobbies.");
  }
  const name = readString(value.name, "name");
  const email = readString(value.email, "email");
  if (typeof value.age !== "number" || !Number.isInteger(value.age) || value.age < -2147483648 || value.age > 2147483647) {
    throw new InputError("age must be an integer from -2147483648 to 2147483647.", "age");
  }
  if (!Array.isArray(value.hobbies) || value.hobbies.length > limits.hobbies) {
    throw new InputError(`hobbies must be an array of at most ${limits.hobbies} strings.`, "hobbies");
  }
  const hobbies: string[] = [];
  for (let i = 0; i < value.hobbies.length; i++) hobbies.push(readString(value.hobbies[i], `hobbies[${i}]`));
  return Object.freeze({ name, age: value.age === 0 ? 0 : value.age, email, hobbies: Object.freeze(hobbies) });
}

export function parsePerson(input: string): Person {
  if (input.length > limits.inputBytes || utf8.encode(input).length > limits.inputBytes) {
    throw new InputError(`The editor is limited to ${limits.inputBytes.toLocaleString("en-US")} UTF-8 bytes.`);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(input); }
  catch { throw new InputError("Invalid JSON. Use double-quoted keys and strings, and remove trailing commas."); }
  return validatePerson(parsed);
}

function varint(value: bigint): number[] {
  const bytes: number[] = [];
  do {
    const low = Number(value & 127n);
    value >>= 7n;
    bytes.push(value ? low | 128 : low);
  } while (value);
  return bytes;
}

/** Fixed Person codec, not a general schema compiler. No message length prefix.
 * Wire reference: https://protobuf.dev/programming-guides/encoding/
 * Negative int32 values are sign-extended to 64 bits and occupy ten bytes.
 */
export function encodePerson(person: Person): Uint8Array {
  const output: number[] = [];
  const stringField = (tag: number, value: string) => {
    const bytes = utf8.encode(value);
    output.push(tag, ...varint(BigInt(bytes.length)), ...bytes);
  };
  if (person.name !== "") stringField(10, person.name);
  if (person.age !== 0) output.push(16, ...varint(BigInt.asUintN(64, BigInt(person.age))));
  if (person.email !== "") stringField(26, person.email);
  for (const hobby of person.hobbies) stringField(34, hobby);
  return Uint8Array.from(output);
}

class WireReader {
  offset = 0;
  fields = 0;
  constructor(readonly bytes: Uint8Array) {}

  take(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || length > this.bytes.length - this.offset) throw new Error("Truncated Protobuf field.");
    const result = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }

  varint(): bigint {
    let result = 0n;
    for (let i = 0; i < 10; i++) {
      const byte = this.take(1)[0];
      if (byte === undefined || (i === 9 && byte > 1)) throw new Error("Invalid 64-bit varint.");
      result |= BigInt(byte & 127) << BigInt(i * 7);
      if (byte < 128) return result;
    }
    throw new Error("Unterminated varint.");
  }

  tag(): { field: number; wire: number } {
    if (++this.fields > 1024) throw new Error("Too many Protobuf fields.");
    const tag = this.varint();
    if (tag > 0xffffffffn || tag < 8n) throw new Error("Invalid Protobuf field tag.");
    return { field: Number(tag >> 3n), wire: Number(tag & 7n) };
  }

  skip(field: number, wire: number, depth = 0): void {
    switch (wire) {
      case 0: this.varint(); return;
      case 1: this.take(8); return;
      case 2: this.take(Number(this.varint())); return;
      case 5: this.take(4); return;
      case 3: {
        if (depth >= 16) throw new Error("Protobuf group nesting exceeds the limit.");
        while (this.offset < this.bytes.length) {
          const next = this.tag();
          if (next.wire === 4) {
            if (next.field !== field) throw new Error("Mismatched Protobuf group.");
            return;
          }
          this.skip(next.field, next.wire, depth + 1);
        }
        throw new Error("Unclosed Protobuf group.");
      }
      default: throw new Error("Invalid Protobuf wire type.");
    }
  }
}

export function decodePerson(bytes: Uint8Array): Person {
  if (bytes.length > limits.binaryBytes) throw new Error("Protobuf message exceeds the byte limit.");
  const reader = new WireReader(bytes);
  let name = "", age = 0, email = "";
  const hobbies: string[] = [];
  while (reader.offset < bytes.length) {
    const { field, wire } = reader.tag();
    if (field >= 1 && field <= 4) {
      if (wire !== (field === 2 ? 0 : 2)) throw new Error("Wrong wire type for Person field.");
      if (field === 2) age = Number(BigInt.asIntN(32, reader.varint()));
      else {
        const length = Number(reader.varint());
        if (length > limits.stringBytes) throw new Error("Protobuf string exceeds the byte limit.");
        const text = fromUtf8.decode(reader.take(length));
        if (field === 1) name = text;
        if (field === 3) email = text;
        if (field === 4) {
          if (hobbies.length >= limits.hobbies) throw new Error("Too many hobbies.");
          hobbies.push(text);
        }
      }
    } else reader.skip(field, wire);
  }
  return validatePerson({ name, age, email, hobbies });
}

export function equalPeople(left: Person, right: Person): boolean {
  return left.name === right.name && left.age === right.age && left.email === right.email &&
    left.hobbies.length === right.hobbies.length && left.hobbies.every((hobby, i) => hobby === right.hobbies[i]);
}

export function checkRoundTrips(input: Person, json: Person, protobuf: Person): readonly RoundTripCheck[] {
  const checks: RoundTripCheck[] = [
    { id: "json-roundtrip", status: equalPeople(input, json) ? "pass" : "fail", detail: "JSON preserves every supported value." },
    { id: "protobuf-roundtrip", status: equalPeople(input, protobuf) ? "pass" : "fail", detail: "Protobuf preserves every supported value after restoring defaults." },
    { id: "encodings-agree", status: equalPeople(json, protobuf) ? "pass" : "fail", detail: "Both decoded records agree, including hobby order." },
  ];
  return Object.freeze(checks.map((check) => Object.freeze({ ...check, detail: check.status === "pass" ? check.detail : `${check.id}: decoded values differ.` })));
}

export function hexDump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const cells = Array.from(bytes.subarray(i, i + 16), (byte) => byte.toString(16).padStart(2, "0"));
    lines.push(`${i.toString(16).padStart(4, "0")}  ${cells.join(" ")}`);
  }
  return lines.join("\n");
}

export function evaluateSerialization(inputJson: string, runId = 1): SerializationResult {
  if (!Number.isSafeInteger(runId) || runId < 1) throw new Error("Invalid run ID.");
  const input = parsePerson(inputJson);
  const text = JSON.stringify(input);
  const jsonBytes = utf8.encode(text);
  const protobufBytes = encodePerson(input);
  const jsonDecoded = validatePerson(JSON.parse(fromUtf8.decode(jsonBytes)));
  const protobufDecoded = decodePerson(protobufBytes);
  return Object.freeze({
    kind: "completed", protocolVersion: 1, challengeId: serializationChallenge.id, challengeVersion: 1,
    schemaId: serializationChallenge.schemaId, measurement: "browser-js-compact-json-vs-protobuf-binary", runId, input,
    json: Object.freeze({ byteLength: jsonBytes.length, text, hex: hexDump(jsonBytes), decoded: jsonDecoded }),
    protobuf: Object.freeze({ byteLength: protobufBytes.length, hex: hexDump(protobufBytes), decoded: protobufDecoded }),
    checks: checkRoundTrips(input, jsonDecoded, protobufDecoded),
  });
}
