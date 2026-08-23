/**
 * FNV-1a over raw bytes. Used to fingerprint a physics snapshot so that two
 * runs — on two machines, in two browsers — can be compared cheaply.
 *
 * This is the mechanical check behind architecture rule 2. It is not a
 * cryptographic hash and must never be used as one.
 */
export function hashBytes(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i] as number;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
