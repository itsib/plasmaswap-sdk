import { Contract } from '@ethersproject/contracts';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider } from '@ethersproject/providers';
import ISwapPair from '../abis/swap-pair.json';
import { LiquidityProvider } from '../constants/constants';
import { Pair } from '../entities/pair';
import { Token } from '../entities/currency';
import { TokenAmount } from '../amounts/currency-amount';
import invariant from 'tiny-invariant';

/**
 * Fetches information about a pair and constructs a pair from the given two tokens.
 * @param tokenA first token
 * @param tokenB second token
 * @param lp
 * @param provider the provider to use to fetch the data
 */
export async function fetchPairData(tokenA: Token, tokenB: Token, lp: LiquidityProvider, provider = getDefaultProvider(getNetwork(tokenA.chainId))): Promise<Pair> {
  invariant(tokenA.chainId === tokenB.chainId, 'CHAIN_ID');

  const address = Pair.getAddress(tokenA, tokenB, lp);
  const [reserves0, reserves1] = await new Contract(address, ISwapPair, provider).getReserves();

  const balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0];

  return new Pair(new TokenAmount(tokenA, balances[0]), new TokenAmount(tokenB, balances[1]), lp);
}
