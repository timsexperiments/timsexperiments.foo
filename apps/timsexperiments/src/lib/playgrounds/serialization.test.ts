import { describe, expect, it } from "bun:test";
import { checkRoundTrips, decodePerson, encodePerson, evaluateSerialization, parsePerson, validatePerson } from "./serialization";
import { starterJson, starterPerson } from "./registry";

// Independently transcribed from tag/length/value arithmetic, not our encoder.
// name: 0a + 0a bytes; age: 10 03; email: 1a + 19 hex bytes (25 decimal);
// hobbies: 22 + lengths 08, 06, 07. Wire reference:
// https://protobuf.dev/programming-guides/encoding/
const pixelHex = "0a0a506978656c20f09f90b610031a19706978656c4074696d736578706572696d656e74732e666f6f2208736c656570696e672206656174696e672207706c6179696e67";
const empty = { name: "", age: 0, email: "", hobbies: [] };
function bytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
}
function toHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function run(value: unknown) { return evaluateSerialization(JSON.stringify(value)); }

describe("Person wire fixtures", () => {
  it("matches every independently specified starter byte", () => {
    expect(toHex(encodePerson(starterPerson))).toBe(pixelHex);
    expect(decodePerson(bytes(pixelHex))).toEqual(starterPerson);
    const result = evaluateSerialization(starterJson);
    expect([result.json.byteLength, result.protobuf.byteLength]).toEqual([107, 68]);
    expect(result.checks.every((check) => check.status === "pass")).toBe(true);
    expect(Object.isFrozen(result.input.hobbies)).toBe(true);
  });
  it("restores omitted scalar defaults and preserves empty repeated strings", () => {
    expect([run(empty).json.byteLength, run(empty).protobuf.byteLength]).toEqual([43, 0]);
    expect(decodePerson(new Uint8Array())).toEqual(empty);
    expect(toHex(encodePerson({ ...empty, hobbies: ["", ""] }))).toBe("22002200");
    expect(run({ ...empty, hobbies: ["", ""] }).protobuf.decoded.hobbies).toEqual(["", ""]);
  });
  it.each([
    [1, "1001"], [127, "107f"], [128, "108001"], [150, "109601"],
    [2147483647, "10ffffffff07"], [-1, "10ffffffffffffffffff01"],
    [-2147483648, "1080808080f8ffffffff01"],
  ])("encodes int32 %d with its golden bytes", (age, fixture) => {
    expect(toHex(encodePerson({ ...empty, age }))).toBe(fixture);
    expect(decodePerson(bytes(fixture)).age).toBe(age);
  });
  it("counts UTF-8 bytes and retains combining marks, BOM, emoji and duplicates", () => {
    const person = { name: "\ufeff🐶 e\u0301 中文", age: -2, email: " \n\u0000 ", hobbies: ["🐈", "🐈", ""] };
    const result = run(person);
    expect(result.protobuf.decoded).toEqual(person);
    expect(result.json.decoded).toEqual(person);
    expect(result.json.byteLength).toBe(new TextEncoder().encode(result.json.text).length);
    expect(result.json.byteLength).toBeGreaterThan(result.json.text.length);
  });
  it("normalizes negative zero and editor formatting/escapes", () => {
    expect(Object.is(run({ ...empty, age: -0 }).input.age, -0)).toBe(false);
    const escaped = '{"hobbies":["sleeping","eating","playing"],"email":"pixel@timsexperiments.foo","age":3,"name":"Pixel \\ud83d\\udc36"}';
    expect(evaluateSerialization(escaped).protobuf).toEqual(evaluateSerialization(starterJson).protobuf);
  });
  it("skips unknown wire fields and groups, and follows last-scalar-wins", () => {
    const extra = "2896013100000000000000003a0361626345000000004b50014c";
    expect(decodePerson(bytes(pixelHex + extra))).toEqual(starterPerson);
    expect(decodePerson(bytes("10011002")).age).toBe(2);
  });
  it.each(["00", "0f", "0a02ff", "0a01ff", "1080", "0a", "0b", "4b54", "4b", "14", "10ffffffffffffffffffff02", "2800".repeat(1025)])("rejects malformed wire data %#", (fixture) => {
    expect(() => decodePerson(bytes(fixture))).toThrow();
  });
  it("exposes real failed checks for a decoder mismatch", () => {
    const checks = checkRoundTrips(starterPerson, starterPerson, { ...starterPerson, age: 42 });
    expect(checks.map((check) => check.status)).toEqual(["pass", "fail", "fail"]);
  });
});

describe("bounded data validation", () => {
  it.each([null, [], true, 3, "hello", {}, { ...empty, extra: 1 }, { name: "", age: 0, hobbies: [] },
    { ...empty, name: null }, { ...empty, hobbies: [null] }, { ...empty, hobbies: "hi" },
    { ...empty, age: 1.1 }, { ...empty, age: "3" }, { ...empty, age: 2147483648 },
    { ...empty, age: -2147483649 }, { ...empty, age: Infinity }, { ...empty, age: NaN },
    { ...empty, name: "\ud800" }, { ...empty, email: "\udfff" }, { ...empty, hobbies: ["\ud800a"] },
  ].map((value) => ({ value })))("rejects unsupported input %#", ({ value }) => {
    expect(() => validatePerson(value)).toThrow();
  });
  it("rejects special keys and malformed JSON without echoing visitor input", () => {
    expect(() => parsePerson('{"name":"","age":0,"email":"","hobbies":[],"__proto__":{}}')).toThrow("unknown keys");
    expect(() => parsePerson("{oops}")).toThrow("Invalid JSON");
    expect(() => parsePerson('{"name":"","age":1e999,"email":"","hobbies":[]}')).toThrow("integer");
    expect(() => validatePerson(Object.create(empty))).toThrow("Include all four");
  });
  it("accepts exact field limits and rejects the next byte/item", () => {
    expect(run({ ...empty, name: "🐶".repeat(256) }).protobuf.decoded.name).toBe("🐶".repeat(256));
    expect(() => run({ ...empty, name: "🐶".repeat(256) + "a" })).toThrow("1024");
    expect(run({ ...empty, hobbies: Array.from({ length: 32 }, () => "") }).input.hobbies).toHaveLength(32);
    expect(() => run({ ...empty, hobbies: Array.from({ length: 33 }, () => "") })).toThrow("32");
    expect(() => run({ ...empty, name: "a".repeat(1025) })).toThrow("1024");
  });
  it("bounds raw JSON by UTF-8 bytes before parsing", () => {
    const json = JSON.stringify(empty);
    expect(parsePerson(json + " ".repeat(16384 - json.length))).toEqual(empty);
    expect(() => parsePerson(json + " ".repeat(16385 - json.length))).toThrow("16,384");
    expect(() => parsePerson('"' + "🐶".repeat(5000) + '"')).toThrow("16,384");
  });
  it("preserves HTML-looking values as data and JSON key order stays fixed", () => {
    const result = run({ hobbies: [], email: "", age: 0, name: "<img src=x onerror=alert(1)>" });
    expect(result.protobuf.decoded.name).toBe("<img src=x onerror=alert(1)>");
    expect(Object.keys(result.input)).toEqual(["name", "age", "email", "hobbies"]);
  });
  it("handles string length varint boundaries", () => {
    expect(toHex(encodePerson({ ...empty, name: "a".repeat(127) })).slice(0, 4)).toBe("0a7f");
    expect(toHex(encodePerson({ ...empty, name: "a".repeat(128) })).slice(0, 6)).toBe("0a8001");
    expect(run({ ...empty, name: "a".repeat(128) }).checks.every((check) => check.status === "pass")).toBe(true);
  });
  it("rejects over-limit binary data and invalid run IDs", () => {
    expect(() => decodePerson(new Uint8Array(40001))).toThrow("limit");
    expect(() => evaluateSerialization(starterJson, 0)).toThrow("run ID");
  });
});
