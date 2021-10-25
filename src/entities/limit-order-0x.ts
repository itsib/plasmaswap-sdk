import { concat, Signature } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import invariant from 'tiny-invariant';
import { TokenAmount } from '../amounts';
import { send0xSignedOrder } from '../api';
import { ChainId, SUPPORTED_0X_CHAINS, ZERO_ADDRESS, ZERO_EX_PROXY_ADDRESS, ZERO_WORD } from '../constants/constants';
import { Signed0xOrder } from '../types';
import {
  EIP712_DOMAIN_ABI_HASH,
  EIP712_LIMIT_ORDER_ABI,
  EIP712_LIMIT_ORDER_ABI_HASH,
  EIP712Domain,
  EIP712MessageForLimitOrder,
  EIP712TypedData,
  formatHexString,
  getLimitOrderEIP712TypedData,
  toCurrencyAmount,
} from '../utils';

export class LimitOrder0x {
  // The account of the maker, and signer, of this order.
  public account: string;

  public sell: TokenAmount;

  public buy: TokenAmount;

  public expiry: number;

  public takerTokenFeeAmount: TokenAmount;

  public feeRecipient: string;

  protected chainId: ChainId;
  protected verifyingContract: string;
  protected salt: string;

  public static TYPE_HASH = EIP712_LIMIT_ORDER_ABI_HASH;

  public static PROXY_DOMAIN_NAME = 'ZeroEx';

  public static PROXY_DOMAIN_VERSION = '1.0.0';

  public static toArray(order: Signed0xOrder): string[] {
    return EIP712_LIMIT_ORDER_ABI.reduce<string[]>((tuple, { name }) => {
      if (name in order) {
        tuple.push(`${order[name as keyof Signed0xOrder]}`);
      }
      return tuple;
    }, []);
  }

  constructor(chainId: ChainId, account: string, sell: TokenAmount, buy: TokenAmount, expiry: number, takerTokenFeeAmount?: TokenAmount, feeRecipient?: string) {
    invariant(!sell.token.equals(buy.token), 'Sell and buy tokens is same.');
    invariant(!takerTokenFeeAmount || buy.token.equals(takerTokenFeeAmount.token), 'Taker token fee amount should be same token');
    invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');
    const verifyingContract = ZERO_EX_PROXY_ADDRESS[chainId];
    invariant(verifyingContract, 'Proxy contract not find');

    this.chainId = chainId;
    this.verifyingContract = verifyingContract;
    this.account = account.toLowerCase();
    this.sell = sell;
    this.buy = buy;
    this.expiry = expiry;
    this.takerTokenFeeAmount = takerTokenFeeAmount || (toCurrencyAmount(buy.token, '0') as TokenAmount);
    this.feeRecipient = feeRecipient?.toLowerCase() || ZERO_ADDRESS;
    this.salt = Date.now().toString();
  }

  /**
   * Returns RAW order fields
   */
  public raw(): { [key: string]: string } {
    return {
      makerToken: this.sell.token.address.toLowerCase(),
      takerToken: this.buy.token.address.toLowerCase(),
      makerAmount: this.sell.raw.toString(10),
      takerAmount: this.buy.raw.toString(10),
      takerTokenFeeAmount: this.takerTokenFeeAmount.raw.toString(10),
      maker: this.account,
      taker: ZERO_ADDRESS,
      sender: ZERO_ADDRESS,
      feeRecipient: this.feeRecipient,
      pool: ZERO_WORD,
      expiry: this.expiry.toString(10),
      salt: this.salt,
    };
  }

  /**
   * Calculates and returns order struct hash
   */
  public getStructHash(): string {
    const rawOrder = this.raw();
    return keccak256(
      concat([
        formatHexString(LimitOrder0x.TYPE_HASH),
        formatHexString(rawOrder.makerToken),
        formatHexString(rawOrder.takerToken),
        formatHexString(rawOrder.makerAmount),
        formatHexString(rawOrder.takerAmount),
        formatHexString(rawOrder.takerTokenFeeAmount),
        formatHexString(rawOrder.maker),
        formatHexString(rawOrder.taker),
        formatHexString(rawOrder.sender),
        formatHexString(rawOrder.feeRecipient),
        formatHexString(rawOrder.pool),
        formatHexString(rawOrder.expiry),
        formatHexString(rawOrder.salt),
      ]),
    );
  }

  /**
   * Calculates and returns order hash
   */
  public getHash(): string {
    const domainHash = keccak256(
      concat([
        EIP712_DOMAIN_ABI_HASH,
        keccak256(Buffer.from(LimitOrder0x.PROXY_DOMAIN_NAME, 'utf8')),
        keccak256(Buffer.from(LimitOrder0x.PROXY_DOMAIN_VERSION, 'utf8')),
        formatHexString(`${this.chainId}`),
        formatHexString(`${this.verifyingContract}`),
      ]),
    );

    return keccak256(concat(['0x1901', domainHash, this.getStructHash()]));
  }

  /**
   * Returns order TypedData for sign
   */
  public getEIP712TypedData(): EIP712TypedData {
    const domain: EIP712Domain = {
      chainId: this.chainId,
      verifyingContract: this.verifyingContract,
      name: LimitOrder0x.PROXY_DOMAIN_NAME,
      version: LimitOrder0x.PROXY_DOMAIN_VERSION,
    };
    const message: EIP712MessageForLimitOrder = this.raw() as EIP712MessageForLimitOrder;

    return getLimitOrderEIP712TypedData(domain, message);
  }

  /**
   * Send signed order to exchange
   * @param signature
   */
  public async send(signature: Signature) {
    const order: Signed0xOrder = Object.assign<Signed0xOrder, Partial<Signed0xOrder>, Partial<Signed0xOrder>>({} as Signed0xOrder, this.raw(), {
      verifyingContract: this.verifyingContract,
      chainId: this.chainId,
      signature: {
        signatureType: 2,
        r: signature.r,
        s: signature.s,
        v: signature.v,
      },
    });

    return send0xSignedOrder(order);
  }
}
