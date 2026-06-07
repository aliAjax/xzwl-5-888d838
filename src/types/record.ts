export type DeliveryStatus = 'pending' | 'in-progress' | 'completed' | 'delivered';

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

export const getDaysDiff = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const calculateReminders = (records: HandpanRecord[]): ReminderResult[] => {
  const pendingReview: HandpanRecord[] = [];
  const upcomingDue: HandpanRecord[] = [];
  const recentlyCompleted: HandpanRecord[] = [];

  records.forEach((record) => {
    const daysSinceTuning = getDaysDiff(record.lastTuningDate);

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


