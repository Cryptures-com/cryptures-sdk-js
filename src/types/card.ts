// Request and response types for the `card` (Expense Management) domain,
// transcribed from the Cryptures API reference (https://docs.cryptures.com/).
// Fields the reference does not mark as required are optional.

/**
 * Card product codes documented today. The catalog is managed by Cryptures
 * and can change -- fetch it with `client.card.cards.listProducts()` rather
 * than hard-coding codes. Any string is accepted.
 */
export type KnownCardProductCode = 'us_addon_visa_bin' | 'us_493_visa_bin' | 'us_493_visa_atm' | '536_master';
export type CardProductCode = KnownCardProductCode | (string & {});

/** A tag attached to a card. */
export interface CardTagRef {
  tag_id: string;
  name: string;
  /** Hex color, e.g. "#4F46E5". */
  color: string;
}

/** `{ status: "success", message?, data }` envelope used by most card operations. */
export interface CardEnvelope<T> {
  status: 'success';
  message?: string;
  data: T;
}

export interface CreateCardParams {
  /** Must be an active product code (see `listProducts`). */
  product_code: CardProductCode;
  first_name: string;
  last_name: string;
  /** The real cardholder email -- retrievable later via `list`. */
  email: string;
  /**
   * Initial USD load. Required for every product except those with
   * `disallow_initial_load: true` (e.g. us_493_visa_atm), which must omit
   * it entirely.
   */
  initial_load?: number;
  /** Optional tag names to attach -- at most 10, each 1-50 characters. */
  tags?: string[];
}

/** A card's own balance. */
export interface CardBalanceAmount {
  /** Balance in micro-units (divide by 1,000,000 for a display value). */
  amount: number;
  /** The same balance as a plain decimal. */
  display_amount: number;
  currency: string;
}

/** The card object returned by `create` and `get`. */
export interface Card {
  /** Used as the `cardId` argument on every other card method. */
  card_id: string;
  /** e.g. "active", "blocked", "terminated". */
  status: string;
  product_code?: CardProductCode;
  /** e.g. "visa" or "mastercard". */
  brand?: string;
  /** Always "virtual". */
  type?: string;
  /** ISO currency code, "USD" today. */
  currency?: string;
  name_on_card?: string;
  /** A system-generated placeholder -- use `list` for the real cardholder email. */
  email?: string;
  last_four?: string;
  /** Two-digit expiry month, e.g. "08". */
  expiry_month?: string;
  /** Four-digit expiry year, e.g. "2031". */
  expiry_year?: string;
  balance?: CardBalanceAmount;
  /** The full PAN. */
  card_number?: string;
  cvv?: string;
  /** A second key carrying the same PAN as `card_number`. */
  cardnumber?: string;
  /** Expiry as "MM/YY". */
  expiredate?: string;
  created_at?: string;
  /** On `get`, always present (possibly empty). On `create`, only when `tags` was sent. */
  tags?: CardTagRef[];
}

export interface GetCardQuery {
  /**
   * Single-use token that unmasks PAN/CVV for dashboard-session callers. A
   * no-op for API-key callers, whose response is always unmasked.
   */
  reveal_token?: string;
}

export interface SetCardPinParams {
  /** Exactly 6 digits. Only us_493_visa_atm cards support a PIN. */
  pin: string;
}

export interface CardSimpleResult {
  status: 'success';
  message?: string;
}

export interface CardAmountParams {
  /** USD amount -- a positive finite number. */
  amount: number;
}

export interface CardAmountResult {
  card_id: string;
  /** Confirmed amount in micro-units (divide by 1,000,000 for USD). */
  amount: number;
  /** The same amount as a plain USD decimal. */
  display_amount: number;
}

export interface CardStatusResult<S extends string> {
  status: 'success';
  message?: string;
  data?: { card_id: string; status: S };
}

export interface CardTransactionsQuery {
  /** Page number, forwarded to the card issuer verbatim. The only pagination parameter. */
  pageNum?: string | number;
}

export interface CardTransaction {
  id: string;
  card_id?: string;
  /** e.g. "authorization". */
  type: string;
  /** e.g. "completed". */
  status: string;
  /** Micro-units (divide by 1,000,000 for USD). */
  amount: number;
  display_amount: number;
  currency: string;
  merchant_name?: string;
  created_at: string;
}

/**
 * Card transaction history. This body is forwarded from the card issuer
 * verbatim; the reference marks the layout as provisional.
 */
export interface CardTransactionsResponse {
  status: 'success';
  message?: string;
  data: {
    transactions: CardTransaction[];
    pagination: {
      type?: string;
      page_num: number;
      page_size: number;
      total: number;
      has_more: boolean;
    };
  };
}

export interface CardListItem {
  card_id: string;
  product_code: CardProductCode;
  /** The real cardholder email supplied at creation time. */
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  /** Always null-check: null if never populated. */
  last_four?: string | null;
  /** Reserved for future use -- always null today. */
  label?: string | null;
  created_at: string;
  tags: CardTagRef[];
}

export interface CardListResponse {
  data: CardListItem[];
}

export interface CardProduct {
  /** The code to pass as `create`'s `product_code`. */
  product_code: string;
  display_name: string;
  min_load_usd: number | null;
  max_load_usd: number | null;
  /** One-time USD fee charged at card creation. */
  issuance_fee_usd: number;
  /** Flat USD fee added to every funding operation. */
  fund_fee_flat_usd: number;
  /** Percentage fee (0-1) applied to every funding amount. */
  fund_fee_pct: number;
  annual_fee_usd: number | null;
  /** When true, `create` must be called without `initial_load`. */
  disallow_initial_load: boolean;
}

export interface CardProductsResponse {
  products: CardProduct[];
}

// ---------------------------------------------------------------------------
// balance
// ---------------------------------------------------------------------------

export interface ProjectBalance {
  /** Current USD balance. 0 for a project with no balance activity yet. */
  balance_usd: number;
  /** ISO 8601 timestamp of the last change, or null if never updated. */
  updated_at: string | null;
}

export type KnownLedgerEntryType =
  | 'card_create_debit'
  | 'card_create_reversal'
  | 'card_fund_debit'
  | 'card_fund_reversal'
  | 'card_withdraw_credit'
  | 'admin_adjustment'
  | 'deposit_credit'
  | 'plan_charge_debit'
  | 'withdrawal_debit'
  | 'withdrawal_reversal'
  | 'giftcard_purchase_debit'
  | 'giftcard_purchase_reversal'
  | 'card_pack_order_debit'
  | 'card_pack_order_reversal'
  | 'compliance_session_debit'
  | 'compliance_aml_check_debit'
  | 'compliance_wallet_screening_debit'
  | 'compliance_monitoring_debit';

/** New types can be added over time -- treat an unknown value as "other billable activity". */
export type LedgerEntryType = KnownLedgerEntryType | (string & {});

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  /** The USD amount debited or credited. */
  amount_usd: number;
  /** What this points at depends on `type` (card_id, deposit id, check id, ...). */
  related_reference: string | null;
  status: 'pending' | 'completed' | 'reversed' | 'disputed';
  created_at: string;
}

export interface LedgerQuery {
  /** 1-indexed page number. Defaults to 1. */
  page?: number;
  /** Rows per page. Defaults to 50; clamped to 200. */
  limit?: number;
}

export interface LedgerPage {
  data: LedgerEntry[];
  page: number;
  limit: number;
  /** Total row count across all pages. */
  total: number;
}

// ---------------------------------------------------------------------------
// tags
// ---------------------------------------------------------------------------

export interface CardTag {
  tag_id: string;
  name: string;
  /** "#" followed by exactly 6 hex digits. */
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CardTagListResponse {
  data: CardTag[];
}

export interface CreateCardTagParams {
  /** 1-50 characters, unique per project (case-insensitive). */
  name: string;
  /** "#" followed by exactly 6 hex digits. Auto-assigned from a palette if omitted. */
  color?: string;
}

/** At least one of `name` / `color` is required. */
export type UpdateCardTagParams = { name: string; color?: string } | { name?: string; color: string };

export interface UpdatedCardTag {
  tag_id: string;
  name: string;
  color: string;
  updated_at: string;
}

export interface DeleteCardTagResponse {
  deleted: boolean;
}

export interface SetCardTagsParams {
  /**
   * The card's complete tag list, by name -- a full replace. `[]` removes
   * every tag. At most 10 names, each 1-50 characters.
   */
  tags: string[];
}

export interface SetCardTagsResponse {
  /** The card's tags after the replace (may be shorter than what was sent). */
  tags: CardTagRef[];
}

// ---------------------------------------------------------------------------
// reports
// ---------------------------------------------------------------------------

export interface CardReportQuery {
  /** Start of the range (inclusive), ISO 8601. Defaults to 12 months ago. */
  from?: string;
  /** End of the range (exclusive), ISO 8601. Defaults to now. */
  to?: string;
}

export interface CardReportAmounts {
  funded_usd: number;
  withdrawn_usd: number;
  net_usd: number;
}

export interface CardReportSummary {
  /** The normalized range actually applied (canonical ISO 8601 UTC). */
  range: { from: string; to: string };
  totals: CardReportAmounts & {
    /** Distinct card references on matching ledger rows -- see the API reference before relying on it. */
    card_count: number;
  };
  unattributed: { funded_usd: number };
  by_month: Array<Partial<CardReportAmounts> & { /** YYYY-MM */ month?: string }>;
  by_type: Array<Partial<CardReportAmounts> & { product_code?: string; card_count?: number }>;
  by_tag: Array<Partial<CardReportAmounts> & { tag_id?: string; name?: string; color?: string; card_count?: number }>;
  untagged: CardReportAmounts & { card_count: number };
  by_card: Array<
    Partial<CardReportAmounts> & {
      card_id?: string;
      first_name?: string;
      last_name?: string;
      last_four?: string | null;
      product_code?: string;
      tags?: Array<{ tag_id?: string; name?: string; color?: string }>;
    }
  >;
}
