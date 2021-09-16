export interface EIP712Parameter {
  name: string;
  type: string;
}

export interface EIP712Types {
  [key: string]: EIP712Parameter[];
}

export type EIP712ObjectValue = string | number | EIP712Object;

export interface EIP712Object {
  [key: string]: EIP712ObjectValue;
}

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface EIP712TypedData {
  types: EIP712Types;
  domain: EIP712Domain;
  message: EIP712Object;
  primaryType: string;
}

export const EIP712_DOMAIN_PARAMETERS: EIP712Parameter[] = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

export const EIP712_PERMIT_PARAMETERS: EIP712Parameter[] = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
];

export const EIP712_LIMIT_ORDER_PARAMETERS: EIP712Parameter[] = [
  { type: 'address', name: 'makerToken' },
  { type: 'address', name: 'takerToken' },
  { type: 'uint128', name: 'makerAmount' },
  { type: 'uint128', name: 'takerAmount' },
  { type: 'uint128', name: 'takerTokenFeeAmount' },
  { type: 'address', name: 'maker' },
  { type: 'address', name: 'taker' },
  { type: 'address', name: 'sender' },
  { type: 'address', name: 'feeRecipient' },
  { type: 'bytes32', name: 'pool' },
  { type: 'uint64', name: 'expiry' },
  { type: 'uint256', name: 'salt' },
];

export interface EIP712MessageForPermit extends EIP712Object {
  owner: string;
  spender: string;
  value: string;
  deadline: number;
  nonce: string;
}

/**
 * Returns typed data for the issuing permission for the transfer of tokens (eth_signTypedData_v3, eth_signTypedData_v4)
 */
export function getEIP712TypedDataForPermit(domain: EIP712Domain, message: EIP712MessageForPermit): EIP712TypedData {
  return {
    types: {
      EIP712Domain: EIP712_DOMAIN_PARAMETERS,
      Permit: EIP712_PERMIT_PARAMETERS,
    },
    domain,
    primaryType: 'Permit',
    message,
  };
}

// export function getLimitOrderEIP712TypedData(): EIP712TypedData {
//
// }
