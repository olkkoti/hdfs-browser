import type { ParsedAclEntry } from "../types/hdfs";

/**
 * Parse a single ACL entry string like "user:alice:rwx" or "default:group::r-x"
 */
export function parseAclEntry(entry: string): ParsedAclEntry {
  const parts = entry.split(":");
  let scope: "access" | "default" = "access";
  let type: string;
  let name: string;
  let permission: string;

  if (parts[0] === "default") {
    scope = "default";
    type = parts[1];
    name = parts[2];
    permission = parts[3];
  } else {
    type = parts[0];
    name = parts[1];
    permission = parts[2];
  }

  return {
    scope,
    type: type as ParsedAclEntry["type"],
    name: name || "",
    permission: permission || "",
  };
}

/**
 * Serialize a ParsedAclEntry back to a string like "user:alice:rwx"
 */
export function serializeAclEntry(entry: ParsedAclEntry): string {
  const prefix = entry.scope === "default" ? "default:" : "";
  return `${prefix}${entry.type}:${entry.name}:${entry.permission}`;
}

/**
 * Serialize entry without permissions (for removal operations).
 * Format: "user:alice:" — trailing colon required by WebHDFS REMOVEACLENTRIES.
 */
export function serializeAclEntryForRemoval(entry: ParsedAclEntry): string {
  const prefix = entry.scope === "default" ? "default:" : "";
  return `${prefix}${entry.type}:${entry.name}:`;
}

/**
 * Convert an octal digit (0-7) to rwx string
 */
function digitToRwx(digit: number): [boolean, boolean, boolean] {
  return [
    (digit & 4) !== 0,
    (digit & 2) !== 0,
    (digit & 1) !== 0,
  ];
}

/**
 * Convert octal string like "755" to a 3x3 boolean array [owner, group, other][r, w, x]
 */
export function octalToRwx(octal: string): [boolean, boolean, boolean][] {
  const padded = octal.padStart(3, "0");
  return [
    digitToRwx(parseInt(padded[0], 10) || 0),
    digitToRwx(parseInt(padded[1], 10) || 0),
    digitToRwx(parseInt(padded[2], 10) || 0),
  ];
}

/**
 * Convert 3x3 boolean array back to octal string
 */
export function rwxToOctal(rwx: [boolean, boolean, boolean][]): string {
  return rwx
    .map(([r, w, x]) => (r ? 4 : 0) + (w ? 2 : 0) + (x ? 1 : 0))
    .join("");
}

/**
 * Convert octal string to human-readable rwx string like "rwxr-xr-x"
 */
export function octalToRwxString(octal: string): string {
  const rwx = octalToRwx(octal);
  return rwx
    .map(([r, w, x]) => (r ? "r" : "-") + (w ? "w" : "-") + (x ? "x" : "-"))
    .join("");
}

/**
 * Check if an ACL entry is a base entry (unnamed user/group/other)
 */
export function isBaseEntry(entry: ParsedAclEntry): boolean {
  return entry.name === "" && (entry.type === "user" || entry.type === "group" || entry.type === "other");
}
