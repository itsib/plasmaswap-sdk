import { SUPPORTED_0X_CHAINS, ChainId } from '../constants/constants';
import invariant from 'tiny-invariant';

const ZERO_EX_API_HOSTS: { [chainId in ChainId]?: string } = {
  [ChainId.MAINNET]: 'https://api.0x.org',
  [ChainId.BSC]: 'https://bsc.api.0x.org',
  [ChainId.MATIC]: 'https://polygon.api.0x.org',
  [ChainId.KOVAN]: 'https://kovan.api.0x.org',
  [ChainId.ROPSTEN]: 'https://ropsten.api.0x.org',
};

/**
 * Returns API url by chain id
 * @param chainId
 * @param isWss - add wss://
 */
export function get0xApiUrl(chainId: ChainId, isWss: boolean = false): string {
  invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');
  let host = ZERO_EX_API_HOSTS[chainId] as string;
  // Try to get host from env
  try {
    if (process?.env?.ZERO_EX_API_HOST) {
      host = process.env.ZERO_EX_API_HOST;
    }
  } catch (e) {}
  // Try to get host from window
  try {
    if ((window as any)?.ZERO_EX_API_HOST) {
      host = (window as any).ZERO_EX_API_HOST;
    }
  } catch (e) {}

  if (isWss) {
    host = host.replace(/^http(s?)/, 'ws$1');
  }

  return host;
}
