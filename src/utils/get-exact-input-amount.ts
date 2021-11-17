import { BigNumber } from '@ethersproject/bignumber';
import Big from 'big.js';

/**
 * Tries to find the exact amount field in the transaction data
 * @param inputAmount
 * @param data
 */
export function getExactInputAmount(inputAmount: string, data: string): string {
  for (let i = 0; i < 10; i++) {
    const deviation = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 === 1 ? 1 : -1);
    const amount = BigNumber.from(inputAmount).add(`${deviation}`);
    const amountHex = amount.toHexString().substr(2);
    if (data.includes(amountHex)) {
      return amount.toString();
    }
  }
  return Big(inputAmount).times('1.0001').toFixed(0);
}
