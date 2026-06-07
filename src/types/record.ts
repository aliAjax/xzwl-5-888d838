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
}

export const DELIVERY_STATUS_OPTIONS: { value: DeliveryStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待调音', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'in-progress', label: '调音中', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'completed', label: '已完成', color: 'bg-green-50 text-green-700 border-green-300' },
  { value: 'delivered', label: '已交付', color: 'bg-brass-50 text-brass-700 border-brass-400' },
];

export const MODE_OPTIONS = [
  'D Kurd',
  'D Celtic',
  'D Integral',
  'C# Amara',
  'E Low Pygmy',
  'F# Hijaz',
  'G Golden Gate',
  'A Aegean',
  'B Celtic Minor',
  'C Pygmy',
  '其他'
];

export const getStatusLabel = (status: DeliveryStatus): string => {
  const option = DELIVERY_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.label : status;
};

export const getStatusColor = (status: DeliveryStatus): string => {
  const option = DELIVERY_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.color : 'bg-gray-100 text-gray-700';
};
