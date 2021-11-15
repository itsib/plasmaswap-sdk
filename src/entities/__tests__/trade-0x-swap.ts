import Big from 'big.js';
import FAKE_DATA from '../../api/__mocks__/fetch-0x-quote.fake.json';
import { ChainId, HYPER_DEX_ROUTER_ADDRESS, InsufficientReservesError, NATIVE, toCurrencyAmount, Token, Trade0xSwap, Trade0xSwapOptions, TradeType } from '../../index';

jest.mock('../../api/fetch-0x-quote.ts');

describe('Trade0xSwap', () => {
  const account = '0x5e900d9b641a8a9c8420f615032c6c88aa18817a';
  const hyperDexRouterAddress = HYPER_DEX_ROUTER_ADDRESS[ChainId.ROPSTEN];

  const token0 = new Token(ChainId.ROPSTEN, FAKE_DATA.tokens[0].address, FAKE_DATA.tokens[0].decimals, FAKE_DATA.tokens[0].symbol, FAKE_DATA.tokens[0].name);
  const token1 = new Token(ChainId.ROPSTEN, FAKE_DATA.tokens[1].address, FAKE_DATA.tokens[1].decimals, FAKE_DATA.tokens[1].symbol, FAKE_DATA.tokens[1].name);
  const token2 = new Token(ChainId.ROPSTEN, FAKE_DATA.tokens[2].address, FAKE_DATA.tokens[2].decimals, FAKE_DATA.tokens[2].symbol, FAKE_DATA.tokens[2].name);
  const token3 = new Token(ChainId.ROPSTEN, '0x0000000000000000000000000000000000000004', 18, 'NONE', 'NONE Token');

  it('Create EXACT_INPUT Trade0xSwap', () => {
    const sellFieldValue = '0.2';
    const sellToken = token0;
    const buyToken = token1;

    const from = toCurrencyAmount(sellToken, Big(sellFieldValue).times(Math.pow(10, sellToken.decimals)).toFixed(0));
    const opts: Trade0xSwapOptions = {
      from,
      to: buyToken,
      slippagePercentage: '0.05',
    };

    return Trade0xSwap.getTrade(opts)
      .then(trade => {
        expect(trade).toBeInstanceOf(Trade0xSwap);
        expect(trade.tradeType).toBe(TradeType.EXACT_INPUT);
        expect(trade.inputAmount.toExact()).toBe(sellFieldValue);
        expect(trade.allowanceTarget).toBe(FAKE_DATA.zeroExProxyContract);

        return trade.getTransactionData(account);
      })
      .then(txData => {
        expect(txData.from).toBe(account);
        expect(txData.to).toBe(FAKE_DATA.zeroExProxyContract);
        expect(txData.data).toBe(FAKE_DATA.quoteTxData);
        expect(txData.value?.toString()).toBe('0');
      });
  });

  it('Create EXACT_OUTPUT Trade0xSwap', () => {
    const buyFieldValue = '1.3456';
    const sellToken = NATIVE[ChainId.ROPSTEN];
    const buyToken = token2;

    const to = toCurrencyAmount(buyToken, Big(buyFieldValue).times(Math.pow(10, buyToken.decimals)).toFixed(0));
    const opts: Trade0xSwapOptions = {
      from: sellToken,
      to,
      slippagePercentage: '0.05',
    };

    return Trade0xSwap.getTrade(opts)
      .then(trade => {
        expect(trade).toBeInstanceOf(Trade0xSwap);
        expect(trade.tradeType).toBe(TradeType.EXACT_OUTPUT);
        expect(trade.outputAmount.toExact()).toBe(buyFieldValue);
        expect(trade.allowanceTarget).toBeUndefined();

        return trade.getTransactionData(account);
      })
      .then(txData => {
        expect(txData.from).toBe(account);
        expect(txData.to).toBe(FAKE_DATA.zeroExProxyContract);
        expect(txData.data).toBe(FAKE_DATA.quoteTxData);
        expect(txData.value?.toString()).toBe('1738818112716960');
      });
  });

  it('Create Trade0xSwap with no liquidity pair', () => {
    const sellFieldValue = '1.3456';
    const sellToken = token2;
    const buyToken = token3;

    const from = toCurrencyAmount(sellToken, Big(sellFieldValue).times(Math.pow(10, sellToken.decimals)).toFixed(0));
    const opts: Trade0xSwapOptions = {
      from: from,
      to: buyToken,
      slippagePercentage: '0.05',
    };

    return expect(Trade0xSwap.getTrade(opts)).rejects.toThrow(InsufficientReservesError);
  });

  it('Create EXACT_INPUT Trade0xSwap with fee', () => {
    const sellFieldValue = '12.345';
    const sellToken = token0;
    const buyToken = token1;

    const from = toCurrencyAmount(sellToken, Big(sellFieldValue).times(Math.pow(10, sellToken.decimals)).toFixed(0));
    const opts: Trade0xSwapOptions = {
      from,
      to: buyToken,
      slippagePercentage: '0.05',
      sellTokenPercentageFee: 0.3,
    };

    return Trade0xSwap.getTrade(opts)
      .then(trade => {
        expect(trade).toBeInstanceOf(Trade0xSwap);
        expect(trade.tradeType).toBe(TradeType.EXACT_INPUT);
        expect(trade.inputAmount.toExact()).toBe(sellFieldValue); // 12.345
        expect(trade.outputAmount.toExact()).toBe('3.236607907772378936'); // 12.345
        expect(trade.allowanceTarget).toBe(hyperDexRouterAddress);

        return trade.getTransactionData(account);
      })
      .then(txData => {
        expect(txData.from).toBe(account);
        expect(txData.to).toBe(hyperDexRouterAddress);
        expect(txData.value?.toString()).toBe('0');
      });
  });
});
