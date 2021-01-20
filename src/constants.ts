import JSBI from 'jsbi';

// exports for external consumption
export type BigintIsh = JSBI | bigint | string;

export enum ChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GÖRLI = 5,
  KOVAN = 42,
}

export enum LiquidityProvider {
  PLASMA,
  UNISWAP,
}

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export const FACTORY_ADDRESS = {
  [LiquidityProvider.UNISWAP]: {
    [ChainId.MAINNET]: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    [ChainId.ROPSTEN]: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    [ChainId.RINKEBY]: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    [ChainId.GÖRLI]: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    [ChainId.KOVAN]: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  },
  [LiquidityProvider.PLASMA]: {
    [ChainId.MAINNET]: '',
    [ChainId.ROPSTEN]: '',
    [ChainId.RINKEBY]: '',
    [ChainId.GÖRLI]: '',
    [ChainId.KOVAN]: '0x7A6521ba7Ba45C908be726D719ACd547D4a8E246',
  },
};

export const INIT_CODE_HASH = {
  [LiquidityProvider.UNISWAP]: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  [LiquidityProvider.PLASMA]: '0xe60eb03e61b5fbeba179f6defb71bb00c5db9dab3b10d39c3985d66081de6d3d',
};

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000);

export const LIQUIDITY_TOKEN_NAME = {
  [LiquidityProvider.UNISWAP]: 'Uniswap V2',
  [LiquidityProvider.PLASMA]: 'Plasmaswap',
};

export const LIQUIDITY_TOKEN_SYMBOL = {
  [LiquidityProvider.UNISWAP]: 'UNI-V2',
  [LiquidityProvider.PLASMA]: 'P-LP',
};

// exports for internal consumption
export const ZERO = JSBI.BigInt(0);
export const ONE = JSBI.BigInt(1);
export const TWO = JSBI.BigInt(2);
export const THREE = JSBI.BigInt(3);
export const FIVE = JSBI.BigInt(5);
export const TEN = JSBI.BigInt(10);
export const _100 = JSBI.BigInt(100);
export const _997 = JSBI.BigInt(997);
export const _1000 = JSBI.BigInt(1000);

export enum SolidityType {
  uint8 = 'uint8',
  uint256 = 'uint256',
}

export const SOLIDITY_TYPE_MAXIMA = {
  [SolidityType.uint8]: JSBI.BigInt('0xff'),
  [SolidityType.uint256]: JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
};
