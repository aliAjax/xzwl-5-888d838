export const STORAGE_KEYS = {
  RECORDS: 'handpan_records',
  MODES: 'handpan_mode_options',
  WORKBENCH: 'handpan_workbench',
  TOMBSTONES: 'handpan_tombstones',
  DEVICE_ID: 'handpan_device_id',
  DATA_VERSION: 'handpan_data_version',
  SNAPSHOTS: 'handpan_snapshots',
  VIEWS: 'handpan_filter_views',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
