export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function isBinaryContent(bytes: Uint8Array): boolean {
  const checkLength = Math.min(bytes.length, 8192);
  for (let i = 0; i < checkLength; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}
