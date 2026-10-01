import type { HttpClient } from '../../core/http.js';
import { CardCards } from './cards.js';
import { CardBalance, CardReports, CardTags, CardWebhooks } from './others.js';

/** The `card` (Expense Management) domain. `client.card`. */
export class CardDomain {
  readonly cards: CardCards;
  readonly webhooks: CardWebhooks;
  readonly balance: CardBalance;
  readonly tags: CardTags;
  readonly reports: CardReports;

  constructor(client: HttpClient) {
    this.cards = new CardCards(client);
    this.webhooks = new CardWebhooks(client);
    this.balance = new CardBalance(client);
    this.tags = new CardTags(client);
    this.reports = new CardReports(client);
  }
}

export { CardBalance, CardCards, CardReports, CardTags, CardWebhooks };
