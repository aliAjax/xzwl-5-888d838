import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateId,
  generateTuningId,
  migrateRecord,
  validateRecord,
  parseImportData,
  analyzeImportData,
  mergeRecordWithConflict,
  mergeFollowUpData,
  getRecords,
  saveRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  addTuningRecord,
} from '../storage';
import type { HandpanRecord, DeliveryStatus } from '@/types/record';

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('ID 生成函数', () => {
    it('generateId 应生成非空字符串', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('generateTuningId 应生成带 tuning- 前缀的 ID', () => {
      const id = generateTuningId();
      expect(id).toMatch(/^tuning-/);
    });

    it('多次调用应生成不同的 ID', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('migrateRecord', () => {
    it('应为缺少 tuningHistory 的记录创建初始调音历史', () => {
      const raw = {
        id: 'test-1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending' as DeliveryStatus,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const migrated = migrateRecord(raw);
      expect(migrated.tuningHistory.length).toBe(1);
      expect(migrated.tuningHistory[0].date).toBe('2024-01-01');
      expect(migrated.tuningHistory[0].deviationNote).toBe('正常');
      expect(migrated.tuningHistory[0].remark).toBe('历史数据迁移');
    });

    it('应保留已有的 tuningHistory', () => {
      const raw = {
        id: 'test-1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending' as DeliveryStatus,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [
          {
            id: 'tuning-1',
            date: '2024-01-15',
            deviationNote: '微调',
            beforeStatus: '',
            afterStatus: '',
            remark: '测试',
            createdAt: '2024-01-15T00:00:00.000Z',
          },
        ],
      };

      const migrated = migrateRecord(raw);
      expect(migrated.tuningHistory.length).toBe(1);
      expect(migrated.tuningHistory[0].id).toBe('tuning-1');
    });

    it('应正确迁移 followUp 数据', () => {
      const raw = {
        id: 'test-1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'delivered' as DeliveryStatus,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        followUp: {
          status: 'contacted',
          lastContactDate: '2024-02-01',
          nextFollowUpDate: '2024-03-01',
          history: [],
        },
      };

      const migrated = migrateRecord(raw);
      expect(migrated.followUp).toBeDefined();
      expect(migrated.followUp?.status).toBe('contacted');
    });
  });

  describe('validateRecord', () => {
    it('应验证完整记录为有效', () => {
      const record: Partial<HandpanRecord> = {
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
      };

      const result = validateRecord(record);
      expect(result.valid).toBe(true);
      expect(result.missingFields.length).toBe(0);
    });

    it('应检测缺少必填字段', () => {
      const record: Partial<HandpanRecord> = {
        serialNumber: 'HP-001',
        mode: 'D Kurd',
      };

      const result = validateRecord(record);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('noteCount');
      expect(result.missingFields).toContain('lastTuningDate');
      expect(result.missingFields).toContain('customerNickname');
      expect(result.missingFields).toContain('deliveryStatus');
    });

    it('应检测无效的 noteCount', () => {
      const record: Partial<HandpanRecord> = {
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 0,
        lastTuningDate: '2024-01-01',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
      };

      const result = validateRecord(record);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('noteCount');
    });

    it('应检测空字符串字段', () => {
      const record: Partial<HandpanRecord> = {
        serialNumber: '',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
      };

      const result = validateRecord(record);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('serialNumber');
    });
  });

  describe('parseImportData', () => {
    it('应正确解析 JSON 数组', () => {
      const data = JSON.stringify([{ serialNumber: 'HP-001' }, { serialNumber: 'HP-002' }]);
      const result = parseImportData(data);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('非数组数据应抛出错误', () => {
      const data = JSON.stringify({ serialNumber: 'HP-001' });
      expect(() => parseImportData(data)).toThrow('导入文件格式错误');
    });
  });

  describe('analyzeImportData', () => {
    const createValidRecord = (overrides: Partial<HandpanRecord> = {}): HandpanRecord => ({
      id: 'record-1',
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
      ...overrides,
    });

    it('应识别全新的有效记录', () => {
      const imported = [createValidRecord({ serialNumber: 'HP-NEW' })];
      const existing: HandpanRecord[] = [];

      const result = analyzeImportData(imported, existing);
      expect(result.total).toBe(1);
      expect(result.valid.length).toBe(1);
      expect(result.conflicts.length).toBe(0);
    });

    it('应识别导入数据中的重复编号', () => {
      const imported = [
        createValidRecord({ serialNumber: 'HP-001' }),
        createValidRecord({ serialNumber: 'HP-001', id: 'record-2' }),
      ];
      const existing: HandpanRecord[] = [];

      const result = analyzeImportData(imported, existing);
      expect(result.duplicateSerialNumbers.length).toBe(1);
      expect(result.valid.length).toBe(1);
      expect(result.valid[0].serialNumber).toBe('HP-001');
      expect(result.duplicateSerialNumbers[0].id).toBe('record-2');
    });

    it('应识别与现有记录的冲突', () => {
      const imported = [createValidRecord({ updatedAt: '2024-02-01T00:00:00.000Z' })];
      const existing = [createValidRecord({ updatedAt: '2024-01-01T00:00:00.000Z' })];

      const result = analyzeImportData(imported, existing);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].isImportedNewer).toBe(true);
      expect(result.newerCount).toBe(1);
    });

    it('应检测缺少字段的记录', () => {
      const imported = [{ serialNumber: 'HP-001', mode: 'D Kurd' } as Partial<HandpanRecord>];
      const existing: HandpanRecord[] = [];

      const result = analyzeImportData(imported, existing);
      expect(result.missingFields.length).toBe(1);
      expect(result.valid.length).toBe(0);
    });
  });

  describe('mergeFollowUpData', () => {
    it('合并时应保留双方的历史记录', () => {
      const existing = {
        status: 'pending' as const,
        lastContactDate: '2024-01-01',
        nextFollowUpDate: null,
        history: [
          {
            id: 'h1',
            recordId: 'r1',
            contactDate: '2024-01-01',
            customerFeedback: '反馈1',
            nextFollowUpDate: null,
            notes: '',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      const imported = {
        status: 'contacted' as const,
        lastContactDate: '2024-02-01',
        nextFollowUpDate: '2024-03-01',
        history: [
          {
            id: 'h2',
            recordId: 'r1',
            contactDate: '2024-02-01',
            customerFeedback: '反馈2',
            nextFollowUpDate: null,
            notes: '',
            createdAt: '2024-02-01T00:00:00.000Z',
            updatedAt: '2024-02-01T00:00:00.000Z',
          },
        ],
      };

      const merged = mergeFollowUpData(existing, imported);
      expect(merged).toBeDefined();
      expect(merged!.history.length).toBe(2);
      expect(merged!.nextFollowUpDate).toBe('2024-03-01');
    });

    it('一方为 undefined 时应返回另一方', () => {
      const existing = {
        status: 'pending' as const,
        lastContactDate: null,
        nextFollowUpDate: null,
        history: [],
      };

      expect(mergeFollowUpData(existing, undefined)).toBe(existing);
      expect(mergeFollowUpData(undefined, existing)).toBe(existing);
    });
  });

  describe('mergeRecordWithConflict', () => {
    const baseRecord: HandpanRecord = {
      id: 'record-1',
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
      __version: 1,
    };

    it('keep-existing 策略应保留现有记录', () => {
      const imported = { ...baseRecord, customerNickname: '客户B', __version: 2 };
      const result = mergeRecordWithConflict(baseRecord, imported, 'keep-existing');
      expect(result.customerNickname).toBe('客户A');
    });

    it('use-imported 策略应使用导入的记录', () => {
      const imported = { ...baseRecord, customerNickname: '客户B', __version: 2 };
      const result = mergeRecordWithConflict(baseRecord, imported, 'use-imported');
      expect(result.customerNickname).toBe('客户B');
      expect(result.id).toBe(baseRecord.id);
      expect(result.__version).toBe(3);
    });

    it('merge 策略应合并调音历史', () => {
      const existing = {
        ...baseRecord,
        tuningHistory: [
          {
            id: 't1',
            date: '2024-01-01',
            deviationNote: '初始',
            beforeStatus: '',
            afterStatus: '',
            remark: '',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      const imported = {
        ...baseRecord,
        tuningHistory: [
          {
            id: 't2',
            date: '2024-02-01',
            deviationNote: '微调',
            beforeStatus: '',
            afterStatus: '',
            remark: '',
            createdAt: '2024-02-01T00:00:00.000Z',
          },
        ],
      };

      const result = mergeRecordWithConflict(existing, imported, 'merge');
      expect(result.tuningHistory.length).toBe(2);
    });
  });

  describe('getRecords / saveRecords', () => {
    it('空存储应返回空数组', () => {
      expect(getRecords()).toEqual([]);
    });

    it('保存和读取记录应正确工作', () => {
      const record = {
        id: 'test-1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending' as DeliveryStatus,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
      };

      saveRecords([record]);
      const loaded = getRecords();
      expect(loaded.length).toBe(1);
      expect(loaded[0].serialNumber).toBe('HP-001');
    });

    it('损坏的 JSON 应返回空数组', () => {
      localStorage.setItem('handpan_records', 'invalid json');
      expect(getRecords()).toEqual([]);
    });
  });

  describe('addRecord', () => {
    it('应添加新记录并生成必要字段', () => {
      const newRecord = addRecord({
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
      });

      expect(newRecord.id).toBeDefined();
      expect(newRecord.createdAt).toBeDefined();
      expect(newRecord.tuningHistory.length).toBe(1);
      expect(newRecord.__version).toBe(1);

      const records = getRecords();
      expect(records.length).toBe(1);
    });
  });

  describe('updateRecord', () => {
    it('应更新现有记录', () => {
      const record = addRecord({
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
      });

      const updated = updateRecord(record.id, { customerNickname: '客户B' });
      expect(updated).not.toBeNull();
      expect(updated!.customerNickname).toBe('客户B');
      expect(updated!.__version).toBe(2);
    });

    it('不存在的记录应返回 null', () => {
      const result = updateRecord('non-existent', { customerNickname: '测试' });
      expect(result).toBeNull();
    });
  });

  describe('deleteRecord', () => {
    it('应删除存在的记录', () => {
      const record = addRecord({
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
      });

      const result = deleteRecord(record.id);
      expect(result).toBe(true);
      expect(getRecords().length).toBe(0);
    });

    it('不存在的记录应返回 false', () => {
      expect(deleteRecord('non-existent')).toBe(false);
    });
  });

  describe('addTuningRecord', () => {
    it('应添加调音记录', () => {
      const record = addRecord({
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
      });

      const updated = addTuningRecord(record.id, {
        date: '2024-02-01',
        deviationNote: '微调',
        beforeStatus: '',
        afterStatus: '',
        remark: '测试调音',
      });

      expect(updated).not.toBeNull();
      expect(updated!.tuningHistory.length).toBe(2);
      expect(updated!.lastTuningDate).toBe('2024-02-01');
    });
  });
});
