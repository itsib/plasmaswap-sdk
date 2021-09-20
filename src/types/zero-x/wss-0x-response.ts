import { Signed0xOrder } from './signed-0x-order';
import { Signed0xOrderMeta } from './signed-0x-order-meta';

export interface Wss0xResponse {
  type: 'update';
  channel: 'orders';
  requestId: string;
  payload: {
    metaData: Signed0xOrderMeta;
    order: Signed0xOrder;
  };
}
