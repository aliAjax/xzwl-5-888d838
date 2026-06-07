import { Plus } from 'lucide-react';

interface FloatingButtonProps {
  onClick: () => void;
}

export function FloatingButton({ onClick }: FloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-brass-400 to-brass-600 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100 transition-all duration-300 flex items-center justify-center group"
      aria-label="新增记录"
    >
      <Plus className="w-7 h-7 transition-transform duration-300 group-hover:rotate-90" />
      <span className="absolute right-full mr-3 px-3 py-1.5 bg-ink-500 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        新增记录
      </span>
    </button>
  );
}
