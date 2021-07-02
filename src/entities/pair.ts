import { getCreate2Address } from '@ethersproject/address';
import { keccak256, pack } from '@ethersproject/solidity';
import { InsufficientInputAmountError, InsufficientReservesError } from '../errors';
import JSBI from 'jsbi';
import invariant from 'tiny-invariant';
import {
  _1000,
  _997,
  BigintIsh,
  ChainId,
  FIVE,
  LIQUIDITY_PROVIDER_NAME,
  LIQUIDITY_TOKEN_NAME,
  LIQUIDITY_TOKEN_SYMBOL,
  LiquidityProvider,
  MINIMUM_LIQUIDITY,
  NETWORK_LABEL,
  ONE,
  ZERO,
} from '../constants/constants';
import { getLpConfiguration, parseBigintIsh, sqrt } from '../utils';
import { TokenAmount, Price } from './fractions';
import { Token } from './token';

type PairAddressCache = {
  [provider: number]: {
    [token0Address: string]: {
      [token1Address: string]: string;
    };
  };
};

const PAIR_ADDRESS_CACHE: PairAddressCache = {};

export class Pair {
  public readonly liquidityToken: Token;

  public readonly liquidityProvider: LiquidityProvider;

  private readonly tokenAmounts: [TokenAmount, TokenAmount];

  public static getAddress(tokenA: Token, tokenB: Token, lp: LiquidityProvider): string {
    const tokens = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    const conf = getLpConfiguration(tokenA.chainId, lp);

    if (!conf) {
      throw new Error(`Unsupported liquidity provider ${LIQUIDITY_PROVIDER_NAME[lp]} in network ${NETWORK_LABEL[tokenA.chainId]}`);
    }

    // To check cashed liquidity pool address, and generate address and save it
    if (!PAIR_ADDRESS_CACHE?.[lp]?.[tokens[0].address]?.[tokens[1].address]) {
      const address = getCreate2Address(
        conf.factory,
        keccak256(['bytes'], [pack(['address', 'address'], [tokens[0].address, tokens[1].address])]),
        conf.initCodeHash,
      );

      if (!PAIR_ADDRESS_CACHE[lp]) {
        PAIR_ADDRESS_CACHE[lp] = {};
      }
      if (!PAIR_ADDRESS_CACHE[lp][tokens[0].address]) {
        PAIR_ADDRESS_CACHE[lp][tokens[0].address] = {};
      }
      PAIR_ADDRESS_CACHE[lp][tokens[0].address][tokens[1].address] = address;
    }

    return PAIR_ADDRESS_CACHE[lp][tokens[0].address][tokens[1].address];
  }

  /**
   * Given two tokens return the liquidity token that represents its liquidity shares
   * @param tokenA one of the two tokens
   * @param tokenB the other token
   * @param lp
   */
  public static toTokenOfLiquidity(tokenA: Token, tokenB: Token, lp: LiquidityProvider): Token {
    return new Token(tokenA.chainId, Pair.getAddress(tokenA, tokenB, lp), 18, LIQUIDITY_TOKEN_SYMBOL[lp], LIQUIDITY_TOKEN_NAME[lp]);
  }

  public constructor(tokenAmountA: TokenAmount, tokenAmountB: TokenAmount, lp: LiquidityProvider) {
    const tokenAmounts = tokenAmountA.token.sortsBefore(tokenAmountB.token) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA];

    this.liquidityProvider = lp;

    this.liquidityToken = Pair.toTokenOfLiquidity(tokenAmounts[0].token, tokenAmounts[1].token, lp);

    this.tokenAmounts = tokenAmounts as [TokenAmount, TokenAmount];
  }

  /**
   * Returns true if the token is either token0 or token1
   * @param token to check
   */
  public involvesToken(token: Token): boolean {
    return token.equals(this.token0) || token.equals(this.token1);
  }

  /**
   * Returns the current mid price of the pair in terms of token0, i.e. the ratio of reserve1 to reserve0
   */
  public get token0Price(): Price {
    return new Price(this.token0, this.token1, this.tokenAmounts[0].raw, this.tokenAmounts[1].raw);
  }

  /**
   * Returns the current mid price of the pair in terms of token1, i.e. the ratio of reserve0 to reserve1
   */
  public get token1Price(): Price {
    return new Price(this.token1, this.token0, this.tokenAmounts[1].raw, this.tokenAmounts[0].raw);
  }

  /**
   * Return the price of the given token in terms of the other token in the pair.
   * @param token token to return price of
   */
  public priceOf(token: Token): Price {
    invariant(this.involvesToken(token), 'TOKEN');
    return token.equals(this.token0) ? this.token0Price : this.token1Price;
  }

  /**
   * Returns the chain ID of the tokens in the pair.
   */
  public get chainId(): ChainId {
    return this.token0.chainId;
  }

  public get token0(): Token {
    return this.tokenAmounts[0].token;
  }

  public get token1(): Token {
    return this.tokenAmounts[1].token;
  }

  public get reserve0(): TokenAmount {
    return this.tokenAmounts[0];
  }

  public get reserve1(): TokenAmount {
    return this.tokenAmounts[1];
  }

  public reserveOf(token: Token): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN');
    return token.equals(this.token0) ? this.reserve0 : this.reserve1;
  }

  public getOutputAmount(inputAmount: TokenAmount): [TokenAmount, Pair] {
    invariant(this.involvesToken(inputAmount.token), 'TOKEN');

    if (JSBI.equal(this.reserve0.raw, ZERO) || JSBI.equal(this.reserve1.raw, ZERO)) {
      throw new InsufficientReservesError();
    }

    const inputReserve = this.reserveOf(inputAmount.token);
    const outputReserve = this.reserveOf(inputAmount.token.equals(this.token0) ? this.token1 : this.token0);
    const inputAmountWithFee = JSBI.multiply(inputAmount.raw, _997);
    const numerator = JSBI.multiply(inputAmountWithFee, outputReserve.raw);
    const denominator = JSBI.add(JSBI.multiply(inputReserve.raw, _1000), inputAmountWithFee);
    const outputAmount = new TokenAmount(inputAmount.token.equals(this.token0) ? this.token1 : this.token0, JSBI.divide(numerator, denominator));

    if (JSBI.equal(outputAmount.raw, ZERO)) {
      throw new InsufficientInputAmountError();
    }

    return [outputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount), this.liquidityProvider)];
  }

  public getInputAmount(outputAmount: TokenAmount): [TokenAmount, Pair] {
    invariant(this.involvesToken(outputAmount.token), 'TOKEN');
    if (
      JSBI.equal(this.reserve0.raw, ZERO) ||
      JSBI.equal(this.reserve1.raw, ZERO) ||
      JSBI.greaterThanOrEqual(outputAmount.raw, this.reserveOf(outputAmount.token).raw)
    ) {
      throw new InsufficientReservesError();
    }

    const outputReserve = this.reserveOf(outputAmount.token);
    const inputReserve = this.reserveOf(outputAmount.token.equals(this.token0) ? this.token1 : this.token0);
    const numerator = JSBI.multiply(JSBI.multiply(inputReserve.raw, outputAmount.raw), _1000);
    const denominator = JSBI.multiply(JSBI.subtract(outputReserve.raw, outputAmount.raw), _997);
    const inputAmount = new TokenAmount(outputAmount.token.equals(this.token0) ? this.token1 : this.token0, JSBI.add(JSBI.divide(numerator, denominator), ONE));

    return [inputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount), this.liquidityProvider)];
  }

  public getLiquidityMinted(totalSupply: TokenAmount, tokenAmountA: TokenAmount, tokenAmountB: TokenAmount): TokenAmount {
    invariant(totalSupply.token.equals(this.liquidityToken), 'LIQUIDITY');
    const tokenAmounts = tokenAmountA.token.sortsBefore(tokenAmountB.token) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA];
    invariant(tokenAmounts[0].token.equals(this.token0) && tokenAmounts[1].token.equals(this.token1), 'TOKEN');

    let liquidity: JSBI;
    if (JSBI.equal(totalSupply.raw, ZERO)) {
      liquidity = JSBI.subtract(sqrt(JSBI.multiply(tokenAmounts[0].raw, tokenAmounts[1].raw)), MINIMUM_LIQUIDITY);
    } else {
      const amount0 = JSBI.divide(JSBI.multiply(tokenAmounts[0].raw, totalSupply.raw), this.reserve0.raw);
      const amount1 = JSBI.divide(JSBI.multiply(tokenAmounts[1].raw, totalSupply.raw), this.reserve1.raw);
      liquidity = JSBI.lessThanOrEqual(amount0, amount1) ? amount0 : amount1;
    }
    if (!JSBI.greaterThan(liquidity, ZERO)) {
      throw new InsufficientInputAmountError();
    }
    return new TokenAmount(this.liquidityToken, liquidity);
  }

  public getLiquidityValue(token: Token, totalSupply: TokenAmount, liquidity: TokenAmount, feeOn: boolean = false, kLast?: BigintIsh): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN');
    invariant(totalSupply.token.equals(this.liquidityToken), 'TOTAL_SUPPLY');
    invariant(liquidity.token.equals(this.liquidityToken), 'LIQUIDITY');
    invariant(JSBI.lessThanOrEqual(liquidity.raw, totalSupply.raw), 'LIQUIDITY');

    let totalSupplyAdjusted: TokenAmount;
    if (!feeOn) {
      totalSupplyAdjusted = totalSupply;
    } else {
      invariant(!!kLast, 'K_LAST');
      const kLastParsed = parseBigintIsh(kLast);
      if (!JSBI.equal(kLastParsed, ZERO)) {
        const rootK = sqrt(JSBI.multiply(this.reserve0.raw, this.reserve1.raw));
        const rootKLast = sqrt(kLastParsed);
        if (JSBI.greaterThan(rootK, rootKLast)) {
          const numerator = JSBI.multiply(totalSupply.raw, JSBI.subtract(rootK, rootKLast));
          const denominator = JSBI.add(JSBI.multiply(rootK, FIVE), rootKLast);
          const feeLiquidity = JSBI.divide(numerator, denominator);
          totalSupplyAdjusted = totalSupply.add(new TokenAmount(this.liquidityToken, feeLiquidity));
        } else {
          totalSupplyAdjusted = totalSupply;
        }
      } else {
        totalSupplyAdjusted = totalSupply;
      }
    }

    return new TokenAmount(token, JSBI.divide(JSBI.multiply(liquidity.raw, this.reserveOf(token).raw), totalSupplyAdjusted.raw));
  }
}
