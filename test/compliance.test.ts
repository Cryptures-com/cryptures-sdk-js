import { describe } from 'vitest';
import {
  complianceAmlCases,
  complianceMonitoringCases,
  compliancePresetsCases,
  complianceSessionsCases,
  complianceWalletScreeningCases,
  complianceWebhooksCases,
} from './cases/compliance.js';
import { runEndpointCases } from './helpers.js';

describe('client.compliance.sessions', () => runEndpointCases(complianceSessionsCases));
describe('client.compliance.presets', () => runEndpointCases(compliancePresetsCases));
describe('client.compliance.aml', () => runEndpointCases(complianceAmlCases));
describe('client.compliance.walletScreening', () => runEndpointCases(complianceWalletScreeningCases));
describe('client.compliance.monitoring', () => runEndpointCases(complianceMonitoringCases));
describe('client.compliance.webhooks', () => runEndpointCases(complianceWebhooksCases));
