import type { HandpanRecord } from '@/types/record';

const STORAGE_KEY = 'handpan_records';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getRecords = (): HandpanRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveRecords = (records: HandpanRecord[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const addRecord = (record: Omit<HandpanRecord, 'id' | 'createdAt' | 'updatedAt'>): HandpanRecord => {
  const records = getRecords();
  const now = new Date().toISOString();
  const newRecord: HandpanRecord = {
    ...record,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  records.push(newRecord);
  saveRecords(records);
  return newRecord;
};

export const updateRecord = (id: string, updates: Partial<HandpanRecord>): HandpanRecord | null => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  records[index] = {
    ...records[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveRecords(records);
  return records[index];
};

export const deleteRecord = (id: string): boolean => {
  const records = getRecords();
  const filtered = records.filter(r => r.id !== id);
  if (filtered.length === records.length) return false;
  saveRecords(filtered);
  return true;
};

export const exportRecords = (): string => {
  const records = getRecords();
  return JSON.stringify(records, null, 2);
};

export const downloadExport = (): void => {
  const dataStr = exportRecords();
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `handpan-records-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface ImportAnalysis {
  total: number;
  valid: HandpanRecord[];
  duplicateSerialNumbers: HandpanRecord[];
  missingFields: { record: Partial<HandpanRecord>; missingFields: string[] }[];
}

const REQUIRED_FIELDS: (keyof HandpanRecord)[] = [
  'serialNumber',
  'mode',
  'noteCount',
  'lastTuningDate',
  'customerNickname',
  'deliveryStatus',
];

export const validateRecord = (record: Partial<HandpanRecord>): { valid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];
  
  for (const field of REQUIRED_FIELDS) {
    const value = record[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }
  
  if (record.noteCount !== undefined && (typeof record.noteCount !== 'number' || record.noteCount < 1)) {
    missingFields.push('noteCount');
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
};

export const parseImportData = (jsonString: string): Partial<HandpanRecord>[] => {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error('导入文件格式错误：数据必须是数组格式');
  }
  return parsed;
};

export const analyzeImportData = (
  importedRecords: Partial<HandpanRecord>[],
  existingRecords: HandpanRecord[]
): ImportAnalysis => {
  const existingSerialNumbers = new Set(existingRecords.map(r => r.serialNumber));
  
  const analysis: ImportAnalysis = {
    total: importedRecords.length,
    valid: [],
    duplicateSerialNumbers: [],
    missingFields: [],
  };
  
  const validSerialNumbersInImport = new Set<string>();
  
  for (const record of importedRecords) {
    const { valid, missingFields } = validateRecord(record);
    
    if (!valid) {
      analysis.missingFields.push({ record, missingFields });
      continue;
    }
    
    const validRecord = record as HandpanRecord;
    
    if (existingSerialNumbers.has(validRecord.serialNumber) || validSerialNumbersInImport.has(validRecord.serialNumber)) {
      analysis.duplicateSerialNumbers.push(validRecord);
      continue;
    }
    
    validSerialNumbersInImport.add(validRecord.serialNumber);
    analysis.valid.push(validRecord);
  }
  
  return analysis;
};

export const mergeImportedRecords = (
  existingRecords: HandpanRecord[],
  validImportedRecords: HandpanRecord[]
): HandpanRecord[] => {
  const now = new Date().toISOString();
  const newRecords = validImportedRecords.map(record => ({
    ...record,
    id: record.id || generateId(),
    createdAt: record.createdAt || now,
    updatedAt: now,
  }));
  
  return [...existingRecords, ...newRecords];
};
