import JSBI from 'jsbi';
import { ChainId, SolidityType } from '../constants/constants';
import { validateSolidityTypeInstance } from '../utils';

/**
 * A currency is any fungible financial instrument on Ethereum, including Ether, Matic and all ERC20 tokens.
 *
 * The only instance of the base class `Currency` is Ether or Matic.
 */
export class Currency {
  public readonly decimals: number;
  public readonly symbol?: string;
  public readonly name?: string;

  public static readonly ETHER: Currency = new Currency(18, 'ETH', 'Ethereum');

  public static readonly MATIC: Currency = new Currency(18, 'MATIC', 'Matic');

  public static readonly NATIVE: { [chainId in ChainId]: Currency } = {
    [ChainId.MAINNET]: Currency.ETHER,
    [ChainId.KOVAN]: Currency.ETHER,
    [ChainId.ROPSTEN]: Currency.ETHER,
    [ChainId.RINKEBY]: Currency.ETHER,
    [ChainId.GÖRLI]: Currency.ETHER,
    [ChainId.MATIC]: Currency.MATIC,
    [ChainId.MUMBAI]: Currency.MATIC,
  };

  /**
   * Constructs an instance of the base class `Currency`. The only instance of the base class `Currency` is `Currency.ETHER`.
   * @param decimals decimals of the currency
   * @param symbol symbol of the currency
   * @param name of the currency
   */
  protected constructor(decimals: number, symbol?: string, name?: string) {
    validateSolidityTypeInstance(JSBI.BigInt(decimals), SolidityType.uint8);

    this.decimals = decimals;
    this.symbol = symbol;
    this.name = name;
  }

  public static getNative(chainId?: ChainId): Currency {
    if (!chainId) {
      throw Error(`No chainId ${chainId}`);
    }
    if (!(chainId in Currency.NATIVE)) {
      throw Error(`No native currency defined for chainId ${chainId}`);
    }
    return Currency.NATIVE[chainId];
  }

  public static getNativeSymbol(chainId?: ChainId): string | undefined {
    const nativeCurrency = this.getNative(chainId);
    return nativeCurrency.symbol;
  }

  public static getNativeName(chainId?: ChainId): string | undefined {
    const nativeCurrency = this.getNative(chainId);
    return nativeCurrency.name;
  }
}

const NATIVE = Currency.NATIVE;

export { NATIVE };
