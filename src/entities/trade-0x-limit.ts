import invariant from 'tiny-invariant';
import { CurrencyAmount, Percent, Price, TokenAmount } from '../amounts';
import { ChainId, SUPPORTED_0X_CHAINS, ZERO } from '../constants/constants';
import { BaseTrade } from '../types';
import { toCurrencyAmount } from '../utils';
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
  public readonly inputAmount: TokenAmount;

  public readonly outputAmount: TokenAmount;

  public readonly executionPrice: Price;

  private readonly _duration: number;
  private readonly _takerTokenFeeAmount?: TokenAmount;
  private readonly _feeRecipient?: string;

  public static getTrade(opts: Trade0xLimitOptions): Trade0xLimit {
    invariant(opts.inputAmount.currency.equals(opts.outputAmount.currency), "AMOUNT'S TOKENS IS EQUAL");

    const chainId: ChainId = opts.inputAmount.currency.chainId;
    invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');

    invariant(opts.duration > 0, 'Duration should be greater than zero');

    return new Trade0xLimit(opts.inputAmount, opts.outputAmount, opts.duration, opts.takerTokenFeeAmount, opts.feeRecipient);
  }

  constructor(inputAmount: TokenAmount, outputAmount: TokenAmount, duration: number, takerTokenFeeAmount?: TokenAmount, feeRecipient?: string) {
    super();
    this.inputAmount = inputAmount;
    this.outputAmount = outputAmount;
    this.executionPrice = new Price(this.inputAmount.currency, this.outputAmount.currency, this.inputAmount.raw, this.outputAmount.raw);
    this._duration = duration;
    this._takerTokenFeeAmount = takerTokenFeeAmount;
    this._feeRecipient = feeRecipient;
  }

  /**
   * Get the minimum amount that must be received from this trade for the given slippage tolerance
   * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
   */
  public minimumAmountOut(slippageTolerance: Percent): CurrencyAmount {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');
    return toCurrencyAmount(this.outputAmount.currency, this.outputAmount.raw.toString());
  }

  /**
   * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
   * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
   */
  public maximumAmountIn(slippageTolerance: Percent): CurrencyAmount {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');
    return toCurrencyAmount(this.inputAmount.currency, this.inputAmount.raw.toString());
  }

  /**
   * Construct new limit order
   * @param account
   */
  public getOrder(account: string): LimitOrder0x {
    const chainId: ChainId = this.inputAmount.currency.chainId;
    const timestamp = Math.floor(Date.now() / 1000) + this._duration;

    return new LimitOrder0x(chainId, account, this.inputAmount, this.outputAmount, timestamp, this._takerTokenFeeAmount, this._feeRecipient);
  }
}
