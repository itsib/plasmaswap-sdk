import { ChainId } from '../constants/constants';
import { Api0xPaginationRequest, Api0xPaginationResponse, Signed0xOrderWidthMeta } from '../types';
import { get0xApiUrl, toQueryString } from '../utils';

export interface Fetch0xSignedOrdersQuery extends Api0xPaginationRequest {
  /**
   *  The address of either the maker or the taker
   */
  trader?: string;

  maker?: string;

  taker?: string;

  sender?: string;

  makerToken?: string;

  takerToken?: string;
}

export type Fetch0xSignedOrdersResponse = Api0xPaginationResponse<Signed0xOrderWidthMeta>;

export async function fetch0xSignedOrders(chainId: ChainId, query: Fetch0xSignedOrdersQuery, abort?: AbortSignal): Promise<Fetch0xSignedOrdersResponse> {
  const host = get0xApiUrl(chainId);
  const queryString = toQueryString(query);
  const url = `${host}/sra/v4/orders?${queryString}`;

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
