import { useState, useEffect } from 'react';
import { Edit3, Save, X, Info } from 'lucide-react';
import type { PhonemeDeviation } from '@/types/record';

interface PhonemeDeviationTableProps {
  mode: 'edit' | 'view';
  deviations: PhonemeDeviation[];
  onChange?: (deviations: PhonemeDeviation[]) => void;
  noteCount: number;
  defaultNames?: string[];
  onNamesChange?: (names: string[]) => void;
}

export function PhonemeDeviationTable({ 
  mode, 
  deviations, 
  onChange, 
  noteCount,
  defaultNames,
  onNamesChange 
}: PhonemeDeviationTableProps) {
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (deviations.length !== noteCount && onChange && defaultNames) {
      const padded: PhonemeDeviation[] = [];
      for (let i = 0; i < noteCount; i++) {
        if (deviations[i]) {
          padded.push({
            ...deviations[i],
            name: deviations[i].name || defaultNames[i] || `音位 ${i}`,
          });
        } else {
          padded.push({
            name: defaultNames[i] || `音位 ${i}`,
            beforeDeviation: null,
            afterDeviation: null,
            remark: '',
          });
        }
      }
      onChange(padded);
    }
  }, [noteCount]);

  const handleDeviationChange = (index: number, field: 'beforeDeviation' | 'afterDeviation' | 'remark', value: string) => {
    if (!onChange) return;
    
    const newDeviations = [...deviations];
    if (field === 'remark') {
      newDeviations[index] = { ...newDeviations[index], [field]: value };
    } else {
      const numValue = value === '' ? null : parseFloat(value);
      newDeviations[index] = { ...newDeviations[index], [field]: numValue };
    }
    onChange(newDeviations);
  };

  const handleNameEditStart = (index: number) => {
    setEditingNameIndex(index);
    setEditingName(deviations[index].name);
  };

  const handleNameSave = () => {
    if (editingNameIndex === null || !onChange || !onNamesChange) return;
    
    const trimmedName = editingName.trim();
    if (trimmedName) {
      const newDeviations = [...deviations];
      newDeviations[editingNameIndex] = { ...newDeviations[editingNameIndex], name: trimmedName };
      onChange(newDeviations);
      
      const newNames = newDeviations.map(d => d.name);
      onNamesChange(newNames);
    }
    setEditingNameIndex(null);
    setEditingName('');
  };

  const handleNameCancel = () => {
    setEditingNameIndex(null);
    setEditingName('');
  };

  const getDeviationColor = (value: number | null) => {
    if (value === null) return 'text-ink-400';
    const abs = Math.abs(value);
    if (abs <= 5) return 'text-green-600';
    if (abs <= 15) return 'text-amber-600';
    return 'text-red-600';
  };

  const getDeviationBgColor = (value: number | null) => {
    if (value === null) return 'bg-white';
    const abs = Math.abs(value);
    if (abs <= 5) return 'bg-green-50';
    if (abs <= 15) return 'bg-amber-50';
    return 'bg-red-50';
  };

  const formatDeviation = (value: number | null) => {
    if (value === null) return '-';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}`;
  };

  const getDeviationDiff = (d: PhonemeDeviation) => {
    if (d.beforeDeviation === null || d.afterDeviation === null) return null;
    return d.afterDeviation - d.beforeDeviation;
  };

  if (mode === 'view') {
    const hasData = deviations.some(d => 
      d.beforeDeviation !== null || 
      d.afterDeviation !== null || 
      d.remark
    );
    
    if (!hasData) {
      return (
        <div className="text-center py-6 text-ink-400 text-sm">
          本次调音无音位偏差记录
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-clay-200">
              <th className="text-left py-2 px-3 font-medium text-ink-500 bg-clay-50">音位</th>
              <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">调音前</th>
              <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">调音后</th>
              <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">变化量</th>
              <th className="text-left py-2 px-3 font-medium text-ink-500 bg-clay-50">备注</th>
            </tr>
          </thead>
          <tbody>
            {deviations.map((d, index) => {
              const diff = getDeviationDiff(d);
              const hasAnyData = d.beforeDeviation !== null || d.afterDeviation !== null || d.remark;
              if (!hasAnyData) return null;
              
              return (
                <tr key={index} className="border-b border-clay-100 hover:bg-clay-50/50">
                  <td className="py-2 px-3 font-medium text-ink-600">
                    {index === 0 && <span className="text-brass-600 mr-1">★</span>}
                    {d.name}
                  </td>
                  <td className={`py-2 px-3 text-center font-mono ${getDeviationColor(d.beforeDeviation)}`}>
                    {formatDeviation(d.beforeDeviation)}
                  </td>
                  <td className={`py-2 px-3 text-center font-mono ${getDeviationColor(d.afterDeviation)}`}>
                    {formatDeviation(d.afterDeviation)}
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {diff === null ? '-' : (
                      <span className={diff === 0 ? 'text-ink-400' : (diff < 0 ? 'text-blue-600' : 'text-purple-600')}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-ink-500">
                    {d.remark || <span className="text-ink-300">-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 flex items-center gap-4 text-xs text-ink-400">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span>≤5 音分（优秀）</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500"></span>
            <span>6-15 音分（良好）</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            <span>&gt;15 音分（需注意）</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-ink-400">
        <Info className="w-3.5 h-3.5" />
        <span>偏差单位：音分（cent）。正值表示偏高，负值表示偏低。</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-clay-200">
              <th className="text-left py-2 px-2 font-medium text-ink-500 bg-clay-50 min-w-[120px]">音位名称</th>
              <th className="text-center py-2 px-2 font-medium text-ink-500 bg-clay-50 min-w-[100px]">调音前偏差</th>
              <th className="text-center py-2 px-2 font-medium text-ink-500 bg-clay-50 min-w-[100px]">调音后偏差</th>
              <th className="text-left py-2 px-2 font-medium text-ink-500 bg-clay-50 min-w-[150px]">备注</th>
            </tr>
          </thead>
          <tbody>
            {deviations.map((d, index) => (
              <tr key={index} className={`border-b border-clay-100 ${index === 0 ? 'bg-brass-50/30' : ''}`}>
                <td className="py-2 px-2">
                  {editingNameIndex === index ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-clay-300 rounded focus:outline-none focus:ring-2 focus:ring-brass-200"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameSave();
                          if (e.key === 'Escape') handleNameCancel();
                        }}
                      />
                      <button
                        onClick={handleNameSave}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNameCancel}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {index === 0 && <span className="text-brass-600">★</span>}
                      <span className="font-medium text-ink-600">{d.name}</span>
                      {onNamesChange && (
                        <button
                          onClick={() => handleNameEditStart(index)}
                          className="p-0.5 text-ink-300 hover:text-ink-500 hover:bg-clay-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className={`py-2 px-2 ${getDeviationBgColor(d.beforeDeviation)}`}>
                  <input
                    type="number"
                    step="0.1"
                    value={d.beforeDeviation === null ? '' : d.beforeDeviation}
                    onChange={(e) => handleDeviationChange(index, 'beforeDeviation', e.target.value)}
                    placeholder="0.0"
                    className={`w-full px-2 py-1 text-center text-sm border border-clay-200 rounded focus:outline-none focus:ring-2 focus:ring-brass-200 font-mono ${getDeviationColor(d.beforeDeviation)} bg-transparent`}
                  />
                </td>
                <td className={`py-2 px-2 ${getDeviationBgColor(d.afterDeviation)}`}>
                  <input
                    type="number"
                    step="0.1"
                    value={d.afterDeviation === null ? '' : d.afterDeviation}
                    onChange={(e) => handleDeviationChange(index, 'afterDeviation', e.target.value)}
                    placeholder="0.0"
                    className={`w-full px-2 py-1 text-center text-sm border border-clay-200 rounded focus:outline-none focus:ring-2 focus:ring-brass-200 font-mono ${getDeviationColor(d.afterDeviation)} bg-transparent`}
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={d.remark}
                    onChange={(e) => handleDeviationChange(index, 'remark', e.target.value)}
                    placeholder="备注说明"
                    className="w-full px-2 py-1 text-sm border border-clay-200 rounded focus:outline-none focus:ring-2 focus:ring-brass-200"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 text-xs text-ink-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500"></span>
          <span>≤5 音分（优秀）</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500"></span>
          <span>6-15 音分（良好）</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500"></span>
          <span>&gt;15 音分（需注意）</span>
        </div>
      </div>
    </div>
  );
}
