import React, { useState, useCallback, useRef } from 'react';
import { Plus, Play, FileSpreadsheet, Keyboard, UploadCloud, Info, Layers, CheckSquare, Key, ShieldCheck, FileText, Link as LinkIcon, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import TaskRow from './components/TaskRow';
import { Task, TaskStatus, AspectRatio, AIModel } from './types';
import { generateImageForTask } from './services/geminiService';

const App: React.FC = () => {
  // 1. Quản lý trạng thái (State Management) tương tự st.session_state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [globalSuffix, setGlobalSuffix] = useState<string>('');
  // Removed manual apiKey state
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  
  // State cho phần Import
  const [importText, setImportText] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // Helper: Tạo task mặc định
  const createNewTask = (partial?: Partial<Task>): Task => ({
    id: uuidv4(),
    selected: true,
    refImage: null,
    prompt: partial?.prompt || '',
    baseModel: AIModel.NANO_BANANA,
    ratio: AspectRatio.SQUARE,
    status: TaskStatus.PENDING,
    batchSize: 1,
    outputImages: []
  });

  // Action: Thêm dòng mới vào cuối
  const addNewRow = () => {
    setTasks(prev => [...prev, createNewTask()]);
  };

  // Action: Thêm dòng mới ngay bên dưới 1 dòng cụ thể
  const addRowBelow = (id: string) => {
    setTasks(prev => {
      const index = prev.findIndex(t => t.id === id);
      if (index === -1) return prev;
      
      const newTask = createNewTask();
      const newTasks = [...prev];
      newTasks.splice(index + 1, 0, newTask); // Chèn vào vị trí index + 1
      return newTasks;
    });
  };

  // Action: Cập nhật task
  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // Action: Xóa task
  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Action: Chọn tất cả / Bỏ chọn tất cả
  const toggleSelectAll = (checked: boolean) => {
    setTasks(prev => prev.map(t => ({ ...t, selected: checked })));
  };

  // Action: Chạy logic sinh ảnh cho 1 task (hàm helper trả về promise)
  const executeTaskLogic = async (task: Task) => {
    // Cập nhật state RUNNING
    updateTask(task.id, { status: TaskStatus.RUNNING, errorMessage: undefined });
    
    try {
      // Gọi service, không truyền API Key (service tự lấy process.env.API_KEY)
      const images = await generateImageForTask(task, globalSuffix);
      
      updateTask(task.id, { 
        status: TaskStatus.DONE, 
        outputImages: images 
      });
    } catch (error: any) {
      updateTask(task.id, { 
        status: TaskStatus.ERROR, 
        errorMessage: error.message || 'Lỗi không xác định khi gọi AI'
      });
    }
  };

  // Action: Chạy task đơn lẻ
  const runSingleTask = async (task: Task) => {
    if (isProcessing) return; // Prevent double click global conflict
    setIsProcessing(true);
    await executeTaskLogic(task);
    setIsProcessing(false);
  };

  // Action: Chạy tất cả các dòng đã chọn (TUẦN TỰ)
  // Thay đổi: Dùng vòng lặp for...of để chờ từng task xong mới chạy task tiếp theo
  // Giúp người dùng thấy ảnh xuất hiện lần lượt (như yêu cầu).
  const runSelected = async () => {
    if (isProcessing) return;
    
    const selectedTasks = tasks.filter(t => t.selected && t.status !== TaskStatus.RUNNING);
    if (selectedTasks.length === 0) return;

    setIsProcessing(true);

    for (const task of selectedTasks) {
      // Kiểm tra lại trong danh sách gốc xem task có bị xóa trong lúc chạy không?
      await executeTaskLogic(task);
    }

    setIsProcessing(false);
  };

  // Action: Chạy TẤT CẢ (Run All) - Không quan tâm selection
  const runAll = async () => {
    if (isProcessing) return;
    
    // Lấy tất cả task chưa chạy hoặc đang pending/error
    const allTasks = tasks.filter(t => t.status !== TaskStatus.RUNNING);
    if (allTasks.length === 0) return;

    setIsProcessing(true);
    
    // Tự động select visual để người dùng biết đang chạy cái gì
    setTasks(prev => prev.map(t => ({...t, selected: true})));

    for (const task of allTasks) {
      await executeTaskLogic(task);
    }

    setIsProcessing(false);
  };

  // Logic Processing Text Import
  const processImportText = (text: string) => {
    if (!text.trim()) return;
    const lines = text.split(/\r?\n/); // Split by newline
    const validLines = lines.filter(line => line.trim().length > 0);
    
    const newTasks = validLines.map(line => {
      // Basic CSV handling: if line has commas, assume first part is prompt
      // But keeping it simple: treat whole line as prompt for robustness unless user specifies
      let prompt = line.trim();
      // Loại bỏ dấu ngoặc kép bao quanh nếu là CSV export
      if (prompt.startsWith('"') && prompt.endsWith('"')) {
        prompt = prompt.slice(1, -1).replace(/""/g, '"');
      }
      return createNewTask({ prompt });
    });

    setTasks(prev => [...prev, ...newTasks]);
    // Reset import inputs
    setImportText('');
    setImportUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    setActiveTab('manual');
  };

  // Logic Import từ Text Area
  const handleTextImport = () => {
    processImportText(importText);
  };

  // Logic Import từ File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processImportText(text);
    };
    reader.readAsText(file);
  };

  // Logic Import từ URL
  const handleUrlImport = async () => {
    if (!importUrl) return;
    try {
      const response = await fetch(importUrl);
      if (!response.ok) throw new Error("Không thể tải file từ URL này.");
      const text = await response.text();
      processImportText(text);
    } catch (error) {
      alert("Lỗi khi tải URL (có thể do chặn CORS). Vui lòng thử tải file về và upload thủ công.");
      console.error(error);
    }
  };

  // API Key Selection Handler
  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
      } catch (e) {
        console.error("Error opening key selector:", e);
      }
    } else {
      console.warn("aistudio object not found in window");
    }
  };

  const isAllSelected = tasks.length > 0 && tasks.every(t => t.selected);
  const selectedCount = tasks.filter(t => t.selected).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 p-2 rounded-lg shadow-sm">
                <span className="text-2xl">🍌</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Banana AI Task Manager</h1>
                <p className="text-xs text-gray-500">Sequential Batch Processing • Gemini Models</p>
              </div>
            </div>

            {/* Global Settings & Actions Container */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap bg-gray-50 p-2 rounded-xl border border-gray-100 xl:bg-transparent xl:p-0 xl:border-none">
              
              {/* API Key Selection Button */}
              <button 
                onClick={handleSelectKey}
                className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
                title="Select API Key from Google AI Studio (Required for Pro models)"
              >
                 <Key size={16} className="text-yellow-500" />
                 <span>Select API Key</span>
              </button>

              {/* Global Suffix Input */}
              <div className="relative group w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Global Suffix (VD: 4k, realistic)"
                  value={globalSuffix}
                  onChange={(e) => setGlobalSuffix(e.target.value)}
                  className="w-full md:w-60 pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-shadow bg-white"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs font-mono bg-gray-100 px-1 rounded">
                  Suffix
                </div>
              </div>
              
              <div className="h-6 w-px bg-gray-300 hidden md:block mx-1"></div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button 
                  onClick={runAll}
                  disabled={tasks.length === 0 || isProcessing}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 text-sm whitespace-nowrap"
                  title="Chạy tất cả các dòng bất kể chọn hay không"
                >
                  <Layers size={18} />
                  <span className="">Run All</span>
                </button>

                <button 
                  onClick={runSelected}
                  disabled={selectedCount === 0 || isProcessing}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  <Play size={18} fill="currentColor" />
                  {isProcessing ? 'Running...' : `Run (${selectedCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full p-4 md:p-6">
        
        {/* Tabs Source */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('manual')}
              className={`pb-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'manual' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Keyboard size={16} />
              Manual Input
            </button>
            <button 
              onClick={() => setActiveTab('import')}
              className={`pb-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'import' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <FileSpreadsheet size={16} />
              Import (Excel/File)
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 pb-3">
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Pending: {tasks.filter(t => t.status === TaskStatus.PENDING).length}</span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Done: {tasks.filter(t => t.status === TaskStatus.DONE).length}</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'manual' ? (
          <>
             {/* List Header Labels with Select All */}
             <div className="hidden md:flex px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 items-center">
                <div className="w-8 flex justify-center">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500 cursor-pointer"
                    title="Chọn tất cả"
                  />
                </div>
                <div className="w-16 text-center">Img</div>
                <div className="flex-grow pl-2">Prompt</div>
                <div className="w-40 pl-2">Ratio</div>
                <div className="w-16 text-center">Model</div> {/* Changed for clarity */}
                <div className="min-w-[140px] text-right">Action</div>
             </div>

             {/* Task List */}
             <div className="space-y-1">
               {tasks.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                   <div className="bg-yellow-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Plus size={32} className="text-yellow-500" />
                   </div>
                   <h3 className="text-gray-900 font-medium text-lg">Chưa có tác vụ nào</h3>
                   <p className="text-gray-500 text-sm mb-6">Bắt đầu bằng cách thêm dòng mới hoặc import dữ liệu.</p>
                   <button onClick={addNewRow} className="text-yellow-600 hover:text-yellow-700 font-medium text-sm">
                     + Thêm dòng đầu tiên
                   </button>
                 </div>
               ) : (
                 tasks.map(task => (
                   <TaskRow 
                     key={task.id} 
                     task={task} 
                     onUpdate={updateTask} 
                     onDelete={deleteTask}
                     onRun={() => runSingleTask(task)}
                     onAddBelow={addRowBelow}
                   />
                 ))
               )}
             </div>

             {/* Add Button */}
             <div className="mt-6 flex justify-center">
                <button 
                  onClick={addNewRow}
                  className="group flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:border-yellow-400 text-gray-600 hover:text-yellow-600 rounded-full shadow-sm transition-all hover:shadow-md"
                >
                  <div className="bg-gray-100 group-hover:bg-yellow-100 p-1 rounded-full transition-colors">
                    <Plus size={16} />
                  </div>
                  <span className="font-medium text-sm">Add New Row at Bottom</span>
                </button>
             </div>
          </>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-8">
            
            {/* 1. Paste Text Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="text-yellow-500" size={20} />
                <h3 className="text-lg font-medium text-gray-900">Cách 1: Dán danh sách Prompt</h3>
              </div>
              <p className="text-sm text-gray-500 mb-3">Copy nội dung từ Excel/Google Sheet hoặc file text và dán vào đây. Mỗi dòng sẽ được tạo thành 1 task.</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Ví dụ:
Một con mèo đang lái xe hơi
Thành phố tương lai cyberpunk
..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-mono mb-2"
              />
              <div className="flex justify-end">
                <button 
                  onClick={handleTextImport}
                  disabled={!importText.trim()}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  Xử lý văn bản
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100"></div>

            {/* 2. File Upload Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UploadCloud className="text-blue-500" size={20} />
                  <h3 className="text-lg font-medium text-gray-900">Cách 2: Tải file lên</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">Hỗ trợ file .txt hoặc .csv. Hệ thống tự động đọc từng dòng.</p>
                
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="text-sm text-gray-500"><span className="font-semibold">Click để tải lên</span> hoặc kéo thả</p>
                    <p className="text-xs text-gray-500">TXT, CSV</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef}
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {/* 3. URL Link Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <LinkIcon className="text-green-500" size={20} />
                  <h3 className="text-lg font-medium text-gray-900">Cách 3: Nhập Link</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">Dán đường dẫn trực tiếp đến file raw text hoặc CSV công khai.</p>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://example.com/prompts.csv"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                  />
                  <button 
                    onClick={handleUrlImport}
                    disabled={!importUrl.trim()}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <Download size={16} />
                    Tải
                  </button>
                </div>
                <p className="text-xs text-red-400 mt-2 italic">* Lưu ý: Một số link có thể bị chặn bởi chính sách bảo mật trình duyệt (CORS).</p>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
         <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-2">
            <p>© 2024 Banana AI Task Manager. Built with React & Tailwind.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Info size={12} /> Models: Flash (Free) / Pro (Key)</span>
              <span>v1.3.1 (Fix Key Logic)</span>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default App;