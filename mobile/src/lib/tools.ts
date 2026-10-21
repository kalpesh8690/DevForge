export type ToolName =
  | "JSON Format"
  | "JSON Minify"
  | "JSON to CSV"
  | "Base64 Encode"
  | "Base64 Decode"
  | "URL Encode"
  | "URL Decode"
  | "Text Stats"
  | "Line Compare"
  | "JWT Payload";

export const TOOL_NAMES: ToolName[] = [
  "JSON Format", "JSON Minify", "JSON to CSV", "Base64 Encode",
  "Base64 Decode", "URL Encode", "URL Decode", "Text Stats",
  "Line Compare", "JWT Payload"
];

function encodeBase64Utf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const hasB = i + 1 < bytes.length;
    const hasC = i + 2 < bytes.length;
    const b = hasB ? bytes[i + 1] : 0;
    const c = hasC ? bytes[i + 2] : 0;
    out += alphabet[a >> 2];
    out += alphabet[((a & 3) << 4) | (b >> 4)];
    out += hasB ? alphabet[((b & 15) << 2) | (c >> 6)] : "=";
    out += hasC ? alphabet[c & 63] : "=";
  }
  return out;
}

function decodeBase64Utf8(input: string): string {
  const normalized = input.replace(/\s/g, "");
  if (normalized.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
    throw new Error("Invalid Base64 input.");
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i += 4) {
    const a = alphabet.indexOf(normalized[i]);
    const b = alphabet.indexOf(normalized[i + 1]);
    const c = normalized[i + 2] === "=" ? 0 : alphabet.indexOf(normalized[i + 2]);
    const d = normalized[i + 3] === "=" ? 0 : alphabet.indexOf(normalized[i + 3]);
    bytes.push((a << 2) | (b >> 4));
    if (normalized[i + 2] !== "=") bytes.push(((b & 15) << 4) | (c >> 2));
    if (normalized[i + 3] !== "=") bytes.push(((c & 3) << 6) | d);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
}

function jsonToCsv(input: string): string {
  const rows: unknown = JSON.parse(input);
  if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new Error("Expected a JSON array of objects.");
  }
  const headers = [...new Set(rows.flatMap((row: Record<string, unknown>) => Object.keys(row)))];
  if (!headers.length) return "";
  const cell = (value: unknown) => {
    const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return [headers.map(cell).join(","), ...rows.map((row: Record<string, unknown>) => headers.map((key) => cell(row[key])).join(","))].join("\r\n");
}

export function textStats(input: string): string {
  return JSON.stringify({
    characters: input.length,
    charactersWithoutWhitespace: input.replace(/\s/g, "").length,
    words: (input.trim().match(/\S+/g) || []).length,
    lines: input.length ? input.split(/\r\n|\n|\r/).length : 0
  }, null, 2);
}

export function compareLines(left: string, right: string): string {
  const a = left.split(/\r\n|\n|\r/);
  const b = right.split(/\r\n|\n|\r/);
  if (a.length * b.length > 40000) throw new Error("Comparison is too large for mobile.");
  const rows: string[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] === b[i]) rows.push("  " + (a[i] ?? ""));
    else {
      if (a[i] !== undefined) rows.push("- " + a[i]);
      if (b[i] !== undefined) rows.push("+ " + b[i]);
    }
  }
  return rows.join("\n");
}

export function decodeJwtPayload(input: string): string {
  const parts = input.trim().split(".");
  if (parts.length !== 3) throw new Error("JWT must have three segments.");
  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.stringify(JSON.parse(decodeBase64Utf8(padded)), null, 2);
}

export function runTool(tool: ToolName, input: string, compare = ""): string {
  switch (tool) {
    case "JSON Format": return JSON.stringify(JSON.parse(input), null, 2);
    case "JSON Minify": return JSON.stringify(JSON.parse(input));
    case "JSON to CSV": return jsonToCsv(input);
    case "Base64 Encode": return encodeBase64Utf8(input);
    case "Base64 Decode": return decodeBase64Utf8(input);
    case "URL Encode": return encodeURIComponent(input);
    case "URL Decode": return decodeURIComponent(input);
    case "Text Stats": return textStats(input);
    case "Line Compare": return compareLines(input, compare);
    case "JWT Payload": return decodeJwtPayload(input);
  }
}
