import JSBI from 'jsbi';

// exports for external consumption
export type BigintIsh = JSBI | bigint | string;

export enum ChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GÖRLI = 5,
  KOVAN = 42,
  MATIC = 137,
}

export enum LiquidityProvider {
  PLASMA,
  UNISWAP,
  SUSHISWAP,
}

export enum Trade0xLiquiditySource {
  Native = 'Native',
  Uniswap = 'Uniswap',
  UniswapV2 = 'Uniswap_V2',
  UniswapV3 = 'Uniswap_V3',
  Eth2Dai = 'Eth2Dai',
  Kyber = 'Kyber',
  Curve = 'Curve',
  LiquidityProvider = 'LiquidityProvider',
  MultiBridge = 'MultiBridge',
  Balancer = 'Balancer',
  BalancerV2 = 'Balancer_V2',
  Cream = 'CREAM',
  Bancor = 'Bancor',
  MStable = 'mStable',
  Mooniswap = 'Mooniswap',
  MultiHop = 'MultiHop',
  Shell = 'Shell',
  Swerve = 'Swerve',
  SnowSwap = 'SnowSwap',
  SushiSwap = 'SushiSwap',
  Dodo = 'DODO',
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

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const NETWORK_LABEL: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: 'Ethereum',
  [ChainId.RINKEBY]: 'Rinkeby',
  [ChainId.ROPSTEN]: 'Ropsten',
  [ChainId.GÖRLI]: 'Görli',
  [ChainId.KOVAN]: 'Kovan',
  [ChainId.MATIC]: 'Polygon',
};

export const NETWORK_NAME: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: 'Ethereum Mainnet',
  [ChainId.RINKEBY]: 'Rinkeby Test Network',
  [ChainId.ROPSTEN]: 'Ropsten Test Network',
  [ChainId.GÖRLI]: 'Goerli Test Network',
  [ChainId.KOVAN]: 'Kovan Test Network',
  [ChainId.MATIC]: 'Polygon Matic',
};

export interface LpConfiguration {
  factory: string;
  router: string;
  initCodeHash: string;
  createdTimestamp: number;
  createdBlockNumber: number;
  graphUrl?: string;
}

export const LP_CONFIGURATIONS: { [chainId in ChainId]: { [lpProvider in LiquidityProvider]?: LpConfiguration } } = {
  [ChainId.MAINNET]: {
    [LiquidityProvider.UNISWAP]: {
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      createdTimestamp: 1588610042,
      createdBlockNumber: 10000835,
      graphUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    },
    [LiquidityProvider.PLASMA]: {
      factory: '0xd87Ad19db2c4cCbf897106dE034D52e3DD90ea60',
      router: '0x5ec243F1F7ECFC137e98365C30c9A28691d86132',
      initCodeHash: '0x611ee9501fb19c9df82695e66f6c58d69d86907b531dfbed652231515ae84081',
      createdTimestamp: 1611490369,
      createdBlockNumber: 11718234,
      graphUrl: 'https://api.thegraph.com/subgraphs/name/itsib/plasmaswap-v2',
    },
    [LiquidityProvider.SUSHISWAP]: {
      factory: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
      router: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
      initCodeHash: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
      createdTimestamp: 1599214239,
      createdBlockNumber: 10794229,
      graphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
    },
  },
  [ChainId.ROPSTEN]: {
    [LiquidityProvider.UNISWAP]: {
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      createdTimestamp: 1588609929,
      createdBlockNumber: 7842777,
    },
  },
  [ChainId.RINKEBY]: {
    [LiquidityProvider.UNISWAP]: {
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      createdTimestamp: 1588609623,
      createdBlockNumber: 6430279,
    },
  },
  [ChainId.GÖRLI]: {
    [LiquidityProvider.UNISWAP]: {
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      createdTimestamp: 1616151422,
      createdBlockNumber: 4467712,
    },
  },
  [ChainId.KOVAN]: {
    [LiquidityProvider.UNISWAP]: {
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      createdTimestamp: 1588609788,
      createdBlockNumber: 18344859,
      graphUrl: 'https://api.thegraph.com/subgraphs/name/maurodelazeri/uniswapv2-kovan',
    },
    [LiquidityProvider.PLASMA]: {
      factory: '0x7A6521ba7Ba45C908be726D719ACd547D4a8E246',
      router: '0x905df0e2cd022bc1a67bf15df485b18ea631d304',
      initCodeHash: '0xe60eb03e61b5fbeba179f6defb71bb00c5db9dab3b10d39c3985d66081de6d3d',
      createdTimestamp: 1606861200,
      createdBlockNumber: 22379351,
      graphUrl: 'https://api.thegraph.com/subgraphs/name/itsib/plasmaswap',
    },
    [LiquidityProvider.SUSHISWAP]: {
      factory: '0x8D4FD620CB7Ed677870b8b62f22c166cC76fb519',
      router: '0x4A0b3a56ECb360924639F57Cd41d0358Aed9aCDd',
      initCodeHash: '0xa0f8210a4091231cb34588d36a21ac73a6681adda0d825bf06c963da5ff4af47',
      createdTimestamp: 1612524980,
      createdBlockNumber: 23322618,
    },
  },
  [ChainId.MATIC]: {
    [LiquidityProvider.PLASMA]: {
      factory: '0x745c475CC101cA5580eFf6F723976480881BC008',
      router: '0x5D5BADeF6F69cBafDF443D6226dC00B24626367E',
      initCodeHash: '0xb19b1e3807140bf48c498cb50370e129d9bd9e5e333bf0e67d9ce7507e634b72',
      createdTimestamp: 1623075489,
      createdBlockNumber: 15441546,
      graphUrl: 'https://api.thegraph.com/subgraphs/name/itsib/plasmaswap-poligon',
    },
    [LiquidityProvider.SUSHISWAP]: {
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      initCodeHash: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
      createdTimestamp: 1614311449,
      createdBlockNumber: 11333218,
      graphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange',
    },
  },
};

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000);

/**
 * The name of the LP token affects the signature, DO NOT CHANGE IT!!!
 */
export const LIQUIDITY_TOKEN_NAME = {
  [LiquidityProvider.UNISWAP]: 'Uniswap V2',
  [LiquidityProvider.PLASMA]: 'Plasmaswap',
  [LiquidityProvider.SUSHISWAP]: 'SushiSwap LP Token',
};

export const LIQUIDITY_TOKEN_SYMBOL = {
  [LiquidityProvider.UNISWAP]: 'UNI-V2',
  [LiquidityProvider.PLASMA]: 'P-LP',
  [LiquidityProvider.SUSHISWAP]: 'SLP',
};

export const LIQUIDITY_PROVIDER_SYMBOL: { [provider in LiquidityProvider]: string } = {
  [LiquidityProvider.PLASMA]: 'PLASMA',
  [LiquidityProvider.UNISWAP]: 'UNISWAP',
  [LiquidityProvider.SUSHISWAP]: 'SUSHISWAP',
};

export const LIQUIDITY_PROVIDER_NAME: { [provider in LiquidityProvider]: string } = {
  [LiquidityProvider.PLASMA]: 'PlasmaSwap',
  [LiquidityProvider.UNISWAP]: 'Uniswap',
  [LiquidityProvider.SUSHISWAP]: 'SushiSwap',
};

export const SUPPORTED_0X_CHAINS: ChainId[] = [ChainId.MAINNET, ChainId.MATIC, ChainId.ROPSTEN];

// Exports for internal consumption
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
