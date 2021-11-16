import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionRequest } from '@ethersproject/providers';
import Big from 'big.js';
import invariant from 'tiny-invariant';
import hyperDexRouterAbi from '../abis/hyper-dex-router.json';
import { CurrencyAmount, Fraction, isCurrencyAmount, Percent, TokenAmount } from '../amounts';
import { NativeAmount } from '../amounts/currency-amount';
import { Fetch0xPriceResponse, fetch0xQuote, Fetch0xQuoteQuery } from '../api';
import { ChainId, HYPER_DEX_ROUTER_ADDRESS, NATIVE_ADDRESSES, ONE, SUPPORTED_0X_CHAINS, Trade0xLiquiditySource, TradeType, ZERO_ADDRESS } from '../constants/constants';
import { JSBI } from '../index';
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
  slippagePercentage: string;
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

interface FetchQuoteMethodOpts {
  from: CurrencyAmount | Currency;
  to: CurrencyAmount | Currency;
  slippagePercentage: string;
  excludedSources?: Trade0xLiquiditySource[];
  sellTokenPercentageFee?: number;
  takerAddress?: string;
}

interface FetchQuoteMethodReturn {
  chainId: ChainId;
  to?: string;
  from?: string;
  gasLimit?: BigNumber;
  nonce?: BigNumber;
  value?: BigNumber;
  data?: string;

  tradeType: TradeType;
  inputAmount: CurrencyAmount;
  outputAmount: CurrencyAmount;
  protocolFee: CurrencyAmount;
  networkFee: CurrencyAmount;
  plasmaFee: CurrencyAmount;

  proportions: Trade0xSwapProportion[];
  allowanceTarget?: string;
  priceImpact?: Percent;
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
  private readonly _optsSlippagePercentage: string;
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

    const { tradeType, proportions, networkFee, protocolFee, inputAmount, outputAmount, allowanceTarget, priceImpact } = await Trade0xSwap._fetchQuote(opts, true, abort);

    return new Trade0xSwap(
      tradeType,
      inputAmount,
      outputAmount,
      networkFee,
      protocolFee,
      proportions,
      opts.slippagePercentage,
      allowanceTarget,
      priceImpact,
      opts.excludedSources,
      opts.sellTokenPercentageFee,
    );
  }

  private static async _fetchQuote(opts: FetchQuoteMethodOpts, justPrice = true, abort?: AbortSignal): Promise<FetchQuoteMethodReturn> {
    const chainId = (opts.from as Currency)?.chainId || (opts.to as Currency)?.chainId;
    const tradeType = isCurrencyAmount(opts.from) ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT;
    const hyperDexRouterAddress = HYPER_DEX_ROUTER_ADDRESS[chainId];
    const isHyperDex = !!(hyperDexRouterAddress && opts.sellTokenPercentageFee);
    const skipValidation = !justPrice && isHyperDex;

    const sellCurrency = isCurrency(opts.from) ? (opts.from as Currency) : (opts.from as CurrencyAmount).currency;
    const buyCurrency = isCurrency(opts.to) ? (opts.to as Currency) : (opts.to as CurrencyAmount).currency;

    let sellAmount: string | undefined;
    let sellFeeAmount: string | undefined;
    if (isCurrencyAmount(opts.from)) {
      sellAmount = (opts.from as CurrencyAmount).raw.toString();
      if (opts.sellTokenPercentageFee) {
        const sellAmountWithoutFee = Big(sellAmount).div(Big(opts.sellTokenPercentageFee).div(100).add(1)).toFixed(0);
        sellFeeAmount = Big(sellAmount).minus(sellAmountWithoutFee).toFixed(0);
        sellAmount = sellAmountWithoutFee;
      }
    }

    let buyAmount: string | undefined;
    if (isCurrencyAmount(opts.to)) {
      buyAmount = (opts.to as CurrencyAmount).raw.toString();
    }

    const query: Fetch0xQuoteQuery = {
      sellToken: sellCurrency instanceof Token ? sellCurrency.address : (sellCurrency.symbol as string),
      buyToken: buyCurrency instanceof Token ? buyCurrency.address : (buyCurrency.symbol as string),
      ...(sellAmount && { sellAmount }),
      ...(buyAmount && { buyAmount }),
      slippagePercentage: opts.slippagePercentage,
      ...(opts.excludedSources && { excludedSources: opts.excludedSources.join(',') }),
      ...(!justPrice && opts.takerAddress && { takerAddress: opts.takerAddress }),
      ...(skipValidation && { skipValidation: true }),
    };

    return fetch0xQuote(chainId, justPrice as false, query, abort).then(quote => {
      // Amounts calculation
      let inputAmount: CurrencyAmount;
      if (tradeType === TradeType.EXACT_INPUT) {
        inputAmount = toCurrencyAmount(sellCurrency, Big(quote.sellAmount).add(sellFeeAmount || '0').toFixed(0)); // eslint-disable-line prettier/prettier
      } else {
        let sellAmountWithFeeRaw: string;
        if (opts.sellTokenPercentageFee) {
          sellAmountWithFeeRaw = Big(quote.sellAmount)
            .add(Big(quote.sellAmount).times(Big(opts.sellTokenPercentageFee).div(100)))
            .toFixed(0);
        } else {
          sellAmountWithFeeRaw = quote.sellAmount;
        }
        sellFeeAmount = Big(sellAmountWithFeeRaw).minus(quote.sellAmount).toFixed(0);
        inputAmount = toCurrencyAmount(sellCurrency, sellAmountWithFeeRaw);
      }
      const outputAmount: CurrencyAmount = toCurrencyAmount(buyCurrency, quote.buyAmount);

      // Tx data
      const to = isHyperDex ? (hyperDexRouterAddress as string) : quote.to;
      const from = opts.takerAddress || quote.from;
      const gasLimit = skipValidation ? BigNumber.from(Trade0xSwap._getEstimateGas(quote)) : BigNumber.from(quote.gas);
      const nonce = undefined;
      let value = BigNumber.from(quote.value);
      let data = quote.data;

      // Fees calculation
      const networkFee = NativeAmount.native(chainId, Big(quote.gasPrice).times(gasLimit.toString()).toString());
      const protocolFee = NativeAmount.native(chainId, quote.protocolFee);
      const plasmaFee: CurrencyAmount = toCurrencyAmount(sellCurrency, sellFeeAmount || '0');

      // Hyper dex proxy contract data calculation
      if (isHyperDex && !justPrice) {
        const inputCurrencyAddress = inputAmount.currency instanceof Token ? inputAmount.currency.address : NATIVE_ADDRESSES[0];
        const outputCurrencyAddress = outputAmount.currency instanceof Token ? outputAmount.currency.address : NATIVE_ADDRESSES[0];
        const feeCurrencyAddress = inputCurrencyAddress;
        const inputAmountWithoutFee = inputAmount.subtract(plasmaFee as TokenAmount);

        let methodArgs: string[];
        if (tradeType === TradeType.EXACT_INPUT) {
          if (inputCurrencyAddress === NATIVE_ADDRESSES[0]) {
            value = value.add(plasmaFee.raw.toString());
          }
          methodArgs = [data, feeCurrencyAddress, inputCurrencyAddress, inputAmountWithoutFee.raw.toString(), outputCurrencyAddress, plasmaFee.raw.toString()];
        } else {
          const slippageTolerance = new Percent(JSBI.BigInt(Big(opts.slippagePercentage).times(10000).toFixed(0)), JSBI.BigInt(10000));
          const slippageAdjustedAmount = new Fraction(ONE).add(slippageTolerance).multiply(inputAmount.raw).quotient;
          const inputAmountMax = toCurrencyAmount(inputAmount.currency, slippageAdjustedAmount);

          const t1 = slippageTolerance.toSignificant();
          const t2 = inputAmount.toExact();
          const t3 = inputAmountWithoutFee.toExact();
          const t4 = inputAmountMax.toExact();

          console.debug(t1, t2, t3, t4);

          if (inputCurrencyAddress === NATIVE_ADDRESSES[0]) {
            value = BigNumber.from(inputAmountMax.add(plasmaFee as TokenAmount).raw.toString());
          } else {
            value = BigNumber.from(quote.value);
          }

          methodArgs = [data, feeCurrencyAddress, inputCurrencyAddress, inputAmountMax.raw.toString(), outputCurrencyAddress, plasmaFee.raw.toString()];
        }
        data = HYPER_DEX_ROUTER_INTERFACE.encodeFunctionData(HYPER_DEX_ROUTER_METHOD_NAME, methodArgs);
      }

      // Liquidity sources proportions
      const proportions = quote.sources
        .filter(i => !!Number(i.proportion))
        .map(i => ({
          name: i.name,
          proportion: Number(i.proportion) * 100,
        }));

      let allowanceTarget: string | undefined;
      if (quote.allowanceTarget && quote.allowanceTarget !== ZERO_ADDRESS) {
        allowanceTarget = isHyperDex ? hyperDexRouterAddress : quote.allowanceTarget;
      }

      // Price impact in percent calculation
      let priceImpact: Percent | undefined;
      if (quote.sellTokenToEthRate && quote.sellTokenToEthRate !== '0' && quote.buyTokenToEthRate && quote.buyTokenToEthRate !== '0') {
        const inputAmountInNative = Big(inputAmount.toExact()).div(quote.sellTokenToEthRate);
        const outputAmountInNative = Big(outputAmount.toExact()).div(quote.buyTokenToEthRate);

        if (inputAmountInNative.gt(0) && outputAmountInNative.gt(0)) {
          const denominator = '100';
          const numerator = Big(100).times(Big(outputAmountInNative).div(inputAmountInNative)).minus(100).times(denominator).toFixed(0);
          priceImpact = new Percent(numerator, denominator);
        }
      }

      return {
        // Tx
        chainId,
        to,
        from,
        gasLimit,
        nonce,
        value,
        data,
        // Amounts
        tradeType,
        inputAmount,
        outputAmount,
        // Fees
        protocolFee,
        networkFee,
        plasmaFee,
        // Some data
        proportions,
        allowanceTarget,
        priceImpact,
      };
    });
  }

  /**
   * Calculate the approximate amount of gas required
   * @param quote
   * @private
   */
  private static _getEstimateGas(quote: Fetch0xPriceResponse): string {
    const hyperDexRouterAddress = HYPER_DEX_ROUTER_ADDRESS[quote.chainId];
    return Big(quote.gas)
      .add(ADDITIONAL_PRICE_ESTIMATE_GAS)
      .add(hyperDexRouterAddress ? ADDITIONAL_GAS_FOR_ROUTER_CONTRACT : 0)
      .toString();
  }

  constructor(
    tradeType: TradeType,
    inputAmount: CurrencyAmount,
    outputAmount: CurrencyAmount,
    networkFee: CurrencyAmount,
    tradeFee: CurrencyAmount,
    proportions: Trade0xSwapProportion[],
    slippagePercentage: string,
    allowanceTarget?: string,
    priceImpact?: Percent,
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
  public async getTransactionData(account: string): Promise<TransactionRequest> {
    const opts: FetchQuoteMethodOpts = {
      from: this.tradeType === TradeType.EXACT_INPUT ? this.inputAmount : this.inputAmount.currency,
      to: this.tradeType === TradeType.EXACT_OUTPUT ? this.outputAmount : this.outputAmount.currency,
      slippagePercentage: this._optsSlippagePercentage,
      excludedSources: this._optsExcludedSources,
      sellTokenPercentageFee: this._optSellTokenPercentageFee,
      takerAddress: account,
    };

    const { to, from, nonce, gasLimit, data, value, chainId } = await Trade0xSwap._fetchQuote(opts, false);

    return { to, from, nonce, gasLimit, data, value, chainId } as TransactionRequest;
  }
}
