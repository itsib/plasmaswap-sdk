import { getAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider } from '@ethersproject/providers';
import IERC20 from './abis/erc20.json';
import ISwapPair from './abis/swap-pair.json';
import {
  BigintIsh,
  ChainId,
  LiquidityProvider,
  LP_CONFIGURATIONS,
  LpConfiguration,
  ONE,
  SOLIDITY_TYPE_MAXIMA,
  SolidityType,
  THREE,
  TWO,
  ZERO,
} from './constants/constants';
import { Currency, CurrencyAmount, Pair, Token, TokenAmount } from './entities';
import JSBI from 'jsbi';
import invariant from 'tiny-invariant';
import warning from 'tiny-warning';

export function validateSolidityTypeInstance(value: JSBI, solidityType: SolidityType): void {
  invariant(JSBI.greaterThanOrEqual(value, ZERO), `${value} is not a ${solidityType}.`);
  invariant(JSBI.lessThanOrEqual(value, SOLIDITY_TYPE_MAXIMA[solidityType]), `${value} is not a ${solidityType}.`);
}

/**
 * Warns if addresses are not checksummed
 * @param address
 */
export function validateAndParseAddress(address: string): string {
  try {
    const checksummedAddress = getAddress(address);
    warning(address === checksummedAddress, `${address} is not checksummed.`);
    return checksummedAddress;
  } catch (error) {
    invariant(false, `${address} is not a valid address.`);
  }
}

/**
 * Convert raw amount, to currency amount
 * @param amount
 * @param currency
 */
export function toCurrencyAmount(currency: Currency, amount: BigintIsh): CurrencyAmount {
  if (currency instanceof Token) {
    return new TokenAmount(currency, amount);
  }
  return CurrencyAmount.native(currency, amount);
}

export function parseBigintIsh(bigintIsh: BigintIsh): JSBI {
  return bigintIsh instanceof JSBI ? bigintIsh : typeof bigintIsh === 'bigint' ? JSBI.BigInt(bigintIsh.toString()) : JSBI.BigInt(bigintIsh);
}

/**
 * Mock the on-chain sqrt function
 * @param y
 */
export function sqrt(y: JSBI): JSBI {
  validateSolidityTypeInstance(y, SolidityType.uint256);
  let z: JSBI = ZERO;
  let x: JSBI;
  if (JSBI.greaterThan(y, THREE)) {
    z = y;
    x = JSBI.add(JSBI.divide(y, TWO), ONE);
    while (JSBI.lessThan(x, z)) {
      z = x;
      x = JSBI.divide(JSBI.add(JSBI.divide(y, x), x), TWO);
    }
  } else if (JSBI.notEqual(y, ZERO)) {
    z = ONE;
  }
  return z;
}

/**
 * Given an array of items sorted by `comparator`, insert an item into its sort index and constrain the size to
 * `maxSize` by removing the last item
 * @param items
 * @param add
 * @param maxSize
 * @param comparator
 */
export function sortedInsert<T>(items: T[], add: T, maxSize: number, comparator: (a: T, b: T) => number): T | null {
  invariant(maxSize > 0, 'MAX_SIZE_ZERO');
  // this is an invariant because the interface cannot return multiple removed items if items.length exceeds maxSize
  invariant(items.length <= maxSize, 'ITEMS_SIZE');

  // short circuit first item add
  if (items.length === 0) {
    items.push(add);
    return null;
  } else {
    const isFull = items.length === maxSize;
    // short circuit if full and the additional item does not come before the last item
    if (isFull && comparator(items[items.length - 1], add) <= 0) {
      return add;
    }

    let lo = 0,
      hi = items.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (comparator(items[mid], add) <= 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    items.splice(lo, 0, add);
    return isFull ? items.pop()! : null;
  }
}

/**
 * Returns Liquidity pool contracts configuration
 * @param chainId
 * @param liquidityProvider
 */
export function getLpConfiguration(chainId?: ChainId, liquidityProvider?: LiquidityProvider): LpConfiguration | null {
  if (chainId === undefined || liquidityProvider === undefined) {
    return null;
  }
  return LP_CONFIGURATIONS[chainId][liquidityProvider] ?? null;
}

const TOKEN_DECIMALS_CACHE: { [chainId: number]: { [address: string]: number } } = {
  [ChainId.MAINNET]: {
    '0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A': 9, // DGD
  },
};

/**
 * Fetch information for a given token on the given chain, using the given ethers provider.
 * @param chainId chain of the token
 * @param address address of the token on the chain
 * @param provider provider used to fetch the token
 * @param symbol optional symbol of the token
 * @param name optional name of the token
 */
export async function fetchTokenData(
  chainId: ChainId,
  address: string,
  provider = getDefaultProvider(getNetwork(chainId)),
  symbol?: string,
  name?: string,
): Promise<Token> {
  // Get decimals, if cache is empty
  if (typeof TOKEN_DECIMALS_CACHE?.[chainId]?.[address] !== 'number') {
    const decimals: number = await new Contract(address, IERC20, provider).decimals();

    if (!TOKEN_DECIMALS_CACHE[chainId]) {
      TOKEN_DECIMALS_CACHE[chainId] = {};
    }

    TOKEN_DECIMALS_CACHE[chainId][address] = decimals;
  }

  return new Token(chainId, address, TOKEN_DECIMALS_CACHE[chainId][address], symbol, name);
}

/**
 * Fetches information about a pair and constructs a pair from the given two tokens.
 * @param tokenA first token
 * @param tokenB second token
 * @param lp
 * @param provider the provider to use to fetch the data
 */
export async function fetchPairData(
  tokenA: Token,
  tokenB: Token,
  lp: LiquidityProvider,
  provider = getDefaultProvider(getNetwork(tokenA.chainId)),
): Promise<Pair> {
  invariant(tokenA.chainId === tokenB.chainId, 'CHAIN_ID');

  const address = Pair.getAddress(tokenA, tokenB, lp);
  const [reserves0, reserves1] = await new Contract(address, ISwapPair, provider).getReserves();

  const balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0];

  return new Pair(new TokenAmount(tokenA, balances[0]), new TokenAmount(tokenB, balances[1]), lp);
}
