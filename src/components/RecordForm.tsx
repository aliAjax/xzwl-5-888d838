import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { HandpanRecord, DeliveryStatus, TuningRecord } from '@/types/record';
import { DELIVERY_STATUS_OPTIONS, getLatestTuning, getPhonemeNames } from '@/types/record';
import { generateId, generateTuningId } from '@/utils/storage';
import { getModeOptionsForForm, getModePhonemeTemplate } from '@/utils/modeStorage';

interface RecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: HandpanRecord) => void;
  editingRecord: HandpanRecord | null;
}

export function RecordForm({ isOpen, onClose, onSave, editingRecord }: RecordFormProps) {
  const [modeOptions, setModeOptions] = useState<string[]>([]);
  const [formData, setFormData] = useState<Omit<HandpanRecord, 'id' | 'createdAt' | 'updatedAt' | 'tuningHistory'>>({
    serialNumber: '',
    mode: '',
    noteCount: 9,
    lastTuningDate: new Date().toISOString().split('T')[0],
    deviationNote: '',
    customerNickname: '',
    deliveryStatus: 'pending',
    phonemeNames: ['Ding', '音位 1', '音位 2', '音位 3', '音位 4', '音位 5', '音位 6', '音位 7', '音位 8'],
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isPhonemeSectionOpen, setIsPhonemeSectionOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const activeModes = getModeOptionsForForm();
      let allOptions = [...activeModes];

      if (editingRecord && editingRecord.mode) {
        if (!allOptions.includes(editingRecord.mode)) {
          allOptions = [editingRecord.mode, ...allOptions];
        }
      }

      setModeOptions(allOptions);

      const defaultMode = editingRecord?.mode || activeModes[0] || '';

      if (editingRecord) {
        setFormData({
          serialNumber: editingRecord.serialNumber,
          mode: editingRecord.mode,
          noteCount: editingRecord.noteCount,
          lastTuningDate: editingRecord.lastTuningDate,
          deviationNote: editingRecord.deviationNote,
          customerNickname: editingRecord.customerNickname,
          deliveryStatus: editingRecord.deliveryStatus,
          phonemeNames: getPhonemeNames(editingRecord, editingRecord.noteCount),
        });
      } else {
        const template = getModePhonemeTemplate(defaultMode);
        const initialNoteCount = template ? template.noteCount : 9;
        const initialPhonemeNames = template ? template.phonemeNames : getPhonemeNames({} as HandpanRecord, 9);

        setFormData({
          serialNumber: '',
          mode: defaultMode,
          noteCount: initialNoteCount,
          lastTuningDate: new Date().toISOString().split('T')[0],
          deviationNote: '',
          customerNickname: '',
          deliveryStatus: 'pending',
          phonemeNames: initialPhonemeNames,
        });
      }
      setErrors({});
    }
  }, [editingRecord, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = '请输入编号';
    }
    if (!formData.customerNickname.trim()) {
      newErrors.customerNickname = '请输入客户昵称';
    }
    if (formData.noteCount < 1) {
      newErrors.noteCount = '音位数量必须大于0';
    }
    if (!formData.lastTuningDate) {
      newErrors.lastTuningDate = '请选择调音日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const now = new Date().toISOString();
    let tuningHistory: TuningRecord[] = editingRecord?.tuningHistory || [];

    if (tuningHistory.length === 0) {
      const initialTuning: TuningRecord = {
        id: generateTuningId(),
        date: formData.lastTuningDate,
        deviationNote: formData.deviationNote,
        beforeStatus: '',
        afterStatus: '',
        remark: editingRecord ? '历史数据迁移' : '首次调音',
        createdAt: now,
      };
      tuningHistory = [initialTuning];
    } else if (editingRecord) {
      const latestTuning = getLatestTuning(editingRecord);
      tuningHistory = tuningHistory.map(tuning =>
        tuning.id === latestTuning?.id
          ? {
              ...tuning,
              date: formData.lastTuningDate,
              deviationNote: formData.deviationNote,
            }
          : tuning
      );
    }

    const record: HandpanRecord = {
      ...formData,
      id: editingRecord?.id || generateId(),
      createdAt: editingRecord?.createdAt || now,
      updatedAt: now,
      tuningHistory,
    };

    onSave(record);
    onClose();
  };

  const handleChange = (field: keyof Omit<HandpanRecord, 'id' | 'createdAt' | 'updatedAt' | 'tuningHistory'>, value: string | number | string[]) => {
    if (field === 'noteCount') {
      const count = value as number;
      setFormData(prev => ({
        ...prev,
        noteCount: count,
        phonemeNames: getPhonemeNames(prev as HandpanRecord, count),
      }));
    } else if (field === 'mode') {
      const modeName = value as string;
      const template = getModePhonemeTemplate(modeName);
      if (template) {
        setFormData(prev => ({
          ...prev,
          mode: modeName,
          noteCount: template.noteCount,
          phonemeNames: template.phonemeNames,
        }));
      } else {
        setFormData(prev => ({ ...prev, mode: modeName }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhonemeNameChange = (index: number, value: string) => {
    setFormData(prev => {
      const newNames = [...(prev.phonemeNames || [])];
      newNames[index] = value;
      return { ...prev, phonemeNames: newNames };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture">
          <div className="flex items-center justify-between p-6 border-b border-clay-100">
            <h2 className="text-2xl font-bold text-ink-500">
              {editingRecord ? '编辑记录' : '新增记录'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  编号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                  placeholder="如 HP-2024-001"
                  className={`input-field ${errors.serialNumber ? 'border-red-300 focus:ring-red-200' : ''}`}
                />
                {errors.serialNumber && (
                  <p className="text-red-500 text-xs mt-1">{errors.serialNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  客户昵称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerNickname}
                  onChange={(e) => handleChange('customerNickname', e.target.value)}
                  placeholder="如 小李"
                  className={`input-field ${errors.customerNickname ? 'border-red-300 focus:ring-red-200' : ''}`}
                />
                {errors.customerNickname && (
                  <p className="text-red-500 text-xs mt-1">{errors.customerNickname}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  调式
                </label>
                <div className="relative">
                  <select
                    value={formData.mode}
                    onChange={(e) => handleChange('mode', e.target.value)}
                    className="select-field"
                  >
                    {modeOptions.map((mode) => {
                      const isEditingExisting = editingRecord && editingRecord.mode === mode;
                      const isActive = getModeOptionsForForm().includes(mode);
                      const hasTemplate = getModePhonemeTemplate(mode) !== null;
                      return (
                        <option
                          key={mode}
                          value={mode}
                          disabled={!isActive && !isEditingExisting}
                        >
                          {mode}{hasTemplate ? ' ✨' : ''}{!isActive ? ' (已停用)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {getModePhonemeTemplate(formData.mode) && (
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="w-4 h-4 text-brass-500" />
                    </div>
                  )}
                </div>
                {getModePhonemeTemplate(formData.mode) && !editingRecord && (
                  <p className="text-xs text-brass-600 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    已自动应用音位模板
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  音位数量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.noteCount}
                  onChange={(e) => handleChange('noteCount', parseInt(e.target.value) || 0)}
                  className={`input-field ${errors.noteCount ? 'border-red-300 focus:ring-red-200' : ''}`}
                />
                {errors.noteCount && (
                  <p className="text-red-500 text-xs mt-1">{errors.noteCount}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  最近调音日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.lastTuningDate}
                  onChange={(e) => handleChange('lastTuningDate', e.target.value)}
                  className={`input-field ${errors.lastTuningDate ? 'border-red-300 focus:ring-red-200' : ''}`}
                />
                {errors.lastTuningDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastTuningDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  交付状态
                </label>
                <select
                  value={formData.deliveryStatus}
                  onChange={(e) => handleChange('deliveryStatus', e.target.value as DeliveryStatus)}
                  className="select-field"
                >
                  {DELIVERY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-500 mb-1.5">
                偏音说明
              </label>
              <textarea
                value={formData.deviationNote}
                onChange={(e) => handleChange('deviationNote', e.target.value)}
                placeholder="记录调音过程中的偏音情况、校准说明等..."
                rows={3}
                className="input-field resize-none"
              />
            </div>

            <div className="border border-clay-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPhonemeSectionOpen(!isPhonemeSectionOpen)}
                className="w-full flex items-center justify-between p-4 bg-clay-50 hover:bg-clay-100 transition-colors"
              >
                <span className="font-medium text-ink-600">
                  音位命名 ({formData.noteCount} 个音位)
                </span>
                {isPhonemeSectionOpen ? (
                  <ChevronUp className="w-5 h-5 text-ink-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-ink-500" />
                )}
              </button>
              {isPhonemeSectionOpen && (
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                  {formData.phonemeNames?.map((name, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm text-ink-400 w-16 font-mono">
                        {index === 0 ? 'Ding' : `#${index}`}
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handlePhonemeNameChange(index, e.target.value)}
                        className="input-field flex-1"
                        placeholder={index === 0 ? 'Ding' : `音位 ${index}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-clay-100">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button type="submit" className="btn-primary">
                {editingRecord ? '保存修改' : '创建记录'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
