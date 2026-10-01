import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type {
  CardReportQuery,
  CardReportSummary,
  CardTag,
  CardTagListResponse,
  CreateCardTagParams,
  DeleteCardTagResponse,
  LedgerPage,
  LedgerQuery,
  ProjectBalance,
  SetCardTagsParams,
  SetCardTagsResponse,
  UpdateCardTagParams,
  UpdatedCardTag,
} from '../../types/card.js';
import type { RegisterWebhookParams, WebhookRegistration, WebhookStatus } from '../../types/common.js';

/** Card-domain webhook registration. `client.card.webhooks`. */
export class CardWebhooks extends APIResource {
  /**
   * Registers (or replaces) the project's card-event callback URL
   * (`card.webhooks.register`). The returned `secret` is shown only once.
   */
  register(params: RegisterWebhookParams, options?: RequestOptions): APIPromise<WebhookRegistration> {
    return this._client.request({ method: 'POST', path: '/api/v1/card/webhooks/register', body: params }, options);
  }

  /** Reads back the registered card webhook, without the secret (`card.webhooks.status`). */
  getStatus(options?: RequestOptions): APIPromise<WebhookStatus> {
    return this._client.request({ method: 'GET', path: '/api/v1/card/webhooks/status' }, options);
  }
}

/** The project's shared USD balance and its ledger. `client.card.balance`. */
export class CardBalance extends APIResource {
  /** The project's shared USD balance (`card.balance.get`). */
  get(options?: RequestOptions): APIPromise<ProjectBalance> {
    return this._client.request({ method: 'GET', path: '/api/v1/card/balance' }, options);
  }

  /** The project's whole-account balance ledger, newest first (`card.balance.transactions`). */
  listTransactions(query?: LedgerQuery, options?: RequestOptions): APIPromise<LedgerPage> {
    return this._client.request({ method: 'GET', path: '/api/v1/card/balance/transactions', query: { ...query } }, options);
  }
}

/** Card tags. `client.card.tags`. */
export class CardTags extends APIResource {
  /** Every tag of the project, newest first (`card.tags.list`). */
  list(options?: RequestOptions): APIPromise<CardTagListResponse> {
    return this._client.request({ method: 'GET', path: '/api/v1/card/tags' }, options);
  }

  /** Creates a tag (`card.tags.create`). */
  create(params: CreateCardTagParams, options?: RequestOptions): APIPromise<CardTag> {
    return this._client.request({ method: 'POST', path: '/api/v1/card/tags', body: params }, options);
  }

  /** Renames and/or recolors a tag (`card.tags.update`). */
  update(tagId: string, params: UpdateCardTagParams, options?: RequestOptions): APIPromise<UpdatedCardTag> {
    return this._client.request({ method: 'PATCH', path: path`/api/v1/card/tags/${tagId}`, body: params }, options);
  }

  /** Deletes a tag and detaches it from every card (`card.tags.delete`). */
  delete(tagId: string, options?: RequestOptions): APIPromise<DeleteCardTagResponse> {
    return this._client.request({ method: 'DELETE', path: path`/api/v1/card/tags/${tagId}` }, options);
  }

  /**
   * Replaces a card's entire tag list (`card.tags.set`). This is a full
   * replace: `tags: []` removes every tag, so `tags` is required here.
   */
  setForCard(cardId: string, params: SetCardTagsParams, options?: RequestOptions): APIPromise<SetCardTagsResponse> {
    if (!params || !Array.isArray(params.tags)) {
      // The API treats a missing `tags` field as `[]` and silently clears
      // every tag; refuse to send that by accident.
      throw new TypeError('setForCard requires an explicit `tags` array (send [] to remove all tags).');
    }
    return this._client.request({ method: 'PUT', path: path`/api/v1/card/cards/${cardId}/tags`, body: params }, options);
  }
}

/** Funding/withdrawal reporting. `client.card.reports`. */
export class CardReports extends APIResource {
  /** Card funding and withdrawal summary over a date range (`card.reports.summary`). */
  getSummary(query?: CardReportQuery, options?: RequestOptions): APIPromise<CardReportSummary> {
    return this._client.request({ method: 'GET', path: '/api/v1/card/reports/summary', query: { ...query } }, options);
  }
}
