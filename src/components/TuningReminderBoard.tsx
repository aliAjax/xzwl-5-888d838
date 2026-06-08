import { AlertCircle, Clock, CheckCircle2, Bell } from 'lucide-react';
import type { HandpanRecord, FilterState, ReminderType } from '@/types/record';
import { calculateReminders, getDaysDiff, getLatestTuningDate } from '@/types/record';

interface TuningReminderBoardProps {
  records: HandpanRecord[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onSelectView?: (viewId: string | null) => void;
}

const getIcon = (type: ReminderType) => {
  switch (type) {
    case 'pending-review':
      return AlertCircle;
    case 'upcoming-due':
      return Clock;
    case 'recently-completed':
      return CheckCircle2;
    default:
      return Bell;
  }
};

export function TuningReminderBoard({ records, filters, onFilterChange, onSelectView }: TuningReminderBoardProps) {
  const reminders = calculateReminders(records);
  const totalCount = reminders.reduce((sum, r) => sum + r.count, 0);

  const handleReminderClick = (type: ReminderType) => {
    onSelectView?.(null);
    if (filters.reminderType === type) {
      onFilterChange({ ...filters, reminderType: '', deliveryStatus: '' });
    } else {
      switch (type) {
        case 'pending-review':
          onFilterChange({ ...filters, reminderType: type, deliveryStatus: 'completed', mode: '', search: '' });
          break;
        case 'upcoming-due':
          onFilterChange({ ...filters, reminderType: type, deliveryStatus: 'delivered', mode: '', search: '' });
          break;
        case 'recently-completed':
          onFilterChange({ ...filters, reminderType: type, deliveryStatus: 'delivered', mode: '', search: '' });
          break;
      }
    }
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-clay-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-clay-500" />
          <span className="font-semibold text-ink-500">调音提醒</span>
          <span className="text-xs text-ink-400">点击可筛选对应记录</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {reminders.map((reminder) => {
            const Icon = getIcon(reminder.category.type);
            const isActive = filters.reminderType === reminder.category.type;
            const isDisabled = reminder.count === 0;

            return (
              <button
                key={reminder.category.type}
                onClick={() => !isDisabled && handleReminderClick(reminder.category.type)}
                disabled={isDisabled}
                className={`
                  relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-200
                  ${isDisabled
                    ? `${reminder.category.bgColor} ${reminder.category.borderColor} opacity-40 cursor-not-allowed`
                    : isActive
                      ? `${reminder.category.bgColor} ${reminder.category.borderColor} ring-2 ring-offset-2 ring-${reminder.category.type === 'pending-review' ? 'amber' : reminder.category.type === 'upcoming-due' ? 'rose' : 'emerald'}-400 shadow-md scale-[1.02]`
                      : `bg-white border-clay-200 hover:${reminder.category.bgColor} hover:${reminder.category.borderColor} hover:shadow-md hover:-translate-y-0.5 cursor-pointer`
                  }
                `}
              >
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                  ${reminder.category.bgColor} ${reminder.category.borderColor} border
                `}>
                  <Icon className={`w-6 h-6 ${reminder.category.iconColor}`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${reminder.category.color}`}>
                      {reminder.category.label}
                    </span>
                    <span className={`
                      inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold
                      ${reminder.count > 0 ? `${reminder.category.bgColor} ${reminder.category.color}` : 'bg-gray-100 text-gray-400'}
                    `}>
                      {reminder.count}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5 truncate">
                    {reminder.category.description}
                  </p>
                  {reminder.count > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {reminder.records.slice(0, 3).map((record) => {
                        const latestTuningDate = getLatestTuningDate(record);
                        const days = getDaysDiff(latestTuningDate);
                        return (
                          <span
                            key={record.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white/80 text-ink-500 border border-clay-100"
                          >
                            {record.serialNumber}
                            {reminder.category.type !== 'pending-review' && (
                              <span className="ml-1 text-ink-400">({days}天)</span>
                            )}
                          </span>
                        );
                      })}
                      {reminder.count > 3 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white/80 text-ink-400">
                          +{reminder.count - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {filters.reminderType && (
          <div className="mt-4 pt-4 border-t border-clay-100 flex items-center gap-2">
            <span className="text-xs text-ink-400">当前筛选：</span>
            <span className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
              ${filters.reminderType === 'pending-review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                filters.reminderType === 'upcoming-due' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'}
            `}>
              {reminders.find(r => r.category.type === filters.reminderType)?.category.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
