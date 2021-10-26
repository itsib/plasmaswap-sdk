import { hexDataLength, hexDataSlice, hexValue, hexZeroPad, isHexString } from '@ethersproject/bytes';

const WORD_LENGTH = 32;

/**
 * Returns a hex formatted string. Results in a length of 32 bytes
 * @param value
 * @param length
 */
export function formatHexString(value: string, length: number = WORD_LENGTH): string {
  if (/^\d+$/.test(value)) {
    value = hexValue(BigInt(value));
  }
  if (!isHexString(value)) {
    throw new Error('Invalid value format');
  }

  return hexDataLength(value) < length ? hexZeroPad(value, length) : hexDataSlice(value, 0, length);
}
