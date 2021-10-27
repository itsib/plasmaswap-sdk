import { BigNumber } from '@ethersproject/bignumber';
import { TransactionRequest } from '@ethersproject/providers';
import Big from 'big.js';
import invariant from 'tiny-invariant';
import { CurrencyAmount, Fraction, isCurrencyAmount, Percent, Price } from '../amounts';
import { NativeAmount } from '../amounts/currency-amount';
import { ChainId, ONE, SUPPORTED_0X_CHAINS, Trade0xLiquiditySource, TradeType, ZERO, ZERO_ADDRESS } from '../constants/constants';
import { BaseTrade } from '../types';
import { toCurrencyAmount } from '../utils';
import { fetch0xQuote, Fetch0xQuoteQuery } from '../api';
import { Currency, isCurrency, Token } from './currency';

export interface Trade0xSwapOptions {
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
  /**
   * (Optional) The ETH address that should receive affiliate fees specified with {@link buyTokenPercentageFee}.
   */
  feeRecipient?: string;
  /**
   * (Optional) The percentage (between 0 - 1.0) of the buyAmount that should be attributed to {@link feeRecipient} as
   * affiliate fees. Note that this requires that the {@link feeRecipient} parameter is also specified in the request.
   */
  buyTokenPercentageFee?: number;
  /**
   * (Optional) An ETH address for which to attribute the trade for tracking and analytics purposes.
   * Note {@link affiliateAddress} is only for tracking trades and has no impact on affiliate fees,
   * for affiliate fees use {@link feeRecipient}.
   */
  affiliateAddress?: string;
}

export interface Trade0xSwapProportion {
  /**
   * Liquidity source provider info
   */
  name: Trade0xLiquiditySource;
  /**
   * In percentage
   */
  proportion: number;
}

export class Trade0xSwap extends BaseTrade {
  public readonly tradeType: TradeType;

  public readonly inputAmount: CurrencyAmount;

  public readonly outputAmount: CurrencyAmount;

  public readonly executionPrice: Price;

  public readonly networkFee: CurrencyAmount;

  public readonly tradeFee: CurrencyAmount;

  public readonly allowanceTarget?: string;

  public readonly proportions: Trade0xSwapProportion[];

  public readonly priceImpact?: Percent;

  /**
   * Saved settings with which the trade was created
   * @private
   */
  private readonly _optsSlippagePercentage?: string;
  private readonly _optsExcludedSources?: Trade0xLiquiditySource[];
  private readonly _optsFeeRecipient?: string;
  private readonly _optsBuyTokenPercentageFee?: number;
  private readonly _optsAffiliateAddress?: string;

  public static async getTrade(opts: Trade0xSwapOptions, abort?: AbortSignal): Promise<Trade0xSwap> {
    invariant((isCurrencyAmount(opts.from) && isCurrency(opts.to)) || (isCurrency(opts.from) && isCurrencyAmount(opts.to)), 'One of from or to amount should be passed');

    if (opts.buyTokenPercentageFee !== undefined) {
      invariant(opts.buyTokenPercentageFee >= 0 && opts.buyTokenPercentageFee <= 1, 'buyTokenPercentageFee should be number between 0-1.0');
    }

    const chainId: ChainId = isCurrency(opts.from) ? (opts.from as Currency).chainId : (opts.to as Currency).chainId;
    invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');

    const tradeType = isCurrencyAmount(opts.from) ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT;
    const toCurrency = isCurrency(opts.to) ? (opts.to as Currency) : (opts.to as CurrencyAmount).currency;
    const fromCurrency = isCurrency(opts.from) ? (opts.from as Currency) : (opts.from as CurrencyAmount).currency;

    const query: Fetch0xQuoteQuery = {
      buyToken: toCurrency instanceof Token ? toCurrency.address : (toCurrency.symbol as string),
      sellToken: fromCurrency instanceof Token ? fromCurrency.address : (fromCurrency.symbol as string),
      buyAmount: isCurrencyAmount(opts.to) ? (opts.to as CurrencyAmount).raw.toString() : undefined,
      sellAmount: isCurrencyAmount(opts.from) ? (opts.from as CurrencyAmount).raw.toString() : undefined,
      slippagePercentage: opts.slippagePercentage,
      gasPrice: opts.gasPrice,
      excludedSources: opts.excludedSources?.join(','),
      feeRecipient: opts.feeRecipient,
      buyTokenPercentageFee: opts.buyTokenPercentageFee,
      affiliateAddress: opts.affiliateAddress,
    };

    const prices = await fetch0xQuote(chainId, true, query, abort);

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

    let rates: { inputToNative?: string; outputToNative?: string } = {};
    if (prices.buyTokenToEthRate && prices.buyTokenToEthRate !== '0') {
      rates.outputToNative = prices.buyTokenToEthRate;
    }
    if (prices.sellTokenToEthRate && prices.sellTokenToEthRate !== '0') {
      rates.inputToNative = prices.sellTokenToEthRate;
    }

    return new Trade0xSwap(
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
      opts.feeRecipient,
      opts.buyTokenPercentageFee,
      opts.affiliateAddress,
    );
  }

  constructor(
    tradeType: TradeType,
    inputAmount: CurrencyAmount,
    outputAmount: CurrencyAmount,
    networkFee: CurrencyAmount,
    tradeFee: CurrencyAmount,
    proportions: Trade0xSwapProportion[],
    allowanceTarget?: string,
    rates?: {
      inputToNative?: string;
      outputToNative?: string;
    },
    slippagePercentage?: string,
    excludedSources?: Trade0xLiquiditySource[],
    feeRecipient?: string,
    buyTokenPercentageFee?: number,
    affiliateAddress?: string,
  ) {
    super();
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
    this._optsFeeRecipient = feeRecipient;
    this._optsBuyTokenPercentageFee = buyTokenPercentageFee;
    this._optsAffiliateAddress = affiliateAddress;

    // Price impact calculation
    if (rates && rates.inputToNative && rates.outputToNative) {
      const inputAmountInNative = Big(this.inputAmount.toExact()).div(rates.inputToNative);
      const outputAmountInNative = Big(this.outputAmount.toExact()).div(rates.outputToNative);

      if (inputAmountInNative.gt(0) && outputAmountInNative.gt(0)) {
        const denominator = '100';
        const numerator = Big(100)
          .times(Big(outputAmountInNative).div(inputAmountInNative))
          .minus(100)
          .times(denominator)
          .toFixed(0);
        this.priceImpact = new Percent(numerator, denominator);
      }
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
    const query: Fetch0xQuoteQuery = {
      buyToken: this.outputAmount.currency instanceof Token ? this.outputAmount.currency.address : (this.outputAmount.currency.symbol as string),
      sellToken: this.inputAmount.currency instanceof Token ? this.inputAmount.currency.address : (this.inputAmount.currency.symbol as string),
      buyAmount: this.tradeType === TradeType.EXACT_INPUT ? undefined : this.outputAmount.raw.toString(10),
      sellAmount: this.tradeType === TradeType.EXACT_INPUT ? this.inputAmount.raw.toString(10) : undefined,
      slippagePercentage: this._optsSlippagePercentage,
      excludedSources: this._optsExcludedSources?.join(','),
      takerAddress: account,
      feeRecipient: this._optsFeeRecipient,
      buyTokenPercentageFee: this._optsBuyTokenPercentageFee,
      affiliateAddress: this._optsAffiliateAddress,
    };
    return fetch0xQuote(chainId, false, query).then(quote => {
      return {
        to: quote.to,
        from: quote.from || account,
        nonce: undefined,

        gasLimit: BigNumber.from(quote.gas),
        gasPrice: BigNumber.from(quote.gasPrice),

        data: quote.data,
        value: BigNumber.from(quote.value),
        chainId: quote.chainId,
      } as TransactionRequest;
    });
  }
}
