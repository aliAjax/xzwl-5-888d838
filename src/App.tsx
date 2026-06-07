import { useState, useRef } from 'react';
import type { HandpanRecord, FilterState } from '@/types/record';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { RecordList } from '@/components/RecordList';
import { RecordForm } from '@/components/RecordForm';
import { FloatingButton } from '@/components/FloatingButton';
import { ImportPreview } from '@/components/ImportPreview';
import { parseImportData, analyzeImportData, mergeImportedRecords, type ImportAnalysis } from '@/utils/storage';

const STORAGE_KEY = 'handpan_records';

const SAMPLE_RECORDS: HandpanRecord[] = [
  {
    id: 'sample-1',
    serialNumber: 'HP-2024-001',
    mode: 'D Kurd',
    noteCount: 9,
    lastTuningDate: '2024-01-15',
    deviationNote: 'Ding 音偏低 5 音分，已校准至标准音高。D3 音共振良好，无需调整。',
    customerNickname: '小李',
    deliveryStatus: 'delivered',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
  },
  {
    id: 'sample-2',
    serialNumber: 'HP-2024-002',
    mode: 'C# Amara',
    noteCount: 10,
    lastTuningDate: '2024-01-20',
    deviationNote: '低八度区整体偏紧，放松了 3 个音位。整体音色更加圆润。',
    customerNickname: '老王',
    deliveryStatus: 'completed',
    createdAt: '2024-01-18T09:00:00Z',
    updatedAt: '2024-01-20T16:00:00Z',
  },
  {
    id: 'sample-3',
    serialNumber: 'HP-2024-003',
    mode: 'E Low Pygmy',
    noteCount: 8,
    lastTuningDate: '2024-01-25',
    deviationNote: '',
    customerNickname: '小张',
    deliveryStatus: 'in-progress',
    createdAt: '2024-01-22T11:00:00Z',
    updatedAt: '2024-01-23T10:00:00Z',
  },
  {
    id: 'sample-4',
    serialNumber: 'HP-2024-004',
    mode: 'D Celtic',
    noteCount: 9,
    lastTuningDate: '2024-01-28',
    deviationNote: '',
    customerNickname: '阿花',
    deliveryStatus: 'pending',
    createdAt: '2024-01-26T14:00:00Z',
    updatedAt: '2024-01-26T14:00:00Z',
  },
];

function App() {
  const [records, setRecords] = useLocalStorage<HandpanRecord[]>(STORAGE_KEY, SAMPLE_RECORDS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HandpanRecord | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    mode: '',
    deliveryStatus: '',
    search: '',
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: HandpanRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
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
    
    alert(`成功导入 ${importAnalysis.valid.length} 条记录`);
    handleCloseImport();
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
      <Header onImportClick={handleImportClick} />
      <FilterBar filters={filters} onFilterChange={setFilters} />
      <RecordList 
        records={records} 
        filters={filters} 
        onEdit={handleOpenEdit} 
        onDelete={handleDelete} 
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
    </div>
  );
}

export default App;
