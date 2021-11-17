import { BigNumber } from '@ethersproject/bignumber';

const RANGE_TO_CHECK = [0, 1, -1, 2, -2, 3, -3];

/**
 * Tries to find the exact amount field in the transaction data
 * @param inputAmount
 * @param data
 */
export function getExactInputAmount(inputAmount: string, data: string): string {
  for (let i = 0; i < RANGE_TO_CHECK.length; i++) {
    const amount = BigNumber.from(inputAmount).add(`${RANGE_TO_CHECK[i]}`);
    const amountHex = amount.toHexString().substr(2);
    if (data.includes(amountHex)) {
      return amount.toString();
    }
  }
  return inputAmount;
}
