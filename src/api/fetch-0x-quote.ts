import { ChainId, Trade0xLiquiditySource } from '../constants/constants';
import { get0xApiUrl } from '../utils/get-0x-api-url';
import { toQueryString } from '../utils/to-query-string';

export interface Fetch0xQuoteOrder {
  type: number;
  makerToken: string;
  makerAmount: string;
  takerToken: string;
  takerAmount: string;
  source: Trade0xLiquiditySource;
  sourcePathId: string;
  fillData: {
    router: string;
    tokenAddressPath: string[];
  };
}

export interface Fetch0xQuoteQuery {
  /**
   * The ERC20 token address or symbol of the token you want to send. "ETH" can be provided as a valid sellToken.
   */
  sellToken: string;
  /**
   * The ERC20 token address or symbol of the token you want to receive. "ETH" can be provided as a valid buyToken
   */
  buyToken: string;
  /**
   * (Optional) The amount of sellToken (in sellToken base units) you want to send.
   */
  sellAmount?: string;
  /**
   * (Optional) The amount of buyToken (in buyToken base units) you want to receive.
   */
  buyAmount?: string;
  /**
   * (Optional) The maximum acceptable slippage in % of the buyToken
   * amount if sellAmount is provided, the maximum acceptable slippage
   * in % of the sellAmount amount if buyAmount is provided.
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
   * Ex: excludedSources=Uniswap,Kyber,Eth2Dai. See {@link Trade0xLiquiditySource} for a full list of sources
   */
  excludedSources?: string;
  /**
   * (Optional) The address which will fill the quote. When provided the gas
   * will be estimated and returned. An eth_call will also be performed.
   * If this fails a Revert Error will be returned in the response.
   */
  takerAddress?: string;
  /**
   * (Optional) Normally, whenever a takerAddress is provided, the API
   * will validate the quote for the user.
   * (For more details, see https://0x.org/docs/guides/0x-api-faq#how-does-takeraddress-help-with-catching-issues.)
   * When this parameter is set to true, that validation will be skipped.
   * See also here: https://0x.org/docs/guides/rfqt-in-the-0x-api#quote-validation.
   */
  skipValidation?: boolean;
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

export interface Fetch0xQuoteResponse {
  chainId: ChainId;
  /**
   * If buyAmount was specified in the request it provides
   * the price of buyToken in sellToken and vice versa.
   * This price does not include the slippage provided in
   * the request above, and therefore represents
   * the best possible price.
   */
  price: string;
  /**
   * The price which must be met or else the entire transaction will revert.
   * This price is influenced by the slippagePercentage parameter.
   * On-chain sources may encounter price movements from quote to settlement.
   */
  guaranteedPrice: string;
  /**
   * The field will be filled in if you send {@link Fetch0xQuoteQuery.takerAddress}
   */
  from?: string;
  /**
   * The address of the contract to send call data to.
   */
  to: string;
  /**
   * The call data required to be sent to the to contract address.
   */
  data: string;
  /**
   * The amount of ether (in wei) that should be sent
   * with the transaction. (Assuming protocolFee is paid in ether).
   */
  value: string;
  /**
   * The gas price (in wei) that should be used to send
   * the transaction. The transaction needs to be sent
   * with this gasPrice or lower for the transaction
   * to be successful.
   */
  gasPrice: string;
  /**
   * The estimated gas limit that should be used to send
   * the transaction to guarantee settlement. A computed
   * estimate is returned in all responses,
   * for a more accurate estimate provide a
   * takerAddress in the request.
   */
  gas: string;
  /**
   * The estimate for the amount of gas that will
   * actually be used in the transaction. Always less than gas.
   */
  estimatedGas: string;
  /**
   * The maximum amount of ether that will be paid
   * towards the protocol fee (in wei), and what
   * is used to compute the value field of the transaction.
   */
  protocolFee: string;
  /**
   * The minimum amount of ether that will be paid towards
   * the protocol fee (in wei) during the transaction.
   */
  minimumProtocolFee: string;
  /**
   * The amount of buyToken (in buyToken units)
   * that would be bought in this swap.
   * Certain on-chain sources do not allow
   * specifying buyAmount, when using buyAmount
   * these sources are excluded.
   */
  buyAmount: string;
  /**
   * The ERC20 token address of the token
   * you want to receive in quote.
   */
  buyTokenAddress: string;

  buyTokenToEthRate?: string;
  /**
   * The amount of sellToken (in sellToken units)
   * that would be sold in this swap. Specifying
   * sellAmount is the recommended way to
   * interact with 0xAPI as it covers all on-chain sources.
   */
  sellAmount: string;
  /**
   * The ERC20 token address of the token
   * you want to sell with quote.
   */
  sellTokenAddress: string;

  sellTokenToEthRate?: string;
  /**
   * The percentage distribution of buyAmount
   * or sellAmount split between each liquidity source.
   */
  sources: {
    name: Trade0xLiquiditySource;
    /**
     * In part of one (For percent you need multiply this value to 100)
     */
    proportion: string;
  }[];
  /**
   * When possible, the 0x smart contracts will burn GST2 Gas
   * Tokens during the transaction, resulting in a (max 50%)
   * ETH refund at the end of the transaction.
   * This field estimates the refund in wei.
   */
  estimatedGasTokenRefund?: string;
  /**
   * The target contract address for which the user needs
   * to have an allowance in order to be able to complete
   * the swap. For swaps with "ETH" as sellToken,
   * wrapping "ETH" to "WETH" or unwrapping "WETH" to "ETH" no
   * allowance is needed, a null address of
   * 0x0000000000000000000000000000000000000000 is then returned instead.
   */
  allowanceTarget: string;

  orders?: Fetch0xQuoteOrder[];
}

export async function fetch0xQuote(chainId: ChainId, justPrice: boolean, query: Fetch0xQuoteQuery, abort?: AbortSignal): Promise<Fetch0xQuoteResponse> {
  const host = get0xApiUrl(chainId);
  const queryString = toQueryString(query);
  const url = `${host}/swap/v1/${justPrice ? 'price' : 'quote'}?${queryString}`;

  const res: Response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    signal: abort,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Fetch quote error, try again later.');
  }

  return await res.json();
}
