/**
 * SalesforceExtractor Plugin — Core plugin class.
 * Registers pages, actions, and dashboard widget.
 * Content script handles DOM extraction in page context.
 */

import { PluginBase } from '@replycators/sdk';
import { PluginLoader } from '@replycators/platform/loader/PluginLoader';
import { SF_MANIFEST } from './manifest';
import type { ActionContext, ActionResult } from '@replycators/sdk';

export class SalesforceExtractorPlugin extends PluginBase {
  readonly manifest = SF_MANIFEST;

  async initialize(context: import('@replycators/sdk').PluginContext): Promise<void> {
    await super.initialize(context);

    context.registerPage({
      id: 'sf-extractor-main',
      title: 'Salesforce Case Extractor',
      icon: '☁️',
      component: 'SalesforceExtractorView',
      route: '/plugins/salesforce-extractor',
      showInSidebar: true,
      order: 10,
    });

    context.registerDashboardComponent({
      id: 'sf-extractor-widget',
      title: 'Salesforce Case Extractor',
      component: 'SalesforceExtractorWidget',
      size: 'medium',
      order: 10,
    });

    context.registerAction({
      id: 'extract-current-tab',
      label: 'Extract Current Salesforce Tab',
      description: 'Extract case data from the currently active Salesforce tab',
      icon: '📋',
      handler: (ctx: import('@replycators/sdk').ActionContext) => this.handleAction('extract-current-tab', ctx),
    });

    context.registerAction({
      id: 'extract-by-case-number',
      label: 'Extract by Case Number',
      description: 'Search all open Salesforce tabs and extract by case number',
      icon: '🔍',
      handler: (ctx: import('@replycators/sdk').ActionContext) => this.handleAction('extract-by-case-number', ctx),
    });

    context.services.logger.info('SalesforceExtractorPlugin initialized');
  }

  async renderView(viewId: string, container: HTMLElement): Promise<void> {
    const { renderSalesforceUI } = await import('./ui/SalesforceExtractorUI');
    renderSalesforceUI(container, this.ctx);
  }

  async handleAction(actionId: string, context: ActionContext): Promise<ActionResult> {
    try {
      const { SalesforceExtractionService } = await import('./background/ExtractionService');
      const svc = new SalesforceExtractionService(this.ctx.services);

      if (actionId === 'extract-current-tab') {
        const tabId = context.tabId;
        if (!tabId) return { success: false, message: 'No tab ID provided' };
        const result = await svc.extractFromTab(tabId, '');
        return {
          success: result !== null,
          data: result,
          message: result ? 'Extraction complete' : 'Extraction failed',
        };
      }

      if (actionId === 'extract-by-case-number') {
        const rawCaseNumber = context.pluginData?.caseNumber;
        const caseNumber = typeof rawCaseNumber === 'string' ? rawCaseNumber.trim() : '';
        if (!caseNumber) return { success: false, message: 'A case number is required' };
        const result = await svc.extractByCaseNumber(caseNumber);
        return { success: !!result, data: result, message: result ? 'Case found' : 'Case not found' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.recordError(err);
      return { success: false, message: msg };
    }

    return { success: false, message: `Unknown action: ${actionId}` };
  }

  async handleMessage(type: string, payload: unknown): Promise<unknown> {
    if (type === 'SF_EXTRACT_RESULT') {
      this.ctx.services.events.emit('sf:extraction-result', payload);
      return { received: true };
    }
    return null;
  }
}

// Self-register with the platform
PluginLoader.register(() => new SalesforceExtractorPlugin());
