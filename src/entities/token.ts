import { ChainId } from 'constants/constants';
import { NATIVE } from 'entities/native';
import invariant from 'tiny-invariant';
import { Currency } from 'types/currency';
import { validateAndParseAddress } from 'utils/validate-and-parse-address';
import { AbstractCurrency } from './abstract-currency';

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

export const WNATIVE: { [chainId: number]: Token } = {
  [ChainId.MAINNET]: new Token(ChainId.MAINNET, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.ROPSTEN]: new Token(ChainId.ROPSTEN, '0xc778417E063141139Fce010982780140Aa0cD5Ab', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.RINKEBY]: new Token(ChainId.RINKEBY, '0xc778417E063141139Fce010982780140Aa0cD5Ab', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.GÖRLI]: new Token(ChainId.GÖRLI, '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.KOVAN]: new Token(ChainId.KOVAN, '0xd0A1E359811322d97991E03f863a0C30C2cF029C', 18, 'WETH', 'Wrapped Ether'),
  [ChainId.MATIC]: new Token(ChainId.MATIC, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 18, 'WMATIC', 'Wrapped Matic'),
  [ChainId.MUMBAI]: new Token(ChainId.MUMBAI, '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', 18, 'WMATIC', 'Wrapped Matic'),
};
