/** 1 Mbps = 1,000,000 bits/s = 125,000 bytes/s。用十進位，和電信單上的 Mbps 對得起來。 */
export const BYTES_PER_MBPS = 125_000

export function bytesPerSecond(mbps: number): number {
  return mbps * BYTES_PER_MBPS
}
