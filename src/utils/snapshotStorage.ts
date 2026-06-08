import type {
  LocalSnapshot,
  SnapshotSummary,
  ComparisonResult,
  EntityComparison,
  RestoreOptions,
  RestorePreview,
  RestoreResult,
  HandpanRecord,
  WorkbenchTask,
  ModeOption,
} from '@/types/record';
import { getRecords, saveRecords, migrateRecords } from './storage';
import { getWorkbenchTasks, saveWorkbenchTasks, cleanupInvalidTasks } from './workbenchStorage';
import { getModes, saveModes } from './modeStorage';
import { getTombstones, saveTombstones, getDataVersion } from './versionedBackup';

const SNAPSHOT_STORAGE_KEY = 'handpan_snapshots';
const SNAPSHOT_FORMAT_VERSION = '1.0';
const MAX_SNAPSHOTS = 50;

export const generateSnapshotId = (): string => {
  return 'snap-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
};

export const getSnapshots = (): LocalSnapshot[] => {
  try {
    const data = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveSnapshots = (snapshots: LocalSnapshot[]): void => {
  localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
};

export const getSnapshotSummaries = (): SnapshotSummary[] => {
  const snapshots = getSnapshots();
  return snapshots.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    createdAt: s.createdAt,
    formatVersion: s.formatVersion,
    dataVersion: s.dataVersion,
    recordCount: s.recordCount,
    workbenchTaskCount: s.workbenchTaskCount,
    modeCount: s.modeCount,
    tombstoneCount: s.tombstoneCount,
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getSnapshotById = (id: string): LocalSnapshot | null => {
  const snapshots = getSnapshots();
  return snapshots.find(s => s.id === id) || null;
};

export const createSnapshot = (name: string, description: string = ''): LocalSnapshot => {
  const records = getRecords();
  const workbenchTasks = getWorkbenchTasks();
  const modes = getModes();
  const tombstones = getTombstones();

  const newSnapshot: LocalSnapshot = {
    id: generateSnapshotId(),
    name: name.trim() || `快照 ${new Date().toLocaleString('zh-CN')}`,
    description: description.trim(),
    createdAt: new Date().toISOString(),
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    dataVersion: getDataVersion(),
    recordCount: records.length,
    workbenchTaskCount: workbenchTasks.length,
    modeCount: modes.length,
    tombstoneCount: tombstones.length,
    data: {
      records: migrateRecords(records),
      workbenchTasks: [...workbenchTasks],
      modes: [...modes],
      tombstones: [...tombstones],
    },
  };

  const snapshots = getSnapshots();
  snapshots.push(newSnapshot);

  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
  }

  saveSnapshots(snapshots);
  return newSnapshot;
};

export const deleteSnapshot = (id: string): boolean => {
  const snapshots = getSnapshots();
  const filtered = snapshots.filter(s => s.id !== id);
  if (filtered.length === snapshots.length) return false;
  saveSnapshots(filtered);
  return true;
};

export const exportSnapshot = (snapshot: LocalSnapshot): string => {
  return JSON.stringify(snapshot, null, 2);
};

export const downloadSnapshot = (snapshot: LocalSnapshot): void => {
  const dataStr = exportSnapshot(snapshot);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = snapshot.createdAt.split('T')[0];
  link.download = `snapshot-${dateStr}-${snapshot.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseSnapshotFile = (jsonString: string): LocalSnapshot => {
  const parsed = JSON.parse(jsonString);

  if (!parsed.id || !parsed.formatVersion || !parsed.data || !Array.isArray(parsed.data.records)) {
    throw new Error('快照文件格式无效');
  }

  return parsed as LocalSnapshot;
};

export const importSnapshot = (snapshot: LocalSnapshot): LocalSnapshot => {
  const existing = getSnapshotById(snapshot.id);
  if (existing) {
    throw new Error('该快照已存在');
  }

  const migratedSnapshot: LocalSnapshot = {
    ...snapshot,
    data: {
      ...snapshot.data,
      records: migrateRecords(snapshot.data.records),
    },
  };

  const snapshots = getSnapshots();
  snapshots.push(migratedSnapshot);

  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
  }

  saveSnapshots(snapshots);
  return migratedSnapshot;
};

const compareObjects = (a: any, b: any): string[] => {
  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);

  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'createdAt' || key === '__version') continue;

    const valA = a?.[key];
    const valB = b?.[key];

    if (typeof valA === 'object' && typeof valB === 'object' && valA !== null && valB !== null) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        changes.push(key);
      }
    } else if (valA !== valB) {
      changes.push(key);
    }
  }

  return changes;
};

const getRecordLabel = (record: HandpanRecord): string => {
  return `${record.serialNumber} (${record.customerNickname})`;
};

const getWorkbenchTaskLabel = (task: WorkbenchTask, records: HandpanRecord[]): string => {
  const record = records.find(r => r.id === task.recordId);
  return record ? `${record.serialNumber} - ${task.status}` : `未知记录 ${task.recordId}`;
};

const getModeLabel = (mode: ModeOption): string => {
  return mode.name;
};

const compareEntity = (
  current: any[],
  snapshot: any[],
  entityType: 'records' | 'workbench' | 'modes',
  currentRecords?: HandpanRecord[],
  snapshotRecords?: HandpanRecord[]
): EntityComparison => {
  const currentMap = new Map(current.map(e => [e.id, e]));
  const snapshotMap = new Map(snapshot.map(e => [e.id, e]));
  const allIds = new Set([...currentMap.keys(), ...snapshotMap.keys()]);

  let added = 0;
  let modified = 0;
  let deleted = 0;
  let unchanged = 0;
  const changes: EntityComparison['changes'] = [];

  for (const id of allIds) {
    const inCurrent = currentMap.has(id);
    const inSnapshot = snapshotMap.has(id);

    if (inCurrent && !inSnapshot) {
      added++;
      const entity = currentMap.get(id)!;
      let label = '';
      if (entityType === 'records') {
        label = getRecordLabel(entity as HandpanRecord);
      } else if (entityType === 'workbench') {
        label = getWorkbenchTaskLabel(entity as WorkbenchTask, currentRecords || []);
      } else {
        label = getModeLabel(entity as ModeOption);
      }
      changes.push({ type: 'added', id, label });
    } else if (!inCurrent && inSnapshot) {
      deleted++;
      const entity = snapshotMap.get(id)!;
      let label = '';
      if (entityType === 'records') {
        label = getRecordLabel(entity as HandpanRecord);
      } else if (entityType === 'workbench') {
        label = getWorkbenchTaskLabel(entity as WorkbenchTask, snapshotRecords || []);
      } else {
        label = getModeLabel(entity as ModeOption);
      }
      changes.push({ type: 'deleted', id, label });
    } else if (inCurrent && inSnapshot) {
      const fieldChanges = compareObjects(currentMap.get(id), snapshotMap.get(id));
      if (fieldChanges.length > 0) {
        modified++;
        const entity = currentMap.get(id)!;
        let label = '';
        if (entityType === 'records') {
          label = getRecordLabel(entity as HandpanRecord);
        } else if (entityType === 'workbench') {
          label = getWorkbenchTaskLabel(entity as WorkbenchTask, currentRecords || []);
        } else {
          label = getModeLabel(entity as ModeOption);
        }
        changes.push({ type: 'modified', id, label, fieldChanges });
      } else {
        unchanged++;
      }
    }
  }

  return {
    entityType,
    currentCount: current.length,
    snapshotCount: snapshot.length,
    diff: current.length - snapshot.length,
    added,
    modified,
    deleted,
    unchanged,
    changes: changes.sort((a, b) => {
      const order = { deleted: 0, modified: 1, added: 2 };
      return order[a.type] - order[b.type];
    }),
  };
};

export const compareWithSnapshot = (snapshotId: string): ComparisonResult | null => {
  const snapshot = getSnapshotById(snapshotId);
  if (!snapshot) return null;

  const currentRecords = getRecords();
  const currentWorkbench = getWorkbenchTasks();
  const currentModes = getModes();

  const recordsComparison = compareEntity(
    currentRecords,
    snapshot.data.records,
    'records'
  );

  const workbenchComparison = compareEntity(
    currentWorkbench,
    snapshot.data.workbenchTasks,
    'workbench',
    currentRecords,
    snapshot.data.records
  );

  const modesComparison = compareEntity(
    currentModes,
    snapshot.data.modes,
    'modes'
  );

  const validRecordIdsInSnapshot = new Set(snapshot.data.records.map(r => r.id));
  const orphanedWorkbenchTasks = snapshot.data.workbenchTasks
    .filter(t => !validRecordIdsInSnapshot.has(t.recordId))
    .map(t => t.id);

  const hasConflicts = orphanedWorkbenchTasks.length > 0 ||
    [recordsComparison, workbenchComparison, modesComparison].some(
      c => c.changes.some(ch => ch.type === 'modified' && ch.fieldChanges && ch.fieldChanges.length > 3)
    );

  return {
    snapshotId: snapshot.id,
    snapshotName: snapshot.name,
    comparedAt: new Date().toISOString(),
    entities: [recordsComparison, workbenchComparison, modesComparison],
    hasConflicts,
    orphanedWorkbenchTasks,
  };
};

export const createRestorePreview = (
  snapshotId: string,
  options: RestoreOptions
): RestorePreview | null => {
  const snapshot = getSnapshotById(snapshotId);
  if (!snapshot) return null;

  const currentRecords = getRecords();
  const currentWorkbench = getWorkbenchTasks();
  const currentModes = getModes();

  const currentRecordIds = new Set(currentRecords.map(r => r.id));
  const snapshotRecordIds = new Set(snapshot.data.records.map(r => r.id));

  let willChangeRecords = 0;
  let willDeleteRecords = 0;
  let willChangeWorkbench = 0;
  let willDeleteWorkbenchTasks = 0;
  let willChangeModes = 0;
  let willDeleteModes = 0;
  const warnings: string[] = [];

  if (options.restoreRecords) {
    willChangeRecords = snapshot.data.records.filter(r => {
      const current = currentRecords.find(cr => cr.id === r.id);
      return !current || JSON.stringify(current) !== JSON.stringify(r);
    }).length;
    willDeleteRecords = currentRecords.filter(r => !snapshotRecordIds.has(r.id)).length;
  }

  if (options.restoreWorkbench) {
    willChangeWorkbench = snapshot.data.workbenchTasks.length;
    willDeleteWorkbenchTasks = currentWorkbench.length;
  }

  if (options.restoreModes) {
    willChangeModes = snapshot.data.modes.length;
    willDeleteModes = currentModes.length;
  }

  const validRecordIdsAfterRestore = options.restoreRecords
    ? snapshotRecordIds
    : currentRecordIds;

  const orphanedTasksAfterRestore = snapshot.data.workbenchTasks
    .filter(t => !validRecordIdsAfterRestore.has(t.recordId))
    .map(t => t.id);

  if (orphanedTasksAfterRestore.length > 0) {
    warnings.push(`恢复后将有 ${orphanedTasksAfterRestore.length} 个工作台任务引用不存在的记录，这些任务将被自动清理。`);
  }

  if (options.restoreWorkbench && !options.restoreRecords) {
    const snapshotOnlyRecordIds = new Set(
      snapshot.data.workbenchTasks
        .map(t => t.recordId)
        .filter(id => !currentRecordIds.has(id))
    );
    if (snapshotOnlyRecordIds.size > 0) {
      warnings.push('只恢复工作台但不恢复记录可能导致任务引用的记录不存在，建议同时恢复记录。');
    }
  }

  return {
    snapshotId: snapshot.id,
    snapshotName: snapshot.name,
    options,
    willChangeRecords,
    willChangeWorkbench,
    willChangeModes,
    willDeleteRecords,
    willDeleteWorkbenchTasks,
    willDeleteModes,
    orphanedTasksAfterRestore,
    warnings,
  };
};

export const restoreFromSnapshot = (
  snapshotId: string,
  options: RestoreOptions
): RestoreResult | null => {
  const snapshot = getSnapshotById(snapshotId);
  if (!snapshot) return null;

  const warnings: string[] = [];
  let cleanedOrphanedTasks = 0;

  const finalRecordIds = options.restoreRecords
    ? new Set(snapshot.data.records.map(r => r.id))
    : new Set(getRecords().map(r => r.id));

  if (options.restoreRecords) {
    const migratedRecords = migrateRecords(snapshot.data.records);
    saveRecords(migratedRecords);
  }

  if (options.restoreModes) {
    saveModes(snapshot.data.modes);
  }

  if (options.restoreWorkbench) {
    const validTasks = snapshot.data.workbenchTasks.filter(t => finalRecordIds.has(t.recordId));
    const orphanedCount = snapshot.data.workbenchTasks.length - validTasks.length;
    if (orphanedCount > 0) {
      cleanedOrphanedTasks = orphanedCount;
      warnings.push(`自动清理了 ${orphanedCount} 个引用不存在记录的工作台任务。`);
    }
    saveWorkbenchTasks(validTasks);
  } else if (options.restoreRecords) {
    cleanedOrphanedTasks = cleanupInvalidTasks(Array.from(finalRecordIds));
    if (cleanedOrphanedTasks > 0) {
      warnings.push(`自动清理了 ${cleanedOrphanedTasks} 个引用已删除记录的工作台任务。`);
    }
  }

  if (options.restoreRecords || options.restoreWorkbench || options.restoreModes) {
    saveTombstones(snapshot.data.tombstones);
  }

  return {
    success: true,
    restoredRecords: options.restoreRecords ? snapshot.recordCount : 0,
    restoredWorkbenchTasks: options.restoreWorkbench ? snapshot.workbenchTaskCount : 0,
    restoredModes: options.restoreModes ? snapshot.modeCount : 0,
    cleanedOrphanedTasks,
    warnings,
    timestamp: new Date().toISOString(),
  };
};
