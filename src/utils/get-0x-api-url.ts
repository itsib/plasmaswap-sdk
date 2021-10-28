import { SUPPORTED_0X_CHAINS, ChainId } from '../constants/constants';
import invariant from 'tiny-invariant';

const OX_URL_PREFIXES: { [chainId in ChainId]?: string } = {
  [ChainId.MAINNET]: '',
  [ChainId.BSC]: 'bsc.',
  [ChainId.MATIC]: 'polygon.',
  [ChainId.KOVAN]: 'kovan.',
  [ChainId.ROPSTEN]: 'ropsten.',
};

/**
 * Returns API url by chain id
 * @param chainId
 * @param isWss - add wss://
 */
export function get0xApiUrl(chainId: ChainId, isWss: boolean = false): string {
  invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');
  return `${isWss ? 'wss' : 'https'}://${OX_URL_PREFIXES[chainId] || ''}api.0x.org`;
}
