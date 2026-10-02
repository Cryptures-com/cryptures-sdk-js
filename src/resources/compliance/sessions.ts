import type { APIPromise } from '../../core/api-promise.js';
import { iterateCursorPages } from '../../core/pagination.js';
import { APIResource, path } from '../../core/resource.js';
import type { BinaryResponse, CursorPage, RequestOptions } from '../../core/types.js';
import type {
  CreateSessionParams,
  CreatedSession,
  DeleteSessionQuery,
  GetSessionDocumentQuery,
  ListSessionsQuery,
  RawSessionList,
  Session,
  SessionDocumentField,
  SessionReport,
  SessionSummary,
  UpdateSessionStatusParams,
  UpdatedSessionStatus,
} from '../../types/compliance.js';

const SESSIONS = '/api/v1/compliance/sessions';

/** Identity (KYC) and company (KYB) verification sessions. `client.compliance.sessions`. */
export class ComplianceSessions extends APIResource {
  /**
   * Starts a verification session and returns the hosted link to send the
   * end user to (`compliance.session.create`). **Not retried automatically**,
   * since a retry after an ambiguous failure could open a second session.
   */
  create(params: CreateSessionParams, options?: RequestOptions): APIPromise<CreatedSession> {
    return this._client.request({ method: 'POST', path: `${SESSIONS}/create`, body: params, retryable: false }, options);
  }

  /** A session's status and normalized result (`compliance.session.get`). */
  get(sessionId: string, options?: RequestOptions): APIPromise<Session> {
    return this._client.request({ method: 'GET', path: `${SESSIONS}${path`/${sessionId}`}`, retryable: true }, options);
  }

  /**
   * One page of the project's sessions, newest first
   * (`compliance.sessions.list`). Pass `nextCursor` back as `cursor` for the
   * next page, or use {@link ComplianceSessions.iterate}.
   */
  list(query?: ListSessionsQuery, options?: RequestOptions): APIPromise<CursorPage<SessionSummary>> {
    return this._client
      .request<RawSessionList>({ method: 'GET', path: SESSIONS, query: { ...query }, retryable: true }, options)
      ._map((raw) => ({ data: raw.sessions, nextCursor: raw.next_cursor ?? null }));
  }

  /**
   * Iterates over every session matching `query`, fetching pages on demand.
   *
   * ```ts
   * for await (const session of client.compliance.sessions.iterate({ status: 'In Review' })) { ... }
   * ```
   */
  iterate(query?: ListSessionsQuery, options?: RequestOptions): AsyncGenerator<SessionSummary, void, undefined> {
    const { cursor, ...filters } = query ?? {};
    return iterateCursorPages((next) => this.list({ ...filters, cursor: next }, options), cursor);
  }

  /** Records a manual `Approved`/`Declined` decision (`compliance.session.status.update`). */
  updateStatus(sessionId: string, params: UpdateSessionStatusParams, options?: RequestOptions): APIPromise<UpdatedSessionStatus> {
    return this._client.request(
      { method: 'PATCH', path: `${SESSIONS}${path`/${sessionId}/status`}`, body: params, retryable: true },
      options,
    );
  }

  /**
   * Deletes a session (`compliance.session.delete`). Resolves with no value
   * on `204`. `privacy_erasure` is honored only on the first successful
   * delete -- decide before you delete.
   */
  delete(sessionId: string, query?: DeleteSessionQuery, options?: RequestOptions): APIPromise<void> {
    const erasure = query?.privacy_erasure;
    return this._client.request(
      {
        method: 'DELETE',
        path: `${SESSIONS}${path`/${sessionId}`}`,
        query: { privacy_erasure: erasure === undefined ? undefined : String(erasure) },
        retryable: true,
      },
      options,
    );
  }

  /**
   * The raw bytes of one captured document, selfie or video
   * (`compliance.session.documents.get`). `contentType` is `image/jpeg` or
   * `video/mp4`.
   */
  getDocument(
    sessionId: string,
    field: SessionDocumentField,
    query?: GetSessionDocumentQuery,
    options?: RequestOptions,
  ): APIPromise<BinaryResponse> {
    return this._client.request(
      {
        method: 'GET',
        path: `${SESSIONS}${path`/${sessionId}/documents/${field}`}`,
        query: { ...query },
        responseType: 'binary',
        retryable: true,
      },
      options,
    );
  }

  /** Generates the session's PDF report, kept for 7 days (`compliance.session.report.create`). */
  createReport(sessionId: string, options?: RequestOptions): APIPromise<SessionReport> {
    return this._client.request({ method: 'POST', path: `${SESSIONS}${path`/${sessionId}/report`}`, retryable: true }, options);
  }

  /** Downloads the most recent PDF report (`compliance.session.report.download`). */
  downloadReport(sessionId: string, options?: RequestOptions): APIPromise<BinaryResponse> {
    return this._client.request(
      { method: 'GET', path: `${SESSIONS}${path`/${sessionId}/report`}`, responseType: 'binary', retryable: true },
      options,
    );
  }
}
