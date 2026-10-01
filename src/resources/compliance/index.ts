import type { HttpClient } from '../../core/http.js';
import {
  ComplianceAml,
  ComplianceMonitoring,
  CompliancePresets,
  ComplianceWalletScreening,
  ComplianceWebhooks,
} from './others.js';
import { ComplianceSessions } from './sessions.js';

/** The `compliance` domain: KYC/KYB sessions, AML and wallet screening, monitoring. `client.compliance`. */
export class ComplianceDomain {
  readonly sessions: ComplianceSessions;
  readonly presets: CompliancePresets;
  readonly aml: ComplianceAml;
  readonly walletScreening: ComplianceWalletScreening;
  readonly monitoring: ComplianceMonitoring;
  readonly webhooks: ComplianceWebhooks;

  constructor(client: HttpClient) {
    this.sessions = new ComplianceSessions(client);
    this.presets = new CompliancePresets(client);
    this.aml = new ComplianceAml(client);
    this.walletScreening = new ComplianceWalletScreening(client);
    this.monitoring = new ComplianceMonitoring(client);
    this.webhooks = new ComplianceWebhooks(client);
  }
}

export {
  ComplianceAml,
  ComplianceMonitoring,
  CompliancePresets,
  ComplianceSessions,
  ComplianceWalletScreening,
  ComplianceWebhooks,
};
