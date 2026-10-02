import type { APIPromise } from '../../core/api-promise.js';
import { iterateCursorPages } from '../../core/pagination.js';
import { APIResource, path } from '../../core/resource.js';
import type { CursorPage, IdempotentRequestOptions, RequestOptions } from '../../core/types.js';
import type { RegisterWebhookParams, WebhookRegistration, WebhookStatus } from '../../types/common.js';
import type {
  AmlCheckParams,
  AmlCheckResult,
  ListMonitoringQuery,
  MonitoringEntity,
  MonitoringSubscription,
  PresetListResponse,
  RawMonitoringList,
  WalletScreening,
  WalletScreeningParams,
} from '../../types/compliance.js';

const COMPLIANCE = '/api/v1/compliance';

function splitIdempotency(options: IdempotentRequestOptions | undefined): {
  idempotencyKey: string | undefined;
  rest: RequestOptions | undefined;
} {
  if (!options) return { idempotencyKey: undefined, rest: undefined };
  const { idempotencyKey, ...rest } = options;
  return { idempotencyKey, rest };
}

/** Verification presets. `client.compliance.presets`. */
export class CompliancePresets extends APIResource {
  /** The standard active presets every project can use (`compliance.presets.list`). */
  list(options?: RequestOptions): APIPromise<PresetListResponse> {
    return this._client.request({ method: 'GET', path: `${COMPLIANCE}/presets`, retryable: true }, options);
  }
}

/** Standalone AML screening of people and companies. `client.compliance.aml`. */
export class ComplianceAml extends APIResource {
  /**
   * Screens a person or company against sanctions, PEP and adverse-media
   * lists (`compliance.aml.check`). Billed per successful call.
   *
   * Pass `idempotencyKey` to make retries safe: it is sent as the
   * `Idempotency-Key` header, and with it set the SDK retries network
   * errors and 5xx automatically. Without a key the call is never retried
   * automatically, because every call is a separate charge.
   */
  check(params: AmlCheckParams, options?: IdempotentRequestOptions): APIPromise<AmlCheckResult> {
    const { idempotencyKey, rest } = splitIdempotency(options);
    return this._client.request(
      {
        method: 'POST',
        path: `${COMPLIANCE}/aml/checks`,
        body: params,
        idempotencyKey,
        retryable: idempotencyKey !== undefined,
      },
      rest,
    );
  }
}

/** Blockchain address risk screening. `client.compliance.walletScreening`. */
export class ComplianceWalletScreening extends APIResource {
  /**
   * Screens a blockchain address for risk exposure
   * (`compliance.wallet_screening.create`). Billed per successful call.
   * Idempotency and retry behavior match `compliance.aml.check`.
   */
  create(params: WalletScreeningParams, options?: IdempotentRequestOptions): APIPromise<WalletScreening> {
    const { idempotencyKey, rest } = splitIdempotency(options);
    return this._client.request(
      {
        method: 'POST',
        path: `${COMPLIANCE}/wallet-screenings`,
        body: params,
        idempotencyKey,
        retryable: idempotencyKey !== undefined,
      },
      rest,
    );
  }

  /** A stored wallet screening, free to read (`compliance.wallet_screening.get`). */
  get(checkId: string, options?: RequestOptions): APIPromise<WalletScreening> {
    return this._client.request({ method: 'GET', path: `${COMPLIANCE}${path`/wallet-screenings/${checkId}`}`, retryable: true }, options);
  }
}

/** Ongoing AML monitoring. `client.compliance.monitoring`. */
export class ComplianceMonitoring extends APIResource {
  /**
   * Places a person or company under ongoing monitoring, charging one year
   * up front (`compliance.monitoring.enable`). Answers `201` when newly
   * enabled and `200` (no charge) when already active -- see
   * `.withResponse()` to tell them apart.
   */
  enable(params: MonitoringEntity, options?: RequestOptions): APIPromise<MonitoringSubscription> {
    return this._client.request({ method: 'POST', path: `${COMPLIANCE}/monitoring`, body: params, retryable: true }, options);
  }

  /** Stops monitoring; the paid year is not refunded (`compliance.monitoring.disable`). Resolves on `204`. */
  disable(params: MonitoringEntity, options?: RequestOptions): APIPromise<void> {
    return this._client.request(
      {
        method: 'DELETE',
        path: `${COMPLIANCE}/monitoring`,
        query: { entity_kind: params.entity_kind, external_user_id: params.external_user_id },
        retryable: true,
      },
      options,
    );
  }

  /** One page of monitoring subscriptions, newest first (`compliance.monitoring.list`). */
  list(query?: ListMonitoringQuery, options?: RequestOptions): APIPromise<CursorPage<MonitoringSubscription>> {
    return this._client
      .request<RawMonitoringList>({ method: 'GET', path: `${COMPLIANCE}/monitoring`, query: { ...query }, retryable: true }, options)
      ._map((raw) => ({ data: raw.subscriptions, nextCursor: raw.next_cursor ?? null }));
  }

  /** Iterates over every monitoring subscription matching `query`, fetching pages on demand. */
  iterate(query?: ListMonitoringQuery, options?: RequestOptions): AsyncGenerator<MonitoringSubscription, void, undefined> {
    const { cursor, ...filters } = query ?? {};
    return iterateCursorPages((next) => this.list({ ...filters, cursor: next }, options), cursor);
  }
}

/** Compliance-domain webhook registration. `client.compliance.webhooks`. */
export class ComplianceWebhooks extends APIResource {
  /**
   * Registers (or replaces) the project's verification-event callback URL
   * (`compliance.webhooks.register`). The returned `secret` is shown only once.
   */
  register(params: RegisterWebhookParams, options?: RequestOptions): APIPromise<WebhookRegistration> {
    return this._client.request({ method: 'POST', path: `${COMPLIANCE}/webhooks/register`, body: params, retryable: true }, options);
  }

  /** Reads back the registered compliance webhook, without the secret (`compliance.webhooks.status`). */
  getStatus(options?: RequestOptions): APIPromise<WebhookStatus> {
    return this._client.request({ method: 'GET', path: `${COMPLIANCE}/webhooks/status`, retryable: true }, options);
  }
}
