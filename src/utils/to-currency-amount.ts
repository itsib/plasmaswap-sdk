import { BigintIsh } from 'constants/constants';
import { Currency } from 'types/currency';
import { NativeAmount } from 'amounts/native-amount';
import { Token } from 'entities/token';
import { TokenAmount } from 'amounts/token-amount';

export function toCurrencyAmount(currency: Currency, amount: BigintIsh): NativeAmount | TokenAmount {
  if (currency instanceof Token) {
    return new TokenAmount(currency, amount);
  }
  return NativeAmount.native(currency, amount);
}
