import type {
  HandpanRecord,
  ModeOption,
  WorkbenchTask,
  Tombstone,
  VersionedBackup,
  BackupMetadata,
  DiffItem,
  ConflictResolution,
  MergeResult,
} from '@/types/record';
import { getRecords } from './storage';
import { getModes } from './modeStorage';
import { getWorkbenchTasks } from './workbenchStorage';

const DEVICE_ID_KEY = 'handpan_device_id';
const TOMBSTONE_KEY = 'handpan_tombstones';
const BACKUP_FORMAT_VERSION = '2.0';
const DATA_VERSION_KEY = 'handpan_data_version';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'dev-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 10);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const getDataVersion = (): number => {
  const version = localStorage.getItem(DATA_VERSION_KEY);
  return version ? parseInt(version, 10) : 1;
};

export const incrementDataVersion = (): number => {
  const current = getDataVersion();
  const next = current + 1;
  localStorage.setItem(DATA_VERSION_KEY, next.toString());
  return next;
};

export const getTombstones = (): Tombstone[] => {
  try {
    const data = localStorage.getItem(TOMBSTONE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveTombstones = (tombstones: Tombstone[]): void => {
  localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(tombstones));
};

export const addTombstone = (id: string, entityType: 'record' | 'mode' | 'workbenchTask'): void => {
  const tombstones = getTombstones();
  const existing = tombstones.find(t => t.id === id && t.entityType === entityType);
  if (existing) return;

  tombstones.push({
    id,
    entityType,
    deletedAt: new Date().toISOString(),
    deletedBy: getDeviceId(),
  });
  saveTombstones(tombstones);
};

export const removeTombstone = (id: string, entityType: 'record' | 'mode' | 'workbenchTask'): void => {
  const tombstones = getTombstones();
  const filtered = tombstones.filter(t => !(t.id === id && t.entityType === entityType));
  if (filtered.length !== tombstones.length) {
    saveTombstones(filtered);
  }
};

export const isTombstoned = (id: string, entityType: 'record' | 'mode' | 'workbenchTask'): boolean => {
  const tombstones = getTombstones();
  return tombstones.some(t => t.id === id && t.entityType === entityType);
};

export const cleanupOldTombstones = (maxAgeDays: number = 90): number => {
  const tombstones = getTombstones();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  const cutoffTime = cutoffDate.getTime();

  const filtered = tombstones.filter(t => new Date(t.deletedAt).getTime() > cutoffTime);
  const removed = tombstones.length - filtered.length;
  if (removed > 0) {
    saveTombstones(filtered);
  }
  return removed;
};

const compareObjects = (a: any, b: any): string[] => {
  const conflicts: string[] = [];
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);

  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'createdAt') continue;

    const valA = a?.[key];
    const valB = b?.[key];

    if (typeof valA === 'object' && typeof valB === 'object' && valA !== null && valB !== null) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        conflicts.push(key);
      }
    } else if (valA !== valB) {
      conflicts.push(key);
    }
  }

  return conflicts;
};

const getUpdatedAt = (entity: any): string => {
  return entity?.updatedAt || entity?.createdAt || '1970-01-01T00:00:00Z';
};

const detectEntityDiffs = (
  localEntities: any[],
  importedEntities: any[],
  localTombstones: Tombstone[],
  importedTombstones: Tombstone[],
  entityType: 'record' | 'mode' | 'workbenchTask'
): DiffItem[] => {
  const diffs: DiffItem[] = [];
  const localMap = new Map(localEntities.map(e => [e.id, e]));
  const importedMap = new Map(importedEntities.map(e => [e.id, e]));
  const allIds = new Set([...localMap.keys(), ...importedMap.keys()]);

  const localTombstoneMap = new Map(
    localTombstones.filter(t => t.entityType === entityType).map(t => [t.id, t])
  );
  const importedTombstoneMap = new Map(
    importedTombstones.filter(t => t.entityType === entityType).map(t => [t.id, t])
  );

  for (const id of allIds) {
    const local = localMap.get(id);
    const imported = importedMap.get(id);
    const localTombstone = localTombstoneMap.get(id);
    const importedTombstone = importedTombstoneMap.get(id);

    if (localTombstone && importedTombstone) {
      continue;
    }

    if (localTombstone && imported) {
      diffs.push({
        id,
        entityType,
        changeType: 'conflict',
        local: undefined,
        imported,
        resolution: 'pending',
        fieldConflicts: ['deleted'],
      });
      continue;
    }

    if (importedTombstone && local) {
      diffs.push({
        id,
        entityType,
        changeType: 'conflict',
        local,
        imported: undefined,
        resolution: 'pending',
        fieldConflicts: ['deleted'],
      });
      continue;
    }

    if (localTombstone && !imported) {
      continue;
    }

    if (importedTombstone && !local) {
      diffs.push({
        id,
        entityType,
        changeType: 'deleted',
        imported: undefined,
        resolution: 'keep-imported',
      });
      continue;
    }

    if (!local && imported) {
      diffs.push({
        id,
        entityType,
        changeType: 'new',
        imported,
        resolution: 'keep-imported',
      });
      continue;
    }

    if (local && !imported) {
      continue;
    }

    if (local && imported) {
      const fieldConflicts = compareObjects(local, imported);

      if (fieldConflicts.length === 0) {
        diffs.push({
          id,
          entityType,
          changeType: 'unchanged',
          local,
          imported,
          resolution: 'keep-local',
        });
      } else {
        const localUpdatedAt = new Date(getUpdatedAt(local)).getTime();
        const importedUpdatedAt = new Date(getUpdatedAt(imported)).getTime();

        let defaultResolution: ConflictResolution = 'pending';
        if (localUpdatedAt > importedUpdatedAt) {
          defaultResolution = 'keep-local';
        } else if (importedUpdatedAt > localUpdatedAt) {
          defaultResolution = 'keep-imported';
        }

        diffs.push({
          id,
          entityType,
          changeType: 'conflict',
          local,
          imported,
          resolution: defaultResolution,
          fieldConflicts,
        });
      }
    }
  }

  return diffs;
};

export const analyzeDiff = (
  localData: {
    records: HandpanRecord[];
    modes: ModeOption[];
    workbenchTasks: WorkbenchTask[];
    tombstones: Tombstone[];
  },
  importedBackup: VersionedBackup
): DiffItem[] => {
  const recordDiffs = detectEntityDiffs(
    localData.records,
    importedBackup.records,
    localData.tombstones,
    importedBackup.tombstones,
    'record'
  );

  const modeDiffs = detectEntityDiffs(
    localData.modes,
    importedBackup.modes,
    localData.tombstones,
    importedBackup.tombstones,
    'mode'
  );

  const taskDiffs = detectEntityDiffs(
    localData.workbenchTasks,
    importedBackup.workbenchTasks,
    localData.tombstones,
    importedBackup.tombstones,
    'workbenchTask'
  );

  return [...recordDiffs, ...modeDiffs, ...taskDiffs];
};

export const applyResolutions = (
  localData: {
    records: HandpanRecord[];
    modes: ModeOption[];
    workbenchTasks: WorkbenchTask[];
    tombstones: Tombstone[];
  },
  diffs: DiffItem[]
): MergeResult => {
  const localRecordMap = new Map(localData.records.map(r => [r.id, r]));
  const localModeMap = new Map(localData.modes.map(m => [m.id, m]));
  const localTaskMap = new Map(localData.workbenchTasks.map(t => [t.id, t]));
  const localTombstoneSet = new Set(localData.tombstones.map(t => `${t.entityType}:${t.id}`));

  const newTombstones: Tombstone[] = [...localData.tombstones];

  for (const diff of diffs) {
    const key = `${diff.entityType}:${diff.id}`;

    switch (diff.resolution) {
      case 'keep-imported':
        if (diff.changeType === 'deleted') {
          if (diff.entityType === 'record') localRecordMap.delete(diff.id);
          if (diff.entityType === 'mode') localModeMap.delete(diff.id);
          if (diff.entityType === 'workbenchTask') localTaskMap.delete(diff.id);

          if (!localTombstoneSet.has(key)) {
            newTombstones.push({
              id: diff.id,
              entityType: diff.entityType,
              deletedAt: new Date().toISOString(),
              deletedBy: getDeviceId(),
            });
          }
        } else if (diff.imported) {
          if (diff.entityType === 'record') localRecordMap.set(diff.id, diff.imported);
          if (diff.entityType === 'mode') localModeMap.set(diff.id, diff.imported);
          if (diff.entityType === 'workbenchTask') localTaskMap.set(diff.id, diff.imported);

          const tombstoneIndex = newTombstones.findIndex(
            t => t.id === diff.id && t.entityType === diff.entityType
          );
          if (tombstoneIndex !== -1) {
            newTombstones.splice(tombstoneIndex, 1);
          }
        }
        break;

      case 'keep-local':
        break;

      case 'manual':
        if (diff.merged) {
          if (diff.entityType === 'record') localRecordMap.set(diff.id, { ...diff.merged, updatedAt: new Date().toISOString() });
          if (diff.entityType === 'mode') localModeMap.set(diff.id, { ...diff.merged, updatedAt: new Date().toISOString() });
          if (diff.entityType === 'workbenchTask') localTaskMap.set(diff.id, { ...diff.merged, updatedAt: new Date().toISOString() });

          const tombstoneIndex = newTombstones.findIndex(
            t => t.id === diff.id && t.entityType === diff.entityType
          );
          if (tombstoneIndex !== -1) {
            newTombstones.splice(tombstoneIndex, 1);
          }
        }
        break;
    }
  }

  return {
    records: Array.from(localRecordMap.values()),
    modes: Array.from(localModeMap.values()),
    workbenchTasks: Array.from(localTaskMap.values()),
    tombstones: newTombstones,
    diffs,
  };
};

export const createVersionedBackup = (): VersionedBackup => {
  const records = getRecords();
  const modes = getModes();
  const workbenchTasks = getWorkbenchTasks();
  const tombstones = getTombstones();

  const oldestCreated = records.length > 0
    ? records.reduce((oldest, r) =>
        new Date(r.createdAt) < new Date(oldest.createdAt) ? r : oldest
      ).createdAt
    : new Date().toISOString();

  const metadata: BackupMetadata = {
    version: incrementDataVersion(),
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    deviceId: getDeviceId(),
    createdAt: oldestCreated,
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    modeCount: modes.length,
    workbenchTaskCount: workbenchTasks.length,
    tombstoneCount: tombstones.length,
  };

  return {
    metadata,
    records,
    modes,
    workbenchTasks,
    tombstones,
  };
};

export const parseBackup = (jsonString: string): VersionedBackup | HandpanRecord[] => {
  const parsed = JSON.parse(jsonString);

  if (parsed.metadata && parsed.metadata.backupFormatVersion && Array.isArray(parsed.records)) {
    return parsed as VersionedBackup;
  }

  if (Array.isArray(parsed)) {
    return parsed as HandpanRecord[];
  }

  throw new Error('无法识别的备份文件格式');
};

export const isVersionedBackup = (data: any): data is VersionedBackup => {
  return data && data.metadata && data.metadata.backupFormatVersion && Array.isArray(data.records);
};

export const getLocalData = () => ({
  records: getRecords(),
  modes: getModes(),
  workbenchTasks: getWorkbenchTasks(),
  tombstones: getTombstones(),
});
