import invariant from 'tiny-invariant';
import { Price } from '../amounts/price';
import { ChainId } from '../constants/constants';
import { Currency, NATIVE, Token, WNATIVE } from './currency';
import { Pair } from './pair';

export class Route {
  public readonly pairs: Pair[];
  public readonly path: Token[];
  public readonly input: Currency;
  public readonly output: Currency;
  public readonly midPrice: Price;

  public constructor(pairs: Pair[], input: Currency, output?: Currency) {
    const chainId: ChainId = pairs[0].chainId;

    invariant(pairs.length > 0, 'PAIRS');
    invariant(
      pairs.every(pair => pair.chainId === chainId),
      'CHAIN_IDS',
    );
    invariant((input instanceof Token && pairs[0].involvesToken(input)) || (input === NATIVE[chainId] && pairs[0].involvesToken(WNATIVE[chainId])), 'INPUT');
    invariant(
      typeof output === 'undefined' ||
        (output instanceof Token && pairs[pairs.length - 1].involvesToken(output)) ||
        (output === NATIVE[chainId] && pairs[pairs.length - 1].involvesToken(WNATIVE[chainId])),
      'OUTPUT',
    );

    const path: Token[] = [input instanceof Token ? input : WNATIVE[chainId]];
    for (const [i, pair] of pairs.entries()) {
      const currentInput = path[i];
      invariant(currentInput.equals(pair.token0) || currentInput.equals(pair.token1), 'PATH');
      const output = currentInput.equals(pair.token0) ? pair.token1 : pair.token0;
      path.push(output);
    }

    this.pairs = pairs;
    this.path = path;
    this.midPrice = Price.fromRoute(this);
    this.input = input;
    this.output = output ?? path[path.length - 1];
  }

  public get chainId(): ChainId {
    return this.pairs[0].chainId;
  }
}
