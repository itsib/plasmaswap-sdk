import { get0xApiUrl } from './get-0x-api-url';

export interface Signed0xOrder {
  chainId: number;
  expiry: string;
  feeRecipient: string;
  maker: string;
  makerAmount: string;
  makerToken: string;
  pool: string;
  salt: string;
  sender: string;
  taker: string;
  takerAmount: string;
  takerToken: string;
  takerTokenFeeAmount: string;
  verifyingContract: string;
  signature: {
    signatureType: number;
    r: string;
    s: string;
    v: number;
  };
}

export async function sendSigned0xOrder(order: Signed0xOrder, abort?: AbortSignal): Promise<any> {
  const host = get0xApiUrl(order.chainId);
  const res: Response = await fetch(`${host}/sra/v4/order`, {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(order),
    signal: abort,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 400) {
      const error = await res.json();
      throw new Error(error.validationErrors?.[0]?.reason || error.reason || 'Unknown validation error');
    }
    throw new Error('Send signed order error');
  }

  return await res.text();
}
