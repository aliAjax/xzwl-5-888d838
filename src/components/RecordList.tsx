import { Music2 } from 'lucide-react';
import type { HandpanRecord, FilterState } from '@/types/record';
import { RecordCard } from './RecordCard';

interface RecordListProps {
  records: HandpanRecord[];
  filters: FilterState;
  onEdit: (record: HandpanRecord) => void;
  onDelete: (id: string) => void;
}

export function RecordList({ records, filters, onEdit, onDelete }: RecordListProps) {
  const filteredRecords = records.filter((record) => {
    const matchesMode = !filters.mode || record.mode === filters.mode;
    const matchesStatus = !filters.deliveryStatus || record.deliveryStatus === filters.deliveryStatus;
    const matchesSearch = !filters.search || 
      record.serialNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
      record.customerNickname.toLowerCase().includes(filters.search.toLowerCase()) ||
      record.mode.toLowerCase().includes(filters.search.toLowerCase());
    return matchesMode && matchesStatus && matchesSearch;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  if (records.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-6">
            <Music2 className="w-10 h-10 text-clay-400" />
          </div>
          <h3 className="text-xl font-semibold text-ink-500 mb-2">还没有记录</h3>
          <p className="text-ink-400 max-w-sm mx-auto">
            点击右下角的加号按钮，添加您的第一只手碟调音记录
          </p>
        </div>
      </div>
    );
  }

  if (sortedRecords.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-6">
            <Music2 className="w-10 h-10 text-clay-400" />
          </div>
          <h3 className="text-xl font-semibold text-ink-500 mb-2">没有匹配的记录</h3>
          <p className="text-ink-400 max-w-sm mx-auto">
            尝试清除筛选条件，或者调整筛选参数
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      <div className="mb-4 text-sm text-ink-400">
        共 {sortedRecords.length} 条记录 {filters.mode || filters.deliveryStatus || filters.search ? '(已筛选)' : ''}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedRecords.map((record, index) => (
          <RecordCard
            key={record.id}
            record={record}
            onEdit={onEdit}
            onDelete={onDelete}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
