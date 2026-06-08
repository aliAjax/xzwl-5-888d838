import { describe, it, expect, beforeEach } from 'vitest';
import { scanDataHealth, type IssueType, type IssueSeverity } from '../dataHealthCheck';
import type { HandpanRecord, ModeOption, WorkbenchTask } from '@/types/record';

describe('dataHealthCheck', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const setupModes = (modes: Partial<ModeOption>[] = []) => {
    const defaultModes: ModeOption[] = [
      { id: 'mode-1', name: 'D Kurd', active: true, sortOrder: 0, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'mode-2', name: 'D Celtic', active: true, sortOrder: 1, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
    ];
    const finalModes = modes.length > 0 ? modes as ModeOption[] : defaultModes;
    localStorage.setItem('handpan_mode_options', JSON.stringify(finalModes));
  };

  const setupRecords = (records: Partial<HandpanRecord>[]) => {
    localStorage.setItem('handpan_records', JSON.stringify(records));
  };

  const setupWorkbench = (tasks: Partial<WorkbenchTask>[]) => {
    localStorage.setItem('handpan_workbench', JSON.stringify(tasks));
  };

  const findIssueByType = (result: ReturnType<typeof scanDataHealth>, type: IssueType) => {
    return result.issueGroups.find(g => g.type === type);
  };

  describe('重复编号检测 (duplicate_serial)', () => {
    it('应检测到重复的编号，严重级别为high，不可自动修复', () => {
      setupModes();
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-01', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
        {
          id: 'record-2',
          serialNumber: 'HP-2024-001',
          mode: 'D Celtic',
          noteCount: 10,
          lastTuningDate: '2024-06-02',
          deviationNote: '微调',
          customerNickname: '客户B',
          deliveryStatus: 'in-progress',
          createdAt: '2024-06-02T00:00:00.000Z',
          updatedAt: '2024-06-02T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-2', date: '2024-06-02', deviationNote: '微调', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-02T00:00:00.000Z' }],
        },
        {
          id: 'record-3',
          serialNumber: 'HP-2024-002',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-03',
          deviationNote: '正常',
          customerNickname: '客户C',
          deliveryStatus: 'completed',
          createdAt: '2024-06-03T00:00:00.000Z',
          updatedAt: '2024-06-03T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-3', date: '2024-06-03', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-03T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'duplicate_serial');
      expect(group).toBeDefined();
      expect(group!.issues.length).toBe(1);
      expect(group!.issues[0].type).toBe('duplicate_serial');
      expect(group!.issues[0].severity).toBe('high' as IssueSeverity);
      expect(group!.issues[0].autoFixable).toBe(false);
      expect(group!.issues[0].serialNumber).toBe('HP-2024-001');
      expect(group!.autoFixableCount).toBe(0);
      expect(group!.manualFixCount).toBe(1);
    });

    it('无重复编号时不应生成问题', () => {
      setupModes();
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-01', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'duplicate_serial');
      expect(group).toBeUndefined();
    });
  });

  describe('缺少调音历史检测 (missing_tuning_history)', () => {
    it('应检测到缺少调音历史的记录，严重级别为medium，可自动修复', () => {
      setupModes();
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [],
        },
        {
          id: 'record-2',
          serialNumber: 'HP-2024-002',
          mode: 'D Celtic',
          noteCount: 10,
          lastTuningDate: '2024-06-02',
          deviationNote: '微调',
          customerNickname: '客户B',
          deliveryStatus: 'in-progress',
          createdAt: '2024-06-02T00:00:00.000Z',
          updatedAt: '2024-06-02T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-02', deviationNote: '微调', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-02T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'missing_tuning_history');
      expect(group).toBeDefined();
      expect(group!.issues.length).toBe(1);
      expect(group!.issues[0].type).toBe('missing_tuning_history');
      expect(group!.issues[0].severity).toBe('medium' as IssueSeverity);
      expect(group!.issues[0].autoFixable).toBe(true);
      expect(group!.issues[0].recordId).toBe('record-1');
      expect(group!.issues[0].serialNumber).toBe('HP-2024-001');
      expect(group!.autoFixableCount).toBe(1);
      expect(group!.manualFixCount).toBe(0);
      expect(group!.issues[0].suggestedFix).toBeDefined();
    });

    it('tuningHistory为undefined时也应检测到', () => {
      setupModes();
      const recordWithoutTuning: any = {
        id: 'record-1',
        serialNumber: 'HP-2024-001',
        mode: 'D Kurd',
        noteCount: 9,
        lastTuningDate: '2024-06-01',
        deviationNote: '正常',
        customerNickname: '客户A',
        deliveryStatus: 'pending',
        createdAt: '2024-06-01T00:00:00.000Z',
        updatedAt: '2024-06-01T00:00:00.000Z',
      };
      localStorage.setItem('handpan_records', JSON.stringify([recordWithoutTuning]));
      setupWorkbench([]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'missing_tuning_history');
      expect(group).toBeDefined();
      expect(group!.issues.length).toBe(1);
      expect(group!.issues[0].autoFixable).toBe(true);
    });
  });

  describe('无效交付状态检测 (invalid_delivery_status)', () => {
    it('应检测到无效的交付状态，严重级别为high，可自动修复', () => {
      setupModes();
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'invalid-status' as any,
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-01', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
        {
          id: 'record-2',
          serialNumber: 'HP-2024-002',
          mode: 'D Celtic',
          noteCount: 10,
          lastTuningDate: '2024-06-02',
          deviationNote: '微调',
          customerNickname: '客户B',
          deliveryStatus: 'delivered',
          createdAt: '2024-06-02T00:00:00.000Z',
          updatedAt: '2024-06-02T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-2', date: '2024-06-02', deviationNote: '微调', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-02T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'invalid_delivery_status');
      expect(group).toBeDefined();
      expect(group!.issues.length).toBe(1);
      expect(group!.issues[0].type).toBe('invalid_delivery_status');
      expect(group!.issues[0].severity).toBe('high' as IssueSeverity);
      expect(group!.issues[0].autoFixable).toBe(true);
      expect(group!.issues[0].recordId).toBe('record-1');
      expect(group!.issues[0].serialNumber).toBe('HP-2024-001');
      expect(group!.autoFixableCount).toBe(1);
      expect(group!.manualFixCount).toBe(0);
      expect(group!.issues[0].suggestedFix).toBeDefined();
      expect(group!.issues[0].suggestedFix!.preview.newValue).toBe('pending');
    });

    it('有效交付状态不应生成问题', () => {
      setupModes();
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-01', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'invalid_delivery_status');
      expect(group).toBeUndefined();
    });
  });

  describe('工作台孤儿任务检测 (orphaned_workbench_task)', () => {
    it('应检测到关联记录不存在的工作台任务，严重级别为medium，可自动修复', () => {
      setupModes();
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-01', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([
        {
          id: 'task-1',
          recordId: 'non-existent-record',
          status: 'pending',
          taskDate: '2024-06-09',
          sortOrder: 0,
          createdAt: '2024-06-09T00:00:00.000Z',
          updatedAt: '2024-06-09T00:00:00.000Z',
        },
        {
          id: 'task-2',
          recordId: 'record-1',
          status: 'in-progress',
          taskDate: '2024-06-09',
          sortOrder: 1,
          createdAt: '2024-06-09T00:00:00.000Z',
          updatedAt: '2024-06-09T00:00:00.000Z',
        },
      ]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'orphaned_workbench_task');
      expect(group).toBeDefined();
      const orphanedIssue = group!.issues.find(i => i.affectedData.recordId === 'non-existent-record');
      expect(orphanedIssue).toBeDefined();
      expect(orphanedIssue!.type).toBe('orphaned_workbench_task');
      expect(orphanedIssue!.severity).toBe('medium' as IssueSeverity);
      expect(orphanedIssue!.autoFixable).toBe(true);
      expect(orphanedIssue!.suggestedFix).toBeDefined();
    });

    it('应检测到已交付记录仍在工作台的任务，严重级别为low，可自动修复', () => {
      setupModes();
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'delivered',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-01', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([
        {
          id: 'task-1',
          recordId: 'record-1',
          status: 'completed',
          taskDate: '2024-06-09',
          sortOrder: 0,
          createdAt: '2024-06-09T00:00:00.000Z',
          updatedAt: '2024-06-09T00:00:00.000Z',
        },
      ]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'orphaned_workbench_task');
      expect(group).toBeDefined();
      const deliveredIssue = group!.issues.find(i => i.serialNumber === 'HP-2024-001');
      expect(deliveredIssue).toBeDefined();
      expect(deliveredIssue!.type).toBe('orphaned_workbench_task');
      expect(deliveredIssue!.severity).toBe('low' as IssueSeverity);
      expect(deliveredIssue!.autoFixable).toBe(true);
      expect(group!.autoFixableCount).toBe(1);
    });
  });

  describe('调式不存在检测 (mode_not_found)', () => {
    it('应检测到使用了不存在调式的记录，严重级别为medium，不可自动修复', () => {
      setupModes([
        { id: 'mode-1', name: 'D Kurd', active: true, sortOrder: 0, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      ]);
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'NonExistentMode',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-01', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
        {
          id: 'record-2',
          serialNumber: 'HP-2024-002',
          mode: 'D Kurd',
          noteCount: 10,
          lastTuningDate: '2024-06-02',
          deviationNote: '微调',
          customerNickname: '客户B',
          deliveryStatus: 'in-progress',
          createdAt: '2024-06-02T00:00:00.000Z',
          updatedAt: '2024-06-02T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-2', date: '2024-06-02', deviationNote: '微调', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-02T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'mode_not_found');
      expect(group).toBeDefined();
      expect(group!.issues.length).toBe(1);
      expect(group!.issues[0].type).toBe('mode_not_found');
      expect(group!.issues[0].severity).toBe('medium' as IssueSeverity);
      expect(group!.issues[0].autoFixable).toBe(false);
      expect(group!.issues[0].recordId).toBe('record-1');
      expect(group!.issues[0].serialNumber).toBe('HP-2024-001');
      expect(group!.issues[0].modeName).toBe('NonExistentMode');
      expect(group!.autoFixableCount).toBe(0);
      expect(group!.manualFixCount).toBe(1);
    });

    it('使用存在的调式不应生成问题', () => {
      setupModes([
        { id: 'mode-1', name: 'D Kurd', active: true, sortOrder: 0, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      ]);
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'pending',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-01', deviationNote: '正常', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([]);

      const result = scanDataHealth();

      const group = findIssueByType(result, 'mode_not_found');
      expect(group).toBeUndefined();
    });
  });

  describe('综合扫描测试', () => {
    it('应同时检测到多类问题，并正确统计总数', () => {
      setupModes([
        { id: 'mode-1', name: 'D Kurd', active: true, sortOrder: 0, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      ]);
      setupRecords([
        {
          id: 'record-1',
          serialNumber: 'HP-2024-001',
          mode: 'D Kurd',
          noteCount: 9,
          lastTuningDate: '2024-06-01',
          deviationNote: '正常',
          customerNickname: '客户A',
          deliveryStatus: 'invalid' as any,
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
          tuningHistory: [],
        },
        {
          id: 'record-2',
          serialNumber: 'HP-2024-001',
          mode: 'NonExistent',
          noteCount: 10,
          lastTuningDate: '2024-06-02',
          deviationNote: '微调',
          customerNickname: '客户B',
          deliveryStatus: 'delivered',
          createdAt: '2024-06-02T00:00:00.000Z',
          updatedAt: '2024-06-02T00:00:00.000Z',
          tuningHistory: [{ id: 'tuning-1', date: '2024-06-02', deviationNote: '微调', beforeStatus: '', afterStatus: '', remark: '', createdAt: '2024-06-02T00:00:00.000Z' }],
        },
      ]);
      setupWorkbench([
        {
          id: 'task-1',
          recordId: 'non-existent',
          status: 'pending',
          taskDate: '2024-06-09',
          sortOrder: 0,
          createdAt: '2024-06-09T00:00:00.000Z',
          updatedAt: '2024-06-09T00:00:00.000Z',
        },
      ]);

      const result = scanDataHealth();

      expect(result.totalRecords).toBe(2);
      expect(result.totalIssues).toBeGreaterThanOrEqual(4);
      
      const duplicateGroup = findIssueByType(result, 'duplicate_serial');
      const missingTuningGroup = findIssueByType(result, 'missing_tuning_history');
      const invalidStatusGroup = findIssueByType(result, 'invalid_delivery_status');
      const modeNotFoundGroup = findIssueByType(result, 'mode_not_found');
      const orphanedGroup = findIssueByType(result, 'orphaned_workbench_task');

      expect(duplicateGroup).toBeDefined();
      expect(missingTuningGroup).toBeDefined();
      expect(invalidStatusGroup).toBeDefined();
      expect(modeNotFoundGroup).toBeDefined();
      expect(orphanedGroup).toBeDefined();

      expect(result.autoFixableCount).toBe(3);
      expect(result.manualFixCount).toBe(2);
    });
  });
});
