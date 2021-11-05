import { ChainId, get0xApiUrl } from '../src';

describe('get-0x-api-url', () => {
  it('Try to get mainnet API URL', () => {
    const result = 'https://api.0x.org';
    expect(get0xApiUrl(ChainId.MAINNET)).toEqual(result);
  });

  it('Try to get mainnet API wss', () => {
    const result = 'wss://api.0x.org';
    expect(get0xApiUrl(ChainId.MAINNET, true)).toEqual(result);
  });

  it('Try to pass ZERO_EX_API_HOST variable', () => {
    const url = 'http://localhost:2080';
    process.env.ZERO_EX_API_HOST = url;
    expect(get0xApiUrl(ChainId.MAINNET)).toEqual(url);
  });
});
