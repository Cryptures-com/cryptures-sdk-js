import { expectBinary, type EndpointCase } from '../helpers.js';

const C = '/api/v1/compliance';
const SESSION_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
const SUBSCRIPTION = {
  entity_kind: 'user',
  external_user_id: 'user_42',
  status: 'active',
  enabled_at: '2026-09-25T09:00:00.000Z',
  next_renewal_at: '2027-09-25T09:00:00.000Z',
  cancelled_at: null,
  created_at: '2026-09-25T09:00:00.000Z',
  updated_at: '2026-09-25T09:00:00.000Z',
};
const SESSION_SUMMARY = {
  session_id: SESSION_ID,
  external_user_id: 'user_42',
  preset_id: 'preset_af363e69-9490-4fa3-a60e-9d3e07e385bc',
  status: 'Approved',
  kind: 'kyc',
  created_at: '2026-09-18T10:51:32.000Z',
  updated_at: '2026-09-18T10:55:53.000Z',
};
const WALLET_SCREENING = {
  check_id: 'chk_7c1d9e2f-3a4b-4c5d-8e6f-0a1b2c3d4e5f',
  address: '0x0000000000000000000000000000000000000000',
  chain: 'ETH',
  result: {
    severity: 'LOW',
    risk_score: 12,
    sanctions_hit: false,
    pep_counterparty: false,
    dominant_risk_category: 'exchange',
    risk_factors: [{ category: 'exchange', direction: 'outgoing', exposure_type: 'direct', percentage: 40, is_high_risk: false }],
  },
  screened_at: '2026-09-25T09:00:00.000Z',
};

export const complianceSessionsCases: EndpointCase[] = [
  {
    operationId: 'compliance.session.create',
    sdkMethod: 'compliance.sessions.create',
    call: (c) =>
      c.compliance.sessions.create({
        preset_id: 'preset_af363e69-9490-4fa3-a60e-9d3e07e385bc',
        external_user_id: 'user_42',
        language: 'en',
        expected_details: { first_name: 'Jane', last_name: 'Doe', date_of_birth: '1990-01-01' },
      }),
    request: {
      method: 'POST',
      path: `${C}/sessions/create`,
      body: {
        preset_id: 'preset_af363e69-9490-4fa3-a60e-9d3e07e385bc',
        external_user_id: 'user_42',
        language: 'en',
        expected_details: { first_name: 'Jane', last_name: 'Doe', date_of_birth: '1990-01-01' },
      },
    },
    response: { status: 201, body: { session_id: SESSION_ID, url: 'https://verify.example.com/session/xyz123abc', status: 'Not Started' } },
  },
  {
    operationId: 'compliance.session.get',
    sdkMethod: 'compliance.sessions.get',
    call: (c) => c.compliance.sessions.get(SESSION_ID),
    request: { method: 'GET', path: `${C}/sessions/${SESSION_ID}` },
    response: {
      body: {
        session_id: SESSION_ID,
        status: 'Approved',
        external_user_id: 'user_42',
        kind: 'kyc',
        features: ['ID_VERIFICATION', 'LIVENESS'],
        results: [
          { feature: 'ID_VERIFICATION', status: 'Approved', document_type: 'Identity Card', name: 'Jane Doe' },
          { feature: 'LIVENESS', status: 'Approved', method: 'ACTIVE_3D', score: 95.4 },
        ],
        warnings: [],
        document_urls: { portrait_image: `https://api.cryptures.com${C}/sessions/${SESSION_ID}/documents/portrait_image` },
      },
    },
  },
  {
    operationId: 'compliance.sessions.list',
    sdkMethod: 'compliance.sessions.list',
    call: (c) => c.compliance.sessions.list({ status: 'Approved', external_user_id: 'user_42', created_after: '2026-09-01', limit: 25, cursor: 'cur_1' }),
    request: {
      method: 'GET',
      path: `${C}/sessions`,
      query: { status: 'Approved', external_user_id: 'user_42', created_after: '2026-09-01', limit: '25', cursor: 'cur_1' },
    },
    response: { body: { sessions: [SESSION_SUMMARY], next_cursor: 'cur_2' } },
    expected: { data: [SESSION_SUMMARY], nextCursor: 'cur_2' },
  },
  {
    operationId: 'compliance.session.status.update',
    sdkMethod: 'compliance.sessions.updateStatus',
    call: (c) => c.compliance.sessions.updateStatus(SESSION_ID, { status: 'Approved', comment: 'Manually reviewed.' }),
    request: { method: 'PATCH', path: `${C}/sessions/${SESSION_ID}/status`, body: { status: 'Approved', comment: 'Manually reviewed.' } },
    response: { body: { session_id: SESSION_ID, status: 'Approved' } },
  },
  {
    operationId: 'compliance.session.delete',
    sdkMethod: 'compliance.sessions.delete',
    call: (c) => c.compliance.sessions.delete(SESSION_ID, { privacy_erasure: true }),
    request: { method: 'DELETE', path: `${C}/sessions/${SESSION_ID}`, query: { privacy_erasure: 'true' } },
    response: { status: 204 },
    expected: undefined,
  },
  {
    operationId: 'compliance.session.delete',
    sdkMethod: 'compliance.sessions.delete',
    label: 'without erasure',
    call: (c) => c.compliance.sessions.delete(SESSION_ID),
    request: { method: 'DELETE', path: `${C}/sessions/${SESSION_ID}` },
    response: { status: 204 },
    expected: undefined,
  },
  {
    operationId: 'compliance.session.documents.get',
    sdkMethod: 'compliance.sessions.getDocument',
    call: (c) => c.compliance.sessions.getDocument(SESSION_ID, 'front_image', { node_id: 'feature_t_ocr' }),
    request: { method: 'GET', path: `${C}/sessions/${SESSION_ID}/documents/front_image`, query: { node_id: 'feature_t_ocr' }, headers: { accept: '*/*' } },
    response: {
      raw: () => new Response(new TextEncoder().encode('JPEGBYTES'), { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store' } }),
    },
    assertResult: (result) => expectBinary(result, 'image/jpeg', 'JPEGBYTES'),
  },
  {
    operationId: 'compliance.session.report.create',
    sdkMethod: 'compliance.sessions.createReport',
    call: (c) => c.compliance.sessions.createReport(SESSION_ID),
    request: { method: 'POST', path: `${C}/sessions/${SESSION_ID}/report` },
    response: {
      status: 201,
      body: {
        report_id: 'rep_3d5f7a9b-1c2e-4f60-8a1b-9c0d2e4f6a8b',
        session_id: SESSION_ID,
        generated_at: '2026-09-25T09:00:00.000Z',
        expires_at: '2026-10-02T09:00:00.000Z',
        size_bytes: 18234,
        download_url: `https://api.cryptures.com${C}/sessions/${SESSION_ID}/report`,
      },
    },
  },
  {
    operationId: 'compliance.session.report.download',
    sdkMethod: 'compliance.sessions.downloadReport',
    call: (c) => c.compliance.sessions.downloadReport(SESSION_ID),
    request: { method: 'GET', path: `${C}/sessions/${SESSION_ID}/report` },
    response: {
      raw: () =>
        new Response(new TextEncoder().encode('%PDF-1.7'), {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-disposition': `attachment; filename="verification-report-${SESSION_ID}.pdf"`,
          },
        }),
    },
    assertResult: (result) => {
      expectBinary(result, 'application/pdf', '%PDF-1.7');
      if ((result as { contentDisposition: string }).contentDisposition !== `attachment; filename="verification-report-${SESSION_ID}.pdf"`) {
        throw new Error('content-disposition not surfaced');
      }
    },
  },
];

export const compliancePresetsCases: EndpointCase[] = [
  {
    operationId: 'compliance.presets.list',
    sdkMethod: 'compliance.presets.list',
    call: (c) => c.compliance.presets.list(),
    request: { method: 'GET', path: `${C}/presets` },
    response: { body: { presets: [{ id: 'preset_af363e69-9490-4fa3-a60e-9d3e07e385bc', label: 'Standard KYC', kind: 'kyc' }] } },
  },
];

export const complianceAmlCases: EndpointCase[] = [
  {
    operationId: 'compliance.aml.check',
    sdkMethod: 'compliance.aml.check',
    call: (c) =>
      c.compliance.aml.check(
        { external_user_id: 'user_42', full_name: 'Jane Doe', date_of_birth: '1990-01-01', nationality: 'ES', entity_type: 'person' },
        { idempotencyKey: 'aml-user_42-2026-09-25' },
      ),
    request: {
      method: 'POST',
      path: `${C}/aml/checks`,
      body: { external_user_id: 'user_42', full_name: 'Jane Doe', date_of_birth: '1990-01-01', nationality: 'ES', entity_type: 'person' },
      headers: { 'idempotency-key': 'aml-user_42-2026-09-25' },
    },
    response: {
      status: 201,
      body: {
        check_id: 'chk_0b5e3c1a-7d24-4f6e-9a18-2c4d6e8f0a1b',
        session_id: SESSION_ID,
        external_user_id: 'user_42',
        status: 'Approved',
        result: { features: ['AML'], results: [{ feature: 'AML', status: 'Approved', total_hits: 0, entity_type: 'person' }], warnings: [] },
        created_at: '2026-09-25T09:00:00.000Z',
      },
    },
  },
];

export const complianceWalletScreeningCases: EndpointCase[] = [
  {
    operationId: 'compliance.wallet_screening.create',
    sdkMethod: 'compliance.walletScreening.create',
    call: (c) =>
      c.compliance.walletScreening.create({ address: '0x0000000000000000000000000000000000000000', chain: 'ETH' }, { idempotencyKey: 'ws-1' }),
    request: {
      method: 'POST',
      path: `${C}/wallet-screenings`,
      body: { address: '0x0000000000000000000000000000000000000000', chain: 'ETH' },
      headers: { 'idempotency-key': 'ws-1' },
    },
    response: { status: 201, body: WALLET_SCREENING },
  },
  {
    operationId: 'compliance.wallet_screening.get',
    sdkMethod: 'compliance.walletScreening.get',
    call: (c) => c.compliance.walletScreening.get(WALLET_SCREENING.check_id),
    request: { method: 'GET', path: `${C}/wallet-screenings/${WALLET_SCREENING.check_id}` },
    response: { body: WALLET_SCREENING },
  },
];

export const complianceMonitoringCases: EndpointCase[] = [
  {
    operationId: 'compliance.monitoring.enable',
    sdkMethod: 'compliance.monitoring.enable',
    call: (c) => c.compliance.monitoring.enable({ entity_kind: 'user', external_user_id: 'user_42' }),
    request: { method: 'POST', path: `${C}/monitoring`, body: { entity_kind: 'user', external_user_id: 'user_42' } },
    response: { status: 201, body: SUBSCRIPTION },
  },
  {
    operationId: 'compliance.monitoring.disable',
    sdkMethod: 'compliance.monitoring.disable',
    call: (c) => c.compliance.monitoring.disable({ entity_kind: 'business', external_user_id: 'acme_1' }),
    request: { method: 'DELETE', path: `${C}/monitoring`, query: { entity_kind: 'business', external_user_id: 'acme_1' } },
    response: { status: 204 },
    expected: undefined,
  },
  {
    operationId: 'compliance.monitoring.list',
    sdkMethod: 'compliance.monitoring.list',
    call: (c) => c.compliance.monitoring.list({ status: 'active', limit: 200 }),
    request: { method: 'GET', path: `${C}/monitoring`, query: { status: 'active', limit: '200' } },
    response: { body: { subscriptions: [SUBSCRIPTION], next_cursor: null } },
    expected: { data: [SUBSCRIPTION], nextCursor: null },
  },
];

export const complianceWebhooksCases: EndpointCase[] = [
  {
    operationId: 'compliance.webhooks.register',
    sdkMethod: 'compliance.webhooks.register',
    call: (c) => c.compliance.webhooks.register({ url: 'https://example.com/webhooks/compliance' }),
    request: { method: 'POST', path: `${C}/webhooks/register`, body: { url: 'https://example.com/webhooks/compliance' } },
    response: {
      body: { url: 'https://example.com/webhooks/compliance', secret: '3f1a9c2e7b6d4058a1c9e3f70b8d2a5c6e9f1b3d7a0c5e8f2b4d6a9c1e3f5b7d' },
    },
  },
  {
    operationId: 'compliance.webhooks.status',
    sdkMethod: 'compliance.webhooks.getStatus',
    call: (c) => c.compliance.webhooks.getStatus(),
    request: { method: 'GET', path: `${C}/webhooks/status` },
    response: { body: { registered: false, url: null, registered_at: null } },
  },
];

export const complianceCases: EndpointCase[] = [
  ...complianceSessionsCases,
  ...compliancePresetsCases,
  ...complianceAmlCases,
  ...complianceWalletScreeningCases,
  ...complianceMonitoringCases,
  ...complianceWebhooksCases,
];
