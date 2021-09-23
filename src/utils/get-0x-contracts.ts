import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { ChainId } from '../constants/constants';

export function get0xExchangeProxyContract(chainId: ChainId): string | undefined {
  try {
    const { exchangeProxy } = getContractAddressesForChainOrThrow(chainId as any);
    return exchangeProxy;
  } catch (e) {
    return undefined;
  }
}

export function get0xExchangeContract(chainId: ChainId): string | undefined {
  try {
    const { exchange } = getContractAddressesForChainOrThrow(chainId as any);
    return exchange;
  } catch (e) {
    return undefined;
  }
}
