import { SUPPORTED_0X_CHAINS, ChainId } from '../constants/constants';
import invariant from 'tiny-invariant';

const OX_URL_PREFIXES: { [chainId in ChainId]?: string } = {
  [ChainId.MAINNET]: '',
  [ChainId.MATIC]: 'polygon.',
  [ChainId.KOVAN]: 'kovan.',
  [ChainId.ROPSTEN]: 'ropsten.',
};

export function get0xApiUrl(chainId: ChainId): string {
  invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');
  return `https://${OX_URL_PREFIXES[chainId] || ''}api.0x.org`;
}
