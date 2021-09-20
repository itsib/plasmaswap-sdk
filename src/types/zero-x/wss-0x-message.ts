import { Signed0xOrderWithMeta } from './signed-0x-order-with-meta';

export interface Wss0xMessage {
  type: 'update';
  channel: 'orders';
  requestId: string;
  payload: Signed0xOrderWithMeta[];
}
