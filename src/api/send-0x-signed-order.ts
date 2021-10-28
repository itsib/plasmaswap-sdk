import { Signed0xOrder } from '../types';
import { get0xApiUrl } from '../utils';

export async function send0xSignedOrder(order: Signed0xOrder, abort?: AbortSignal): Promise<any> {
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
