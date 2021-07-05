import _Big from 'big.js';
import JSBI from 'jsbi';
import invariant from 'tiny-invariant';
import toFormat from 'toformat';
import { BigintIsh, ChainId, Rounding, SolidityType, TEN } from '../constants/constants';
import { Currency, Native, Token, WNATIVE } from '../entities/currency';
import { parseBigintIsh } from '../utils/parse-bigint-ish';
import { validateSolidityTypeInstance } from '../utils/validate-solidity-type-instance';
import { Fraction } from './fraction';

const Big = toFormat(_Big);

abstract class AbstractCurrencyAmount extends Fraction {
  public readonly currency: Currency;

  protected constructor(currency: Currency, amount: BigintIsh) {
    const parsedAmount = parseBigintIsh(amount);
    validateSolidityTypeInstance(parsedAmount, SolidityType.uint256);

    super(parsedAmount, JSBI.exponentiate(TEN, JSBI.BigInt(currency.decimals)));

    this.currency = currency;
  }

  public abstract add(other: CurrencyAmount): CurrencyAmount;

  public abstract subtract(other: CurrencyAmount): CurrencyAmount;

  public wrapped(): TokenAmount {
    if (this instanceof TokenAmount) {
      return this;
    }
    return new TokenAmount(WNATIVE[this.currency.chainId], this.raw);
  }

  public unwrapped(): CurrencyAmount {
    if (this.currency.equals(WNATIVE[this.currency.chainId])) {
      return NativeAmount.native(this.currency.chainId, this.raw);
    }
    return this;
  }

  public toSignificant(significantDigits: number = 6, format?: object, rounding: Rounding = Rounding.ROUND_DOWN): string {
    return super.toSignificant(significantDigits, format, rounding);
  }

  public toFixed(decimalPlaces: number = this.currency.decimals, format?: object, rounding: Rounding = Rounding.ROUND_DOWN): string {
    invariant(decimalPlaces <= this.currency.decimals, 'DECIMALS');
    return super.toFixed(decimalPlaces, format, rounding);
  }

  public toExact(format: object = { groupSeparator: '' }): string {
    Big.DP = this.currency.decimals;
    return new Big(this.numerator.toString()).div(this.denominator.toString()).toFormat(format);
  }

  public get raw(): JSBI {
    return this.numerator;
  }
}

export class NativeAmount extends AbstractCurrencyAmount {
  /**
   * Helper that calls the constructor with the ETHER currency
   * @param chainId
   * @param amount ether amount in wei
   */
  public static native(chainId: ChainId, amount: BigintIsh): NativeAmount;
  public static native(currency: Native, amount: BigintIsh): NativeAmount;
  public static native(chainIdOrCurrency: Native | ChainId, amount: BigintIsh): NativeAmount {
    if (chainIdOrCurrency instanceof Native) {
      return new NativeAmount(chainIdOrCurrency, amount);
    } else {
      return new NativeAmount(Native.NATIVE[chainIdOrCurrency], amount);
    }
  }

  // amount _must_ be raw, i.e. in the native representation
  protected constructor(currency: Currency, amount: BigintIsh) {
    super(currency, amount);
  }

  public add(other: NativeAmount): NativeAmount {
    invariant(this.currency.equals(other.currency), 'TOKEN');
    return new NativeAmount(this.currency, JSBI.add(this.raw, other.raw));
  }

  public subtract(other: NativeAmount): NativeAmount {
    invariant(this.currency.equals(other.currency), 'TOKEN');
    return new NativeAmount(this.currency, JSBI.subtract(this.raw, other.raw));
  }
}

export class TokenAmount extends AbstractCurrencyAmount {
  public readonly token: Token;

  // amount _must_ be raw, i.e. in the native representation
  public constructor(token: Token, amount: BigintIsh) {
    super(token, amount);
    this.token = token;
  }

  public add(other: TokenAmount): TokenAmount {
    invariant(this.token.equals(other.token), 'TOKEN');
    return new TokenAmount(this.token, JSBI.add(this.raw, other.raw));
  }

  public subtract(other: TokenAmount): TokenAmount {
    invariant(this.token.equals(other.token), 'TOKEN');
    return new TokenAmount(this.token, JSBI.subtract(this.raw, other.raw));
  }
}

export type CurrencyAmount = NativeAmount | TokenAmount;
