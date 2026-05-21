import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FirebaseConfig } from '../utils/firebase';

interface SyncSettingsModalProps {
  onClose: () => void;
  onSave: (enabled: boolean, roomName: string, config: FirebaseConfig | null) => void;
  currentEnabled: boolean;
  currentRoomName: string;
  currentConfig: FirebaseConfig | null;
}

const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  onClose,
  onSave,
  currentEnabled,
  currentRoomName,
  currentConfig,
}) => {
  const [enabled, setEnabled] = useState(currentEnabled);
  const [roomName, setRoomName] = useState(currentRoomName);
  
  // Individual config states
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [databaseURL, setDatabaseURL] = useState(currentConfig?.databaseURL || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');

  // JSON paste state
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Handle parsing pasted Firebase config snippet
  const handleParseConfig = () => {
    try {
      setJsonError('');
      if (!rawJson.trim()) return;

      // Extract JSON-like content or try to parse clean JSON
      let parsed: any = null;

      // Try parsing direct JSON
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        // If direct JSON parse fails, try to extract object from js snippet: const firebaseConfig = { ... };
        const objectRegex = /\{[\s\S]*?\}/;
        const match = rawJson.match(objectRegex);
        if (match) {
          // Convert JS object format to JSON format (quote unquoted keys)
          const jsonString = match[0]
            .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":') // Quote keys
            .replace(/'/g, '"') // Replace single quotes with double quotes
            .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
            .replace(/\/\/.*$/gm, ''); // Remove single line comments
          
          parsed = JSON.parse(jsonString);
        }
      }

      if (parsed && typeof parsed === 'object') {
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.authDomain) setAuthDomain(parsed.authDomain);
        if (parsed.databaseURL) setDatabaseURL(parsed.databaseURL);
        if (parsed.projectId) setProjectId(parsed.projectId);
        
        setRawJson(''); // Clear after successful parse
        alert('Đã nạp cấu hình Firebase thành công!');
      } else {
        setJsonError('Không tìm thấy cấu hình Firebase hợp lệ. Vui lòng kiểm tra lại định dạng.');
      }
    } catch (e) {
      console.error(e);
      setJsonError('Lỗi phân tích cú pháp. Hãy chắc chắn bạn đã copy đúng phần object {...}');
    }
  };

  const handleSaveClick = () => {
    if (enabled) {
      if (!roomName.trim()) {
        alert('Vui lòng nhập Tên phòng (Room ID).');
        return;
      }
      if (!apiKey.trim() || !databaseURL.trim() || !projectId.trim()) {
        alert('Vui lòng điền đủ apiKey, databaseURL và projectId để bật đồng bộ.');
        return;
      }
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim(),
    };

    onSave(enabled, roomName.trim(), enabled ? config : currentConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <motion.div
        className="bg-white w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_#1E293B] rounded-3xl p-6 overflow-y-auto flex flex-col max-h-[90vh]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex justify-between items-center border-b-4 border-black pb-3 mb-4 flex-shrink-0">
          <h3 className="text-sm font-heading font-black uppercase tracking-wider text-black flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neo-accent"></span>
            </span>
            Cài đặt Đồng bộ
          </h3>
          <button
            onClick={onClose}
            className="neo-btn-press w-8 h-8 border-2 border-black bg-white flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 flex-grow pr-1">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_#1E293B] rounded-2xl">
            <div>
              <span className="text-xs font-heading font-black uppercase tracking-wider text-black">Đồng bộ trực tuyến</span>
              <p className="text-[10px] font-bold text-gray-500 mt-0.5">Kết nối nhiều thiết bị cùng lúc</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white border-2 border-black rounded-full peer peer-checked:bg-neo-accent peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-2 after:border-black after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>

          {enabled && (
            <div className="space-y-4 animate-fade-in">
              {/* Room ID */}
              <div>
                <label className="block text-xs font-semibold text-black uppercase mb-1">
                  Tên phòng (Room ID / Tên nhóm)
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-neo-accent placeholder-gray-400"
                  placeholder="Ví dụ: phong-uno-2026"
                />
              </div>

              {/* Paste config section */}
              <div className="border-t-2 border-black border-dashed pt-3">
                <label className="block text-xs font-semibold text-black uppercase mb-1">
                  Dán nhanh cấu hình Firebase
                </label>
                <textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  className="w-full h-18 bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-neo-accent placeholder-gray-400 resize-none"
                  placeholder="Dán mã nhúng config từ Firebase Console hoặc file JSON vào đây..."
                />
                {jsonError && <p className="text-red-500 text-[10px] font-bold mt-1">{jsonError}</p>}
                <button
                  type="button"
                  onClick={handleParseConfig}
                  className="neo-btn-press mt-2 w-full bg-neo-secondary hover:bg-neo-secondary/95 text-black border-2 border-black text-xs font-black uppercase py-2 px-3 rounded-full cursor-pointer shadow-[2.5px_2.5px_0px_0px_#1E293B]"
                >
                  Nạp cấu hình
                </button>
              </div>

              {/* Individual configs */}
              <div className="space-y-3 border-t-2 border-black border-dashed pt-3">
                <p className="text-xs font-heading font-black uppercase tracking-wider text-black">Chi tiết cấu hình Firebase</p>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500">API Key *</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-neo-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500">Database URL *</label>
                  <input
                    type="text"
                    value={databaseURL}
                    onChange={(e) => setDatabaseURL(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-neo-accent"
                    placeholder="https://your-app-default-rtdb.firebaseio.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500">Project ID *</label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-neo-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500">Auth Domain (Tùy chọn)</label>
                  <input
                    type="text"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-neo-accent"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-[#FFFDF5] p-3 border-2 border-black rounded-2xl text-[10px] text-gray-700 space-y-1 shadow-[3px_3px_0px_0px_#1E293B]">
                <span className="font-heading font-black uppercase text-black block">Cách lấy cấu hình Firebase:</span>
                <ol className="list-decimal pl-4 font-bold space-y-0.5 text-gray-600">
                  <li>Truy cập <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-neo-accent hover:underline">Firebase Console</a></li>
                  <li>Tạo dự án mới & tạo **Realtime Database** (chọn chế độ test/public).</li>
                  <li>Vào Cài đặt dự án &rarr; Đăng ký ứng dụng Web để lấy đoạn mã cấu hình.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 border-t-4 border-black border-dashed pt-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="neo-btn-press flex-1 bg-white hover:bg-gray-50 text-black font-black text-xs uppercase py-2.5 rounded-full border-2 border-black shadow-[3px_3px_0px_0px_#1E293B] cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveClick}
            className="neo-btn-press flex-1 bg-neo-accent hover:bg-neo-accent/95 text-white font-black text-xs uppercase py-2.5 rounded-full border-2 border-black shadow-[3px_3px_0px_0px_#1E293B] cursor-pointer"
          >
            Lưu lại
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SyncSettingsModal;
