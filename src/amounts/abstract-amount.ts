import { Fraction } from 'amounts/fraction';
import { NativeAmount } from 'amounts/native-amount';
import { TokenAmount } from 'amounts/token-amount';
import _Big from 'big.js';
import { BigintIsh, Rounding, SolidityType, TEN } from 'constants/constants';
import { WNATIVE } from 'entities';
import JSBI from 'jsbi';
import invariant from 'tiny-invariant';
import toFormat from 'toformat';
import { Currency } from 'types/currency';
import { CurrencyAmount } from 'types/currency-amount';
import { parseBigintIsh } from 'utils/parse-bigint-ish';
import { validateSolidityTypeInstance } from 'utils/validate-solidity-type-instance';

const Big = toFormat(_Big);

export abstract class AbstractAmount extends Fraction {
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
