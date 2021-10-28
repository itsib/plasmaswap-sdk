import { ChainId } from '../constants/constants';
import { Signed0xOrderWithMeta } from '../types';
import { get0xApiUrl } from '../utils';

export async function fetch0xSignedOrder(chainId: ChainId, hash: string, abort?: AbortSignal): Promise<Signed0xOrderWithMeta> {
  const host = get0xApiUrl(chainId);
  const url = `${host}/sra/v4/order/${hash}`;

  const res: Response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    signal: abort,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Fetch order error, try again later.');
  }

  return await res.json();
}
