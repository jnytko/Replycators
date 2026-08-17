/**
 * NotificationCenter — Platform-wide notification management.
 * Plugins call services.notifications.show(); the UI subscribes to display them.
 */

import type { INotificationService, PlatformNotification } from '../../sdk/types';
import { EventBus, PlatformEvents } from '../events/EventBus';

export class NotificationCenter implements INotificationService {
  private static instance: NotificationCenter;
  private active = new Map<string, PlatformNotification>();
  private history: PlatformNotification[] = [];
  private readonly maxHistory = 200;

  static getInstance(): NotificationCenter {
    if (!NotificationCenter.instance) {
      NotificationCenter.instance = new NotificationCenter();
    }
    return NotificationCenter.instance;
  }

  show(notification: PlatformNotification): void {
    const enriched: PlatformNotification = {
      ...notification,
      timestamp: Date.now(),
    };

    this.active.set(enriched.id, enriched);
    this.history.push(enriched);
    if (this.history.length > this.maxHistory) this.history.shift();

    EventBus.getInstance().emit(PlatformEvents.NOTIFICATION, {
      action: 'show',
      notification: enriched,
    });

    // Auto-dismiss if duration > 0
    if (enriched.duration && enriched.duration > 0) {
      setTimeout(() => this.dismiss(enriched.id), enriched.duration);
    }
  }

  dismiss(id: string): void {
    const notification = this.active.get(id);
    if (!notification) return;
    this.active.delete(id);
    EventBus.getInstance().emit(PlatformEvents.NOTIFICATION, {
      action: 'dismiss',
      notification,
    });
  }

  getActive(): PlatformNotification[] {
    return Array.from(this.active.values());
  }

  getHistory(limit = 50): PlatformNotification[] {
    return this.history.slice(-limit);
  }

  clearHistory(): void {
    this.history = [];
  }

  getUnreadCount(): number {
    return this.active.size;
  }
}
