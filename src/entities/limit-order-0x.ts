import { Signature } from '@ethersproject/bytes';
import invariant from 'tiny-invariant';
import { TokenAmount } from '../amounts';
import { send0xSignedOrder } from '../api';
import { ChainId, SUPPORTED_0X_CHAINS, ZERO_ADDRESS, ZERO_WORD } from '../constants/constants';
import { Signed0xOrder } from '../types';
import { EIP712Domain, EIP712MessageForLimitOrder, EIP712TypedData, getLimitOrderEIP712TypedData, getSalt, toCurrencyAmount } from '../utils';
import { get0xExchangeProxyContract } from '../utils/get-0x-contracts';

export class LimitOrder0x {
  // The account of the maker, and signer, of this order.
  public account: string;

  public sell: TokenAmount;

  public buy: TokenAmount;

  public expiry: number;

  public takerTokenFeeAmount: TokenAmount;

  public feeRecipient: string;

  protected chainId?: ChainId;
  protected verifyingContract?: string;
  protected salt?: string;

  constructor(account: string, sell: TokenAmount, buy: TokenAmount, expiry: number, takerTokenFeeAmount?: TokenAmount, feeRecipient?: string) {
    invariant(!sell.token.equals(buy.token), 'Sell and buy tokens is same.');
    invariant(!takerTokenFeeAmount || buy.token.equals(takerTokenFeeAmount.token), 'Taker token fee amount should be same token');

    this.account = account;
    this.sell = sell;
    this.buy = buy;
    this.expiry = expiry;
    this.takerTokenFeeAmount = takerTokenFeeAmount || (toCurrencyAmount(buy.token, '0') as TokenAmount);
    this.feeRecipient = feeRecipient || ZERO_ADDRESS;
  }

  public getEIP712TypedData(chainId: ChainId): EIP712TypedData {
    invariant(SUPPORTED_0X_CHAINS.includes(chainId), 'Unsupported chainId');
    const verifyingContract = get0xExchangeProxyContract(chainId);
    invariant(verifyingContract, 'Proxy contract not find');

    this.chainId = chainId;
    this.verifyingContract = verifyingContract;
    this.salt = getSalt();

    const domain: EIP712Domain = {
      chainId,
      verifyingContract,
      name: 'ZeroEx',
      version: '1.0.0',
    };
    const message: EIP712MessageForLimitOrder = {
      makerToken: this.sell.token.address,
      takerToken: this.buy.token.address,
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

    return getLimitOrderEIP712TypedData(domain, message);
  }

  public async send(signature: Signature) {
    invariant(this.chainId && this.verifyingContract && this.salt, 'The signature does not fit this order');

    const order: Signed0xOrder = {
      makerToken: this.sell.token.address,
      takerToken: this.buy.token.address,
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

      verifyingContract: this.verifyingContract,
      chainId: this.chainId,
      signature: {
        signatureType: 2,
        r: signature.r,
        s: signature.s,
        v: signature.v,
      },
    };

    return send0xSignedOrder(order);
  }
}
