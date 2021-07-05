import { BigintIsh, ChainId } from 'constants/constants';
import { Native } from 'entities/native';
import JSBI from 'jsbi';
import invariant from 'tiny-invariant';
import { Currency } from 'types/currency';
import { AbstractAmount } from './abstract-amount';

export class NativeAmount extends AbstractAmount {
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
