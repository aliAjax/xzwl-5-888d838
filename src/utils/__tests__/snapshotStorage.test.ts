import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSnapshot,
  getSnapshots,
  getSnapshotById,
  deleteSnapshot,
  restoreFromSnapshot,
  createRestorePreview,
  compareWithSnapshot,
  importSnapshot,
  parseSnapshotFile,
} from '../snapshotStorage';
import { saveRecords } from '../storage';
import { saveModes } from '../modeStorage';
import { saveWorkbenchTasks } from '../workbenchStorage';
import { saveTombstones, addTombstone } from '../versionedBackup';
import { dataStore } from '../dataStore';
import { STORAGE_KEYS } from '../storageKeys';
import type { HandpanRecord, ModeOption, WorkbenchTask, LocalSnapshot } from '@/types/record';

describe('snapshotStorage utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const createTestRecord = (id: string, overrides: Partial<HandpanRecord> = {}): HandpanRecord => ({
    id,
    serialNumber: `HP-${id}`,
    mode: 'D Kurd',
    noteCount: 9,
    lastTuningDate: '2024-01-01',
    deviationNote: '正常',
    customerNickname: '客户A',
    deliveryStatus: 'pending',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    tuningHistory: [],
    ...overrides,
  });

  const createTestMode = (id: string, overrides: Partial<ModeOption> = {}): ModeOption => ({
    id,
    name: `调式${id}`,
    active: true,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  const createTestTask = (id: string, recordId: string, overrides: Partial<WorkbenchTask> = {}): WorkbenchTask => ({
    id,
    recordId,
    status: 'pending',
    taskDate: '2024-06-01',
    sortOrder: 0,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  });

  const setupTestData = () => {
    const records = [
      createTestRecord('r1'),
      createTestRecord('r2', { serialNumber: 'HP-r2', customerNickname: '客户B' }),
    ];
    const modes = [createTestMode('m1'), createTestMode('m2')];
    const tasks = [createTestTask('t1', 'r1'), createTestTask('t2', 'r2')];

    saveRecords(records);
    saveModes(modes);
    saveWorkbenchTasks(tasks);
    addTombstone('deleted-record', 'record');

    return { records, modes, tasks };
  };

  describe('createSnapshot', () => {
    it('应创建包含所有数据的快照', () => {
      setupTestData();

      const snapshot = createSnapshot('测试快照', '测试描述');

      expect(snapshot.id).toMatch(/^snap-/);
      expect(snapshot.name).toBe('测试快照');
      expect(snapshot.description).toBe('测试描述');
      expect(snapshot.recordCount).toBe(2);
      expect(snapshot.modeCount).toBe(2);
      expect(snapshot.workbenchTaskCount).toBe(2);
      expect(snapshot.tombstoneCount).toBe(1);
      expect(snapshot.data.records.length).toBe(2);
      expect(snapshot.data.modes.length).toBe(2);
      expect(snapshot.data.workbenchTasks.length).toBe(2);
      expect(snapshot.data.tombstones.length).toBe(1);
    });

    it('空名称应生成默认名称', () => {
      setupTestData();
      const snapshot = createSnapshot('');
      expect(snapshot.name).toContain('快照');
    });

    it('应保存快照到 localStorage', () => {
      setupTestData();
      const snapshot = createSnapshot('测试快照');

      const storedSnapshots = JSON.parse(localStorage.getItem(STORAGE_KEYS.SNAPSHOTS) || '[]');
      expect(storedSnapshots.length).toBe(1);
      expect(storedSnapshots[0].id).toBe(snapshot.id);
    });
  });

  describe('getSnapshots / getSnapshotById', () => {
    it('空存储应返回空数组', () => {
      expect(getSnapshots()).toEqual([]);
    });

    it('应获取所有快照', () => {
      setupTestData();
      createSnapshot('快照1');
      createSnapshot('快照2');

      const snapshots = getSnapshots();
      expect(snapshots.length).toBe(2);
    });

    it('应通过 ID 获取快照', () => {
      setupTestData();
      const snapshot = createSnapshot('测试快照');

      const found = getSnapshotById(snapshot.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(snapshot.id);
    });

    it('不存在的 ID 应返回 null', () => {
      expect(getSnapshotById('non-existent')).toBeNull();
    });
  });

  describe('deleteSnapshot', () => {
    it('应删除存在的快照', () => {
      setupTestData();
      const snapshot = createSnapshot('测试快照');

      const result = deleteSnapshot(snapshot.id);
      expect(result).toBe(true);
      expect(getSnapshots().length).toBe(0);
    });

    it('不存在的快照应返回 false', () => {
      expect(deleteSnapshot('non-existent')).toBe(false);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('应完全恢复所有模块数据', () => {
      setupTestData();
      const snapshot = createSnapshot('恢复测试快照');

      saveRecords([]);
      saveModes([]);
      saveWorkbenchTasks([]);
      saveTombstones([]);

      const options = {
        restoreRecords: true,
        restoreWorkbench: true,
        restoreModes: true,
      };

      const result = restoreFromSnapshot(snapshot.id, options);

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.restoredRecords).toBe(2);
      expect(result!.restoredWorkbenchTasks).toBe(2);
      expect(result!.restoredModes).toBe(2);

      const storedRecords = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS) || '[]');
      const storedModes = JSON.parse(localStorage.getItem(STORAGE_KEYS.MODES) || '[]');
      const storedTasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKBENCH) || '[]');
      const storedTombstones = JSON.parse(localStorage.getItem(STORAGE_KEYS.TOMBSTONES) || '[]');

      expect(storedRecords.length).toBe(2);
      expect(storedModes.length).toBe(2);
      expect(storedTasks.length).toBe(2);
      expect(storedTombstones.length).toBe(1);
    });

    it('应通过 dataStore 触发批量数据变更事件', () => {
      setupTestData();
      const snapshot = createSnapshot('事件测试快照');

      saveRecords([]);
      saveModes([]);
      saveWorkbenchTasks([]);

      const options = {
        restoreRecords: true,
        restoreWorkbench: true,
        restoreModes: true,
      };

      let eventCount = 0;
      let lastEvent: any = null;
      const unsubscribe = dataStore.subscribe((event) => {
        eventCount++;
        lastEvent = event;
      });

      restoreFromSnapshot(snapshot.id, options);

      expect(eventCount).toBe(1);
      expect(lastEvent.type).toBe('batch');
      expect(lastEvent.keys).toContain(STORAGE_KEYS.RECORDS);
      expect(lastEvent.keys).toContain(STORAGE_KEYS.MODES);
      expect(lastEvent.keys).toContain(STORAGE_KEYS.WORKBENCH);
      expect(lastEvent.keys).toContain(STORAGE_KEYS.TOMBSTONES);

      unsubscribe();
    });

    it('应只恢复记录模块', () => {
      setupTestData();
      const snapshot = createSnapshot('部分恢复快照');

      saveRecords([]);
      saveModes([createTestMode('new-mode')]);
      saveWorkbenchTasks([]);

      const options = {
        restoreRecords: true,
        restoreWorkbench: false,
        restoreModes: false,
      };

      const result = restoreFromSnapshot(snapshot.id, options);

      expect(result).not.toBeNull();
      expect(result!.restoredRecords).toBe(2);
      expect(result!.restoredModes).toBe(0);
      expect(result!.restoredWorkbenchTasks).toBe(0);

      const storedRecords = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS) || '[]');
      const storedModes = JSON.parse(localStorage.getItem(STORAGE_KEYS.MODES) || '[]');

      expect(storedRecords.length).toBe(2);
      expect(storedModes.length).toBe(1);
      expect(storedModes[0].id).toBe('new-mode');
    });

    it('应清理引用不存在记录的工作台任务', () => {
      const records = [createTestRecord('r1')];
      const tasks = [
        createTestTask('t1', 'r1'),
        createTestTask('t2', 'non-existent-record'),
      ];

      saveRecords(records);
      saveModes([]);
      saveWorkbenchTasks(tasks);

      const snapshot = createSnapshot('孤立任务测试快照');

      saveRecords([createTestRecord('r1')]);
      saveWorkbenchTasks([]);

      const options = {
        restoreRecords: true,
        restoreWorkbench: true,
        restoreModes: false,
      };

      const result = restoreFromSnapshot(snapshot.id, options);

      expect(result).not.toBeNull();
      expect(result!.cleanedOrphanedTasks).toBe(1);
      expect(result!.warnings.length).toBe(1);
      expect(result!.warnings[0]).toContain('1');

      const storedTasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKBENCH) || '[]');
      expect(storedTasks.length).toBe(1);
      expect(storedTasks[0].id).toBe('t1');
    });

    it('不存在的快照 ID 应返回 null', () => {
      const options = {
        restoreRecords: true,
        restoreWorkbench: true,
        restoreModes: true,
      };

      const result = restoreFromSnapshot('non-existent', options);
      expect(result).toBeNull();
    });

    it('恢复时应正确迁移历史数据格式', () => {
      const oldFormatRecord = {
        id: 'old-r1',
        serialNumber: 'HP-OLD',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '老客户',
        deliveryStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const snapshot: LocalSnapshot = {
        id: 'snap-migration-test',
        name: '迁移测试快照',
        description: '',
        createdAt: new Date().toISOString(),
        formatVersion: '1.0',
        dataVersion: 1,
        recordCount: 1,
        workbenchTaskCount: 0,
        modeCount: 0,
        tombstoneCount: 0,
        data: {
          records: [oldFormatRecord as HandpanRecord],
          workbenchTasks: [],
          modes: [],
          tombstones: [],
        },
      };

      const storedSnapshots = [snapshot];
      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(storedSnapshots));

      const options = {
        restoreRecords: true,
        restoreWorkbench: false,
        restoreModes: false,
      };

      const result = restoreFromSnapshot(snapshot.id, options);

      expect(result).not.toBeNull();
      expect(result!.restoredRecords).toBe(1);

      const storedRecords = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS) || '[]');
      expect(storedRecords[0].tuningHistory).toBeDefined();
      expect(storedRecords[0].tuningHistory.length).toBe(1);
      expect(storedRecords[0].tuningHistory[0].remark).toBe('历史数据迁移');
    });
  });

  describe('createRestorePreview', () => {
    it('应创建恢复预览', () => {
      setupTestData();
      const snapshot = createSnapshot('预览测试快照');

      saveRecords([createTestRecord('r3')]);

      const options = {
        restoreRecords: true,
        restoreWorkbench: false,
        restoreModes: false,
      };

      const preview = createRestorePreview(snapshot.id, options);

      expect(preview).not.toBeNull();
      expect(preview!.willChangeRecords).toBe(2);
      expect(preview!.willDeleteRecords).toBe(1);
    });

    it('不存在的快照应返回 null', () => {
      const options = {
        restoreRecords: true,
        restoreWorkbench: false,
        restoreModes: false,
      };

      const preview = createRestorePreview('non-existent', options);
      expect(preview).toBeNull();
    });
  });

  describe('compareWithSnapshot', () => {
    it('应比较当前数据与快照', () => {
      setupTestData();
      const snapshot = createSnapshot('比较测试快照');

      saveRecords([
        createTestRecord('r1'),
        createTestRecord('r3', { serialNumber: 'HP-r3', customerNickname: '客户C' }),
      ]);

      const comparison = compareWithSnapshot(snapshot.id);

      expect(comparison).not.toBeNull();
      expect(comparison!.entities.length).toBe(3);

      const recordsComparison = comparison!.entities.find(e => e.entityType === 'records');
      expect(recordsComparison).toBeDefined();
      expect(recordsComparison!.added).toBe(1);
      expect(recordsComparison!.deleted).toBe(1);
    });

    it('不存在的快照应返回 null', () => {
      expect(compareWithSnapshot('non-existent')).toBeNull();
    });
  });

  describe('parseSnapshotFile / importSnapshot', () => {
    it('应解析有效的快照文件', () => {
      setupTestData();
      const snapshot = createSnapshot('导入测试快照');
      const jsonString = JSON.stringify(snapshot);

      const parsed = parseSnapshotFile(jsonString);
      expect(parsed.id).toBe(snapshot.id);
      expect(parsed.data.records.length).toBe(2);
    });

    it('无效格式应抛出错误', () => {
      expect(() => parseSnapshotFile(JSON.stringify({ invalid: true }))).toThrow('快照文件格式无效');
    });

    it('应导入快照', () => {
      const externalSnapshot: LocalSnapshot = {
        id: 'snap-external-1',
        name: '外部快照',
        description: '',
        createdAt: new Date().toISOString(),
        formatVersion: '1.0',
        dataVersion: 1,
        recordCount: 1,
        workbenchTaskCount: 0,
        modeCount: 0,
        tombstoneCount: 0,
        data: {
          records: [createTestRecord('ext-r1')],
          workbenchTasks: [],
          modes: [],
          tombstones: [],
        },
      };

      const imported = importSnapshot(externalSnapshot);
      expect(imported.id).toBe('snap-external-1');
      expect(getSnapshots().length).toBe(1);
    });

    it('重复导入相同快照应抛出错误', () => {
      const snapshot: LocalSnapshot = {
        id: 'snap-duplicate',
        name: '重复快照',
        description: '',
        createdAt: new Date().toISOString(),
        formatVersion: '1.0',
        dataVersion: 1,
        recordCount: 1,
        workbenchTaskCount: 0,
        modeCount: 0,
        tombstoneCount: 0,
        data: {
          records: [createTestRecord('dup-r1')],
          workbenchTasks: [],
          modes: [],
          tombstones: [],
        },
      };

      importSnapshot(snapshot);
      expect(() => importSnapshot(snapshot)).toThrow('该快照已存在');
    });
  });

  describe('使用 dataStore.writeAllData 进行原子写入', () => {
    it('恢复操作应使用 writeAllData 进行批量写入', () => {
      setupTestData();
      const snapshot = createSnapshot('原子写入测试快照');

      saveRecords([]);
      saveModes([]);
      saveWorkbenchTasks([]);

      const options = {
        restoreRecords: true,
        restoreWorkbench: true,
        restoreModes: true,
      };

      let receivedEvent: any = null;
      const unsubscribe = dataStore.subscribe((event) => {
        if (event.type === 'batch') {
          receivedEvent = event;
        }
      });

      restoreFromSnapshot(snapshot.id, options);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.keys).toEqual(
        expect.arrayContaining([
          STORAGE_KEYS.RECORDS,
          STORAGE_KEYS.MODES,
          STORAGE_KEYS.WORKBENCH,
          STORAGE_KEYS.TOMBSTONES,
        ])
      );

      unsubscribe();
    });

    it('部分恢复应只写入启用的模块', () => {
      setupTestData();
      const snapshot = createSnapshot('部分写入测试快照');

      saveRecords([]);
      saveModes([createTestMode('temp-mode')]);

      const options = {
        restoreRecords: true,
        restoreWorkbench: false,
        restoreModes: false,
      };

      let receivedEvent: any = null;
      const unsubscribe = dataStore.subscribe((event) => {
        receivedEvent = event;
      });

      restoreFromSnapshot(snapshot.id, options);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.keys).toContain(STORAGE_KEYS.RECORDS);
      expect(receivedEvent.keys).toContain(STORAGE_KEYS.TOMBSTONES);
      expect(receivedEvent.keys).not.toContain(STORAGE_KEYS.MODES);
      expect(receivedEvent.keys).not.toContain(STORAGE_KEYS.WORKBENCH);

      const storedModes = JSON.parse(localStorage.getItem(STORAGE_KEYS.MODES) || '[]');
      expect(storedModes.length).toBe(1);
      expect(storedModes[0].id).toBe('temp-mode');

      unsubscribe();
    });
  });
});
