import React, { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';

interface PopoverProps {
  content: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({ content }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${isOpen ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500'}`}
        title="Cấu hình nâng cao"
      >
        <Settings size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 p-4">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-2">Cài đặt Task</h4>
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popover;