export type DeliveryStatus = 'pending' | 'in-progress' | 'completed' | 'delivered';

export interface TuningRecord {
  id: string;
  date: string;
  deviationNote: string;
  beforeStatus: string;
  afterStatus: string;
  remark: string;
  createdAt: string;
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
  updatedAt: string;
  tuningHistory: TuningRecord[];
}

export interface FilterState {
  mode: string;
  deliveryStatus: DeliveryStatus | '';
  search: string;
  reminderType: ReminderType | '';
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
  updatedAt: string;
}

export interface WorkbenchData {
  tasks: WorkbenchTask[];
  currentDate: string;
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

