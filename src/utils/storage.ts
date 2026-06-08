import type { HandpanRecord, TuningRecord, PhonemeDeviation, FollowUpRecord, FollowUpData, FollowUpStatus } from '@/types/record';
import { generateFollowUpId, getFollowUpStatus } from '@/types/record';

const STORAGE_KEY = 'handpan_records';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const generateTuningId = (): string => {
  return 'tuning-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const migrateFollowUpData = (data: any): FollowUpData | undefined => {
  if (!data) return undefined;
  
  const migrated: FollowUpData = {
    status: data.status || 'pending',
    lastContactDate: data.lastContactDate || null,
    nextFollowUpDate: data.nextFollowUpDate || null,
    history: Array.isArray(data.history) ? data.history.map((h: any) => ({
      id: h.id || generateFollowUpId(),
      recordId: h.recordId || '',
      contactDate: h.contactDate || new Date().toISOString().split('T')[0],
      customerFeedback: h.customerFeedback || '',
      nextFollowUpDate: h.nextFollowUpDate || null,
      notes: h.notes || '',
      createdAt: h.createdAt || new Date().toISOString(),
      updatedAt: h.updatedAt || new Date().toISOString(),
    })) : [],
  };

  return migrated;
};

export const migrateRecord = (record: any): HandpanRecord => {
  const migrated: HandpanRecord = {
    ...record,
    tuningHistory: record.tuningHistory || [],
    phonemeNames: record.phonemeNames !== undefined ? record.phonemeNames : undefined,
    followUp: migrateFollowUpData(record.followUp),
  };

  if (migrated.tuningHistory.length > 0) {
    migrated.tuningHistory = migrated.tuningHistory.map((tuning: any) => ({
      ...tuning,
      phonemeDeviations: tuning.phonemeDeviations !== undefined ? tuning.phonemeDeviations : undefined,
    }));
  }

  if (migrated.tuningHistory.length === 0 && (record.lastTuningDate || record.deviationNote)) {
    const initialTuning: TuningRecord = {
      id: generateTuningId(),
      date: record.lastTuningDate || new Date().toISOString().split('T')[0],
      deviationNote: record.deviationNote || '',
      beforeStatus: '',
      afterStatus: '',
      remark: '历史数据迁移',
      createdAt: record.updatedAt || record.createdAt || new Date().toISOString(),
      phonemeDeviations: record.phonemeDeviations !== undefined ? record.phonemeDeviations : undefined,
    };
    migrated.tuningHistory = [initialTuning];
  }

  return migrated;
};

export const migrateRecords = (records: any[]): HandpanRecord[] => {
  return records.map(migrateRecord);
};

export const getRecords = (): HandpanRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return migrateRecords(parsed);
  } catch {
    return [];
  }
};

export const saveRecords = (records: HandpanRecord[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const addRecord = (record: Omit<HandpanRecord, 'id' | 'createdAt' | 'updatedAt' | 'tuningHistory'>): HandpanRecord => {
  const records = getRecords();
  const now = new Date().toISOString();
  
  const initialTuning: TuningRecord = {
    id: generateTuningId(),
    date: record.lastTuningDate,
    deviationNote: record.deviationNote,
    beforeStatus: '',
    afterStatus: '',
    remark: '',
    createdAt: now,
  };

  const newRecord: HandpanRecord = {
    ...record,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    tuningHistory: [initialTuning],
    phonemeNames: record.phonemeNames,
  };
  records.push(newRecord);
  saveRecords(records);
  return newRecord;
};

export const addTuningRecord = (recordId: string, tuning: Omit<TuningRecord, 'id' | 'createdAt'> & { phonemeDeviations?: PhonemeDeviation[] }): HandpanRecord | null => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === recordId);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  const newTuning: TuningRecord = {
    ...tuning,
    id: generateTuningId(),
    createdAt: now,
    phonemeDeviations: tuning.phonemeDeviations,
  };

  records[index] = {
    ...records[index],
    lastTuningDate: tuning.date,
    deviationNote: tuning.deviationNote,
    tuningHistory: [...records[index].tuningHistory, newTuning],
    updatedAt: now,
  };
  saveRecords(records);
  return records[index];
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

export const createInitialTuningHistory = (record: Partial<HandpanRecord>, phonemeDeviations?: PhonemeDeviation[]): TuningRecord[] => {
  const now = new Date().toISOString();
  return [{
    id: generateTuningId(),
    date: record.lastTuningDate || new Date().toISOString().split('T')[0],
    deviationNote: record.deviationNote || '',
    beforeStatus: '',
    afterStatus: '',
    remark: '导入数据',
    createdAt: now,
    phonemeDeviations,
  }];
};

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
  const newRecords = validImportedRecords.map(record => {
    const migrated = migrateRecord(record);
    return {
      ...migrated,
      id: migrated.id || generateId(),
      createdAt: migrated.createdAt || now,
      updatedAt: now,
      tuningHistory: migrated.tuningHistory?.length > 0 
        ? migrated.tuningHistory 
        : createInitialTuningHistory(migrated, (record as any).phonemeDeviations),
      followUp: migrated.followUp,
    };
  });
  
  return [...existingRecords, ...newRecords];
};

export const initializeFollowUpData = (recordId: string): HandpanRecord | null => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === recordId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const followUpData: FollowUpData = {
    status: 'pending',
    lastContactDate: null,
    nextFollowUpDate: null,
    history: [],
  };

  records[index] = {
    ...records[index],
    followUp: followUpData,
    updatedAt: now,
  };

  saveRecords(records);
  return records[index];
};

export const addFollowUpRecord = (
  recordId: string,
  followUpData: Omit<FollowUpRecord, 'id' | 'recordId' | 'createdAt' | 'updatedAt'>,
  newStatus?: FollowUpStatus
): HandpanRecord | null => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === recordId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const newFollowUp: FollowUpRecord = {
    ...followUpData,
    id: generateFollowUpId(),
    recordId,
    createdAt: now,
    updatedAt: now,
  };

  const existingFollowUp = records[index].followUp;
  const history = existingFollowUp?.history || [];
  const updatedHistory = [...history, newFollowUp];

  let updatedStatus: FollowUpStatus = newStatus || 'pending';
  if (!newStatus) {
    if (followUpData.nextFollowUpDate) {
      updatedStatus = 'contacted';
    } else {
      const tempRecord: HandpanRecord = {
        ...records[index],
        followUp: {
          status: 'pending' as FollowUpStatus,
          lastContactDate: followUpData.contactDate,
          nextFollowUpDate: followUpData.nextFollowUpDate,
          history: updatedHistory,
        },
      };
      updatedStatus = getFollowUpStatus(tempRecord);
    }
  }

  const followUp: FollowUpData = {
    status: updatedStatus,
    lastContactDate: followUpData.contactDate,
    nextFollowUpDate: followUpData.nextFollowUpDate,
    history: updatedHistory,
  };

  records[index] = {
    ...records[index],
    followUp,
    updatedAt: now,
  };

  saveRecords(records);
  return records[index];
};

export const updateFollowUpStatus = (
  recordId: string,
  status: FollowUpStatus
): HandpanRecord | null => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === recordId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const existingFollowUp = records[index].followUp;

  const followUp: FollowUpData = {
    status,
    lastContactDate: existingFollowUp?.lastContactDate || null,
    nextFollowUpDate: existingFollowUp?.nextFollowUpDate || null,
    history: existingFollowUp?.history || [],
  };

  records[index] = {
    ...records[index],
    followUp,
    updatedAt: now,
  };

  saveRecords(records);
  return records[index];
};

export const updateFollowUpRecord = (
  recordId: string,
  followUpId: string,
  updates: Partial<Omit<FollowUpRecord, 'id' | 'recordId' | 'createdAt'>>
): HandpanRecord | null => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === recordId);
  if (index === -1) return null;

  const existingFollowUp = records[index].followUp;
  if (!existingFollowUp) return null;

  const now = new Date().toISOString();
  const historyIndex = existingFollowUp.history.findIndex(h => h.id === followUpId);
  if (historyIndex === -1) return null;

  const updatedHistory = [...existingFollowUp.history];
  updatedHistory[historyIndex] = {
    ...updatedHistory[historyIndex],
    ...updates,
    updatedAt: now,
  };

  const lastContact = updatedHistory.length > 0 
    ? updatedHistory.reduce((latest, h) => 
        new Date(h.contactDate) > new Date(latest.contactDate) ? h : latest
      )
    : null;

  const followUp: FollowUpData = {
    ...existingFollowUp,
    lastContactDate: lastContact?.contactDate || existingFollowUp.lastContactDate,
    nextFollowUpDate: updates.nextFollowUpDate !== undefined 
      ? updates.nextFollowUpDate 
      : existingFollowUp.nextFollowUpDate,
    history: updatedHistory,
  };

  records[index] = {
    ...records[index],
    followUp,
    updatedAt: now,
  };

  saveRecords(records);
  return records[index];
};

export const deleteFollowUpRecord = (
  recordId: string,
  followUpId: string
): HandpanRecord | null => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === recordId);
  if (index === -1) return null;

  const existingFollowUp = records[index].followUp;
  if (!existingFollowUp) return null;

  const now = new Date().toISOString();
  const updatedHistory = existingFollowUp.history.filter(h => h.id !== followUpId);

  const lastContact = updatedHistory.length > 0
    ? updatedHistory.reduce((latest, h) =>
        new Date(h.contactDate) > new Date(latest.contactDate) ? h : latest
      )
    : null;

  const followUp: FollowUpData = {
    ...existingFollowUp,
    lastContactDate: lastContact?.contactDate || null,
    nextFollowUpDate: lastContact?.nextFollowUpDate || null,
    history: updatedHistory,
  };

  records[index] = {
    ...records[index],
    followUp,
    updatedAt: now,
  };

  saveRecords(records);
  return records[index];
};
