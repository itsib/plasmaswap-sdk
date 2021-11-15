import Big from 'big.js';
import { ChainId } from '../../constants/constants';
import { NATIVE } from '../../entities';
import { InsufficientReservesError, ValidationError } from '../../errors';
import { Fetch0xPriceResponse, Fetch0xQuoteQuery, Fetch0xQuoteResponse } from '../fetch-0x-quote';
import FAKE_DATA from './fetch-0x-quote.fake.json';

const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function getCurrencyData(currencyId: string): typeof FAKE_DATA.tokens[number] | undefined {
  if (currencyId === 'ETH') {
    return {
      address: ETH_ADDRESS,
      decimals: NATIVE[ChainId.ROPSTEN].decimals,
      symbol: NATIVE[ChainId.ROPSTEN].symbol || '',
      name: NATIVE[ChainId.ROPSTEN].name || '',
      toEthRate: '1',
    };
  }
  return FAKE_DATA.tokens.find(i => i.address === currencyId);
}

export const fetch0xQuote = jest.fn<Promise<Fetch0xPriceResponse | Fetch0xQuoteResponse>, [ChainId, boolean, Fetch0xQuoteQuery]>(
  (chainId: ChainId, justPrice: boolean, query: Fetch0xQuoteQuery) => {
    const sellToken = getCurrencyData(query.sellToken);
    const buyToken = getCurrencyData(query.buyToken);

    if (!sellToken || !buyToken) {
      return Promise.reject(new InsufficientReservesError());
    }

    if (!query.sellAmount && !query.buyAmount) {
      return Promise.reject(
        new ValidationError('Validation failed', [
          {
            name: 'sellAmount',
            message: 'One of field sellAmount or buyAmount should be filled',
          },
        ]),
      );
    }

    const pricePercent = Big(FAKE_DATA.pricePercent).div(100);
    const guaranteedPricePercent = Big(FAKE_DATA.guaranteedPricePercent).div(100);

    const rate: Big = query.sellAmount ? Big(buyToken.toEthRate).div(sellToken.toEthRate) : Big(sellToken.toEthRate).div(buyToken.toEthRate);
    const price: string = rate[query.sellAmount ? 'minus' : 'add'](rate.times(pricePercent)).toString(); // Rate minus 10%
    const guaranteedPrice: string = rate[query.sellAmount ? 'minus' : 'add'](rate.times(guaranteedPricePercent)).toString(); // Rate minus 13%

    const excludedSources = query.excludedSources ? query.excludedSources.split(',') : [];
    const sources = FAKE_DATA.defaultQuoteFields.sources.filter(source => !excludedSources.includes(source.name));
    if (!sources.length) {
      return Promise.reject(new InsufficientReservesError());
    }
    sources.forEach((source, index) => (source.proportion = index === 0 ? '1' : '0'));

    const sellAmount = query.sellAmount
      ? query.sellAmount
      : Big(query.buyAmount as string)
          .div(Math.pow(10, buyToken.decimals))
          .times(price)
          .times(Math.pow(10, sellToken.decimals))
          .toFixed(0);

    const buyAmount = query.buyAmount
      ? query.buyAmount
      : Big(query.sellAmount as string)
          .div(Math.pow(10, sellToken.decimals))
          .times(price)
          .times(Math.pow(10, buyToken.decimals))
          .toFixed(0);

    return Promise.resolve({
      ...FAKE_DATA.defaultQuoteFields,
      chainId,
      allowanceTarget: sellToken.address === ETH_ADDRESS ? ZERO_ADDRESS : FAKE_DATA.zeroExProxyContract,
      buyAmount,
      buyTokenAddress: buyToken.address,
      buyTokenToEthRate: buyToken.toEthRate,
      price,
      sellAmount,
      sellTokenAddress: sellToken.address,
      sellTokenToEthRate: sellToken.toEthRate,
      value: sellToken.address === ETH_ADDRESS ? sellAmount : 0,
      sources,
      ...(justPrice
        ? {}
        : {
            from: query.takerAddress,
            to: FAKE_DATA.zeroExProxyContract,
            guaranteedPrice: guaranteedPrice as string,
            data: FAKE_DATA.quoteTxData,
          }),
    } as typeof justPrice extends true ? Fetch0xPriceResponse : Fetch0xQuoteResponse);
  },
);
