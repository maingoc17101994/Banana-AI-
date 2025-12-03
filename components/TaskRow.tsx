import React, { useRef } from 'react';
import { Trash2, Play, AlertCircle, CheckCircle, Image as ImageIcon, ChevronDown, ChevronUp, Loader2, PlusCircle, Zap, Diamond } from 'lucide-react';
import { Task, TaskStatus, AspectRatio, AIModel } from '../types';
import Popover from './Popover';

interface TaskRowProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  onAddBelow: (id: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onUpdate, onDelete, onRun, onAddBelow }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = React.useState(task.outputImages.length > 0);

  // Tự động mở rộng khi có kết quả mới
  React.useEffect(() => {
    if (task.status === TaskStatus.DONE && task.outputImages.length > 0) {
      setExpanded(true);
    }
  }, [task.status, task.outputImages.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(task.id, { refImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE: return 'text-green-500 bg-green-50 border-green-200';
      case TaskStatus.ERROR: return 'text-red-500 bg-red-50 border-red-200';
      case TaskStatus.RUNNING: return 'text-blue-500 bg-blue-50 border-blue-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  // Helper xác định hiển thị badge model
  const isProModel = task.baseModel === AIModel.NANO_BANANA_PRO;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-3 transition-all hover:shadow-md">
      {/* Row Layout */}
      <div className="flex flex-wrap items-start p-3 gap-3 md:flex-nowrap items-center">
        
        {/* Cột 1: Checkbox */}
        <div className="w-8 flex justify-center pt-2 md:pt-0">
          <input
            type="checkbox"
            checked={task.selected}
            onChange={(e) => onUpdate(task.id, { selected: e.target.checked })}
            className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500 cursor-pointer"
          />
        </div>

        {/* Cột 2: Ref Image */}
        <div className="w-12 md:w-16 flex flex-col items-center pt-1 md:pt-0">
          <div 
            className="w-12 h-12 rounded border border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-yellow-400 transition-colors relative group"
            onClick={() => fileInputRef.current?.click()}
          >
            {task.refImage ? (
              <img src={task.refImage} alt="Ref" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={20} className="text-gray-400" />
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
            {/* Tooltip hint */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all"></div>
          </div>
        </div>

        {/* Cột 3: Prompt */}
        <div className="flex-grow min-w-[200px]">
          <textarea
            value={task.prompt}
            onChange={(e) => onUpdate(task.id, { prompt: e.target.value })}
            placeholder="Nhập mô tả ảnh..."
            className="w-full h-12 p-2 text-sm border border-gray-200 rounded-md focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 resize-none"
          />
        </div>

        {/* Cột 4: Size */}
        <div className="w-32 md:w-40 pt-1 md:pt-0">
          <select
            value={task.ratio}
            onChange={(e) => onUpdate(task.id, { ratio: e.target.value as AspectRatio })}
            className="w-full p-2 text-sm border border-gray-200 rounded-md bg-white focus:border-yellow-500 outline-none"
          >
            <option value={AspectRatio.SQUARE}>1:1 (Square)</option>
            <option value={AspectRatio.PORTRAIT}>3:4 (Portrait)</option>
            <option value={AspectRatio.LANDSCAPE}>4:3 (Landscape)</option>
            <option value={AspectRatio.WIDE}>16:9 (Wide)</option>
            <option value={AspectRatio.TALL}>9:16 (Stories)</option>
          </select>
        </div>

        {/* Cột 5: Settings (Popover & Model Badge) */}
        <div className="pt-1 md:pt-0 flex flex-col items-center gap-1 min-w-[60px]">
          <Popover content={
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Model AI</label>
                <select 
                  value={task.baseModel}
                  onChange={(e) => onUpdate(task.id, { baseModel: e.target.value as AIModel })}
                  className="w-full p-2 text-sm border border-gray-200 rounded-md"
                >
                  <option value={AIModel.NANO_BANANA}>Nano Banana (Fast/Free)</option>
                  <option value={AIModel.NANO_BANANA_PRO}>Nano Banana Pro (High-Q)</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  *Pro yêu cầu API Key mạnh hơn.
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Số lượng ảnh (Batch)</label>
                <input 
                  type="range" 
                  min="1" 
                  max="4" 
                  value={task.batchSize}
                  onChange={(e) => onUpdate(task.id, { batchSize: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span className="font-bold text-yellow-600">{task.batchSize}</span>
                  <span>4</span>
                </div>
              </div>
            </div>
          } />
          
          {/* Badge Model Indicator */}
          <div 
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 cursor-help ${
              isProModel 
                ? 'bg-purple-100 text-purple-700 border-purple-200' 
                : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}
            title={isProModel ? "Đang dùng model Pro (Cần API Key)" : "Đang dùng model Flash (Miễn phí)"}
          >
             {isProModel ? <Diamond size={8} /> : <Zap size={8} />}
             {isProModel ? 'PRO' : 'FLASH'}
          </div>
        </div>

        {/* Cột 6: Actions & Status */}
        <div className="flex items-center gap-1 min-w-[140px] justify-end pt-1 md:pt-0">
          {/* Status Icon */}
          <div className={`mr-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
             {task.status === TaskStatus.RUNNING && <Loader2 size={12} className="animate-spin" />}
             {task.status === TaskStatus.DONE && <CheckCircle size={12} />}
             {task.status === TaskStatus.ERROR && <AlertCircle size={12} />}
             {task.status === TaskStatus.PENDING && <span className="w-2 h-2 rounded-full bg-yellow-400"></span>}
             <span className="hidden sm:inline">{task.status === TaskStatus.RUNNING ? 'Running' : task.status}</span>
          </div>

          <button 
            onClick={() => onRun(task.id)}
            disabled={task.status === TaskStatus.RUNNING}
            className="p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-50 transition-colors"
            title="Chạy dòng này"
          >
            <Play size={18} />
          </button>
          
          <button 
            onClick={() => onAddBelow(task.id)}
            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
            title="Thêm dòng mới bên dưới"
          >
            <PlusCircle size={18} />
          </button>

          <button 
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Xóa dòng"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Error Message Display */}
      {task.errorMessage && (
        <div className="px-4 pb-2 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} />
          {task.errorMessage}
        </div>
      )}

      {/* Output Area (Expandable) */}
      {(task.outputImages.length > 0) && (
        <div className="border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span>Kết quả ({task.outputImages.length} ảnh)</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {expanded && (
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in zoom-in duration-300">
              {task.outputImages.map((img, idx) => (
                <div key={idx} className="group relative rounded-lg overflow-hidden border border-gray-200 shadow-sm aspect-square bg-white">
                  <img src={img} alt={`Output ${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <a 
                    href={img} 
                    download={`banana-ai-${task.id}-${idx}.png`}
                    className="absolute bottom-2 right-2 p-1.5 bg-white rounded-full shadow-md text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity hover:text-yellow-600"
                    title="Tải xuống"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskRow;