import { Contract } from '@ethersproject/contracts';
import { getNetwork } from '@ethersproject/networks';
import { getDefaultProvider } from '@ethersproject/providers';
import IERC20 from 'abis/erc20.json';
import { ChainId } from 'constants/constants';
import { Token } from 'entities';

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
export async function fetchTokenData(chainId: ChainId, address: string, provider = getDefaultProvider(getNetwork(chainId)), symbol?: string, name?: string): Promise<Token> {
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
