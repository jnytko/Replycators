export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export type LogLevel = 'debug' | 'info' | 'warn' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  pluginId: string;
  message: string;
  args?: unknown[];
}

export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  duration?: number;
  pluginId?: string;
  timestamp?: number;
}

export type EventHandler = (data?: unknown) => void | Promise<void>;

export interface IEventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, handler: EventHandler): () => void;
  once(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  getHistory(event?: string): Array<{ event: string; data: unknown; timestamp: number }>;
}

export interface IStorageService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(prefix?: string): Promise<void>;
  getAll<T>(prefix: string): Promise<Record<string, T>>;
}

export type SettingValue = string | number | boolean | null | Record<string, unknown> | unknown[];

export interface PluginSettingOption {
  value: string;
  label: string;
}

export interface PluginSettingSchema {
  key: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  default?: SettingValue;
  options?: PluginSettingOption[];
  group?: string;
}

export interface ISettingsService {
  registerSchema(pluginId: string, schema: PluginSettingSchema[]): void;
  getSchema(pluginId: string): PluginSettingSchema[];
  getAllSchemas(): Map<string, PluginSettingSchema[]>;
  get<T extends SettingValue>(pluginId: string, key: string): Promise<T | undefined>;
  set(pluginId: string, key: string, value: SettingValue): Promise<void>;
  getAll(pluginId: string): Promise<Record<string, SettingValue>>;
  reset(pluginId: string, key?: string): Promise<void>;
}

export interface TabMessage {
  type: string;
  pluginId?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export interface BackgroundMessage {
  type: string;
  pluginId?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export type MessageHandler = (
  message: unknown,
  sender: chrome.runtime.MessageSender
) => unknown | Promise<unknown>;

export interface IMessagingService {
  sendToTab(tabId: number, message: TabMessage): Promise<unknown>;
  sendToBackground(message: BackgroundMessage): Promise<unknown>;
  onMessage(handler: MessageHandler): () => void;
  onMessageType(type: string, handler: MessageHandler): () => void;
  injectScript(tabId: number, files: string[]): Promise<void>;
}

export interface INotificationService {
  show(notification: PlatformNotification): void;
  dismiss(id: string): void;
  getActive(): PlatformNotification[];
  getHistory(limit?: number): PlatformNotification[];
  clearHistory(): void;
  getUnreadCount(): number;
}

export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  getEntries(limit?: number): LogEntry[];
}

export type PluginStatus = 'registered' | 'loading' | 'active' | 'inactive' | 'disabled' | 'error';

export interface PluginHealth {
  status: PluginStatus;
  errorCount: number;
  lastError?: string;
  lastActivity?: number;
  loadTime?: number;
}

export interface PluginPage {
  id: string;
  title: string;
  icon?: string;
  component: string;
  route: string;
  showInSidebar?: boolean;
  order?: number;
}

export interface PluginWidget {
  id: string;
  title: string;
  component: string;
  size: 'small' | 'medium' | 'large';
  order?: number;
}

export interface PluginMenuItem {
  id: string;
  label: string;
  action: string;
  order?: number;
}

export interface ActionContext {
  tabId?: number;
  pluginData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface PluginAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  handler: (context: ActionContext) => ActionResult | Promise<ActionResult>;
}

export interface BackgroundTask {
  id: string;
  name: string;
  alarmName?: string;
  handler: () => void | Promise<void>;
}

export interface DashboardComponent {
  id: string;
  title: string;
  component: string;
  size: 'small' | 'medium' | 'large';
  order?: number;
}

export interface PluginNotificationConfig {
  id: string;
  title: string;
  type: NotificationType;
  trigger: 'manual' | 'event' | 'schedule' | string;
}

export interface ManifestContentScript {
  matches: string[];
  js: string[];
  runAt?: 'document_start' | 'document_end' | 'document_idle';
  world?: 'ISOLATED' | 'MAIN';
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  tags?: string[];
  icon?: string;
  permissions?: string[];
  hostPermissions?: string[];
  contentScripts?: ManifestContentScript[];
  settings?: PluginSettingSchema[];
  enabled?: boolean;
}

export interface PlatformServices {
  storage: IStorageService;
  events: IEventBus;
  logger: ILogger;
  notifications: INotificationService;
  settings: ISettingsService;
  messaging: IMessagingService;
}
