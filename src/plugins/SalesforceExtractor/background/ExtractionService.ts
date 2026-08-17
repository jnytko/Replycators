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
  posts: PostEntry[];
  rawText: string;
  extractedAt: number;
  tabId: number;
}

export interface PostEntry {
  author: string;
  timestamp: string;
  content: string;
}

const SF_URL_PATTERN = /salesforce\.com|lightning\.force\.com/i;

export class SalesforceExtractionService {
  constructor(private services: PlatformServices) {}

  async extractFromTab(tabId: number, caseNumber: string): Promise<SalesforceExtractResult | null> {
    this.services.logger.info(`Extracting from tab ${tabId}, caseNumber="${caseNumber}"`);

    try {
      // Inject content script (idempotent — duplicate injection is caught)
      await this.injectContentScript(tabId);
    } catch (_) {
      // Already injected; continue
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
      files: ['plugins/SalesforceExtractor/content/sf-content.js'],
    });
  }
}
