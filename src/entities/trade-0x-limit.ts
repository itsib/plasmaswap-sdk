import invariant from 'tiny-invariant';
import { TokenAmount } from '../amounts';
import { ChainId, SUPPORTED_0X_CHAINS, TradeType } from '../constants/constants';
import { BaseTrade } from '../types';
import { LimitOrder0x } from './limit-order-0x';

export interface Trade0xLimitOptions {
  inputAmount: TokenAmount;
  outputAmount: TokenAmount;
  /**
   * Limit order lifetime in seconds
   */
  duration: number;
  /**
   * Fee in taker tokens
   */
  takerTokenFeeAmount?: TokenAmount;
  /**
   * Address of fee recipient
   */
  feeRecipient?: string;
}

export class Trade0xLimit extends BaseTrade {
  private readonly _duration: number;
  private readonly _takerTokenFeeAmount?: TokenAmount;
  private readonly _feeRecipient?: string;

  public static getTrade(opts: Trade0xLimitOptions): Trade0xLimit {
    invariant(!opts.inputAmount.currency.equals(opts.outputAmount.currency), "AMOUNT'S TOKENS IS EQUAL");
    invariant(opts.inputAmount.currency.isToken, 'Only tokens amount is supported (inputAmount).');
    invariant(opts.outputAmount.currency.isToken, 'Only tokens amount is supported (outputAmount).');
    invariant(opts.inputAmount.greaterThan('0') && opts.outputAmount.greaterThan('0'), 'Both amounts should by greater than zero.');

    const chainId: ChainId = opts.inputAmount.currency.chainId;
    invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');

    invariant(opts.duration > 0, 'Duration should be greater than zero');

    return new Trade0xLimit(opts.inputAmount, opts.outputAmount, opts.duration, opts.takerTokenFeeAmount, opts.feeRecipient);
  }

  constructor(inputAmount: TokenAmount, outputAmount: TokenAmount, duration: number, takerTokenFeeAmount?: TokenAmount, feeRecipient?: string) {
    super(TradeType.LIMIT, inputAmount, outputAmount);
    this._duration = duration;
    this._takerTokenFeeAmount = takerTokenFeeAmount;
    this._feeRecipient = feeRecipient;
  }

  /**
   * Returns limit order lifetime in seconds
   */
  public getOrderDuration(): number {
    return this._duration;
  }

  /**
   * Returns order finish timestamp (From current moment)
   */
  public getOrderEstimate(): number {
    return Math.floor(Date.now() / 1000) + this._duration;
  }

  /**
   * Construct new limit order
   * @param account
   */
  public getOrder(account: string): LimitOrder0x {
    const chainId: ChainId = this.inputAmount.currency.chainId;
    return new LimitOrder0x(
      chainId,
      account,
      this.inputAmount as TokenAmount,
      this.outputAmount as TokenAmount,
      this.getOrderEstimate(),
      this._takerTokenFeeAmount,
      this._feeRecipient,
    );
  }
}
