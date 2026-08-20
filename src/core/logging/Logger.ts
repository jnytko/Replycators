/**
 * LoggingFramework — Structured, leveled log collection.
 * Each plugin gets its own logger scoped to its plugin ID.
 */

import type { ILogger, LogEntry, LogLevel } from '../../sdk/types';
import { EventBus, PlatformEvents } from '../events/EventBus';

let entryCounter = 0;

export class Logger implements ILogger {
  private readonly pluginId: string;
  private static entries: LogEntry[] = [];
  private static readonly maxEntries = 2000;
  private readonly minLevel: LogLevel;

  private static readonly LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    warning: 2,
    error: 3,
  };

  constructor(pluginId: string, minLevel: LogLevel = 'debug') {
    this.pluginId = pluginId;
    this.minLevel = minLevel;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, args);
  }

  getEntries(limit = 100): LogEntry[] {
    return Logger.entries
      .filter(e => e.pluginId === this.pluginId || this.pluginId === 'platform')
      .slice(-limit);
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (Logger.LEVELS[level] < Logger.LEVELS[this.minLevel]) return;

    const entry: LogEntry = {
      id: `log-${++entryCounter}`,
      timestamp: Date.now(),
      level,
      pluginId: this.pluginId,
      message,
      args: args.length > 0 ? args : undefined,
    };

    Logger.entries.push(entry);
    if (Logger.entries.length > Logger.maxEntries) Logger.entries.shift();

    // Forward to event bus (UI subscribes for live display)
    EventBus.getInstance().emit(PlatformEvents.LOG_ENTRY, entry);

  }

  // ─── Static API for platform-wide log access ──────────────────────────────

  static getAllEntries(limit = 200): LogEntry[] {
    return Logger.entries.slice(-limit);
  }

  static getEntriesForPlugin(pluginId: string, limit = 100): LogEntry[] {
    return Logger.entries.filter(e => e.pluginId === pluginId).slice(-limit);
  }

  static clearEntries(): void {
    Logger.entries = [];
  }
}

// ─── Global logger factory ─────────────────────────────────────────────────────

const loggerCache = new Map<string, Logger>();

export function getLogger(pluginId: string): Logger {
  if (!loggerCache.has(pluginId)) {
    loggerCache.set(pluginId, new Logger(pluginId));
  }
  return loggerCache.get(pluginId)!;
}
