import invariant from 'tiny-invariant';
import { CurrencyAmount, Fraction, Percent, Price } from '../../amounts';
import { ONE, TradeType, ZERO } from '../../constants/constants';
import { toCurrencyAmount } from '../../utils';

export abstract class BaseTrade {
  /**
   * The type of the trade, either exact in or exact out.
   */
  public readonly tradeType: TradeType;
  /**
   * The input amount for the trade assuming no slippage.
   */
  public readonly inputAmount: CurrencyAmount;
  /**
   * The output amount for the trade assuming no slippage.
   */
  public readonly outputAmount: CurrencyAmount;
  /**
   * The price expressed in terms of output amount/input amount.
   */
  public readonly executionPrice: Price;

  protected constructor(tradeType: TradeType, inputAmount: CurrencyAmount, outputAmount: CurrencyAmount) {
    this.tradeType = tradeType;
    this.inputAmount = inputAmount;
    this.outputAmount = outputAmount;
    this.executionPrice = new Price(this.inputAmount.currency, this.outputAmount.currency, this.inputAmount.raw, this.outputAmount.raw);
  }

  /**
   * Get the minimum amount that must be received from this trade for the given slippage tolerance
   * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
   */
  public minimumAmountOut(slippageTolerance: Percent): CurrencyAmount {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');

    if (this.tradeType === TradeType.EXACT_OUTPUT || this.tradeType === TradeType.LIMIT) {
      return this.outputAmount;
    } else {
      const slippageAdjustedAmountOut = new Fraction(ONE)
        .add(slippageTolerance)
        .invert()
        .multiply(this.outputAmount.raw).quotient;

      return toCurrencyAmount(this.outputAmount.currency, slippageAdjustedAmountOut);
    }
  }

  /**
   * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
   * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
   */
  public maximumAmountIn(slippageTolerance: Percent): CurrencyAmount {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');
    if (this.tradeType === TradeType.EXACT_INPUT || this.tradeType === TradeType.LIMIT) {
      return this.inputAmount;
    } else {
      const slippageAdjustedAmountIn = new Fraction(ONE).add(slippageTolerance).multiply(this.inputAmount.raw).quotient;

      return toCurrencyAmount(this.inputAmount.currency, slippageAdjustedAmountIn);
    }
  }
}
