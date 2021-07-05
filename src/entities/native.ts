import { ChainId } from 'constants/constants';
import invariant from 'tiny-invariant';
import { Currency } from 'types/currency';
import { AbstractCurrency } from './abstract-currency';
import { Token, WNATIVE } from './token';

/**
 * Represents the native currency of the chain on which it resides, e.g.
 */
export class Native extends AbstractCurrency {
  public readonly isNative: true = true;
  public readonly isToken: false = false;

  public static readonly NATIVE: { [chainId in ChainId]: Native } = {
    [ChainId.MAINNET]: new Native(ChainId.MAINNET, 18, 'ETH', 'Ethereum'),
    [ChainId.KOVAN]: new Native(ChainId.KOVAN, 18, 'ETH', 'Ethereum'),
    [ChainId.ROPSTEN]: new Native(ChainId.ROPSTEN, 18, 'ETH', 'Ethereum'),
    [ChainId.RINKEBY]: new Native(ChainId.RINKEBY, 18, 'ETH', 'Ethereum'),
    [ChainId.GÖRLI]: new Native(ChainId.GÖRLI, 18, 'ETH', 'Ethereum'),
    [ChainId.MATIC]: new Native(ChainId.MATIC, 18, 'MATIC', 'Matic'),
    [ChainId.MUMBAI]: new Native(ChainId.MUMBAI, 18, 'MATIC', 'Matic'),
  };

  protected constructor(chainId: ChainId, decimals: number, symbol?: string, name?: string) {
    super(chainId, decimals, symbol, name);
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId;
  }

  public wrapped(): Token {
    const wNative = WNATIVE[this.chainId];
    invariant(!!wNative, 'WRAPPED');
    return wNative;
  }

  public unwrapped(): Currency {
    return this;
  }
}

const NATIVE = Native.NATIVE;

export { NATIVE };
