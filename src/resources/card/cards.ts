import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type {
  Card,
  CardAmountParams,
  CardAmountResult,
  CardEnvelope,
  CardListResponse,
  CardProductsResponse,
  CardSimpleResult,
  CardStatusResult,
  CardTransactionsQuery,
  CardTransactionsResponse,
  CreateCardParams,
  GetCardQuery,
  SetCardPinParams,
} from '../../types/card.js';

const CARDS = '/api/v1/card/cards';

/**
 * Virtual card lifecycle: issue, fund, withdraw, freeze and terminate.
 * `client.card.cards`.
 *
 * Errors raised by the card issuer itself are forwarded verbatim
 * (`{ status: "failure", message, code }`) and surface as a
 * `CrypturesApiError` whose `code`/`message` come from that body.
 */
export class CardCards extends APIResource {
  /**
   * Creates a virtual card, atomically debiting the project's USD balance
   * (`card.create`). **Not retried automatically** -- an ambiguous failure
   * may still have created the card; check `list` before trying again.
   */
  create(params: CreateCardParams, options?: RequestOptions): APIPromise<CardEnvelope<Card>> {
    return this._client.request({ method: 'POST', path: `${CARDS}/create`, body: params, retryable: false }, options);
  }

  /** Fetches a card by id, including PAN and CVV for API-key callers (`card.get`). */
  get(cardId: string, query?: GetCardQuery, options?: RequestOptions): APIPromise<CardEnvelope<Card>> {
    return this._client.request({ method: 'GET', path: `${CARDS}${path`/${cardId}`}`, query: { ...query }, retryable: true }, options);
  }

  /** Lists every card of the calling project, newest first (`card.list`). */
  list(options?: RequestOptions): APIPromise<CardListResponse> {
    return this._client.request({ method: 'GET', path: CARDS, retryable: true }, options);
  }

  /** The active card product catalog -- the codes `create` accepts (`card.products.list`). */
  listProducts(options?: RequestOptions): APIPromise<CardProductsResponse> {
    return this._client.request({ method: 'GET', path: '/api/v1/card/products', retryable: true }, options);
  }

  /**
   * Sets a 6-digit PIN. us_493_visa_atm cards only (`card.setpin`).
   * **Not retried automatically.**
   */
  setPin(cardId: string, params: SetCardPinParams, options?: RequestOptions): APIPromise<CardSimpleResult> {
    return this._client.request({ method: 'POST', path: `${CARDS}${path`/${cardId}/pin`}`, body: params, retryable: false }, options);
  }

  /**
   * Adds funds to a card, debiting the project's balance plus a top-up fee
   * (`card.fund`). **Not retried automatically.**
   */
  fund(cardId: string, params: CardAmountParams, options?: RequestOptions): APIPromise<CardEnvelope<CardAmountResult>> {
    return this._client.request(
      { method: 'POST', path: `${CARDS}${path`/${cardId}/fund`}`, body: params, retryable: false },
      options,
    );
  }

  /**
   * Withdraws funds from a card back to the project's balance
   * (`card.withdraw`). **Not retried automatically.**
   */
  withdraw(cardId: string, params: CardAmountParams, options?: RequestOptions): APIPromise<CardEnvelope<CardAmountResult>> {
    return this._client.request(
      { method: 'POST', path: `${CARDS}${path`/${cardId}/withdraw`}`, body: params, retryable: false },
      options,
    );
  }

  /** Permanently terminates a card (`card.terminate`). **Not retried automatically.** */
  terminate(cardId: string, options?: RequestOptions): APIPromise<CardStatusResult<'terminated'>> {
    return this._client.request({ method: 'POST', path: `${CARDS}${path`/${cardId}/terminate`}`, retryable: false }, options);
  }

  /** Freezes a card (`card.block`). **Not retried automatically.** */
  block(cardId: string, options?: RequestOptions): APIPromise<CardStatusResult<'blocked'>> {
    return this._client.request({ method: 'POST', path: `${CARDS}${path`/${cardId}/block`}`, retryable: false }, options);
  }

  /** Unfreezes a previously blocked card (`card.unblock`). **Not retried automatically.** */
  unblock(cardId: string, options?: RequestOptions): APIPromise<CardStatusResult<'active'>> {
    return this._client.request({ method: 'POST', path: `${CARDS}${path`/${cardId}/unblock`}`, retryable: false }, options);
  }

  /** A card's transaction history (`card.transactions`). */
  listTransactions(cardId: string, query?: CardTransactionsQuery, options?: RequestOptions): APIPromise<CardTransactionsResponse> {
    return this._client.request(
      { method: 'GET', path: `${CARDS}${path`/${cardId}/transactions`}`, query: { ...query }, retryable: true },
      options,
    );
  }
}
