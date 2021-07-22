import invariant from 'tiny-invariant';
import { ChainId } from '../constants/constants';
import { validateAndParseAddress } from '../utils/validate-and-parse-address';

/**
 * A currency is any fungible financial instrument, including Ether, all ERC20 tokens, and other chain-native currencies
 */
export abstract class AbstractCurrency {
  /**
   * Returns whether the currency is native to the chain and must be wrapped (e.g. Ether)
   */
  public abstract readonly isNative: boolean;
  /**
   * Returns whether the currency is a token that is usable in Uniswap without wrapping
   */
  public abstract readonly isToken: boolean;

  /**
   * The chain ID on which this currency resides
   */
  public readonly chainId: ChainId;
  /**
   * The decimals used in representing currency amounts
   */
  public readonly decimals: number;
  /**
   * The symbol of the currency, i.e. a short textual non-unique identifier
   */
  public readonly symbol?: string;
  /**
   * The name of the currency, i.e. a descriptive textual non-unique identifier
   */
  public readonly name?: string;

  /**
   * Constructs an instance of the base class `BaseCurrency`.
   * @param chainId the chain ID on which this currency resides
   * @param decimals decimals of the currency
   * @param symbol symbol of the currency
   * @param name of the currency
   */
  protected constructor(chainId: ChainId, decimals: number, symbol?: string, name?: string) {
    invariant(Number.isSafeInteger(chainId), 'CHAIN_ID');
    invariant(decimals >= 0 && decimals < 255 && Number.isInteger(decimals), 'DECIMALS');

    this.chainId = chainId;
    this.decimals = decimals;
    this.symbol = symbol;
    this.name = name;
  }

  /**
   * Returns whether this currency is functionally equivalent to the other currency
   * @param other the other currency
   */
  public abstract equals(other: Currency): boolean;

  /**
   * Return the wrapped version of this currency that can be used with the Uniswap contracts. Currencies must
   * implement this to be used in Uniswap
   */
  public abstract wrapped(): Token;

  /**
   * Returns native version of currency (WETH => ETH)
   */
  public abstract unwrapped(): Currency;
}

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

/**
 * Represents an ERC20 token with a unique address and some metadata.
 */
export class Token extends AbstractCurrency {
  public readonly address: string;

  public readonly isNative: false = false;
  public readonly isToken: true = true;

  public constructor(chainId: ChainId, address: string, decimals: number, symbol?: string, name?: string) {
    super(chainId, decimals, symbol, name);
    this.address = validateAndParseAddress(address);
  }

  /**
   * Returns true if the two tokens are equivalent, i.e. have the same chainId and address.
   * @param other other token to compare
   */
  public equals(other: Currency): boolean {
    return other.isToken && this.chainId === other.chainId && this.address === other.address;
  }

  /**
   * Returns true if the address of this token sorts before the address of the other token
   * @param other other token to compare
   * @throws if the tokens have the same address
   * @throws if the tokens are on different chains
   */
  public sortsBefore(other: Token): boolean {
    invariant(this.chainId === other.chainId, 'CHAIN_IDS');
    invariant(this.address !== other.address, 'ADDRESSES');
    return this.address.toLowerCase() < other.address.toLowerCase();
  }

  /**
   * Return this token, which does not need to be wrapped
   */
  public wrapped(): Token {
    return this;
  }

  /**
   * Return this token, which does not need to be wrapped
   */
  public unwrapped(): Currency {
    if (this.equals(WNATIVE[this.chainId])) {
      return NATIVE[this.chainId];
    }
    return this;
  }
}

const NATIVE = Native.NATIVE;

export { NATIVE };

export const WNATIVE: { [chainId: number]: Token } = {
  [ChainId.MAINNET]: new Token(ChainId.MAINNET, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.ROPSTEN]: new Token(ChainId.ROPSTEN, '0xc778417E063141139Fce010982780140Aa0cD5Ab', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.RINKEBY]: new Token(ChainId.RINKEBY, '0xc778417E063141139Fce010982780140Aa0cD5Ab', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.GÖRLI]: new Token(ChainId.GÖRLI, '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.KOVAN]: new Token(ChainId.KOVAN, '0xd0A1E359811322d97991E03f863a0C30C2cF029C', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.MATIC]: new Token(ChainId.MATIC, '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', 18, 'WMATIC', 'Wrapped Matic'),
};

export type Currency = Native | Token;
