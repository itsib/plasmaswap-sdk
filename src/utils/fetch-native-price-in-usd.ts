import { ChainId } from '../constants/constants';
import { timestamp } from './timestamp';

enum CoingeckoId {
  ETHEREUM = 'ethereum',
  POLYGON = 'matic-network',
}

interface CurrencyPriceCache {
  requestTime: number;
  value: Promise<number | undefined>;
}

const CURRENCY_COINGECKO_ID_MAP: { [chainId in ChainId]: CoingeckoId } = {
  [ChainId.MAINNET]: CoingeckoId.ETHEREUM,
  [ChainId.ROPSTEN]: CoingeckoId.ETHEREUM,
  [ChainId.RINKEBY]: CoingeckoId.ETHEREUM,
  [ChainId.GÖRLI]: CoingeckoId.ETHEREUM,
  [ChainId.KOVAN]: CoingeckoId.ETHEREUM,
  [ChainId.MATIC]: CoingeckoId.POLYGON,
}

const URL = 'https://api.coingecko.com/api/v3/simple/price';

const CURRENCY_PRICE_CACHE_TIME = 60; // One minute

const CURRENCY_PRICE_CACHE: { [currencyId in CoingeckoId]?: CurrencyPriceCache } = {};

function abortException(): DOMException {
  return new DOMException('The user aborted a request.', 'AbortError');
}

async function _fetchPriceInUsd(coingeckoId: CoingeckoId, abort?: AbortSignal): Promise<number | undefined> {
  const url = `${URL}?ids=${coingeckoId}&vs_currencies=usd`;

  const res: Response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    signal: abort,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Fetch currency price error');
  }

  const prices: { [coingeckoId: string]: { usd: number } } = await res.json();
  return prices?.[coingeckoId]?.usd;
}

/**
 * Returns the market price of the cryptocurrency to USD.
 * Cache time one minute
 * @param chainId
 * @param abort
 */
export async function fetchNativePriceInUsd(chainId: ChainId, abort?: AbortSignal): Promise<number | undefined> {
  let aborted = false;
  abort && abort.addEventListener('abort', () => (aborted = true));

  const coingeckoId = CURRENCY_COINGECKO_ID_MAP[chainId];
  const cache = CURRENCY_PRICE_CACHE[coingeckoId];
  if (cache && cache.requestTime >= timestamp() - CURRENCY_PRICE_CACHE_TIME) {
    return cache.value.then(price => (aborted ? Promise.reject(abortException()) : price));
  }

  CURRENCY_PRICE_CACHE[coingeckoId] = {
    value: _fetchPriceInUsd(coingeckoId).catch(err => {
      Reflect.deleteProperty(CURRENCY_PRICE_CACHE, coingeckoId);
      return Promise.reject(err);
    }),
    requestTime: timestamp(),
  };

  return (CURRENCY_PRICE_CACHE[coingeckoId] as CurrencyPriceCache).value.then(price => (aborted ? Promise.reject(abortException()) : price));
}
