import { STORAGE_KEYS, type StorageKey } from './storageKeys';

export type DataChangeType = 'write' | 'delete' | 'batch';

export interface DataChangeEvent {
  type: DataChangeType;
  keys: StorageKey[];
  timestamp: number;
}

type Subscriber = (event: DataChangeEvent) => void;

class DataStore {
  private subscribers: Set<Subscriber> = new Set();
  private batchDepth = 0;
  private batchedKeys: Set<StorageKey> = new Set();

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  readItem<T>(key: StorageKey, defaultValue: T | null = null): T | null {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  readRawItem(key: StorageKey, defaultValue: string | null = null): string | null {
    return localStorage.getItem(key) ?? defaultValue;
  }

  writeItem<T>(key: StorageKey, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
    this.notifyChange('write', [key]);
  }

  writeRawItem(key: StorageKey, value: string): void {
    localStorage.setItem(key, value);
    this.notifyChange('write', [key]);
  }

  removeItem(key: StorageKey): void {
    localStorage.removeItem(key);
    this.notifyChange('delete', [key]);
  }

  beginBatch(): void {
    this.batchDepth++;
  }

  commitBatch(): void {
    if (this.batchDepth > 0) {
      this.batchDepth--;
      if (this.batchDepth === 0 && this.batchedKeys.size > 0) {
        const keys = Array.from(this.batchedKeys);
        this.batchedKeys.clear();
        this.emit({
          type: 'batch',
          keys,
          timestamp: Date.now(),
        });
      }
    }
  }

  abortBatch(): void {
    this.batchDepth = 0;
    this.batchedKeys.clear();
  }

  writeBatch(items: Array<{ key: StorageKey; value: unknown }>): void {
    this.beginBatch();
    try {
      for (const { key, value } of items) {
        localStorage.setItem(key, JSON.stringify(value));
        this.batchedKeys.add(key);
      }
      this.commitBatch();
    } catch {
      this.abortBatch();
      throw new Error('批量写入失败');
    }
  }

  writeAllData(data: {
    records?: unknown;
    modes?: unknown;
    workbenchTasks?: unknown;
    tombstones?: unknown;
  }): void {
    const items: Array<{ key: StorageKey; value: unknown }> = [];

    if (data.records !== undefined) {
      items.push({ key: STORAGE_KEYS.RECORDS, value: data.records });
    }
    if (data.modes !== undefined) {
      items.push({ key: STORAGE_KEYS.MODES, value: data.modes });
    }
    if (data.workbenchTasks !== undefined) {
      items.push({ key: STORAGE_KEYS.WORKBENCH, value: data.workbenchTasks });
    }
    if (data.tombstones !== undefined) {
      items.push({ key: STORAGE_KEYS.TOMBSTONES, value: data.tombstones });
    }

    this.writeBatch(items);
  }

  private notifyChange(type: DataChangeType, keys: StorageKey[]): void {
    if (this.batchDepth > 0) {
      keys.forEach(key => this.batchedKeys.add(key));
      return;
    }

    this.emit({
      type,
      keys,
      timestamp: Date.now(),
    });
  }

  private emit(event: DataChangeEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('数据变更通知失败:', error);
      }
    });
  }
}

export const dataStore = new DataStore();
