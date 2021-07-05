import { NativeAmount } from 'amounts/native-amount';
import { TokenAmount } from 'amounts/token-amount';

export type CurrencyAmount = NativeAmount | TokenAmount;
