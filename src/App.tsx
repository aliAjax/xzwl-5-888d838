import { useState, useRef, useEffect } from 'react';
import type { HandpanRecord, FilterState, TuningRecord, DeliveryStatus } from '@/types/record';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { TuningReminderBoard } from '@/components/TuningReminderBoard';
import { RecordList } from '@/components/RecordList';
import { RecordForm } from '@/components/RecordForm';
import { RecordDetail } from '@/components/RecordDetail';
import { FloatingButton } from '@/components/FloatingButton';
import { ImportPreview } from '@/components/ImportPreview';
import { DeliveryOrder } from '@/components/DeliveryOrder';
import { ModeManager } from '@/components/ModeManager';
import { TuningWorkbench } from '@/components/TuningWorkbench';
import { parseImportData, analyzeImportData, mergeImportedRecords, migrateRecords, generateTuningId, type ImportAnalysis } from '@/utils/storage';
import { removeTasksByRecordId, cleanupInvalidTasks } from '@/utils/workbenchStorage';

const STORAGE_KEY = 'handpan_records';

const createSampleTuning = (date: string, note: string, before: string, after: string, remark: string): TuningRecord => ({
  id: generateTuningId(),
  date,
  deviationNote: note,
  beforeStatus: before,
  afterStatus: after,
  remark,
  createdAt: new Date(date).toISOString(),
});

const SAMPLE_RECORDS: HandpanRecord[] = [
  {
    id: 'sample-1',
    serialNumber: 'HP-2026-001',
    mode: 'D Kurd',
    noteCount: 9,
    lastTuningDate: '2026-05-20',
    deviationNote: 'Ding 音偏低 5 音分，已校准至标准音高。D3 音共振良好，无需调整。',
    customerNickname: '小李',
    deliveryStatus: 'delivered',
    createdAt: '2026-05-15T10:00:00Z',
    updatedAt: '2026-05-20T14:30:00Z',
    tuningHistory: [
      createSampleTuning('2026-05-10', '初检发现 Ding 音偏低 10 音分，D3 音偏高 3 音分', '整体音准偏差较大，音色发紧', '校准 Ding 音和 D3 音，音准恢复正常', '首次调音完成'),
      createSampleTuning('2026-05-20', 'Ding 音偏低 5 音分，已校准至标准音高。D3 音共振良好，无需调整。', 'Ding 音略有回落，其他音位稳定', '微调 Ding 音至标准音高', '复查调音'),
    ],
  },
  {
    id: 'sample-2',
    serialNumber: 'HP-2026-002',
    mode: 'C# Amara',
    noteCount: 10,
    lastTuningDate: '2026-06-01',
    deviationNote: '低八度区整体偏紧，放松了 3 个音位。整体音色更加圆润。',
    customerNickname: '老王',
    deliveryStatus: 'completed',
    createdAt: '2026-05-28T09:00:00Z',
    updatedAt: '2026-06-01T16:00:00Z',
    tuningHistory: [
      createSampleTuning('2026-06-01', '低八度区整体偏紧，放松了 3 个音位。整体音色更加圆润。', '低八度区音色偏硬，响应不够灵敏', '放松 3 个低音音位，音色更加通透', '首次调音'),
    ],
  },
  {
    id: 'sample-3',
    serialNumber: 'HP-2026-003',
    mode: 'E Low Pygmy',
    noteCount: 8,
    lastTuningDate: '2026-04-05',
    deviationNote: '',
    customerNickname: '小张',
    deliveryStatus: 'delivered',
    createdAt: '2026-04-01T11:00:00Z',
    updatedAt: '2026-04-05T10:00:00Z',
    tuningHistory: [
      createSampleTuning('2026-04-05', '', '音准良好，无需调整', '保持原样', '例行检查'),
    ],
  },
  {
    id: 'sample-4',
    serialNumber: 'HP-2026-004',
    mode: 'D Celtic',
    noteCount: 9,
    lastTuningDate: '2026-04-10',
    deviationNote: '',
    customerNickname: '阿花',
    deliveryStatus: 'delivered',
    createdAt: '2026-04-05T14:00:00Z',
    updatedAt: '2026-04-10T14:00:00Z',
    tuningHistory: [
      createSampleTuning('2026-04-10', '', '新琴首次调音', '标准音高调校完成', '首次调音'),
    ],
  },
  {
    id: 'sample-5',
    serialNumber: 'HP-2026-005',
    mode: 'F# Hijaz',
    noteCount: 11,
    lastTuningDate: '2026-05-15',
    deviationNote: '高音区泛音丰富，调整了 Ding 音的谐波。',
    customerNickname: '老刘',
    deliveryStatus: 'completed',
    createdAt: '2026-05-10T10:00:00Z',
    updatedAt: '2026-05-15T11:00:00Z',
    tuningHistory: [
      createSampleTuning('2026-05-15', '高音区泛音丰富，调整了 Ding 音的谐波。', '高音区略亮，Ding 音谐波偏多', '微调 Ding 音，使整体音色更平衡', '首次调音'),
    ],
  },
  {
    id: 'sample-6',
    serialNumber: 'HP-2026-006',
    mode: 'G Golden Gate',
    noteCount: 9,
    lastTuningDate: '2026-06-05',
    deviationNote: '',
    customerNickname: '小陈',
    deliveryStatus: 'in-progress',
    createdAt: '2026-06-03T09:00:00Z',
    updatedAt: '2026-06-04T15:00:00Z',
    tuningHistory: [
      createSampleTuning('2026-06-05', '', '粗调完成，待精调', '', '进行中'),
    ],
  },
];

function App() {
  const [records, setRecords] = useLocalStorage<HandpanRecord[]>(STORAGE_KEY, SAMPLE_RECORDS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HandpanRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<HandpanRecord | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    mode: '',
    deliveryStatus: '',
    search: '',
    reminderType: '',
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [deliveryRecord, setDeliveryRecord] = useState<HandpanRecord | null>(null);
  const [isModeManagerOpen, setIsModeManagerOpen] = useState(false);
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const migrated = migrateRecords(records);
    const hasChanges = migrated.some((r, i) => JSON.stringify(r) !== JSON.stringify(records[i]));
    if (hasChanges) {
      setRecords(migrated);
    }
  }, []);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: HandpanRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (record: HandpanRecord) => {
    setDetailRecord(record);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setDetailRecord(null);
  };

  const handleAddTuning = (recordId: string, tuning: Omit<TuningRecord, 'id' | 'createdAt'>) => {
    setRecords(prev => {
      return prev.map(record => {
        if (record.id !== recordId) return record;
        
        const now = new Date().toISOString();
        const newTuning: TuningRecord = {
          ...tuning,
          id: generateTuningId(),
          createdAt: now,
        };
        
        return {
          ...record,
          lastTuningDate: tuning.date,
          deviationNote: tuning.deviationNote,
          tuningHistory: [...record.tuningHistory, newTuning],
          updatedAt: now,
        };
      });
    });
    if (detailRecord && detailRecord.id === recordId) {
      setDetailRecord(prev => {
        if (!prev) return null;
        const now = new Date().toISOString();
        const newTuning: TuningRecord = {
          ...tuning,
          id: generateTuningId(),
          createdAt: now,
        };
        return {
          ...prev,
          lastTuningDate: tuning.date,
          deviationNote: tuning.deviationNote,
          tuningHistory: [...prev.tuningHistory, newTuning],
          updatedAt: now,
        };
      });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  const handleSave = (record: HandpanRecord) => {
    if (editingRecord) {
      setRecords(prev => 
        prev.map(r => (r.id === record.id ? record : r))
      );
    } else {
      setRecords(prev => [...prev, record]);
    }
  };

  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    removeTasksByRecordId(id);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedRecords = parseImportData(content);
        const analysis = analyzeImportData(parsedRecords, records);
        
        setImportAnalysis(analysis);
        setImportFileName(file.name);
        setIsImportOpen(true);
      } catch (error) {
        alert(error instanceof Error ? error.message : '文件解析失败，请检查文件格式');
      }
    };
    reader.onerror = () => {
      alert('文件读取失败');
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseImport = () => {
    setIsImportOpen(false);
    setImportAnalysis(null);
    setImportFileName('');
  };

  const handleConfirmImport = () => {
    if (!importAnalysis) return;
    
    const mergedRecords = mergeImportedRecords(records, importAnalysis.valid);
    setRecords(mergedRecords);
    
    setTimeout(() => {
      const validIds = mergedRecords.map(r => r.id);
      const deliveredIds = mergedRecords.filter(r => r.deliveryStatus === 'delivered').map(r => r.id);
      cleanupInvalidTasks(validIds, deliveredIds);
    }, 0);
    
    alert(`成功导入 ${importAnalysis.valid.length} 条记录`);
    handleCloseImport();
  };

  const handleOpenDelivery = (record: HandpanRecord) => {
    setDeliveryRecord(record);
    setIsDeliveryOpen(true);
  };

  const handleCloseDelivery = () => {
    setIsDeliveryOpen(false);
    setDeliveryRecord(null);
  };

  const handleOpenModeManager = () => {
    setIsModeManagerOpen(true);
  };

  const handleCloseModeManager = () => {
    setIsModeManagerOpen(false);
  };

  const handleOpenWorkbench = () => {
    setIsWorkbenchOpen(true);
  };

  const handleCloseWorkbench = () => {
    setIsWorkbenchOpen(false);
  };

  const handleUpdateRecordStatus = (recordId: string, status: DeliveryStatus) => {
    setRecords(prev => 
      prev.map(r => r.id === recordId ? { ...r, deliveryStatus: status, updatedAt: new Date().toISOString() } : r)
    );
    if (detailRecord && detailRecord.id === recordId) {
      setDetailRecord(prev => prev ? { ...prev, deliveryStatus: status, updatedAt: new Date().toISOString() } : null);
    }
  };

  const handleOpenTuningHistoryFromWorkbench = (record: HandpanRecord) => {
    setIsWorkbenchOpen(false);
    setTimeout(() => {
      setDetailRecord(record);
      setIsDetailOpen(true);
    }, 300);
  };

  return (
    <div className="min-h-screen pb-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Header onImportClick={handleImportClick} onModeManagerClick={handleOpenModeManager} />
      <FilterBar filters={filters} onFilterChange={setFilters} records={records} onOpenWorkbench={handleOpenWorkbench} />
      <TuningReminderBoard records={records} filters={filters} onFilterChange={setFilters} />
      <RecordList 
        records={records} 
        filters={filters} 
        onEdit={handleOpenEdit} 
        onDelete={handleDelete}
        onGenerateDelivery={handleOpenDelivery}
        onViewDetail={handleOpenDetail}
      />
      <FloatingButton onClick={handleOpenAdd} />
      <RecordForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        editingRecord={editingRecord}
      />
      <ImportPreview
        isOpen={isImportOpen}
        onClose={handleCloseImport}
        onConfirm={handleConfirmImport}
        analysis={importAnalysis}
        fileName={importFileName}
      />
      <DeliveryOrder
        isOpen={isDeliveryOpen}
        onClose={handleCloseDelivery}
        record={deliveryRecord}
      />
      <ModeManager
        isOpen={isModeManagerOpen}
        onClose={handleCloseModeManager}
      />
      <RecordDetail
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        record={detailRecord}
        onAddTuning={handleAddTuning}
      />
      <TuningWorkbench
        isOpen={isWorkbenchOpen}
        onClose={handleCloseWorkbench}
        records={records}
        onViewTuningHistory={handleOpenTuningHistoryFromWorkbench}
        onUpdateRecordStatus={handleUpdateRecordStatus}
      />
    </div>
  );
}

export default App;
