import { hexDataLength, hexDataSlice, hexValue, hexZeroPad } from '@ethersproject/bytes';

const WORD_LENGTH = 32;

/**
 * Returns a hex formatted string. Results in a length of 32 bytes
 * @param value
 * @param length
 */
export function formatHexString(value: string, length: number = WORD_LENGTH): string {
  if (!value.startsWith('0x') && !isNaN(parseInt(value, 10))) {
    value = hexValue(+value);
  }

  return hexDataLength(value) < length ? hexZeroPad(value, length) : hexDataSlice(value, 0, length);
}
