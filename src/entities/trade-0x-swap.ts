import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionRequest } from '@ethersproject/providers';
import Big from 'big.js';
import invariant from 'tiny-invariant';
import hyperDexRouterAbi from '../abis/hyper-dex-router.json';
import { CurrencyAmount, isCurrencyAmount, Percent } from '../amounts';
import { NativeAmount } from '../amounts/currency-amount';
import { fetch0xQuote, Fetch0xQuoteQuery, Fetch0xQuoteResponse } from '../api';
import { ChainId, HYPER_DEX_ROUTER_ADDRESS, NATIVE_ADDRESSES, SUPPORTED_0X_CHAINS, Trade0xLiquiditySource, TradeType, ZERO_ADDRESS } from '../constants/constants';
import { BaseTrade } from '../types';
import { toCurrencyAmount } from '../utils';
import { Currency, isCurrency, Token } from './currency';

const ADDITIONAL_PRICE_ESTIMATE_GAS = 200000;
const ADDITIONAL_GAS_FOR_ROUTER_CONTRACT = 60000;

const HYPER_DEX_ROUTER_INTERFACE = new Interface(hyperDexRouterAbi);
const HYPER_DEX_ROUTER_METHOD_NAME = 'MultiRoute(bytes,address,address,uint256,address,uint256)';

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
   * (Optional) Liquidity sources (Eth2Dai, Uniswap, Kyber, 0x, LiquidityProvider etc)
   * that will not be included in the provided quote.
   */
  excludedSources?: Trade0xLiquiditySource[];
  /**
   * (Optional) The percentage (between 0 - 100) of the {@link from}
   */
  sellTokenPercentageFee?: number;
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
  private readonly _optSellTokenPercentageFee?: number;

  public static async getTrade(opts: Trade0xSwapOptions, abort?: AbortSignal): Promise<Trade0xSwap> {
    invariant((isCurrencyAmount(opts.from) && isCurrency(opts.to)) || (isCurrency(opts.from) && isCurrencyAmount(opts.to)), 'One of from or to amount should be passed');

    const chainId: ChainId = isCurrency(opts.from) ? (opts.from as Currency).chainId : (opts.to as Currency).chainId;
    invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');

    // To check sellTokenPercentageFee
    if (opts.sellTokenPercentageFee !== undefined) {
      invariant(opts.sellTokenPercentageFee >= 0 && opts.sellTokenPercentageFee <= 100, 'sellTokenPercentageFee should be number between 0-100');
      if (!HYPER_DEX_ROUTER_ADDRESS[chainId]) {
        console.warn(`Hyper Dex Router address not defined, Setting the "sellTokenPercentageFee" variable will have no effect`);
      }
    }

    const quote = await Trade0xSwap._fetchQuoteByTradeOpts(opts, abort);

    // Liquidity sources proportions
    const proportions = quote.sources
      .filter(i => !!Number(i.proportion))
      .map(i => ({
        name: i.name,
        proportion: Number(i.proportion) * 100,
      }));

    // Fees calculation
    const networkFee = NativeAmount.native(chainId, Big(quote.gasPrice).times(Trade0xSwap._getEstimateGas(quote)).toString());
    const protocolFee = NativeAmount.native(chainId, quote.protocolFee);

    // Amounts fields (Preliminary calculation)
    const inputCurrency = isCurrency(opts.from) ? (opts.from as Currency) : (opts.from as CurrencyAmount).currency;
    const outputCurrency = isCurrency(opts.to) ? (opts.to as Currency) : (opts.to as CurrencyAmount).currency;
    const inputAmount = toCurrencyAmount(inputCurrency, Trade0xSwap._changeAmountByPercent(quote.sellAmount, opts.sellTokenPercentageFee));
    const outputAmount = toCurrencyAmount(outputCurrency, quote.buyAmount);

    return new Trade0xSwap(
      isCurrencyAmount(opts.from) ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT,
      inputAmount,
      outputAmount,
      networkFee,
      protocolFee,
      proportions,
      Trade0xSwap._getAllowanceTarget(quote),
      Trade0xSwap._getPriceImpact(inputAmount, outputAmount, quote),
      opts.slippagePercentage,
      opts.excludedSources,
      opts.sellTokenPercentageFee,
    );
  }

  /**
   * Calculate the approximate amount of gas required
   * @param quote
   * @private
   */
  private static _getEstimateGas(quote: Fetch0xQuoteResponse): string {
    const hyperDexRouterAddress = HYPER_DEX_ROUTER_ADDRESS[quote.chainId];
    return Big(quote.gas)
      .add(ADDITIONAL_PRICE_ESTIMATE_GAS)
      .add(hyperDexRouterAddress ? ADDITIONAL_GAS_FOR_ROUTER_CONTRACT : 0)
      .toString();
  }

  /**
   * Allowance target should be hyper dex router if defined, else to get from quote
   * @param quote
   * @private
   */
  private static _getAllowanceTarget(quote: Fetch0xQuoteResponse): string | undefined {
    const hyperDexRouterAddress = HYPER_DEX_ROUTER_ADDRESS[quote.chainId];
    if (quote.allowanceTarget && quote.allowanceTarget !== ZERO_ADDRESS) {
      return hyperDexRouterAddress || quote.allowanceTarget;
    }
    return undefined;
  }

  /**
   * Price impact in percent calculation
   * @param inputAmount
   * @param outputAmount
   * @param quote
   * @private
   */
  private static _getPriceImpact(inputAmount: CurrencyAmount, outputAmount: CurrencyAmount, quote: Fetch0xQuoteResponse): Percent | undefined {
    if (!quote.sellTokenToEthRate || quote.sellTokenToEthRate === '0' || !quote.buyTokenToEthRate || quote.buyTokenToEthRate === '0') {
      return undefined;
    }

    const inputAmountInNative = Big(inputAmount.toExact()).div(quote.sellTokenToEthRate);
    const outputAmountInNative = Big(outputAmount.toExact()).div(quote.buyTokenToEthRate);

    if (inputAmountInNative.gt(0) && outputAmountInNative.gt(0)) {
      const denominator = '100';
      const numerator = Big(100).times(Big(outputAmountInNative).div(inputAmountInNative)).minus(100).times(denominator).toFixed(0);
      return new Percent(numerator, denominator);
    }
    return undefined;
  }

  /**
   * Change the amount by a percentage
   * @param amount
   * @param percent
   * @private
   */
  private static _changeAmountByPercent(amount: string, percent?: number): string {
    if (!percent) {
      return amount;
    }

    const bPercent = Big(percent).div(100);
    const bAmount = Big(amount);
    if (percent > 0) {
      return bAmount.add(bAmount.times(bPercent)).toFixed(0);
    } else {
      return Big(bAmount).div(bPercent.abs().add(1)).toFixed(0);
    }
  }

  /**
   * Fetch quote by the get price mode
   * @param opts
   * @param abort
   * @private
   */
  private static async _fetchQuoteByTradeOpts(opts: Trade0xSwapOptions, abort?: AbortSignal): Promise<Fetch0xQuoteResponse> {
    const chainId = (opts.from as Currency)?.chainId || (opts.to as Currency)?.chainId;
    const sellCurrency = isCurrency(opts.from) ? (opts.from as Currency) : (opts.from as CurrencyAmount).currency;
    const buyCurrency = isCurrency(opts.to) ? (opts.to as Currency) : (opts.to as CurrencyAmount).currency;
    const feePercent = opts.sellTokenPercentageFee ? -opts.sellTokenPercentageFee : undefined;
    const sellAmount = isCurrencyAmount(opts.from) ? Trade0xSwap._changeAmountByPercent((opts.from as CurrencyAmount).raw.toString(), feePercent) : undefined;
    const buyAmount = isCurrencyAmount(opts.to) ? (opts.to as CurrencyAmount).raw.toString() : undefined;

    const query: Fetch0xQuoteQuery = {
      sellToken: sellCurrency instanceof Token ? sellCurrency.address : (sellCurrency.symbol as string),
      buyToken: buyCurrency instanceof Token ? buyCurrency.address : (buyCurrency.symbol as string),
      sellAmount,
      buyAmount,
      slippagePercentage: opts.slippagePercentage,
      excludedSources: opts.excludedSources?.join(','),
    };

    return fetch0xQuote(chainId, true, query, abort);
  }

  constructor(
    tradeType: TradeType,
    inputAmount: CurrencyAmount,
    outputAmount: CurrencyAmount,
    networkFee: CurrencyAmount,
    tradeFee: CurrencyAmount,
    proportions: Trade0xSwapProportion[],
    allowanceTarget?: string,
    priceImpact?: Percent,
    slippagePercentage?: string,
    excludedSources?: Trade0xLiquiditySource[],
    sellTokenPercentageFee?: number,
  ) {
    invariant(tradeType === TradeType.EXACT_INPUT || tradeType === TradeType.EXACT_OUTPUT, 'Unsupported trade type');

    super(tradeType, inputAmount, outputAmount);

    this.networkFee = networkFee;
    this.tradeFee = tradeFee;
    this.proportions = proportions;
    this.allowanceTarget = allowanceTarget;
    this.priceImpact = priceImpact;

    this._optsSlippagePercentage = slippagePercentage;
    this._optsExcludedSources = excludedSources;
    this._optSellTokenPercentageFee = sellTokenPercentageFee;
  }

  /**
   * Returns transaction data
   */
  public async getTransactionData(account?: string): Promise<TransactionRequest> {
    const chainId = this.inputAmount.currency.chainId;
    const feePercent = this._optSellTokenPercentageFee ? -this._optSellTokenPercentageFee : undefined;
    const hyperDexRouterAddress = HYPER_DEX_ROUTER_ADDRESS[chainId];
    const isHyperDexRouterUsed = !!(hyperDexRouterAddress && feePercent);

    const query: Fetch0xQuoteQuery = {
      sellToken: this.inputAmount.currency instanceof Token ? this.inputAmount.currency.address : (this.inputAmount.currency.symbol as string),
      buyToken: this.outputAmount.currency instanceof Token ? this.outputAmount.currency.address : (this.outputAmount.currency.symbol as string),
      sellAmount: this.tradeType === TradeType.EXACT_INPUT ? Trade0xSwap._changeAmountByPercent(this.inputAmount.raw.toString(10), feePercent) : undefined,
      buyAmount: this.tradeType === TradeType.EXACT_INPUT ? undefined : this.outputAmount.raw.toString(10),
      slippagePercentage: this._optsSlippagePercentage,
      excludedSources: this._optsExcludedSources?.join(','),
      takerAddress: account,
      skipValidation: isHyperDexRouterUsed,
    };
    return fetch0xQuote(chainId, false, query).then(quote => {
      // Use Hyper Dex Router contract
      if (isHyperDexRouterUsed) {
        const inputCurrency = this.inputAmount.currency instanceof Token ? this.inputAmount.currency.address : NATIVE_ADDRESSES[0];
        const outputCurrency = this.outputAmount.currency instanceof Token ? this.outputAmount.currency.address : NATIVE_ADDRESSES[0];
        const feeCurrency = inputCurrency;

        const sellAmount = Trade0xSwap._changeAmountByPercent(quote.sellAmount, this._optSellTokenPercentageFee);
        const feeAmount = Big(sellAmount).minus(quote.sellAmount).toFixed(0);

        let value = BigNumber.from(quote.value);
        if (inputCurrency === NATIVE_ADDRESSES[0]) {
          value = value.add(feeAmount);
        }

        const callParams = [quote.data, feeCurrency, inputCurrency, quote.sellAmount, outputCurrency, feeAmount];
        const data = HYPER_DEX_ROUTER_INTERFACE.encodeFunctionData(HYPER_DEX_ROUTER_METHOD_NAME, callParams);

        return {
          to: quote.to,
          from: quote.from || account,
          nonce: undefined,

          gasLimit: BigNumber.from(Trade0xSwap._getEstimateGas(quote)),

          data: data,
          value: value,
          chainId: quote.chainId,
        } as TransactionRequest;
      }
      // Use default 0x proxy contract
      else {
        return {
          to: quote.to,
          from: quote.from || account,
          nonce: undefined,

          gasLimit: BigNumber.from(quote.gas),

          data: quote.data,
          value: BigNumber.from(quote.value),
          chainId: quote.chainId,
        } as TransactionRequest;
      }
    });
  }
}
