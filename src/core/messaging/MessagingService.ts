/**
 * MessagingService — Unified Chrome messaging abstraction.
 * Plugins never call chrome.runtime directly; they use this service.
 */

import type { IMessagingService, TabMessage, BackgroundMessage, MessageHandler } from '../../sdk/types';
import { getLogger } from '../logging/Logger';

const logger = getLogger('platform:messaging');

export class MessagingService implements IMessagingService {
  private static instance: MessagingService;
  private handlers = new Map<string, MessageHandler[]>();

  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService();
      MessagingService.instance.bootstrap();
    }
    return MessagingService.instance;
  }

  private bootstrap(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const type: string = message?.type ?? '';
      const handlers = this.handlers.get(type) ?? this.handlers.get('*') ?? [];

      if (handlers.length === 0) return false;

      let responded = false;
      const handleAsync = async () => {
        for (const h of handlers) {
          try {
            const result = await h(message, sender);
            if (result !== undefined && !responded) {
              sendResponse(result);
              responded = true;
            }
          } catch (err) {
            logger.error(`Handler error for message type "${type}":`, err);
          }
        }
        if (!responded) sendResponse(null);
      };

      handleAsync();
      return true; // Keep channel open for async response
    });
  }

  async sendToTab(tabId: number, message: TabMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  async sendToBackground(message: BackgroundMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  onMessage(handler: MessageHandler): () => void {
    const existing = this.handlers.get('*') ?? [];
    existing.push(handler);
    this.handlers.set('*', existing);
    return () => {
      const arr = this.handlers.get('*') ?? [];
      this.handlers.set('*', arr.filter(h => h !== handler));
    };
  }

  onMessageType(type: string, handler: MessageHandler): () => void {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
    return () => {
      const arr = this.handlers.get(type) ?? [];
      this.handlers.set(type, arr.filter(h => h !== handler));
    };
  }

  async injectScript(tabId: number, files: string[]): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      files,
    });
  }
}
