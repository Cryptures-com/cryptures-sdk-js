import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import { toBlob } from '../../core/upload.js';
import type {
  Card,
  CardAmountParams,
  CardAmountResult,
  CardEnvelope,
  CardKycSubmitResponse,
  CardListResponse,
  CardProductsResponse,
  CardSimpleResult,
  CardStatusResult,
  CardTransactionsQuery,
  CardTransactionsResponse,
  CreateCardParams,
  GetCardQuery,
  KycDocument,
  SetCardPinParams,
  SubmitCardKycParams,
} from '../../types/card.js';

const CARDS = '/api/v1/card/cards';

function appendDocument(form: FormData, field: string, document: KycDocument): void {
  const named =
    document instanceof Blob || document instanceof ArrayBuffer || ArrayBuffer.isView(document) ? undefined : document;
  const file = named ? named.file : document;
  const fileName = typeof File !== 'undefined' && file instanceof File ? file.name : undefined;
  // Every part needs a file name to be a file part; fetch sets the multipart boundary header itself.
  form.append(field, toBlob(file as Blob, named?.contentType), named?.filename ?? fileName ?? field);
}

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

  /**
   * Submits the cardholder's identity documents for a card
   * (`card.kyc.submit`). Sent as `multipart/form-data` with `documentFront`
   * (required) and `documentBack` (optional). Each file is a PNG, JPG/JPEG or
   * PDF of at most 2 MB; the API checks the type from the content. Nothing is
   * validated client-side -- the API's errors surface as-is.
   *
   * Only cards whose product supports KYC accept documents: check
   * `kyc.supported` from `get`/`list` or `kyc_supported` from `listProducts`.
   * A one-time per-card fee (`kyc_fee_usd`, default 1 USD) is charged from the
   * project balance before submission; when the fee is 0 the upload is free
   * (`fee_charged_usd: 0`). Resubmitting is not charged again
   * (`fee_already_paid: true`). A `card.kyc_submitted` webhook event fires on
   * success.
   *
   * **Not retried automatically** -- it is charged and not idempotent. After a
   * 502 `upstream_error`, a 504 `upstream_timeout` or a network error the
   * outcome is unknown and the fee is held for review: check `get`
   * (`kyc.submitted`) and `balance.listTransactions` before submitting again.
   *
   * Errors (`CrypturesApiError.code`):
   * - 400 `invalid_request`, `missing_document_front`, `too_many_files`,
   *   `invalid_file_type`, and `kyc_rejected` (the issuer refused the
   *   documents; the fee is refunded automatically)
   * - 402 `insufficient_balance` (nothing is charged)
   * - 404 `card_not_found`
   * - 409 `kyc_not_supported`, `kyc_email_unknown`, `kyc_in_progress`
   * - 413 `file_too_large` (over 2 MB), `payload_too_large`
   * - 429 `rate_limited` (more than 5 submissions per card per day, or the per-minute limit)
   * - 502 `upstream_error`, 504 `upstream_timeout`
   */
  submitKyc(cardId: string, params: SubmitCardKycParams, options?: RequestOptions): APIPromise<CardKycSubmitResponse> {
    const form = new FormData();
    appendDocument(form, 'documentFront', params.documentFront);
    if (params.documentBack !== undefined) appendDocument(form, 'documentBack', params.documentBack);
    return this._client.request({ method: 'POST', path: `${CARDS}${path`/${cardId}/kyc`}`, formData: form, retryable: false }, options);
  }

  /** A card's transaction history (`card.transactions`). */
  listTransactions(cardId: string, query?: CardTransactionsQuery, options?: RequestOptions): APIPromise<CardTransactionsResponse> {
    return this._client.request(
      { method: 'GET', path: `${CARDS}${path`/${cardId}/transactions`}`, query: { ...query }, retryable: true },
      options,
    );
  }
}
