import type { HandpanRecord, ModeOption, DeliveryStatus, TuningRecord } from '@/types/record';
import { DELIVERY_STATUS_OPTIONS, getLatestTuningDate } from '@/types/record';
import { migrateRecord, validateRecord } from './storage';
import { getModes } from './modeStorage';
import { getWorkbenchTasks } from './workbenchStorage';

export type IssueSeverity = 'high' | 'medium' | 'low';
export type IssueType =
  | 'duplicate_serial'
  | 'missing_tuning_history'
  | 'invalid_delivery_status'
  | 'inactive_mode_in_use'
  | 'tuning_date_after_update'
  | 'missing_required_fields'
  | 'invalid_note_count'
  | 'corrupted_record'
  | 'orphaned_workbench_task'
  | 'invalid_tuning_history'
  | 'mode_not_found'
  | 'inconsistent_tuning_data';

export interface Issue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  autoFixable: boolean;
  recordId?: string;
  serialNumber?: string;
  modeName?: string;
  affectedData: any;
  suggestedFix?: {
    description: string;
    preview: any;
  };
}

export interface IssueGroup {
  type: IssueType;
  title: string;
  icon: string;
  issues: Issue[];
  autoFixableCount: number;
  manualFixCount: number;
}

export interface ScanResult {
  totalRecords: number;
  totalModes: number;
  totalWorkbenchTasks: number;
  totalIssues: number;
  issueGroups: IssueGroup[];
  scanTime: string;
  autoFixableCount: number;
  manualFixCount: number;
}

export interface FixPreview {
  issueId: string;
  type: IssueType;
  title: string;
  currentValue: any;
  newValue: any;
  description: string;
}

export interface RepairSummary {
  repairTime: string;
  totalAttempted: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  autoFixedCount: number;
  manualFixedCount: number;
  results: {
    issueId: string;
    type: IssueType;
    title: string;
    status: 'success' | 'failed' | 'skipped';
    message: string;
  }[];
}

const VALID_DELIVERY_STATUSES = new Set(DELIVERY_STATUS_OPTIONS.map(o => o.value));

const safeParseJSON = (data: string | null): any => {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const generateIssueId = (): string => {
  return 'issue-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
};

const safeGetRecord = (record: any): HandpanRecord | null => {
  if (!record || typeof record !== 'object') {
    return null;
  }
  try {
    const migrated = migrateRecord(record);
    if (!migrated || typeof migrated !== 'object') {
      return null;
    }
    return migrated;
  } catch (error) {
    return null;
  }
};

const isRecordCorrupted = (raw: any): boolean => {
  if (!raw || typeof raw !== 'object') {
    return true;
  }
  try {
    JSON.stringify(raw);
    return false;
  } catch {
    return true;
  }
};

const hasMissingTuningHistoryRaw = (raw: any): boolean => {
  if (!raw || typeof raw !== 'object') return false;
  if (!raw.tuningHistory || !Array.isArray(raw.tuningHistory) || raw.tuningHistory.length === 0) {
    return true;
  }
  return false;
};

const isValidDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

const isDateAfter = (date1: string, date2: string): boolean => {
  if (!isValidDate(date1) || !isValidDate(date2)) return false;
  return new Date(date1).getTime() > new Date(date2).getTime();
};

const detectDuplicateSerials = (records: HandpanRecord[]): Issue[] => {
  const issues: Issue[] = [];
  const serialMap = new Map<string, HandpanRecord[]>();

  records.forEach(record => {
    if (!record.serialNumber) return;
    const existing = serialMap.get(record.serialNumber) || [];
    serialMap.set(record.serialNumber, [...existing, record]);
  });

  serialMap.forEach((recordGroup, serial) => {
    if (recordGroup.length > 1) {
      issues.push({
        id: generateIssueId(),
        type: 'duplicate_serial',
        severity: 'high',
        title: `编号重复：${serial}`,
        description: `发现 ${recordGroup.length} 条记录使用了相同的编号 "${serial}"`,
        autoFixable: false,
        serialNumber: serial,
        affectedData: { records: recordGroup.map(r => ({ id: r.id, customerNickname: r.customerNickname, createdAt: r.createdAt })) },
      });
    }
  });

  return issues;
};

const detectMissingTuningHistory = (rawRecords: any[], validRecords: HandpanRecord[]): Issue[] => {
  const issues: Issue[] = [];

  rawRecords.forEach((raw, index) => {
    if (isRecordCorrupted(raw)) return;
    
    if (hasMissingTuningHistoryRaw(raw)) {
      const validRecord = validRecords[index];
      if (!validRecord) return;

      issues.push({
        id: generateIssueId(),
        type: 'missing_tuning_history',
        severity: 'medium',
        title: `缺少调音历史：${validRecord.serialNumber}`,
        description: `记录 "${validRecord.serialNumber}" (${validRecord.customerNickname}) 没有调音历史记录`,
        autoFixable: true,
        recordId: validRecord.id,
        serialNumber: validRecord.serialNumber,
        affectedData: { recordId: validRecord.id, lastTuningDate: validRecord.lastTuningDate, deviationNote: validRecord.deviationNote },
        suggestedFix: {
          description: '根据现有记录信息创建一条初始调音记录',
          preview: {
            action: '创建初始调音历史',
            date: validRecord.lastTuningDate || new Date().toISOString().split('T')[0],
            deviationNote: validRecord.deviationNote || '无',
          },
        },
      });
    }
  });

  return issues;
};

const detectInvalidDeliveryStatus = (records: HandpanRecord[]): Issue[] => {
  const issues: Issue[] = [];

  records.forEach(record => {
    if (!VALID_DELIVERY_STATUSES.has(record.deliveryStatus as DeliveryStatus)) {
      issues.push({
        id: generateIssueId(),
        type: 'invalid_delivery_status',
        severity: 'high',
        title: `无效交付状态：${record.serialNumber}`,
        description: `记录 "${record.serialNumber}" 的交付状态 "${record.deliveryStatus}" 不是有效的状态值`,
        autoFixable: true,
        recordId: record.id,
        serialNumber: record.serialNumber,
        affectedData: { currentStatus: record.deliveryStatus, validStatuses: Array.from(VALID_DELIVERY_STATUSES) },
        suggestedFix: {
          description: '将交付状态重置为 "pending"（待调音）',
          preview: {
            oldValue: record.deliveryStatus,
            newValue: 'pending',
          },
        },
      });
    }
  });

  return issues;
};

const detectInactiveModeInUse = (records: HandpanRecord[], modes: ModeOption[]): Issue[] => {
  const issues: Issue[] = [];
  const activeModeNames = new Set(modes.filter(m => m.active).map(m => m.name));
  const allModeNames = new Set(modes.map(m => m.name));

  records.forEach(record => {
    if (!record.mode) return;
    
    if (!allModeNames.has(record.mode)) {
      issues.push({
        id: generateIssueId(),
        type: 'mode_not_found',
        severity: 'medium',
        title: `调式不存在：${record.serialNumber}`,
        description: `记录 "${record.serialNumber}" 使用的调式 "${record.mode}" 在调式库中不存在`,
        autoFixable: false,
        recordId: record.id,
        serialNumber: record.serialNumber,
        modeName: record.mode,
        affectedData: { mode: record.mode, availableModes: modes.map(m => m.name) },
      });
    } else if (!activeModeNames.has(record.mode)) {
      const createTime = record.createdAt || '';
      const mode = modes.find(m => m.name === record.mode);
      const modeUpdateTime = mode?.updatedAt || '';
      
      if (isDateAfter(createTime, modeUpdateTime)) {
        issues.push({
          id: generateIssueId(),
          type: 'inactive_mode_in_use',
          severity: 'medium',
          title: `停用调式被使用：${record.serialNumber}`,
          description: `记录 "${record.serialNumber}" 使用了已停用的调式 "${record.mode}"，且记录创建时间晚于调式停用时间`,
          autoFixable: false,
          recordId: record.id,
          serialNumber: record.serialNumber,
          modeName: record.mode,
          affectedData: {
            mode: record.mode,
            recordCreatedAt: createTime,
            modeUpdatedAt: modeUpdateTime,
          },
        });
      }
    }
  });

  return issues;
};

const detectTuningDateAfterUpdate = (records: HandpanRecord[]): Issue[] => {
  const issues: Issue[] = [];

  records.forEach(record => {
    const latestTuningDate = getLatestTuningDate(record);
    
    if (record.updatedAt && latestTuningDate) {
      const tuningDateTime = new Date(latestTuningDate).getTime();
      const updatedAtTime = new Date(record.updatedAt).getTime();
      
      if (tuningDateTime > updatedAtTime) {
        issues.push({
          id: generateIssueId(),
          type: 'tuning_date_after_update',
          severity: 'low',
          title: `调音日期晚于更新时间：${record.serialNumber}`,
          description: `记录 "${record.serialNumber}" 的最新调音日期 (${latestTuningDate}) 晚于记录更新时间 (${record.updatedAt.split('T')[0]})`,
          autoFixable: true,
          recordId: record.id,
          serialNumber: record.serialNumber,
          affectedData: { latestTuningDate, updatedAt: record.updatedAt },
          suggestedFix: {
            description: '将记录更新时间设置为最新调音日期',
            preview: {
              oldUpdatedAt: record.updatedAt,
              newUpdatedAt: new Date(latestTuningDate).toISOString(),
            },
          },
        });
      }
    }

    if (record.tuningHistory && record.tuningHistory.length > 0) {
      record.tuningHistory.forEach((tuning, index) => {
        if (tuning.date && record.updatedAt) {
          const tuningDateTime = new Date(tuning.date).getTime();
          const updatedAtTime = new Date(record.updatedAt).getTime();
          
          if (tuningDateTime > updatedAtTime) {
            issues.push({
              id: generateIssueId(),
              type: 'tuning_date_after_update',
              severity: 'low',
              title: `调音记录日期异常：${record.serialNumber} #${index + 1}`,
              description: `记录 "${record.serialNumber}" 的第 ${index + 1} 条调音记录日期 (${tuning.date}) 晚于记录更新时间`,
              autoFixable: true,
              recordId: record.id,
              serialNumber: record.serialNumber,
              affectedData: { tuningIndex: index, tuningDate: tuning.date, updatedAt: record.updatedAt },
              suggestedFix: {
                description: '将调音记录日期调整为不晚于记录更新时间',
                preview: {
                  oldDate: tuning.date,
                  newDate: record.updatedAt.split('T')[0],
                },
              },
            });
          }
        }
      });
    }
  });

  return issues;
};

const detectMissingRequiredFields = (records: HandpanRecord[]): Issue[] => {
  const issues: Issue[] = [];

  records.forEach(record => {
    const { valid, missingFields } = validateRecord(record);
    if (!valid) {
      issues.push({
        id: generateIssueId(),
        type: 'missing_required_fields',
        severity: 'high',
        title: `缺少必填字段：${record.serialNumber || record.id}`,
        description: `记录缺少以下必填字段：${missingFields.join('、')}`,
        autoFixable: false,
        recordId: record.id,
        serialNumber: record.serialNumber,
        affectedData: { missingFields, record },
      });
    }

    if (record.noteCount !== undefined && (typeof record.noteCount !== 'number' || record.noteCount < 1)) {
      issues.push({
        id: generateIssueId(),
        type: 'invalid_note_count',
        severity: 'high',
        title: `无效音位数量：${record.serialNumber || record.id}`,
        description: `记录的音位数量 "${record.noteCount}" 无效，必须是大于 0 的数字`,
        autoFixable: false,
        recordId: record.id,
        serialNumber: record.serialNumber,
        affectedData: { noteCount: record.noteCount },
      });
    }
  });

  return issues;
};

const hasInvalidTuningHistoryRaw = (raw: any): boolean[] => {
  if (!raw || typeof raw !== 'object') return [];
  if (!raw.tuningHistory || !Array.isArray(raw.tuningHistory)) return [];
  
  return raw.tuningHistory.map((tuning: any) => {
    if (!tuning || typeof tuning !== 'object') return true;
    return !tuning.id || !tuning.date || !tuning.createdAt;
  });
};

const detectInvalidTuningHistory = (rawRecords: any[], validRecords: HandpanRecord[]): Issue[] => {
  const issues: Issue[] = [];

  rawRecords.forEach((raw, index) => {
    if (isRecordCorrupted(raw)) return;
    
    const invalidIndices = hasInvalidTuningHistoryRaw(raw);
    const validRecord = validRecords[index];
    if (!validRecord) return;

    invalidIndices.forEach((isInvalid, tuningIndex) => {
      if (isInvalid) {
        issues.push({
          id: generateIssueId(),
          type: 'invalid_tuning_history',
          severity: 'medium',
          title: `调音记录损坏：${validRecord.serialNumber} #${tuningIndex + 1}`,
          description: `记录 "${validRecord.serialNumber}" 的第 ${tuningIndex + 1} 条调音记录缺少必要字段`,
          autoFixable: true,
          recordId: validRecord.id,
          serialNumber: validRecord.serialNumber,
          affectedData: { tuningIndex, tuning: raw.tuningHistory?.[tuningIndex] },
          suggestedFix: {
            description: '为调音记录补充缺失的必要字段',
            preview: {
              action: '修复调音记录字段',
              fields: ['id', 'date', 'createdAt'],
            },
          },
        });
      }
    });
  });

  return issues;
};

const detectOrphanedWorkbenchTasks = (records: HandpanRecord[]): Issue[] => {
  const issues: Issue[] = [];
  const tasks = getWorkbenchTasks();
  const validRecordIds = new Set(records.map(r => r.id));
  const deliveredRecordIds = new Set(records.filter(r => r.deliveryStatus === 'delivered').map(r => r.id));

  tasks.forEach(task => {
    if (!validRecordIds.has(task.recordId)) {
      issues.push({
        id: generateIssueId(),
        type: 'orphaned_workbench_task',
        severity: 'medium',
        title: `孤立工作台任务：${task.id}`,
        description: `工作台任务 "${task.id}" 关联的记录不存在`,
        autoFixable: true,
        affectedData: { task, recordId: task.recordId },
        suggestedFix: {
          description: '删除该孤立的工作台任务',
          preview: {
            action: '删除任务',
            taskId: task.id,
          },
        },
      });
    } else if (deliveredRecordIds.has(task.recordId)) {
      const record = records.find(r => r.id === task.recordId);
      issues.push({
        id: generateIssueId(),
        type: 'orphaned_workbench_task',
        severity: 'low',
        title: `已交付记录仍在工作台：${record?.serialNumber}`,
        description: `记录 "${record?.serialNumber}" 已交付，但仍在工作台任务列表中`,
        autoFixable: true,
        recordId: task.recordId,
        serialNumber: record?.serialNumber,
        affectedData: { task, record },
        suggestedFix: {
          description: '从工作台中移除该已交付记录的任务',
          preview: {
            action: '移除任务',
            taskId: task.id,
            recordSerial: record?.serialNumber,
          },
        },
      });
    }
  });

  return issues;
};

const detectCorruptedRecords = (rawRecords: any[]): Issue[] => {
  const issues: Issue[] = [];

  rawRecords.forEach((raw, index) => {
    try {
      const migrated = safeGetRecord(raw);
      if (!migrated) {
        issues.push({
          id: generateIssueId(),
          type: 'corrupted_record',
          severity: 'high',
          title: `数据损坏：记录 #${index + 1}`,
          description: `第 ${index + 1} 条记录数据结构损坏，无法正常解析`,
          autoFixable: false,
          affectedData: { index, rawData: raw },
        });
      }
    } catch (error) {
      issues.push({
        id: generateIssueId(),
        type: 'corrupted_record',
        severity: 'high',
        title: `数据损坏：记录 #${index + 1}`,
        description: `第 ${index + 1} 条记录解析时发生错误：${error instanceof Error ? error.message : '未知错误'}`,
        autoFixable: false,
        affectedData: { index, rawData: raw, error: error instanceof Error ? error.message : '未知错误' },
      });
    }
  });

  return issues;
};

const ISSUE_GROUP_CONFIG: Record<IssueType, { title: string; icon: string }> = {
  duplicate_serial: { title: '重复编号', icon: 'copy' },
  missing_tuning_history: { title: '缺少调音历史', icon: 'history' },
  invalid_delivery_status: { title: '无效交付状态', icon: 'alert-triangle' },
  inactive_mode_in_use: { title: '停用调式被使用', icon: 'power-off' },
  tuning_date_after_update: { title: '日期逻辑错误', icon: 'clock' },
  missing_required_fields: { title: '缺少必填字段', icon: 'file-x' },
  invalid_note_count: { title: '无效音位数量', icon: 'music' },
  corrupted_record: { title: '数据损坏', icon: 'database' },
  orphaned_workbench_task: { title: '孤立工作台任务', icon: 'list-todo' },
  invalid_tuning_history: { title: '调音记录损坏', icon: 'wrench' },
  mode_not_found: { title: '调式不存在', icon: 'search' },
  inconsistent_tuning_data: { title: '调音数据不一致', icon: 'refresh-cw' },
};

const groupIssues = (issues: Issue[]): IssueGroup[] => {
  const groupMap = new Map<IssueType, Issue[]>();

  issues.forEach(issue => {
    const existing = groupMap.get(issue.type) || [];
    groupMap.set(issue.type, [...existing, issue]);
  });

  const groups: IssueGroup[] = [];
  groupMap.forEach((issues, type) => {
    const config = ISSUE_GROUP_CONFIG[type] || { title: type, icon: 'help-circle' };
    groups.push({
      type,
      title: config.title,
      icon: config.icon,
      issues,
      autoFixableCount: issues.filter(i => i.autoFixable).length,
      manualFixCount: issues.filter(i => !i.autoFixable).length,
    });
  });

  return groups.sort((a, b) => {
    const severityOrder: Record<IssueSeverity, number> = { high: 0, medium: 1, low: 2 };
    const getMaxSeverity = (issues: Issue[]): number => {
      if (issues.length === 0) return 3;
      return Math.min(...issues.map(i => severityOrder[i.severity]));
    };
    return getMaxSeverity(a.issues) - getMaxSeverity(b.issues);
  });
};

export const scanDataHealth = (): ScanResult => {
  try {
    const recordsRaw = safeParseJSON(localStorage.getItem('handpan_records'));
    const recordsArray = Array.isArray(recordsRaw) ? recordsRaw : [];

    const validRecords: HandpanRecord[] = [];
    recordsRaw.forEach((raw: any) => {
      const migrated = safeGetRecord(raw);
      if (migrated) {
        validRecords.push(migrated);
      }
    });

    const modes = getModes();
    const tasks = getWorkbenchTasks();

    const allIssues: Issue[] = [];

    allIssues.push(...detectCorruptedRecords(recordsArray));
    allIssues.push(...detectMissingRequiredFields(validRecords));
    allIssues.push(...detectDuplicateSerials(validRecords));
    allIssues.push(...detectMissingTuningHistory(recordsArray, validRecords));
    allIssues.push(...detectInvalidDeliveryStatus(validRecords));
    allIssues.push(...detectInactiveModeInUse(validRecords, modes));
    allIssues.push(...detectTuningDateAfterUpdate(validRecords));
    allIssues.push(...detectInvalidTuningHistory(recordsArray, validRecords));
    allIssues.push(...detectOrphanedWorkbenchTasks(validRecords));

    const issueGroups = groupIssues(allIssues);

    return {
      totalRecords: validRecords.length,
      totalModes: modes.length,
      totalWorkbenchTasks: tasks.length,
      totalIssues: allIssues.length,
      issueGroups,
      scanTime: new Date().toISOString(),
      autoFixableCount: allIssues.filter(i => i.autoFixable).length,
      manualFixCount: allIssues.filter(i => !i.autoFixable).length,
    };
  } catch (error) {
    console.error('Error during data health scan:', error);
    return {
      totalRecords: 0,
      totalModes: 0,
      totalWorkbenchTasks: 0,
      totalIssues: 0,
      issueGroups: [],
      scanTime: new Date().toISOString(),
      autoFixableCount: 0,
      manualFixCount: 0,
    };
  }
};

export const generateFixPreviews = (issues: Issue[]): FixPreview[] => {
  return issues
    .filter(issue => issue.autoFixable && issue.suggestedFix)
    .map(issue => ({
      issueId: issue.id,
      type: issue.type,
      title: issue.title,
      currentValue: issue.affectedData,
      newValue: issue.suggestedFix!.preview,
      description: issue.suggestedFix!.description,
    }));
};

export const performAutoFix = (issue: Issue): { success: boolean; message: string; updatedRecords?: HandpanRecord[] } => {
  try {
    const recordsRaw = safeParseJSON(localStorage.getItem('handpan_records'));
    const recordsArray = Array.isArray(recordsRaw) ? recordsRaw : [];
    let records = recordsArray.map((raw: any) => safeGetRecord(raw)).filter(Boolean) as HandpanRecord[];

    switch (issue.type) {
      case 'missing_tuning_history': {
        const recordIndex = records.findIndex(r => r.id === issue.recordId);
        if (recordIndex === -1) {
          return { success: false, message: '找不到对应的记录' };
        }

        const record = records[recordIndex];
        const now = new Date().toISOString();
        const initialTuning: TuningRecord = {
          id: 'tuning-' + Date.now().toString(36) + Math.random().toString(36).substr(2),
          date: record.lastTuningDate || new Date().toISOString().split('T')[0],
          deviationNote: record.deviationNote || '',
          beforeStatus: '',
          afterStatus: '',
          remark: '数据修复：创建初始调音历史',
          createdAt: now,
        };

        records[recordIndex] = {
          ...record,
          tuningHistory: [initialTuning],
          updatedAt: now,
        };

        localStorage.setItem('handpan_records', JSON.stringify(records));
        return { success: true, message: '已创建初始调音历史记录', updatedRecords: records };
      }

      case 'invalid_delivery_status': {
        const recordIndex = records.findIndex(r => r.id === issue.recordId);
        if (recordIndex === -1) {
          return { success: false, message: '找不到对应的记录' };
        }

        records[recordIndex] = {
          ...records[recordIndex],
          deliveryStatus: 'pending',
          updatedAt: new Date().toISOString(),
        };

        localStorage.setItem('handpan_records', JSON.stringify(records));
        return { success: true, message: '已将交付状态重置为待调音', updatedRecords: records };
      }

      case 'tuning_date_after_update': {
        const recordIndex = records.findIndex(r => r.id === issue.recordId);
        if (recordIndex === -1) {
          return { success: false, message: '找不到对应的记录' };
        }

        const record = records[recordIndex];
        const tuningIndex = issue.affectedData.tuningIndex;

        if (tuningIndex !== undefined && record.tuningHistory[tuningIndex]) {
          record.tuningHistory[tuningIndex] = {
            ...record.tuningHistory[tuningIndex],
            date: record.updatedAt.split('T')[0],
          };
        } else {
          record.updatedAt = new Date(getLatestTuningDate(record)).toISOString();
        }

        records[recordIndex] = {
          ...record,
          updatedAt: new Date().toISOString(),
        };

        localStorage.setItem('handpan_records', JSON.stringify(records));
        return { success: true, message: '已修复日期逻辑问题', updatedRecords: records };
      }

      case 'invalid_tuning_history': {
        const recordIndex = records.findIndex(r => r.id === issue.recordId);
        if (recordIndex === -1) {
          return { success: false, message: '找不到对应的记录' };
        }

        const record = records[recordIndex];
        const tuningIndex = issue.affectedData.tuningIndex;

        if (tuningIndex !== undefined && record.tuningHistory[tuningIndex]) {
          const tuning = record.tuningHistory[tuningIndex];
          const now = new Date().toISOString();

          record.tuningHistory[tuningIndex] = {
            id: tuning.id || 'tuning-' + Date.now().toString(36) + Math.random().toString(36).substr(2),
            date: tuning.date || record.lastTuningDate || new Date().toISOString().split('T')[0],
            deviationNote: tuning.deviationNote || '',
            beforeStatus: tuning.beforeStatus || '',
            afterStatus: tuning.afterStatus || '',
            remark: tuning.remark || '数据修复',
            createdAt: tuning.createdAt || now,
            phonemeDeviations: tuning.phonemeDeviations,
          };

          records[recordIndex] = {
            ...record,
            updatedAt: now,
          };

          localStorage.setItem('handpan_records', JSON.stringify(records));
          return { success: true, message: '已修复调音记录字段', updatedRecords: records };
        }

        return { success: false, message: '找不到对应的调音记录' };
      }

      case 'orphaned_workbench_task': {
        const tasks = getWorkbenchTasks();
        const taskId = issue.affectedData.task?.id;

        if (taskId) {
          const filteredTasks = tasks.filter(t => t.id !== taskId);
          localStorage.setItem('handpan_workbench', JSON.stringify(filteredTasks));
          return { success: true, message: '已删除孤立的工作台任务' };
        }

        return { success: false, message: '找不到对应的任务ID' };
      }

      default:
        return { success: false, message: '该问题类型不支持自动修复' };
    }
  } catch (error) {
    console.error('Error during auto fix:', error);
    return { success: false, message: `修复失败：${error instanceof Error ? error.message : '未知错误'}` };
  }
};

export const performBatchAutoFix = (issues: Issue[]): RepairSummary => {
  const results: RepairSummary['results'] = [];
  let successCount = 0;
  let failedCount = 0;

  const autoFixableIssues = issues.filter(i => i.autoFixable);

  for (const issue of autoFixableIssues) {
    const result = performAutoFix(issue);
    if (result.success) {
      successCount++;
      results.push({
        issueId: issue.id,
        type: issue.type,
        title: issue.title,
        status: 'success',
        message: result.message,
      });
    } else {
      failedCount++;
      results.push({
        issueId: issue.id,
        type: issue.type,
        title: issue.title,
        status: 'failed',
        message: result.message,
      });
    }
  }

  return {
    repairTime: new Date().toISOString(),
    totalAttempted: autoFixableIssues.length,
    successCount,
    failedCount,
    skippedCount: issues.length - autoFixableIssues.length,
    autoFixedCount: successCount,
    manualFixedCount: 0,
    results,
  };
};
