import { ChainId } from '../constants/constants';
import { Api0xPaginationRequest, Api0xPaginationResponse, Signed0xOrderWithMeta } from '../types';
import { get0xApiUrl, toQueryString } from '../utils';

export interface Fetch0xOrderbookQuery extends Api0xPaginationRequest {
  /**
   *  The address of makerToken or takerToken designated as the base currency in the currency pair calculation of price.
   */
  baseToken?: string;
  /**
   * The address of makerToken or takerToken designated as the quote currency in the currency pair calculation of price.
   */
  quoteToken?: string;
}

export interface Fetch0xOrderbookResponse {
  bids: Api0xPaginationResponse<Signed0xOrderWithMeta>;
  asks: Api0xPaginationResponse<Signed0xOrderWithMeta>;
}

export async function fetch0xOrderbook(chainId: ChainId, query: Fetch0xOrderbookQuery, abort?: AbortSignal): Promise<Fetch0xOrderbookResponse> {
  const host = get0xApiUrl(chainId);
  const queryString = toQueryString(query);
  const url = `${host}/orderbook/v1?${queryString}`;

  const res: Response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    signal: abort,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Fetch orders list error, try again later.');
  }

  return await res.json();
}
