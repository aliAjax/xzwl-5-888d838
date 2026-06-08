import { describe, it, expect } from 'vitest';
import {
  getStatusLabel,
  getStatusColor,
  getLatestTuning,
  getLatestTuningDate,
  getLatestDeviationNote,
  compareTuningRecords,
  calculateReminders,
  getDaysDiff,
  getMaxDeviation,
  getCalibratedCount,
  getPhonemeNames,
  createEmptyPhonemeDeviations,
  getFollowUpStatus,
  getFollowUpStatusLabel,
  getFollowUpStatusColor,
  calculateFollowUpQueue,
  generateFollowUpId,
  isOverdueFollowUp,
  isThisWeekFollowUp,
  calculateFollowUpQuickFilters,
  getNextWorkbenchStatus,
  getWorkbenchStatusLabel,
  getWorkbenchStatusColor,
  DELIVERY_STATUS_OPTIONS,
  FOLLOW_UP_STATUS_OPTIONS,
  WORKBENCH_STATUS_OPTIONS,
} from '@/types/record';
import type { HandpanRecord, TuningRecord, PhonemeDeviation } from '@/types/record';

describe('record types utils', () => {
  describe('状态标签和颜色函数', () => {
    it('getStatusLabel 应返回正确的标签', () => {
      expect(getStatusLabel('pending')).toBe('待调音');
      expect(getStatusLabel('in-progress')).toBe('调音中');
      expect(getStatusLabel('completed')).toBe('已完成');
      expect(getStatusLabel('delivered')).toBe('已交付');
      expect(getStatusLabel('invalid' as any)).toBe('invalid');
    });

    it('getStatusColor 应返回正确的颜色类名', () => {
      expect(getStatusColor('pending')).toContain('bg-gray');
      expect(getStatusColor('in-progress')).toContain('bg-blue');
      expect(getStatusColor('completed')).toContain('bg-green');
      expect(getStatusColor('delivered')).toContain('bg-brass');
      expect(getStatusColor('invalid' as any)).toContain('bg-gray');
    });

    it('getWorkbenchStatusLabel 应返回正确的标签', () => {
      expect(getWorkbenchStatusLabel('pending')).toBe('待调音');
      expect(getWorkbenchStatusLabel('in-progress')).toBe('调音中');
      expect(getWorkbenchStatusLabel('completed')).toBe('已完成待复查');
    });

    it('getWorkbenchStatusColor 应返回正确的颜色类名', () => {
      expect(getWorkbenchStatusColor('pending')).toContain('bg-gray');
      expect(getWorkbenchStatusColor('in-progress')).toContain('bg-blue');
      expect(getWorkbenchStatusColor('completed')).toContain('bg-amber');
    });

    it('getFollowUpStatusLabel 应返回正确的标签', () => {
      expect(getFollowUpStatusLabel('pending')).toBe('待回访');
      expect(getFollowUpStatusLabel('contacted')).toBe('已联系');
      expect(getFollowUpStatusLabel('needs-repair')).toBe('需返修');
      expect(getFollowUpStatusLabel('closed')).toBe('已关闭');
    });

    it('getFollowUpStatusColor 应返回正确的颜色类名', () => {
      expect(getFollowUpStatusColor('pending')).toContain('bg-amber');
      expect(getFollowUpStatusColor('contacted')).toContain('bg-blue');
      expect(getFollowUpStatusColor('needs-repair')).toContain('bg-rose');
      expect(getFollowUpStatusColor('closed')).toContain('bg-gray');
    });
  });

  describe('getNextWorkbenchStatus', () => {
    it('应正确返回下一个状态', () => {
      expect(getNextWorkbenchStatus('pending')).toBe('in-progress');
      expect(getNextWorkbenchStatus('in-progress')).toBe('completed');
      expect(getNextWorkbenchStatus('completed')).toBeNull();
    });
  });

  describe('generateFollowUpId', () => {
    it('应生成带 followup- 前缀的 ID', () => {
      const id = generateFollowUpId();
      expect(id).toMatch(/^followup-/);
    });

    it('多次调用应生成不同的 ID', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateFollowUpId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('compareTuningRecords', () => {
    it('应按日期排序', () => {
      const t1: TuningRecord = {
        id: 't1',
        date: '2024-01-01',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      const t2: TuningRecord = {
        id: 't2',
        date: '2024-01-02',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-02T00:00:00.000Z',
      };

      expect(compareTuningRecords(t1, t2)).toBeLessThan(0);
      expect(compareTuningRecords(t2, t1)).toBeGreaterThan(0);
    });

    it('日期相同时应按 createdAt 排序', () => {
      const t1: TuningRecord = {
        id: 't1',
        date: '2024-01-01',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T10:00:00.000Z',
      };
      const t2: TuningRecord = {
        id: 't2',
        date: '2024-01-01',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T12:00:00.000Z',
      };

      expect(compareTuningRecords(t1, t2)).toBeLessThan(0);
      expect(compareTuningRecords(t2, t1)).toBeGreaterThan(0);
    });
  });

  describe('getLatestTuning', () => {
    const createTestRecord = (tuningHistory: TuningRecord[] = []): HandpanRecord => ({
      id: 'r1',
      serialNumber: 'HP-001',
      mode: 'D Kurd',
      noteCount: 9,
      lastTuningDate: '2024-01-01',
      deviationNote: '初始',
      customerNickname: '客户A',
      deliveryStatus: 'pending',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      tuningHistory,
    });

    it('空调音历史应返回 null', () => {
      const record = createTestRecord();
      expect(getLatestTuning(record)).toBeNull();
    });

    it('应返回最新的调音记录', () => {
      const t1: TuningRecord = {
        id: 't1',
        date: '2024-01-01',
        deviationNote: '初始',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      const t2: TuningRecord = {
        id: 't2',
        date: '2024-02-01',
        deviationNote: '微调',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-02-01T00:00:00.000Z',
      };
      const record = createTestRecord([t1, t2]);

      expect(getLatestTuning(record)?.id).toBe('t2');
    });
  });

  describe('getLatestTuningDate / getLatestDeviationNote', () => {
    const createTuning = (date: string, note: string): TuningRecord => ({
      id: 't1',
      date,
      deviationNote: note,
      beforeStatus: '',
      afterStatus: '',
      remark: '',
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    it('有调音历史时应使用最新调音记录的值', () => {
      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '初始',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [createTuning('2024-02-01', '微调')],
      };

      expect(getLatestTuningDate(record)).toBe('2024-02-01');
      expect(getLatestDeviationNote(record)).toBe('微调');
    });

    it('无调音历史时应回退到记录字段', () => {
      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '初始',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
      };

      expect(getLatestTuningDate(record)).toBe('2024-01-01');
      expect(getLatestDeviationNote(record)).toBe('初始');
    });
  });

  describe('getDaysDiff', () => {
    it('应正确计算日期差', () => {
      const today = new Date();
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(today.getDate() - 5);

      const diff = getDaysDiff(fiveDaysAgo.toISOString().split('T')[0]);
      expect(diff).toBe(5);
    });

    it('应返回绝对值', () => {
      const today = new Date();
      const sixDaysLater = new Date(today);
      sixDaysLater.setDate(today.getDate() + 6);

      const diff = getDaysDiff(sixDaysLater.toISOString().split('T')[0]);
      expect(diff).toBeGreaterThanOrEqual(5);
    });
  });

  describe('calculateReminders', () => {
    const createBaseRecord = (overrides: Partial<HandpanRecord> = {}): HandpanRecord => ({
      id: 'r1',
      serialNumber: 'HP-001',
      mode: 'D Kurd',
      noteCount: 9,
      lastTuningDate: new Date().toISOString().split('T')[0],
      deviationNote: '正常',
      customerNickname: '客户A',
      deliveryStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tuningHistory: [],
      ...overrides,
    });

    it('completed 状态应归类为待复查', () => {
      const record = createBaseRecord({ deliveryStatus: 'completed' });
      const result = calculateReminders([record]);

      expect(result[0].count).toBe(1);
      expect(result[0].category.type).toBe('pending-review');
    });

    it('delivered 且 60-90 天内应归类为即将到期', () => {
      const seventyFiveDaysAgo = new Date();
      seventyFiveDaysAgo.setDate(seventyFiveDaysAgo.getDate() - 75);

      const record = createBaseRecord({
        deliveryStatus: 'delivered',
        lastTuningDate: seventyFiveDaysAgo.toISOString().split('T')[0],
      });

      const result = calculateReminders([record]);
      expect(result[1].count).toBe(1);
      expect(result[1].category.type).toBe('upcoming-due');
    });

    it('delivered 且 30 天内应归类为已完成', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const record = createBaseRecord({
        deliveryStatus: 'delivered',
        lastTuningDate: tenDaysAgo.toISOString().split('T')[0],
      });

      const result = calculateReminders([record]);
      expect(result[2].count).toBe(1);
      expect(result[2].category.type).toBe('recently-completed');
    });

    it('应正确处理多条记录', () => {
      const records: HandpanRecord[] = [
        createBaseRecord({ id: 'r1', deliveryStatus: 'completed', serialNumber: 'HP-001' }),
        createBaseRecord({ id: 'r2', deliveryStatus: 'delivered', serialNumber: 'HP-002', lastTuningDate: new Date().toISOString().split('T')[0] }),
      ];

      const result = calculateReminders(records);
      expect(result[0].count).toBe(1);
      expect(result[2].count).toBe(1);
    });
  });

  describe('getMaxDeviation', () => {
    it('无音位偏差数据应返回 null', () => {
      const tuning: TuningRecord = {
        id: 't1',
        date: '2024-01-01',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(getMaxDeviation(tuning)).toBeNull();
    });

    it('应返回最大偏差绝对值', () => {
      const deviations: PhonemeDeviation[] = [
        { name: 'Ding', beforeDeviation: 5, afterDeviation: -3, remark: '' },
        { name: '音位1', beforeDeviation: null, afterDeviation: 8, remark: '' },
        { name: '音位2', beforeDeviation: -10, afterDeviation: null, remark: '' },
      ];

      const tuning: TuningRecord = {
        id: 't1',
        date: '2024-01-01',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        phonemeDeviations: deviations,
      };

      expect(getMaxDeviation(tuning)).toBe(10);
    });

    it('全为 0 或 null 应返回 null', () => {
      const deviations: PhonemeDeviation[] = [
        { name: 'Ding', beforeDeviation: 0, afterDeviation: 0, remark: '' },
        { name: '音位1', beforeDeviation: null, afterDeviation: null, remark: '' },
      ];

      const tuning: TuningRecord = {
        id: 't1',
        date: '2024-01-01',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        phonemeDeviations: deviations,
      };

      expect(getMaxDeviation(tuning)).toBeNull();
    });
  });

  describe('getCalibratedCount', () => {
    it('无音位偏差数据应返回 0', () => {
      const tuning: TuningRecord = {
        id: 't1',
        date: '2024-01-01',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(getCalibratedCount(tuning)).toBe(0);
    });

    it('应统计前后偏差不同的音位数量', () => {
      const deviations: PhonemeDeviation[] = [
        { name: 'Ding', beforeDeviation: 5, afterDeviation: 3, remark: '' },
        { name: '音位1', beforeDeviation: 5, afterDeviation: 5, remark: '' },
        { name: '音位2', beforeDeviation: null, afterDeviation: 5, remark: '' },
        { name: '音位3', beforeDeviation: 5, afterDeviation: null, remark: '' },
      ];

      const tuning: TuningRecord = {
        id: 't1',
        date: '2024-01-01',
        deviationNote: '',
        beforeStatus: '',
        afterStatus: '',
        remark: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        phonemeDeviations: deviations,
      };

      expect(getCalibratedCount(tuning)).toBe(1);
    });
  });

  describe('getPhonemeNames', () => {
    it('有自定义音位名称且数量匹配时应返回自定义名称', () => {
      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 3,
        lastTuningDate: '2024-01-01',
        deviationNote: '',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
        phonemeNames: ['Ding', '音位A', '音位B'],
      };

      expect(getPhonemeNames(record, 3)).toEqual(['Ding', '音位A', '音位B']);
    });

    it('无自定义名称时应生成默认名称', () => {
      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 3,
        lastTuningDate: '2024-01-01',
        deviationNote: '',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
      };

      expect(getPhonemeNames(record, 3)).toEqual(['Ding', '音位 1', '音位 2']);
    });
  });

  describe('createEmptyPhonemeDeviations', () => {
    it('应创建指定名称的空偏差数组', () => {
      const names = ['Ding', '音位1', '音位2'];
      const result = createEmptyPhonemeDeviations(names);

      expect(result.length).toBe(3);
      expect(result[0].name).toBe('Ding');
      expect(result[0].beforeDeviation).toBeNull();
      expect(result[0].afterDeviation).toBeNull();
      expect(result[0].remark).toBe('');
    });
  });

  describe('getFollowUpStatus', () => {
    const createBaseRecord = (overrides: Partial<HandpanRecord> = {}): HandpanRecord => ({
      id: 'r1',
      serialNumber: 'HP-001',
      mode: 'D Kurd',
      noteCount: 9,
      lastTuningDate: new Date().toISOString().split('T')[0],
      deviationNote: '正常',
      customerNickname: '客户A',
      deliveryStatus: 'delivered',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tuningHistory: [],
      ...overrides,
    });

    it('未交付记录应为 pending', () => {
      const record = createBaseRecord({ deliveryStatus: 'pending' });
      expect(getFollowUpStatus(record)).toBe('pending');
    });

    it('needs-repair 状态应保持', () => {
      const record = createBaseRecord({
        followUp: {
          status: 'needs-repair',
          lastContactDate: new Date().toISOString().split('T')[0],
          nextFollowUpDate: null,
          history: [],
        },
      });
      expect(getFollowUpStatus(record)).toBe('needs-repair');
    });

    it('closed 状态应保持', () => {
      const record = createBaseRecord({
        followUp: {
          status: 'closed',
          lastContactDate: new Date().toISOString().split('T')[0],
          nextFollowUpDate: null,
          history: [],
        },
      });
      expect(getFollowUpStatus(record)).toBe('closed');
    });

    it('30天内有联系记录应为 contacted', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const record = createBaseRecord({
        followUp: {
          status: 'pending',
          lastContactDate: tenDaysAgo.toISOString().split('T')[0],
          nextFollowUpDate: null,
          history: [],
        },
      });
      expect(getFollowUpStatus(record)).toBe('contacted');
    });

    it('超过30天未联系应为 pending', () => {
      const fortyDaysAgo = new Date();
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

      const record = createBaseRecord({
        followUp: {
          status: 'pending',
          lastContactDate: fortyDaysAgo.toISOString().split('T')[0],
          nextFollowUpDate: null,
          history: [],
        },
      });
      expect(getFollowUpStatus(record)).toBe('pending');
    });
  });

  describe('calculateFollowUpQueue', () => {
    it('应按状态正确分类已交付记录', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const records: HandpanRecord[] = [
        {
          id: 'r1',
          serialNumber: 'HP-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'delivered',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
          followUp: {
            status: 'needs-repair',
            lastContactDate: tenDaysAgo.toISOString().split('T')[0],
            nextFollowUpDate: null,
            history: [],
          },
        },
        {
          id: 'r2',
          serialNumber: 'HP-002',
          mode: 'D Celtic',
          noteCount: 10,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户B',
          deliveryStatus: 'delivered',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
          followUp: {
            status: 'contacted',
            lastContactDate: tenDaysAgo.toISOString().split('T')[0],
            nextFollowUpDate: null,
            history: [],
          },
        },
        {
          id: 'r3',
          serialNumber: 'HP-003',
          mode: 'D Integral',
          noteCount: 9,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户C',
          deliveryStatus: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
        },
      ];

      const result = calculateFollowUpQueue(records);
      expect(result[0].count).toBe(0);
      expect(result[1].count).toBe(1);
      expect(result[2].count).toBe(1);
      expect(result[3].count).toBe(0);
    });
  });

  describe('isOverdueFollowUp', () => {
    it('已关闭的记录不应视为逾期', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'delivered',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
        followUp: {
          status: 'closed',
          lastContactDate: null,
          nextFollowUpDate: yesterday.toISOString().split('T')[0],
          history: [],
        },
      };

      expect(isOverdueFollowUp(record)).toBe(false);
    });

    it('下次跟进日期已过应视为逾期', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'delivered',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
        followUp: {
          status: 'pending',
          lastContactDate: null,
          nextFollowUpDate: yesterday.toISOString().split('T')[0],
          history: [],
        },
      };

      expect(isOverdueFollowUp(record)).toBe(true);
    });

    it('无下次跟进日期不应视为逾期', () => {
      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'delivered',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
        followUp: {
          status: 'pending',
          lastContactDate: null,
          nextFollowUpDate: null,
          history: [],
        },
      };

      expect(isOverdueFollowUp(record)).toBe(false);
    });
  });

  describe('isThisWeekFollowUp', () => {
    it('下次跟进日期在本周内应返回 true', () => {
      const today = new Date();
      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'delivered',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
        followUp: {
          status: 'pending',
          lastContactDate: null,
          nextFollowUpDate: today.toISOString().split('T')[0],
          history: [],
        },
      };

      expect(isThisWeekFollowUp(record)).toBe(true);
    });

    it('已关闭的记录应返回 false', () => {
      const today = new Date();
      const record: HandpanRecord = {
        id: 'r1',
        serialNumber: 'HP-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-01-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'delivered',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tuningHistory: [],
        followUp: {
          status: 'closed',
          lastContactDate: null,
          nextFollowUpDate: today.toISOString().split('T')[0],
          history: [],
        },
      };

      expect(isThisWeekFollowUp(record)).toBe(false);
    });
  });

  describe('calculateFollowUpQuickFilters', () => {
    it('应正确分类快速筛选', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const records: HandpanRecord[] = [
        {
          id: 'r1',
          serialNumber: 'HP-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'delivered',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
          followUp: {
            status: 'pending',
            lastContactDate: null,
            nextFollowUpDate: yesterday.toISOString().split('T')[0],
            history: [],
          },
        },
        {
          id: 'r2',
          serialNumber: 'HP-002',
          mode: 'D Celtic',
          noteCount: 10,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户B',
          deliveryStatus: 'delivered',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
          followUp: {
            status: 'pending',
            lastContactDate: null,
            nextFollowUpDate: tomorrow.toISOString().split('T')[0],
            history: [],
          },
        },
        {
          id: 'r3',
          serialNumber: 'HP-003',
          mode: 'D Integral',
          noteCount: 9,
          lastTuningDate: '2024-01-01',
          deviationNote: '正常',
          customerNickname: '客户C',
          deliveryStatus: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tuningHistory: [],
        },
      ];

      const result = calculateFollowUpQuickFilters(records);
      expect(result[0].count).toBe(1);
      expect(result[1].count).toBe(1);
    });
  });

  describe('常量配置', () => {
    it('DELIVERY_STATUS_OPTIONS 应包含所有状态', () => {
      expect(DELIVERY_STATUS_OPTIONS.length).toBe(4);
      expect(DELIVERY_STATUS_OPTIONS.map(o => o.value)).toEqual(['pending', 'in-progress', 'completed', 'delivered']);
    });

    it('FOLLOW_UP_STATUS_OPTIONS 应包含所有状态', () => {
      expect(FOLLOW_UP_STATUS_OPTIONS.length).toBe(4);
      expect(FOLLOW_UP_STATUS_OPTIONS.map(o => o.value)).toEqual(['pending', 'contacted', 'needs-repair', 'closed']);
    });

    it('WORKBENCH_STATUS_OPTIONS 应包含所有状态', () => {
      expect(WORKBENCH_STATUS_OPTIONS.length).toBe(3);
      expect(WORKBENCH_STATUS_OPTIONS.map(o => o.value)).toEqual(['pending', 'in-progress', 'completed']);
    });
  });
});
