export interface HexLine {
  offset: string;
  hex: string;
  ascii: string;
}

export function hexDump(bytes: Uint8Array, baseOffset: number): HexLine[] {
  const lines: HexLine[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const slice = bytes.slice(i, i + 16);
    const offset = (baseOffset + i).toString(16).padStart(8, "0");

    const hexParts: string[] = [];
    for (let j = 0; j < 16; j++) {
      if (j < slice.length) {
        hexParts.push(slice[j].toString(16).padStart(2, "0"));
      } else {
        hexParts.push("  ");
      }
    }
    const hex = hexParts.slice(0, 8).join(" ") + "  " + hexParts.slice(8).join(" ");

    let ascii = "";
    for (let j = 0; j < slice.length; j++) {
      const b = slice[j];
      ascii += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".";
    }

    lines.push({ offset, hex, ascii });
  }
  return lines;
}
