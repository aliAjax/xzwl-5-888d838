import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDeviceId,
  getDataVersion,
  incrementDataVersion,
  getTombstones,
  saveTombstones,
  addTombstone,
  removeTombstone,
  isTombstoned,
  cleanupOldTombstones,
  createVersionedBackup,
  parseBackup,
  isVersionedBackup,
  getLocalData,
  analyzeDiff,
  applyResolutions,
  hasAnyChanges,
  filterDiffsByModuleOptions,
} from '../versionedBackup';
import type { HandpanRecord, ModeOption, WorkbenchTask, VersionedBackup } from '@/types/record';
import { saveRecords } from '../storage';
import { saveModes } from '../modeStorage';
import { saveWorkbenchTasks } from '../workbenchStorage';

describe('versionedBackup utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getDeviceId', () => {
    it('首次调用应生成设备 ID 并存储', () => {
      const id = getDeviceId();
      expect(id).toMatch(/^dev-/);
      expect(localStorage.getItem('handpan_device_id')).toBe(id);
    });

    it('后续调用应返回相同的设备 ID', () => {
      const id1 = getDeviceId();
      const id2 = getDeviceId();
      expect(id1).toBe(id2);
    });
  });

  describe('getDataVersion / incrementDataVersion', () => {
    it('初始数据版本应为 1', () => {
      expect(getDataVersion()).toBe(1);
    });

    it('incrementDataVersion 应递增版本', () => {
      const v1 = incrementDataVersion();
      expect(v1).toBe(2);
      expect(getDataVersion()).toBe(2);

      const v2 = incrementDataVersion();
      expect(v2).toBe(3);
    });
  });

  describe('Tombstone 管理', () => {
    it('getTombstones 空存储应返回空数组', () => {
      expect(getTombstones()).toEqual([]);
    });

    it('addTombstone 应添加墓碑记录', () => {
      addTombstone('record-1', 'record');
      const tombstones = getTombstones();
      expect(tombstones.length).toBe(1);
      expect(tombstones[0].id).toBe('record-1');
      expect(tombstones[0].entityType).toBe('record');
      expect(tombstones[0].deletedBy).toBeDefined();
    });

    it('重复添加相同墓碑应忽略', () => {
      addTombstone('record-1', 'record');
      addTombstone('record-1', 'record');
      expect(getTombstones().length).toBe(1);
    });

    it('removeTombstone 应移除墓碑', () => {
      addTombstone('record-1', 'record');
      removeTombstone('record-1', 'record');
      expect(getTombstones().length).toBe(0);
    });

    it('isTombstoned 应正确检测墓碑', () => {
      addTombstone('record-1', 'record');
      expect(isTombstoned('record-1', 'record')).toBe(true);
      expect(isTombstoned('record-2', 'record')).toBe(false);
    });

    it('cleanupOldTombstones 应清理超过指定天数的墓碑', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      const oldTombstone = {
        id: 'old-record',
        entityType: 'record' as const,
        deletedAt: oldDate.toISOString(),
        deletedBy: 'test-device',
      };
      const newTombstone = {
        id: 'new-record',
        entityType: 'record' as const,
        deletedAt: new Date().toISOString(),
        deletedBy: 'test-device',
      };
      saveTombstones([oldTombstone, newTombstone]);

      const removed = cleanupOldTombstones(90);
      expect(removed).toBe(1);
      expect(getTombstones().length).toBe(1);
      expect(getTombstones()[0].id).toBe('new-record');
    });

    it('cleanupOldTombstones 默认清理 90 天前的墓碑', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);
      const oldTombstone = {
        id: 'old-record',
        entityType: 'record' as const,
        deletedAt: oldDate.toISOString(),
        deletedBy: 'test-device',
      };
      saveTombstones([oldTombstone]);

      const removed = cleanupOldTombstones();
      expect(removed).toBe(1);
    });
  });

  describe('createVersionedBackup', () => {
    const setupTestData = () => {
      const records: HandpanRecord[] = [
        {
          id: 'r1',
          serialNumber: 'HP-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
        },
      ];

      const modes: ModeOption[] = [
        {
          id: 'm1',
          name: 'D Kurd',
          active: true,
          sortOrder: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const tasks: WorkbenchTask[] = [
        {
          id: 't1',
          recordId: 'r1',
          status: 'pending',
          taskDate: '2024-06-01',
          sortOrder: 0,
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
        },
      ];

      saveRecords(records);
      saveModes(modes);
      saveWorkbenchTasks(tasks);
      addTombstone('deleted-record', 'record');

      return { records, modes, tasks };
    };

    it('应创建包含所有数据的版本化备份', () => {
      setupTestData();
      const backup = createVersionedBackup();

      expect(backup.metadata).toBeDefined();
      expect(backup.metadata.backupFormatVersion).toBe('2.0');
      expect(backup.metadata.recordCount).toBe(1);
      expect(backup.metadata.modeCount).toBe(1);
      expect(backup.metadata.workbenchTaskCount).toBe(1);
      expect(backup.metadata.tombstoneCount).toBe(1);
      expect(backup.records.length).toBe(1);
      expect(backup.modes.length).toBe(1);
      expect(backup.workbenchTasks.length).toBe(1);
      expect(backup.tombstones.length).toBe(1);
    });

    it('每次备份应递增数据版本', () => {
      setupTestData();
      const backup1 = createVersionedBackup();
      const backup2 = createVersionedBackup();
      expect(backup2.metadata.version).toBe(backup1.metadata.version + 1);
    });
  });

  describe('parseBackup / isVersionedBackup', () => {
    it('应解析版本化备份格式', () => {
      const backup = {
        metadata: {
          version: 1,
          backupFormatVersion: '2.0',
          deviceId: 'test',
          createdAt: '2024-01-01T00:00:00.000Z',
          exportedAt: '2024-01-01T00:00:00.000Z',
          recordCount: 0,
          modeCount: 0,
          workbenchTaskCount: 0,
          tombstoneCount: 0,
        },
        records: [],
        modes: [],
        workbenchTasks: [],
        tombstones: [],
      };

      const parsed = parseBackup(JSON.stringify(backup));
      expect(isVersionedBackup(parsed)).toBe(true);
    });

    it('应兼容旧格式的纯记录数组', () => {
      const records = [
        {
          id: 'r1',
          serialNumber: 'HP-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
        },
      ];

      const parsed = parseBackup(JSON.stringify(records));
      expect(Array.isArray(parsed)).toBe(true);
      expect(isVersionedBackup(parsed)).toBe(false);
    });

    it('无效格式应抛出错误', () => {
      expect(() => parseBackup(JSON.stringify({ invalid: true }))).toThrow('无法识别的备份文件格式');
    });
  });

  describe('getLocalData', () => {
    it('应获取所有本地数据', () => {
      const records: HandpanRecord[] = [
        {
          id: 'r1',
          serialNumber: 'HP-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
        },
      ];
      saveRecords(records);

      const localData = getLocalData();
      expect(localData.records.length).toBe(1);
      expect(localData.modes.length).toBeGreaterThan(0);
      expect(Array.isArray(localData.workbenchTasks)).toBe(true);
      expect(Array.isArray(localData.tombstones)).toBe(true);
    });
  });

  describe('analyzeDiff', () => {
    const createBaseData = () => ({
      records: [
        {
          id: 'r1',
          serialNumber: 'HP-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
        },
      ] as HandpanRecord[],
      modes: [
        {
          id: 'm1',
          name: 'D Kurd',
          active: true,
          sortOrder: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ] as ModeOption[],
      workbenchTasks: [] as WorkbenchTask[],
      tombstones: [],
    });

    it('应检测新增记录', () => {
      const localData = createBaseData();
      const importedBackup: VersionedBackup = {
        metadata: {} as any,
        records: [
          ...localData.records,
          {
            id: 'r2',
            serialNumber: 'HP-002',
            mode: 'D Celtic',
            noteCount: 10,
            lastTuningDate: '2024-02-01',
            deviationNote: '微调',
            customerNickname: '客户B',
            deliveryStatus: 'in-progress',
            createdAt: '2024-02-01T00:00:00.000Z',
            updatedAt: '2024-02-01T00:00:00.000Z',
            tuningHistory: [],
          },
        ],
        modes: localData.modes,
        workbenchTasks: [],
        tombstones: [],
      };

      const diffs = analyzeDiff(localData, importedBackup);
      const newRecordDiff = diffs.find(d => d.id === 'r2');
      expect(newRecordDiff).toBeDefined();
      expect(newRecordDiff!.changeType).toBe('new');
      expect(newRecordDiff!.resolution).toBe('keep-imported');
    });

    it('应检测修改的记录', () => {
      const localData = createBaseData();
      const importedBackup: VersionedBackup = {
        metadata: {} as any,
        records: [
          {
            ...localData.records[0],
            customerNickname: '客户A修改',
            updatedAt: '2024-02-01T00:00:00.000Z',
          },
        ],
        modes: localData.modes,
        workbenchTasks: [],
        tombstones: [],
      };

      const diffs = analyzeDiff(localData, importedBackup);
      const modifiedDiff = diffs.find(d => d.id === 'r1');
      expect(modifiedDiff).toBeDefined();
      expect(modifiedDiff!.changeType).toBe('conflict');
      expect(modifiedDiff!.fieldConflicts).toContain('customerNickname');
    });

    it('应检测未修改的记录', () => {
      const localData = createBaseData();
      const importedBackup: VersionedBackup = {
        metadata: {} as any,
        records: localData.records,
        modes: localData.modes,
        workbenchTasks: [],
        tombstones: [],
      };

      const diffs = analyzeDiff(localData, importedBackup);
      const unchangedDiff = diffs.find(d => d.id === 'r1');
      expect(unchangedDiff).toBeDefined();
      expect(unchangedDiff!.changeType).toBe('unchanged');
    });

    it('应检测本地有墓碑但导入有记录的冲突', () => {
      const localData = {
        ...createBaseData(),
        records: [],
        tombstones: [
          {
            id: 'r1',
            entityType: 'record' as const,
            deletedAt: '2024-02-01T00:00:00.000Z',
            deletedBy: 'test',
          },
        ],
      };
      const importedBackup: VersionedBackup = {
        metadata: {} as any,
        records: createBaseData().records,
        modes: localData.modes,
        workbenchTasks: [],
        tombstones: [],
      };

      const diffs = analyzeDiff(localData, importedBackup);
      const conflictDiff = diffs.find(d => d.id === 'r1');
      expect(conflictDiff).toBeDefined();
      expect(conflictDiff!.changeType).toBe('conflict');
      expect(conflictDiff!.fieldConflicts).toContain('deleted');
      expect(conflictDiff!.resolution).toBe('pending');
    });
  });

  describe('applyResolutions', () => {
    it('keep-imported 策略应添加新记录', () => {
      const localData = {
        records: [] as HandpanRecord[],
        modes: [] as ModeOption[],
        workbenchTasks: [] as WorkbenchTask[],
        tombstones: [],
      };

      const newRecord: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
      };

      const diffs = [
        {
          id: 'r1',
          entityType: 'record' as const,
          changeType: 'new' as const,
          imported: newRecord,
          resolution: 'keep-imported' as const,
        },
      ];

      const result = applyResolutions(localData, diffs);
      expect(result.records.length).toBe(1);
      expect(result.records[0].id).toBe('r1');
    });

    it('keep-local 策略应保留本地数据', () => {
      const localRecord: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
      };

      const localData = {
        records: [localRecord],
        modes: [] as ModeOption[],
        workbenchTasks: [] as WorkbenchTask[],
        tombstones: [],
      };

      const diffs = [
        {
          id: 'r1',
          entityType: 'record' as const,
          changeType: 'conflict' as const,
          local: localRecord,
          imported: { ...localRecord, customerNickname: '客户B' },
          resolution: 'keep-local' as const,
          fieldConflicts: ['customerNickname'],
        },
      ];

      const result = applyResolutions(localData, diffs);
      expect(result.records[0].customerNickname).toBe('客户A');
    });

    it('keep-imported deleted 应删除记录并添加墓碑', () => {
      const localRecord: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
      };

      const localData = {
        records: [localRecord],
        modes: [] as ModeOption[],
        workbenchTasks: [] as WorkbenchTask[],
        tombstones: [],
      };

      const diffs = [
        {
          id: 'r1',
          entityType: 'record' as const,
          changeType: 'deleted' as const,
          resolution: 'keep-imported' as const,
        },
      ];

      const result = applyResolutions(localData, diffs);
      expect(result.records.length).toBe(0);
      expect(result.tombstones.length).toBe(1);
      expect(result.tombstones[0].id).toBe('r1');
    });
  });

  describe('hasAnyChanges', () => {
    it('有变更时应返回 true', () => {
      const moduleStats = [
        {
          moduleType: 'records' as const,
          total: 1,
          added: 1,
          modified: 0,
          deleted: 0,
          conflict: 0,
          unchanged: 0,
        },
      ];
      expect(hasAnyChanges(moduleStats)).toBe(true);
    });

    it('无变更时应返回 false', () => {
      const moduleStats = [
        {
          moduleType: 'records' as const,
          total: 1,
          added: 0,
          modified: 0,
          deleted: 0,
          conflict: 0,
          unchanged: 1,
        },
      ];
      expect(hasAnyChanges(moduleStats)).toBe(false);
    });
  });

  describe('filterDiffsByModuleOptions', () => {
    it('应根据模块选项过滤 diffs', () => {
      const diffs = [
        { id: 'r1', entityType: 'record' as const, changeType: 'new' as const, resolution: 'keep-imported' as const },
        { id: 'm1', entityType: 'mode' as const, changeType: 'new' as const, resolution: 'keep-imported' as const },
        { id: 't1', entityType: 'workbenchTask' as const, changeType: 'new' as const, resolution: 'keep-imported' as const },
      ];

      const options = {
        records: true,
        modes: false,
        workbenchTasks: true,
        tombstones: false,
      };

      const filtered = filterDiffsByModuleOptions(diffs, options);
      expect(filtered.length).toBe(2);
      expect(filtered.map(d => d.id)).toEqual(['r1', 't1']);
    });
  });
});
