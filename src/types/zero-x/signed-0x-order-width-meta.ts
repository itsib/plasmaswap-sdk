import { Signed0xOrder } from './signed-0x-order';

export interface Signed0xOrderWidthMeta {
  order: Signed0xOrder;
  metaData: {
    orderHash: string;
    remainingFillableTakerAmount: string;
    createdAt?: string;
    state?: 'EXPIRED' | 'ADDED';
  };
}
