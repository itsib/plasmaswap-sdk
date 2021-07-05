import { BigintIsh } from '../constants/constants';
import { Currency, Token } from '../entities/currency';
import { NativeAmount, TokenAmount } from '../amounts/currency-amount';

export function toCurrencyAmount(currency: Currency, amount: BigintIsh): NativeAmount | TokenAmount {
  if (currency instanceof Token) {
    return new TokenAmount(currency, amount);
  }
  return NativeAmount.native(currency, amount);
}
