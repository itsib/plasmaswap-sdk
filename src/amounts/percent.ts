import { _100, Rounding } from '../constants/constants';
import { Fraction } from './fraction';
import Big from 'big.js';

const _100_PERCENT = new Fraction(_100);

export class Percent extends Fraction {
  public toSignificant(significantDigits: number = 5, format?: object, rounding?: Rounding): string {
    return this.multiply(_100_PERCENT).toSignificant(significantDigits, format, rounding);
  }

  public toFixed(decimalPlaces: number = 2, format?: object, rounding?: Rounding): string {
    return this.multiply(_100_PERCENT).toFixed(decimalPlaces, format, rounding);
  }

  public toExact(): string {
    return new Big(this.numerator.toString()).div(this.denominator.toString()).toString();
  }
}
