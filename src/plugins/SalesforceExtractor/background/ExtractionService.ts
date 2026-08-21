/**
 * SalesforceExtractionService — Background-side orchestration.
 * Finds tabs, injects content script, sends extract messages, collects responses.
 */

import type { PlatformServices } from '@replycators/sdk';

export interface SalesforceExtractResult {
  caseNumber: string;
  accountName: string;
  contactName: string;
  subject: string;
  description: string;
  agentDescription?: string;
  severityLevel?: string;
  primaryProduct?: string;
  nextActionDatetime?: string;
  status?: string;
  priority?: string;
  posts: PostEntry[];
  rawText?: string;
  extractedAt: number;
  tabId: number;
}

export interface PostEntry {
  author: string;
  timestamp: string;
  content: string;
  type?: string;
}

const SF_URL_PATTERN = /salesforce\.com|lightning\.force\.com/i;
const SF_CONTENT_SCRIPT = 'plugins/salesforce/content/sf-content.js';

function isPostEntry(value: unknown): value is PostEntry {
  if (!value || typeof value !== 'object') return false;
  const post = value as Record<string, unknown>;
  return typeof post.author === 'string' &&
    typeof post.timestamp === 'string' &&
    typeof post.content === 'string' &&
    (post.type === undefined || typeof post.type === 'string');
}

function isExtractPayload(
  value: unknown
): value is Omit<SalesforceExtractResult, 'tabId' | 'extractedAt'> {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.caseNumber === 'string' &&
    typeof data.accountName === 'string' &&
    typeof data.contactName === 'string' &&
    typeof data.subject === 'string' &&
    typeof data.description === 'string' &&
    (data.agentDescription === undefined || typeof data.agentDescription === 'string') &&
    (data.severityLevel === undefined || typeof data.severityLevel === 'string') &&
    (data.primaryProduct === undefined || typeof data.primaryProduct === 'string') &&
    (data.nextActionDatetime === undefined || typeof data.nextActionDatetime === 'string') &&
    (data.status === undefined || typeof data.status === 'string') &&
    (data.priority === undefined || typeof data.priority === 'string') &&
    (data.rawText === undefined || typeof data.rawText === 'string') &&
    Array.isArray(data.posts) && data.posts.every(isPostEntry);
}

export class SalesforceExtractionService {
  constructor(private services: PlatformServices) {}

  async extractFromTab(tabId: number, caseNumber: string): Promise<SalesforceExtractResult | null> {
    this.services.logger.info(`Extracting from tab ${tabId}, caseNumber="${caseNumber}"`);

    try {
      // Inject content script (idempotent — duplicate injection is caught)
      await this.injectContentScript(tabId);
    } catch (err) {
      this.services.logger.error(`Failed to inject Salesforce content script into tab ${tabId}`, err);
      return null;
    }

    return new Promise<SalesforceExtractResult | null>((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { type: 'SF_EXTRACT', pluginId: 'com.replycators.salesforce-extractor', payload: { caseNumber } },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            this.services.logger.warn(`No response from tab ${tabId}:`, chrome.runtime.lastError?.message);
            resolve(null);
            return;
          }
          if (response.result === null) {
            resolve(null); // Case number mismatch
            return;
          }
          if (!isExtractPayload(response.data)) {
            this.services.logger.error(`Invalid extraction response from tab ${tabId}`);
            resolve(null);
            return;
          }
          resolve({ ...response.data, tabId, extractedAt: Date.now() });
        }
      );
    });
  }

  async extractByCaseNumber(caseNumber: string): Promise<SalesforceExtractResult | null> {
    const tabs = await this.getSalesforceTabs();
    this.services.logger.info(`Scanning ${tabs.length} Salesforce tab(s) for case "${caseNumber}"`);

    for (const tab of tabs) {
      if (!tab.id) continue;
      const result = await this.extractFromTab(tab.id, caseNumber);
      if (result) return result;
    }
    return null;
  }

  private async getSalesforceTabs(): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
      chrome.tabs.query({ lastFocusedWindow: false }, (tabs) => {
        resolve(tabs.filter(t => t.url && SF_URL_PATTERN.test(t.url)));
      });
    });
  }

  private async injectContentScript(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [SF_CONTENT_SCRIPT],
    });
  }
}
