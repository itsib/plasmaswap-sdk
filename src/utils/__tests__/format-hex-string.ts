import { formatHexString } from '../../index';

describe('format-hex-string', () => {
  it('String number value to hex', () => {
    const amount = '232759384921936450232759384921936450';
    const result = '0x00000000000000000000000000000000002cd3ec7725317f2946f18798311242';

    expect(formatHexString(amount)).toEqual(result);
  });

  it('String value to hex', () => {
    const value = '0x411Ab3796C0F78e2fba7ada86F4dFcebDcD7f27F';
    const result = '0x000000000000000000000000411Ab3796C0F78e2fba7ada86F4dFcebDcD7f27F';
    expect(formatHexString(value)).toEqual(result);
  });

  it('Invalid value', () => {
    const amount = '23275938492193645023275938492193.6450';
    expect(() => formatHexString(amount)).toThrowError('Invalid value format');
  });
});
