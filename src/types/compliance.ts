// Request and response types for the `compliance` domain, transcribed from
// the Cryptures API reference (https://docs.cryptures.com/). Fields the
// reference does not mark as required are optional.

/** What kind of session this is. */
export type SessionKind = 'kyc' | 'kyb' | 'aml_standalone';

/** Session statuses documented today. The list can grow -- handle unknown values gracefully. */
export type KnownSessionStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Awaiting User'
  | 'Resubmitted'
  | 'Approved'
  | 'Declined'
  | 'In Review'
  | 'Abandoned'
  | 'Expired'
  | 'Kyc Expired'
  | 'Unknown'
  | 'Deleted';
export type SessionStatus = KnownSessionStatus | (string & {});

export interface CreateSessionParams {
  /** A preset id from `presets.list()`. */
  preset_id: string;
  /** Your own identifier for the end user. At most 200 characters, no colon or control characters. */
  external_user_id: string;
  /** Public https URL (at most 2048 characters) the end user returns to after verifying. */
  callback?: string;
  /** Hosted page language, e.g. `en`, `es`, `fr`, `pt-BR`, `zh-CN`. */
  language?: string;
  /** Free-form JSON object kept with the session. At most 2000 characters serialized. */
  metadata?: Record<string, unknown>;
  /** Details you already know, to check against the document. */
  expected_details?: {
    first_name?: string;
    last_name?: string;
    /** YYYY-MM-DD. */
    date_of_birth?: string;
  };
  /** The end user's contact details. */
  contact_details?: { email?: string };
}

export interface CreatedSession {
  session_id: string;
  /** Hosted verification page. Single-use; do not cache or reuse. */
  url: string;
  /** Status as reported at creation (typically "Not Started"). */
  status: SessionStatus;
}

/** One check outcome within a session result. */
export interface SessionResultEntry {
  /** Which check this outcome is for, matching a value in `features`. */
  feature: string;
  /** This check's own outcome, e.g. "Approved". */
  status: string;
  /** ID checks only, e.g. "Identity Card". */
  document_type?: string;
  /** ID checks only -- first and last name joined into one string. */
  name?: string;
  /** ID checks only. */
  date_of_birth?: string;
  /** ID checks only. */
  issuing_state?: string;
  /** Liveness/face checks only, e.g. "ACTIVE_3D". */
  method?: string;
  /** Liveness/face checks only. */
  score?: number;
  /** Screening checks only. */
  total_hits?: number;
  /** Screening checks only, e.g. "person". */
  entity_type?: string;
  /** Company registry checks (KYB) only. */
  company_name?: string;
  /** Company registry checks (KYB) only. */
  registration_number?: string;
  /** Company registry checks (KYB) only. ISO 3166-1 alpha-2. */
  country_code?: string;
  /** Company registry checks (KYB) only: `lite`, `shareholders` or `ubo`. */
  tier?: string;
  /** Key-people checks (KYB) only. */
  people_count?: number;
}

export interface SessionWarning {
  feature: string;
  short_description: string;
  /** Omitted when the warning has no long form. */
  long_description?: string;
}

/** Document field names accepted by `sessions.getDocument`. */
export type SessionDocumentField =
  | 'portrait_image'
  | 'front_image'
  | 'back_image'
  | 'front_video'
  | 'back_video'
  | 'full_front_image'
  | 'full_back_image'
  | 'front_image_camera_front'
  | 'back_image_camera_front';

export interface Session {
  session_id: string;
  status: SessionStatus;
  /** Omitted entirely if it could not be recovered for this session. */
  external_user_id?: string;
  kind: SessionKind;
  /** Which checks ran, e.g. `ID_VERIFICATION`, `LIVENESS`, `FACE_MATCH`, `AML`. Empty until a result exists. */
  features: string[];
  /** One entry per check outcome. Empty until a result exists. */
  results: SessionResultEntry[];
  /** Every warning, flattened across checks. */
  warnings: SessionWarning[];
  /**
   * Present only when documents/selfies/videos were captured. Maps a
   * document field name to a URL on this API's documents endpoint.
   */
  document_urls?: Partial<Record<SessionDocumentField, string>> & Record<string, string>;
}

export interface ListSessionsQuery {
  /** Only sessions in this status, e.g. `Approved` or `In Review`. */
  status?: SessionStatus;
  /** Only sessions for this end user. */
  external_user_id?: string;
  /** Inclusive lower bound, ISO-8601 date or timestamp. */
  created_after?: string;
  /** Exclusive upper bound, ISO-8601 date or timestamp. */
  created_before?: string;
  /** Page size, 1-200. Defaults to 50. */
  limit?: number;
  /** The `nextCursor` from the previous page. */
  cursor?: string;
}

export interface SessionSummary {
  session_id: string;
  external_user_id: string;
  preset_id: string;
  status: SessionStatus;
  kind: SessionKind;
  created_at: string;
  updated_at: string;
}

/** The raw `sessions.list` body, before the SDK maps it to `{ data, nextCursor }`. */
export interface RawSessionList {
  sessions: SessionSummary[];
  next_cursor: string | null;
}

export interface Preset {
  /** Pass as `preset_id` to `sessions.create`. */
  id: string;
  label: string;
  /** `kyc` verifies a person, `kyb` a company. */
  kind: 'kyc' | 'kyb';
}

export interface PresetListResponse {
  presets: Preset[];
}

export interface GetSessionDocumentQuery {
  /** Disambiguates which result item to read when there is more than one for this check. */
  node_id?: string;
}

export interface UpdateSessionStatusParams {
  status: 'Approved' | 'Declined';
  /** At most 500 printable characters. */
  comment?: string;
}

export interface UpdatedSessionStatus {
  session_id: string;
  status: 'Approved' | 'Declined';
}

export interface DeleteSessionQuery {
  /**
   * Also request erasure of the end user's personal data. Honored only on
   * the first successful delete of a session. Defaults to false.
   */
  privacy_erasure?: boolean | 'true' | 'false';
}

export interface SessionReport {
  report_id: string;
  session_id: string;
  generated_at: string;
  /** Seven days after `generated_at`. */
  expires_at: string;
  size_bytes: number;
  /** GET with your API key (`sessions.downloadReport`) to receive the PDF. */
  download_url: string;
}

// ---------------------------------------------------------------------------
// AML screening
// ---------------------------------------------------------------------------

export interface AmlCheckParams {
  /** Your own identifier for the subject. At most 200 characters, no colon or control characters. */
  external_user_id: string;
  /** Person or company name. At most 200 characters. */
  full_name: string;
  /** YYYY-MM-DD. Improves matching for people. */
  date_of_birth?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. `ES`. */
  nationality?: string;
  /** Defaults to `person`. */
  entity_type?: 'person' | 'company';
}

export interface AmlCheckResult {
  /** The ledger row's `related_reference`. */
  check_id: string;
  /** The stored `aml_standalone` session, readable with `sessions.get`. */
  session_id: string | null;
  external_user_id: string;
  /** e.g. `Approved`, `In Review` or `Declined`. */
  status: string;
  result: {
    features: string[];
    results: Array<{
      feature: string;
      status: string;
      total_hits?: number;
      entity_type?: string;
      score?: number;
    }>;
    warnings: SessionWarning[];
  };
  created_at: string;
}

// ---------------------------------------------------------------------------
// Wallet screening
// ---------------------------------------------------------------------------

/** Chains accepted by wallet screening (case-insensitive; `TRX` is an alias of `TRON`). */
export type WalletScreeningChain = 'BTC' | 'ETH' | 'BNB' | 'MATIC' | 'TRON' | 'TRX' | 'LTC' | 'DOGE' | 'SOL' | 'XRP' | 'BCH';

export interface WalletScreeningParams {
  /** 1-128 characters: letters, digits and `. _ : -`. */
  address: string;
  chain: WalletScreeningChain;
}

export interface WalletRiskFactor {
  /** e.g. `mixer`, `sanctions`, `darknet_market`, `ransomware`, `scam`, `exchange`, `other`. */
  category?: string;
  direction?: 'incoming' | 'outgoing';
  exposure_type?: 'direct' | 'indirect';
  /** Share of exposure, 0-100. */
  percentage?: number;
  is_high_risk?: boolean;
}

export interface WalletScreeningRisk {
  severity: 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** 0-100. Omitted when not available. */
  risk_score?: number;
  sanctions_hit: boolean;
  pep_counterparty?: boolean;
  dominant_risk_category?: string;
  /** Up to 25 exposure factors. */
  risk_factors: WalletRiskFactor[];
}

export interface WalletScreening {
  check_id: string;
  /** As you sent it. */
  address: string;
  /** Upper-case chain code (`TRX` is reported as `TRON`). */
  chain: string;
  result: WalletScreeningRisk;
  screened_at: string;
}

// ---------------------------------------------------------------------------
// Monitoring
// ---------------------------------------------------------------------------

export type MonitoringEntityKind = 'user' | 'business';
export type MonitoringStatus = 'active' | 'cancelled' | 'suspended_insufficient_balance';

export interface MonitoringEntity {
  /** `user` for a KYC/person screening, `business` for a KYB/company screening. */
  entity_kind: MonitoringEntityKind;
  /** Your own identifier, as used when the session or screening was created. */
  external_user_id: string;
}

export interface MonitoringSubscription {
  entity_kind: MonitoringEntityKind;
  external_user_id: string;
  status: MonitoringStatus;
  /** Start of the current paid year. */
  enabled_at: string;
  /** When the next year is charged. */
  next_renewal_at: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListMonitoringQuery {
  status?: MonitoringStatus;
  /** Page size, 1-200. Defaults to 50. */
  limit?: number;
  /** The `nextCursor` from the previous page. */
  cursor?: string;
}

/** The raw `monitoring.list` body, before the SDK maps it to `{ data, nextCursor }`. */
export interface RawMonitoringList {
  subscriptions: MonitoringSubscription[];
  next_cursor: string | null;
}
