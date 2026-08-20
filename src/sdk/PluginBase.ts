import type {
  ActionContext,
  ActionResult,
  BackgroundTask,
  DashboardComponent,
  PlatformServices,
  PluginAction,
  PluginHealth,
  PluginManifest,
  PluginMenuItem,
  PluginNotificationConfig,
  PluginPage,
  PluginWidget,
} from './types';

export interface PluginContext {
  manifest: PluginManifest;
  services: PlatformServices;
  registerPage(page: PluginPage): void;
  registerWidget(widget: PluginWidget): void;
  registerMenuItem(item: PluginMenuItem): void;
  registerAction(action: PluginAction): void;
  registerBackgroundTask(task: BackgroundTask): void;
  registerDashboardComponent(component: DashboardComponent): void;
  registerNotification(config: PluginNotificationConfig): void;
}

export interface IPlugin {
  readonly manifest: PluginManifest;
  health: PluginHealth;
  initialize(context: PluginContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  destroy(): Promise<void>;
  renderView(viewId: string, container: HTMLElement): Promise<void>;
  handleAction(actionId: string, context: ActionContext): Promise<ActionResult>;
  handleMessage?(type: string, payload: unknown): Promise<unknown>;
}

export abstract class PluginBase implements IPlugin {
  abstract readonly manifest: PluginManifest;

  health: PluginHealth = {
    status: 'registered',
    errorCount: 0,
  };

  protected ctx!: PluginContext;

  async initialize(context: PluginContext): Promise<void> {
    this.ctx = context;
    this.health.status = 'active';
    this.health.lastActivity = Date.now();
  }

  async activate(): Promise<void> {
    this.health.status = 'active';
    this.health.lastActivity = Date.now();
  }

  async deactivate(): Promise<void> {
    this.health.status = 'inactive';
    this.health.lastActivity = Date.now();
  }

  async destroy(): Promise<void> {
    this.health.status = 'inactive';
    this.health.lastActivity = Date.now();
  }

  async renderView(_viewId: string, _container: HTMLElement): Promise<void> {
    // No-op default; plugin may override.
  }

  async handleAction(actionId: string, _context: ActionContext): Promise<ActionResult> {
    return { success: false, message: `Unhandled action: ${actionId}` };
  }

  async handleMessage(_type: string, _payload: unknown): Promise<unknown> {
    return null;
  }

  protected recordError(error: unknown): void {
    this.health.errorCount += 1;
    this.health.lastError = error instanceof Error ? error.message : String(error);
    this.health.status = 'error';
    this.health.lastActivity = Date.now();
  }
}
