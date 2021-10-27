import { CurrencyAmount, Percent } from '../../amounts';

export abstract class BaseTrade {
  public abstract minimumAmountOut(slippageTolerance: Percent): CurrencyAmount;
  public abstract maximumAmountIn(slippageTolerance: Percent): CurrencyAmount;
}
