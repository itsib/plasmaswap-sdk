import { Signed0xOrderWidthMeta } from './signed-0x-order-width-meta';

export interface Wss0xMessage {
  type: 'update';
  channel: 'orders';
  requestId: string;
  payload: Signed0xOrderWidthMeta[];
}
