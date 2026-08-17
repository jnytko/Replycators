/**
 * ApptioUpgradeCalculator — Plugin entry point.
 *
 * Self-registers with PluginLoader.
 * All UI logic is in ui/UpgradeCalculatorUI.ts.
 * Schedule retrieval / parsing / caching is in UpgradeScheduleService.ts.
 */

import { PluginBase }  from '../../sdk/PluginBase';
import { PluginLoader } from '../../platform/loader/PluginLoader';
import { APPTIO_UPGRADE_MANIFEST } from './manifest';
import type { ActionContext, ActionResult } from '../../sdk/types';

export class ApptioUpgradeCalculatorPlugin extends PluginBase {
  readonly manifest = APPTIO_UPGRADE_MANIFEST;

  async initialize(context: import('../../sdk/PluginBase').PluginContext): Promise<void> {
    await super.initialize(context);

    context.registerPage({
      id:            'apptio-upgrade-calc-main',
      title:         'Apptio Planning Upgrade Calculator',
      icon:          '📅',
      component:     'ApptioUpgradeCalculatorView',
      route:         '/plugins/apptio-planning-upgrade-calculator',
      showInSidebar: true,
      order:         25,
    });

    context.registerDashboardComponent({
      id:        'apptio-upgrade-calc-widget',
      title:     'Apptio Planning Upgrade Calculator',
      component: 'ApptioUpgradeCalculatorWidget',
      size:      'medium',
      order:     25,
    });

    context.registerAction({
      id:          'open-upgrade-calculator',
      label:       'Open Upgrade Calculator',
      description: 'Calculate Apptio Planning upgrade dates for a customer',
      icon:        '📅',
      handler:     (ctx) => this.handleAction('open-upgrade-calculator', ctx),
    });

    context.registerNotification({
      id:      'schedule-refreshed',
      title:   'Apptio Planning Upgrade Calculator',
      type:    'info',
      trigger: 'manual',
    });

    context.services.logger.info('ApptioUpgradeCalculatorPlugin initialized');
  }

  async renderView(_viewId: string, container: HTMLElement): Promise<void> {
    const { renderUpgradeCalculatorUI } = await import('./ui/UpgradeCalculatorUI');
    renderUpgradeCalculatorUI(container, this.ctx);
  }

  async handleAction(actionId: string, _context: ActionContext): Promise<ActionResult> {
    if (actionId === 'open-upgrade-calculator') {
      return {
        success: true,
        message: 'Open the Apptio Planning Upgrade Calculator plugin to calculate upgrade dates.',
      };
    }
    return { success: false, message: `Unknown action: ${actionId}` };
  }
}

PluginLoader.register(() => new ApptioUpgradeCalculatorPlugin());
