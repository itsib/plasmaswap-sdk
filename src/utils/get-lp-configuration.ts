import { ChainId, LiquidityProvider, LP_CONFIGURATIONS, LpConfiguration } from '../constants/constants';

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
