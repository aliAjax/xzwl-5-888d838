import { Filter, Search, X } from 'lucide-react';
import type { FilterState, DeliveryStatus } from '@/types/record';
import { MODE_OPTIONS, DELIVERY_STATUS_OPTIONS } from '@/types/record';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const handleModeChange = (mode: string) => {
    onFilterChange({ ...filters, mode, reminderType: '' });
  };

  const handleStatusChange = (deliveryStatus: DeliveryStatus | '') => {
    onFilterChange({ ...filters, deliveryStatus, reminderType: '' });
  };

  const handleSearchChange = (search: string) => {
    onFilterChange({ ...filters, search, reminderType: '' });
  };

  const handleClear = () => {
    onFilterChange({ mode: '', deliveryStatus: '', search: '', reminderType: '' });
  };

  const hasActiveFilters = filters.mode || filters.deliveryStatus || filters.search || filters.reminderType;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-clay-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-clay-500" />
          <span className="font-semibold text-ink-500">筛选记录</span>
          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="ml-auto inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-500 transition-colors"
            >
              <X className="w-4 h-4" />
              清除筛选
            </button>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm text-ink-400 mb-1.5">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="搜索编号、客户昵称..."
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm text-ink-400 mb-1.5">调式</label>
            <select
              value={filters.mode}
              onChange={(e) => handleModeChange(e.target.value)}
              className="select-field"
            >
              <option value="">全部调式</option>
              {MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm text-ink-400 mb-1.5">交付状态</label>
            <select
              value={filters.deliveryStatus}
              onChange={(e) => handleStatusChange(e.target.value as DeliveryStatus | '')}
              className="select-field"
            >
              <option value="">全部状态</option>
              {DELIVERY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
