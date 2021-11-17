import { getExactInputAmount } from '../get-exact-input-amount';

describe('getExactInputAmount', () => {
  // Uniswap V3
  const data0 =
    '0x6af479b20000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000446b15b2b0850d2292d00000000000000000000000000000000000000000000000000000004afc142b80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b57ab1ec28d129707052df4df418d58a2d46d5f510001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000869584cd00000000000000000000000086003b044f70dac0abc80ac8957305b6370893ed000000000000000000000000000000000000000000000096ddb46f8e61954ac2';
  const exact0 = '20193517872320559065389';
  const amount0_0 = '20193517872320559065389'; // 0
  const amount0_1 = '20193517872320559065390'; // +1
  const amount0_2 = '20193517872320559065391'; // +2
  const amount0_3 = '20193517872320559065392'; // +3
  const amount0_4 = '20193517872320559065388'; // -1
  const amount0_5 = '20193517872320559065387'; // -2
  const amount0_6 = '20193517872320559065386'; // -3
  const amount0_7 = '20193517872320559065385'; // -4
  // Sell to liquidity provider
  const data1 =
    '0xf7fcd384000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000e2f2a5c287993345a840db3b0845fbc70f5935a5000000000000000000000000561b94454b65614ae3db0897b74303f4acf7cc7500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a352944000000000000000000000000000000000000000000000034af00fc70045c3b1a0800000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000800000000000000000000000008474ddbe98f5aa3179b3b3f5942d724afcdec9f6a6417ed60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000869584cd00000000000000000000000086003b044f70dac0abc80ac8957305b6370893ed0000000000000000000000000000000000000000000000a32396387261955016';
  const exact1 = '250000000000';
  const amount1_0 = '250000000000'; // 0
  const amount1_1 = '250000000001'; // +1
  const amount1_2 = '250000000002'; // +2
  const amount1_3 = '250000000003'; // +3
  const amount1_4 = '249999999999'; // -1
  const amount1_5 = '249999999998'; // -2
  const amount1_6 = '249999999997'; // -3
  const amount1_7 = '249999999996'; // -4

  const data2 =
    '0x77725df6000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000005d21dba00000000000000000000000000000000000000000000000000511cfebef3590500000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000005d21dba00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000051855780dffcd80000000000000000000000000000000000000000000000000000000005d21dba000000000000000000000000000000006daea1723962647b7e189d311d757fb79300000000000000000000000000000000000000000000000000000000000000000000000000000000000000009a45c63ef50d0cc8ccdaffc54ea5ac8007313a6f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000619550b944978ee7cae038000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000001c80645810488aa9823e10df6c96948e6f3282acdcae3cfc18977602ed215dafab64c36cb85de75bd32f3ef761a53cb80aa8235af87fbe82a49d279101dc336613000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000005d21dba000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000002ba0b86991c6218b36c1d19d4a2e9eb0ce3606eb48002710c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000869584cd00000000000000000000000086003b044f70dac0abc80ac8957305b6370893ed0000000000000000000000000000000000000000000000de692241a46195505f';
  const exact2 = '25000000000';
  const amount2_0 = '25000000000'; // 0
  const amount2_1 = '25000000001'; // +1
  const amount2_2 = '25000000002'; // +2
  const amount2_3 = '25000000003'; // +3
  const amount2_4 = '24999999999'; // -1
  const amount2_5 = '24999999998'; // -2
  const amount2_6 = '24999999997'; // -3
  const amount2_7 = '24999999996'; // -4

  it('should find exact amount in the Uniswap V3 data', () => {
    expect(getExactInputAmount(amount0_0, data0)).toBe(exact0);
    expect(getExactInputAmount(amount0_1, data0)).toBe(exact0);
    expect(getExactInputAmount(amount0_2, data0)).toBe(exact0);
    expect(getExactInputAmount(amount0_3, data0)).toBe(exact0);
    expect(getExactInputAmount(amount0_4, data0)).toBe(exact0);
    expect(getExactInputAmount(amount0_5, data0)).toBe(exact0);
    expect(getExactInputAmount(amount0_6, data0)).toBe(exact0);
    expect(getExactInputAmount(amount0_7, data0)).toBe(exact0);
  });

  it('should find exact amount in the Sell to liquidity provider data', () => {
    expect(getExactInputAmount(amount1_0, data1)).toBe(exact1);
    expect(getExactInputAmount(amount1_1, data1)).toBe(exact1);
    expect(getExactInputAmount(amount1_2, data1)).toBe(exact1);
    expect(getExactInputAmount(amount1_3, data1)).toBe(exact1);
    expect(getExactInputAmount(amount1_4, data1)).toBe(exact1);
    expect(getExactInputAmount(amount1_5, data1)).toBe(exact1);
    expect(getExactInputAmount(amount1_6, data1)).toBe(exact1);
    expect(getExactInputAmount(amount1_7, data1)).toBe(exact1);
  });

  it('should find exact amount in some tx data data', () => {
    expect(getExactInputAmount(amount2_0, data2)).toBe(exact2);
    expect(getExactInputAmount(amount2_1, data2)).toBe(exact2);
    expect(getExactInputAmount(amount2_2, data2)).toBe(exact2);
    expect(getExactInputAmount(amount2_3, data2)).toBe(exact2);
    expect(getExactInputAmount(amount2_4, data2)).toBe(exact2);
    expect(getExactInputAmount(amount2_5, data2)).toBe(exact2);
    expect(getExactInputAmount(amount2_6, data2)).toBe(exact2);
    expect(getExactInputAmount(amount2_7, data2)).toBe(exact2);
  });
});
