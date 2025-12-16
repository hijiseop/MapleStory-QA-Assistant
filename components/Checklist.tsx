import React, { useMemo } from 'react';
import { ChecklistItem } from '../types';
import { CheckCircle2, Circle, AlertCircle, Flame, History as HistoryIcon } from 'lucide-react';

interface ChecklistProps {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
}

const Checklist: React.FC<ChecklistProps> = ({ items, onToggle }) => {
  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    items.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400">
        <AlertCircle size={48} className="mb-2 opacity-20" />
        <p>체크리스트가 비어있습니다.</p>
      </div>
    );
  }

  const getSourceIcon = (source: ChecklistItem['source']) => {
    switch (source) {
      case 'Community':
        return <Flame size={14} className="text-red-500" fill="currentColor" />;
      case 'History':
        return <HistoryIcon size={14} className="text-blue-500" />;
      default:
        return null; // Logic implies default/none
    }
  };

  const getSourceBadge = (source: ChecklistItem['source']) => {
    switch (source) {
      case 'Community':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200">
            <Flame size={10} fill="currentColor" /> INVEN 핫이슈
          </span>
        );
      case 'History':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-200">
            <HistoryIcon size={10} /> 재발 방지
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([category, tasks]: [string, ChecklistItem[]]) => (
        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-orange-50 px-4 py-2 border-b border-orange-100 flex justify-between items-center">
            <h3 className="font-bold text-orange-800 text-sm">{category}</h3>
            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
              {tasks.filter(t => t.isCompleted).length} / {tasks.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {tasks.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onToggle(item.id)}
                className={`group flex items-start p-4 cursor-pointer transition-colors duration-200 hover:bg-gray-50 ${item.isCompleted ? 'bg-gray-50/50' : ''}`}
              >
                <div className="flex-shrink-0 mt-0.5 mr-3">
                  {item.isCompleted ? (
                    <CheckCircle2 className="text-green-500 w-5 h-5" />
                  ) : (
                    <Circle className="text-gray-300 group-hover:text-orange-400 w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                      {getSourceBadge(item.source)}
                   </div>
                   <div className={`text-sm ${item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {item.task}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Checklist;