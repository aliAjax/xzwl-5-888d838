export type DeliveryStatus = 'pending' | 'in-progress' | 'completed' | 'delivered';

export type FollowUpStatus = 'pending' | 'contacted' | 'needs-repair' | 'closed';

export interface FollowUpRecord {
  id: string;
  recordId: string;
  contactDate: string;
  customerFeedback: string;
  nextFollowUpDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpData {
  status: FollowUpStatus;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  history: FollowUpRecord[];
}

export interface PhonemeDeviation {
  name: string;
  beforeDeviation: number | null;
  afterDeviation: number | null;
  remark: string;
}


export interface TuningRecord {
  id: string;
  date: string;
  deviationNote: string;
  beforeStatus: string;
  afterStatus: string;
  remark: string;
  createdAt: string;
  phonemeDeviations?: PhonemeDeviation[];
}

export interface HandpanRecord {
  id: string;
  serialNumber: string;
  mode: string;
  noteCount: number;
  lastTuningDate: string;
  deviationNote: string;
  customerNickname: string;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  phonemeDeviations?: PhonemeDeviation[];
  updatedAt: string;
  tuningHistory: TuningRecord[];
  phonemeNames?: string[];
  followUp?: FollowUpData;
  __version?: number;
}

export type RecordConflictResolution = 'keep-existing' | 'use-imported' | 'merge';

export interface RecordConflict {
  serialNumber: string;
  existingRecord: HandpanRecord;
  importedRecord: HandpanRecord;
  existingUpdatedAt: string;
  importedUpdatedAt: string;
  isImportedNewer: boolean;
  resolution: RecordConflictResolution;
}

export interface ImportConflictAnalysis {
  canAutoMerge: boolean;
  newerCount: number;
  olderCount: number;
  sameTimeCount: number;
}

export interface FilterState {
  mode: string;
  deliveryStatus: DeliveryStatus | '';
  search: string;
  reminderType: ReminderType | '';
}

export interface FilterView {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
  updatedAt: string;
}

export const DELIVERY_STATUS_OPTIONS: { value: DeliveryStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待调音', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'in-progress', label: '调音中', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'completed', label: '已完成', color: 'bg-green-50 text-green-700 border-green-300' },
  { value: 'delivered', label: '已交付', color: 'bg-brass-50 text-brass-700 border-brass-400' },
];

export interface ModeOption {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  phonemeDeviations?: PhonemeDeviation[];
  updatedAt: string;
}

export const DEFAULT_MODE_OPTIONS: ModeOption[] = [
  { id: 'mode-d-kurd', name: 'D Kurd', active: true, sortOrder: 0, createdAt: '', updatedAt: '' },
  { id: 'mode-d-celtic', name: 'D Celtic', active: true, sortOrder: 1, createdAt: '', updatedAt: '' },
  { id: 'mode-d-integral', name: 'D Integral', active: true, sortOrder: 2, createdAt: '', updatedAt: '' },
  { id: 'mode-csharp-amara', name: 'C# Amara', active: true, sortOrder: 3, createdAt: '', updatedAt: '' },
  { id: 'mode-e-low-pygmy', name: 'E Low Pygmy', active: true, sortOrder: 4, createdAt: '', updatedAt: '' },
  { id: 'mode-fsharp-hijaz', name: 'F# Hijaz', active: true, sortOrder: 5, createdAt: '', updatedAt: '' },
  { id: 'mode-g-golden-gate', name: 'G Golden Gate', active: true, sortOrder: 6, createdAt: '', updatedAt: '' },
  { id: 'mode-a-aegean', name: 'A Aegean', active: true, sortOrder: 7, createdAt: '', updatedAt: '' },
  { id: 'mode-b-celtic-minor', name: 'B Celtic Minor', active: true, sortOrder: 8, createdAt: '', updatedAt: '' },
  { id: 'mode-c-pygmy', name: 'C Pygmy', active: true, sortOrder: 9, createdAt: '', updatedAt: '' },
  { id: 'mode-other', name: '其他', active: true, sortOrder: 10, createdAt: '', updatedAt: '' },
];

export const MODE_OPTIONS = DEFAULT_MODE_OPTIONS.map(m => m.name);

export const getStatusLabel = (status: DeliveryStatus): string => {
  const option = DELIVERY_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.label : status;
};

export const getStatusColor = (status: DeliveryStatus): string => {
  const option = DELIVERY_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.color : 'bg-gray-100 text-gray-700';
};

export type ReminderType = 'pending-review' | 'upcoming-due' | 'recently-completed';

export interface ReminderCategory {
  type: ReminderType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

export interface ReminderResult {
  category: ReminderCategory;
  records: HandpanRecord[];
  count: number;
}

export const REMINDER_CATEGORIES: ReminderCategory[] = [
  {
    type: 'pending-review',
    label: '待复查',
    description: '调音完成待复查交付',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    iconColor: 'text-amber-500',
  },
  {
    type: 'upcoming-due',
    label: '即将到期',
    description: '距上次调音60-90天',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    iconColor: 'text-rose-500',
  },
  {
    type: 'recently-completed',
    label: '已完成',
    description: '近30天内交付完成',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    iconColor: 'text-emerald-500',
  },
];

export type WorkbenchTaskStatus = 'pending' | 'in-progress' | 'completed';

export interface WorkbenchTask {
  id: string;
  recordId: string;
  status: WorkbenchTaskStatus;
  taskDate: string;
  sortOrder: number;
  createdAt: string;
  phonemeDeviations?: PhonemeDeviation[];
  updatedAt: string;
}

export interface WorkbenchData {
  tasks: WorkbenchTask[];
  currentDate: string;
}

export interface Tombstone {
  id: string;
  entityType: 'record' | 'mode' | 'workbenchTask';
  deletedAt: string;
  deletedBy: string;
}

export interface BackupMetadata {
  version: number;
  backupFormatVersion: string;
  deviceId: string;
  createdAt: string;
  exportedAt: string;
  recordCount: number;
  modeCount: number;
  workbenchTaskCount: number;
  tombstoneCount: number;
}

export interface VersionedBackup {
  metadata: BackupMetadata;
  records: HandpanRecord[];
  modes: ModeOption[];
  workbenchTasks: WorkbenchTask[];
  tombstones: Tombstone[];
}

export type ChangeType = 'new' | 'modified' | 'deleted' | 'conflict' | 'unchanged';
export type ConflictResolution = 'keep-local' | 'keep-imported' | 'manual' | 'pending';

export interface DiffItem {
  id: string;
  entityType: 'record' | 'mode' | 'workbenchTask';
  changeType: ChangeType;
  local?: any;
  imported?: any;
  base?: any;
  resolution: ConflictResolution;
  merged?: any;
  fieldConflicts?: string[];
}

export interface MergeResult {
  records: HandpanRecord[];
  modes: ModeOption[];
  workbenchTasks: WorkbenchTask[];
  tombstones: Tombstone[];
  diffs: DiffItem[];
}

export const WORKBENCH_STATUS_OPTIONS: { value: WorkbenchTaskStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待调音', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'in-progress', label: '调音中', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'completed', label: '已完成待复查', color: 'bg-amber-50 text-amber-700 border-amber-300' },
];

export const getWorkbenchStatusLabel = (status: WorkbenchTaskStatus): string => {
  const option = WORKBENCH_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.label : status;
};

export const getWorkbenchStatusColor = (status: WorkbenchTaskStatus): string => {
  const option = WORKBENCH_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.color : 'bg-gray-100 text-gray-700';
};

export const getNextWorkbenchStatus = (status: WorkbenchTaskStatus): WorkbenchTaskStatus | null => {
  const flow: WorkbenchTaskStatus[] = ['pending', 'in-progress', 'completed'];
  const currentIndex = flow.indexOf(status);
  return currentIndex < flow.length - 1 ? flow[currentIndex + 1] : null;
};

export const getDaysDiff = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const compareTuningRecords = (a: TuningRecord, b: TuningRecord): number => {
  const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
  if (dateDiff !== 0) {
    return dateDiff;
  }

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

export const getLatestTuning = (record: HandpanRecord): TuningRecord | null => {
  if (!record.tuningHistory || record.tuningHistory.length === 0) {
    return null;
  }
  return record.tuningHistory.reduce((latest, current) => 
    compareTuningRecords(current, latest) > 0 ? current : latest
  );
};

export const getLatestTuningDate = (record: HandpanRecord): string => {
  const latest = getLatestTuning(record);
  return latest ? latest.date : record.lastTuningDate;
};

export const getLatestDeviationNote = (record: HandpanRecord): string => {
  const latest = getLatestTuning(record);
  return latest ? latest.deviationNote : record.deviationNote;
};

export const calculateReminders = (records: HandpanRecord[]): ReminderResult[] => {
  const pendingReview: HandpanRecord[] = [];
  const upcomingDue: HandpanRecord[] = [];
  const recentlyCompleted: HandpanRecord[] = [];

  records.forEach((record) => {
    const latestTuningDate = getLatestTuningDate(record);
    const daysSinceTuning = getDaysDiff(latestTuningDate);

    if (record.deliveryStatus === 'completed') {
      pendingReview.push(record);
    }

    if (record.deliveryStatus === 'delivered' && daysSinceTuning >= 60 && daysSinceTuning < 90) {
      upcomingDue.push(record);
    }

    if (record.deliveryStatus === 'delivered' && daysSinceTuning < 30) {
      recentlyCompleted.push(record);
    }
  });

  return [
    {
      category: REMINDER_CATEGORIES[0],
      records: pendingReview,
      count: pendingReview.length,
    },
    {
      category: REMINDER_CATEGORIES[1],
      records: upcomingDue,
      count: upcomingDue.length,
    },
    {
      category: REMINDER_CATEGORIES[2],
      records: recentlyCompleted,
      count: recentlyCompleted.length,
    },
  ];
};


export const getMaxDeviation = (tuning: TuningRecord): number | null => {
  if (!tuning.phonemeDeviations || tuning.phonemeDeviations.length === 0) {
    return null;
  }
  const deviations = tuning.phonemeDeviations
    .map(d => Math.abs(d.afterDeviation ?? d.beforeDeviation ?? 0))
    .filter(v => v > 0);
  return deviations.length > 0 ? Math.max(...deviations) : null;
};

export const getCalibratedCount = (tuning: TuningRecord): number => {
  if (!tuning.phonemeDeviations || tuning.phonemeDeviations.length === 0) {
    return 0;
  }
  return tuning.phonemeDeviations.filter(d => 
    d.beforeDeviation !== null && 
    d.afterDeviation !== null && 
    d.beforeDeviation !== d.afterDeviation
  ).length;
};

export const getPhonemeNames = (record: HandpanRecord, noteCount: number): string[] => {
  if (record.phonemeNames && record.phonemeNames.length === noteCount) {
    return record.phonemeNames;
  }
  const names: string[] = ["Ding"];
  for (let i = 1; i < noteCount; i++) {
    names.push("音位 " + i);
  }
  return names;
};

export const createEmptyPhonemeDeviations = (names: string[]): PhonemeDeviation[] => {
  return names.map(name => ({
    name,
    beforeDeviation: null,
    afterDeviation: null,
    remark: "",
  }));
};

export const FOLLOW_UP_STATUS_OPTIONS: { value: FollowUpStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待回访', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'contacted', label: '已联系', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'needs-repair', label: '需返修', color: 'bg-rose-50 text-rose-700 border-rose-300' },
  { value: 'closed', label: '已关闭', color: 'bg-gray-50 text-gray-600 border-gray-300' },
];

export const getFollowUpStatusLabel = (status: FollowUpStatus): string => {
  const option = FOLLOW_UP_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.label : status;
};

export const getFollowUpStatusColor = (status: FollowUpStatus): string => {
  const option = FOLLOW_UP_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.color : 'bg-gray-100 text-gray-600';
};

export interface FollowUpCategory {
  status: FollowUpStatus;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

export interface FollowUpResult {
  category: FollowUpCategory;
  records: HandpanRecord[];
  count: number;
}

export const FOLLOW_UP_CATEGORIES: FollowUpCategory[] = [
  {
    status: 'pending',
    label: '待回访',
    description: '已交付且超过30天未联系',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    iconColor: 'text-amber-500',
  },
  {
    status: 'contacted',
    label: '已联系',
    description: '30天内有联系记录且状态正常',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    iconColor: 'text-blue-500',
  },
  {
    status: 'needs-repair',
    label: '需返修',
    description: '客户反馈需要返修处理',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    iconColor: 'text-rose-500',
  },
  {
    status: 'closed',
    label: '已关闭',
    description: '回访完成，无需继续跟进',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    iconColor: 'text-gray-500',
  },
];

const PENDING_DAYS_THRESHOLD = 30;

export const getFollowUpStatus = (record: HandpanRecord): FollowUpStatus => {
  if (record.deliveryStatus !== 'delivered') {
    return 'pending';
  }

  const followUp = record.followUp;

  if (!followUp) {
    const latestTuningDate = getLatestTuningDate(record);
    const daysSinceTuning = getDaysDiff(latestTuningDate);
    return daysSinceTuning >= PENDING_DAYS_THRESHOLD ? 'pending' : 'pending';
  }

  if (followUp.status === 'needs-repair' || followUp.status === 'closed') {
    return followUp.status;
  }

  if (followUp.lastContactDate) {
    const daysSinceContact = getDaysDiff(followUp.lastContactDate);
    if (daysSinceContact < PENDING_DAYS_THRESHOLD) {
      return 'contacted';
    }
  }

  return 'pending';
};

export const getNextFollowUpDate = (record: HandpanRecord): string | null => {
  const followUp = record.followUp;
  if (!followUp) return null;
  return followUp.nextFollowUpDate;
};

export const getLastContactDate = (record: HandpanRecord): string | null => {
  const followUp = record.followUp;
  if (!followUp) return null;
  return followUp.lastContactDate;
};

export const calculateFollowUpQueue = (records: HandpanRecord[]): FollowUpResult[] => {
  const pending: HandpanRecord[] = [];
  const contacted: HandpanRecord[] = [];
  const needsRepair: HandpanRecord[] = [];
  const closed: HandpanRecord[] = [];

  records.forEach((record) => {
    if (record.deliveryStatus !== 'delivered') {
      return;
    }

    const status = getFollowUpStatus(record);

    switch (status) {
      case 'pending':
        pending.push(record);
        break;
      case 'contacted':
        contacted.push(record);
        break;
      case 'needs-repair':
        needsRepair.push(record);
        break;
      case 'closed':
        closed.push(record);
        break;
    }
  });

  const sortByDate = (a: HandpanRecord, b: HandpanRecord) => {
    const dateA = getLastContactDate(a) || getLatestTuningDate(a);
    const dateB = getLastContactDate(b) || getLatestTuningDate(b);
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  };

  pending.sort(sortByDate);
  contacted.sort(sortByDate);
  needsRepair.sort(sortByDate);
  closed.sort(sortByDate);

  return [
    {
      category: FOLLOW_UP_CATEGORIES[0],
      records: pending,
      count: pending.length,
    },
    {
      category: FOLLOW_UP_CATEGORIES[1],
      records: contacted,
      count: contacted.length,
    },
    {
      category: FOLLOW_UP_CATEGORIES[2],
      records: needsRepair,
      count: needsRepair.length,
    },
    {
      category: FOLLOW_UP_CATEGORIES[3],
      records: closed,
      count: closed.length,
    },
  ];
};

export const generateFollowUpId = (): string => {
  return 'followup-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export type SnapshotEntityType = 'records' | 'workbench' | 'modes' | 'all';

export interface LocalSnapshot {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  formatVersion: string;
  dataVersion: number;
  recordCount: number;
  workbenchTaskCount: number;
  modeCount: number;
  tombstoneCount: number;
  data: {
    records: HandpanRecord[];
    workbenchTasks: WorkbenchTask[];
    modes: ModeOption[];
    tombstones: Tombstone[];
  };
}

export interface SnapshotSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  formatVersion: string;
  dataVersion: number;
  recordCount: number;
  workbenchTaskCount: number;
  modeCount: number;
  tombstoneCount: number;
}

export interface EntityComparison {
  entityType: 'records' | 'workbench' | 'modes';
  currentCount: number;
  snapshotCount: number;
  diff: number;
  added: number;
  modified: number;
  deleted: number;
  unchanged: number;
  changes: {
    type: 'added' | 'modified' | 'deleted';
    id: string;
    label: string;
    fieldChanges?: string[];
  }[];
}

export interface ComparisonResult {
  snapshotId: string;
  snapshotName: string;
  comparedAt: string;
  entities: EntityComparison[];
  hasConflicts: boolean;
  orphanedWorkbenchTasks: string[];
}

export interface RestoreOptions {
  restoreRecords: boolean;
  restoreWorkbench: boolean;
  restoreModes: boolean;
}

export interface RestorePreview {
  snapshotId: string;
  snapshotName: string;
  options: RestoreOptions;
  willChangeRecords: number;
  willChangeWorkbench: number;
  willChangeModes: number;
  willDeleteRecords: number;
  willDeleteWorkbenchTasks: number;
  willDeleteModes: number;
  orphanedTasksAfterRestore: string[];
  warnings: string[];
}

export interface RestoreResult {
  success: boolean;
  restoredRecords: number;
  restoredWorkbenchTasks: number;
  restoredModes: number;
  cleanedOrphanedTasks: number;
  warnings: string[];
  timestamp: string;
}
