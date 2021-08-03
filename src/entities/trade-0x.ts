import { BigNumber } from '@ethersproject/bignumber';
import { TransactionRequest } from '@ethersproject/providers';
import Big from 'big.js';
import invariant from 'tiny-invariant';
import { CurrencyAmount, Fraction, isCurrencyAmount, Percent, Price } from '../amounts';
import { NativeAmount } from '../amounts/currency-amount';
import { ChainId, ONE, SUPPORTED_0X_CHAINS, Trade0xLiquiditySource, TradeType, ZERO, ZERO_ADDRESS } from '../constants/constants';
import { fetch0xQuote, fetchNativePriceInUsd, FetchQuoteQuery, toCurrencyAmount } from '../utils';
import { Currency, isCurrency, Token } from './currency';

export interface Trade0xOptions {
  /**
   * From (Sell, Input) currency
   */
  from: CurrencyAmount | Currency;
  /**
   * To (Buy, Output) currency
   */
  to: CurrencyAmount | Currency;
  /**
   * (Optional) The maximum acceptable slippage in % of the buyToken
   * amount if sellAmount is provided, the maximum acceptable slippage
   * in % of the sellAmount amount if inputAmount is provided.
   * This parameter will change over time with market conditions.
   */
  slippagePercentage?: string;
  /**
   * (Optional, defaults to ethgasstation "fast") The target gas price (in wei)
   * for the swap transaction. If the price is too low to achieve
   * the quote, an error will be returned.
   */
  gasPrice?: string;
  /**
   * (Optional) Liquidity sources (Eth2Dai, Uniswap, Kyber, 0x, LiquidityProvider etc)
   * that will not be included in the provided quote.
   */
  excludedSources?: Trade0xLiquiditySource[];
}

export interface Trade0xProportion {
  /**
   * Liquidity source provider info
   */
  name: Trade0xLiquiditySource;
  /**
   * In percentage
   */
  proportion: number;
}

export class Trade0x {
  public readonly tradeType: TradeType;

  public readonly inputAmount: CurrencyAmount;

  public readonly inputAmountInUsd?: string;

  public readonly outputAmount: CurrencyAmount;

  public readonly outputAmountInUsd?: string;

  public readonly executionPrice: Price;

  public readonly networkFee: CurrencyAmount;

  public readonly networkFeeInUsd?: string;

  public readonly tradeFee: CurrencyAmount;

  public readonly tradeFeeInUsd?: string;

  public readonly allowanceTarget?: string;

  public readonly proportions: Trade0xProportion[];

  public readonly priceImpact?: Percent;

  /**
   * Saved settings with which the trade was created
   * @private
   */
  private readonly _optsSlippagePercentage?: string;
  private readonly _optsExcludedSources?: Trade0xLiquiditySource[];

  public static async getTrade(opts: Trade0xOptions, abort?: AbortSignal): Promise<Trade0x> {
    invariant((isCurrencyAmount(opts.from) && isCurrency(opts.to)) || (isCurrency(opts.from) && isCurrencyAmount(opts.to)), 'One of from or to amount should be passed');

    const chainId: ChainId = isCurrency(opts.from) ? (opts.from as Currency).chainId : (opts.to as Currency).chainId;
    invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');

    const tradeType = isCurrencyAmount(opts.from) ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT;
    const toCurrency = isCurrency(opts.to) ? (opts.to as Currency) : (opts.to as CurrencyAmount).currency;
    const fromCurrency = isCurrency(opts.from) ? (opts.from as Currency) : (opts.from as CurrencyAmount).currency;

    const query: FetchQuoteQuery = {
      buyToken: toCurrency instanceof Token ? toCurrency.address : (toCurrency.symbol as string),
      sellToken: fromCurrency instanceof Token ? fromCurrency.address : (fromCurrency.symbol as string),
      buyAmount: isCurrencyAmount(opts.to) ? (opts.to as CurrencyAmount).raw.toString() : undefined,
      sellAmount: isCurrencyAmount(opts.from) ? (opts.from as CurrencyAmount).raw.toString() : undefined,
      slippagePercentage: opts.slippagePercentage,
      gasPrice: opts.gasPrice,
      excludedSources: opts.excludedSources?.join(','),
    };

    const [prices, nativeCurrencyPrice] = await Promise.all([fetch0xQuote(chainId, true, query, abort), fetchNativePriceInUsd(chainId, abort)]);

    const networkFee = NativeAmount.native(
      chainId,
      Big(prices.gasPrice)
        .times(prices.gas)
        .toString(),
    );
    const protocolFee = NativeAmount.native(chainId, prices.protocolFee);
    const proportions = prices.sources.filter(i => !!Number(i.proportion)).map(i => ({ name: i.name, proportion: Number(i.proportion) * 100 }));
    const inputAmount = toCurrencyAmount(fromCurrency, prices.sellAmount);
    const outputAmount = toCurrencyAmount(toCurrency, prices.buyAmount);

    let rates: { inputToNative?: string; outputToNative?: string; nativeToUsd?: string } | undefined = undefined;
    if (nativeCurrencyPrice) {
      rates = {
        nativeToUsd: nativeCurrencyPrice.toString(),
      };
      if (prices.buyTokenToEthRate) {
        rates.outputToNative = prices.buyTokenToEthRate;
      }
      if (prices.sellTokenToEthRate) {
        rates.inputToNative = prices.sellTokenToEthRate;
      }
    }

    return new Trade0x(
      tradeType,
      inputAmount,
      outputAmount,
      networkFee,
      protocolFee,
      proportions,
      prices.allowanceTarget && prices.allowanceTarget !== ZERO_ADDRESS ? prices.allowanceTarget : undefined,
      rates,
      opts.slippagePercentage,
      opts.excludedSources,
    );
  }

  constructor(
    tradeType: TradeType,
    inputAmount: CurrencyAmount,
    outputAmount: CurrencyAmount,
    networkFee: CurrencyAmount,
    tradeFee: CurrencyAmount,
    proportions: Trade0xProportion[],
    allowanceTarget?: string,
    rates?: {
      inputToNative?: string;
      outputToNative?: string;
      nativeToUsd?: string;
    },
    slippagePercentage?: string,
    excludedSources?: Trade0xLiquiditySource[],
  ) {
    this.tradeType = tradeType;
    this.inputAmount = inputAmount;
    this.outputAmount = outputAmount;
    this.networkFee = networkFee;
    this.tradeFee = tradeFee;
    this.proportions = proportions;
    this.allowanceTarget = allowanceTarget;
    this.executionPrice = new Price(this.inputAmount.currency, this.outputAmount.currency, this.inputAmount.raw, this.outputAmount.raw);

    this._optsSlippagePercentage = slippagePercentage;
    this._optsExcludedSources = excludedSources;

    if (rates && rates.nativeToUsd) {
      if (rates.inputToNative) {
        this.inputAmountInUsd = Big(this.inputAmount.toExact())
          .div(rates.inputToNative)
          .times(rates.nativeToUsd)
          .toString();
      }

      if (rates.outputToNative) {
        this.outputAmountInUsd = Big(this.outputAmount.toExact())
          .div(rates.outputToNative)
          .times(rates.nativeToUsd)
          .toString();
      }

      if (this.inputAmountInUsd && this.outputAmountInUsd) {
        const denominator = '100';
        const numerator = Big(100)
          .times(Big(this.outputAmountInUsd).div(Big(this.inputAmountInUsd)))
          .minus(100)
          .times(denominator)
          .toFixed(0);
        this.priceImpact = new Percent(numerator, denominator);
      }

      this.networkFeeInUsd = Big(this.networkFee.toExact())
        .times(rates.nativeToUsd)
        .toString();

      this.tradeFeeInUsd = Big(this.tradeFee.toExact())
        .div(Big(10).pow(18))
        .times(rates.nativeToUsd)
        .toString();
    }
  }

  /**
   * Get the minimum amount that must be received from this trade for the given slippage tolerance
   * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
   */
  public minimumAmountOut(slippageTolerance: Percent): CurrencyAmount {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');

    if (this.tradeType === TradeType.EXACT_OUTPUT) {
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
    if (this.tradeType === TradeType.EXACT_INPUT) {
      return this.inputAmount;
    } else {
      const slippageAdjustedAmountIn = new Fraction(ONE).add(slippageTolerance).multiply(this.inputAmount.raw).quotient;

      return toCurrencyAmount(this.inputAmount.currency, slippageAdjustedAmountIn);
    }
  }

  /**
   * Returns transaction data
   */
  public async getTransactionData(account?: string): Promise<TransactionRequest> {
    const chainId = this.inputAmount.currency.chainId;
    const query: FetchQuoteQuery = {
      buyToken: this.outputAmount.currency instanceof Token ? this.outputAmount.currency.address : (this.outputAmount.currency.symbol as string),
      sellToken: this.inputAmount.currency instanceof Token ? this.inputAmount.currency.address : (this.inputAmount.currency.symbol as string),
      buyAmount: this.tradeType === TradeType.EXACT_INPUT ? undefined : this.outputAmount.raw.toString(10),
      sellAmount: this.tradeType === TradeType.EXACT_INPUT ? this.inputAmount.raw.toString(10) : undefined,
      slippagePercentage: this._optsSlippagePercentage,
      excludedSources: this._optsExcludedSources?.join(','),
      takerAddress: account,
    };
    return fetch0xQuote(chainId, false, query).then(quote => {
      return {
        to: quote.to,
        from: account,
        nonce: undefined,

        gasLimit: BigNumber.from(quote.gas),
        gasPrice: BigNumber.from(quote.gasPrice),

        data: quote.data,
        value: BigNumber.from(quote.value),
        chainId: quote.chainId,
      };
    });
  }
}
