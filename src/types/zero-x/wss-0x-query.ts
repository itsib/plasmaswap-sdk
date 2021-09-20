export interface Wss0xQuery {
  /**
   * The type of message being sent. Only "subscribe" is supported for now.
   */
  type: 'subscribe';
  /**
   * The topic of the messaging. Only "orders" is supported for now.
   */
  channel: 'orders';
  /**
   * A string uuid that will be sent back by the server in response messages so the client can appropriately respond when multiple subscriptions are made.
   */
  requestId: string;
  /**
   * Request filter, if undefined, to subscribe to all orders
   */
  payload?: {
    /**
     * Filter orders by the address of the ERC20 token the maker is selling.
     */
    makerToken?: string;
    /**
     * Filter orders by the address of the ERC20 token the taker is selling
     */
    takerToken?: string;
  };
}
