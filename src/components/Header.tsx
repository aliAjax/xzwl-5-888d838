import { Download, Upload, Music2 } from 'lucide-react';
import { downloadExport } from '@/utils/storage';

interface HeaderProps {
  onImportClick: () => void;
}

export function Header({ onImportClick }: HeaderProps) {
  const handleExport = () => {
    downloadExport();
  };

  return (
    <header className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-clay-400 to-clay-600 flex items-center justify-center shadow-lg">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-ink-500 tracking-tight">
                手碟调音记录
              </h1>
              <p className="text-sm text-ink-400 mt-0.5">
                Handpan Tuning Tracker
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={onImportClick}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>导入数据</span>
            </button>
            <button
              onClick={handleExport}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>导出数据</span>
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-brass-400 to-transparent opacity-60" />
      </div>
    </header>
  );
}
