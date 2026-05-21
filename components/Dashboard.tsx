import React, { useState, useEffect } from 'react';
import { User, firebaseService } from '../utils/firebase';

interface DashboardProps {
  user: User;
  profile: any;
  rooms: any[];
  pendingRequests: any[];
  onSelectRoom: (roomId: string) => void;
  onLogout: () => void;
  onUpdateProfile: () => Promise<void>;
}
import { ALL_BANKS } from '../constants';


const PRESET_AVATARS = [
  { name: 'Pixel Felix', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix' },
  { name: 'Robot Jack', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Jack' },
  { name: 'Adventurer Lily', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily' },
  { name: 'Emoji Bob', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Bob' },
  { name: 'Cute Rabbit', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rabbit' },
];

export default function Dashboard({
  user,
  profile,
  rooms,
  pendingRequests,
  onSelectRoom,
  onLogout,
  onUpdateProfile,
}: DashboardProps) {
  // Tab Create/Join state
  const [dashboardTab, setDashboardTab] = useState<'create' | 'join'>('create');

  // Create Room state
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Join Room state
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState(profile?.displayName || user.displayName || '');
  const [settingsAvatar, setSettingsAvatar] = useState(profile?.photoURL || user.photoURL || '');
  const [bankId, setBankId] = useState(profile?.bankInfo?.bankId || '');
  const [accountNumber, setAccountNumber] = useState(profile?.bankInfo?.accountNumber || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState({ text: '', type: '' });

  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
      setSettingsName(profile.displayName || user.displayName || '');
      setSettingsAvatar(profile.photoURL || user.photoURL || '');
      setBankId(profile.bankInfo?.bankId || '');
      setAccountNumber(profile.bankInfo?.accountNumber || '');
    }
  }, [profile, user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMsg({ text: '', type: '' });
    try {
      // 1. Update Profile info
      await firebaseService.updateUserProfile(user.uid, settingsName.trim(), settingsAvatar);
      // 2. Update Bank account info
      await firebaseService.updateUserBankInfo(user.uid, bankId, accountNumber);

      await onUpdateProfile();
      setSettingsMsg({ text: 'Cập nhật tài khoản thành công! 🎉', type: 'success' });
      setTimeout(() => {
        setIsSettingsOpen(false);
        setSettingsMsg({ text: '', type: '' });
      }, 1000);
    } catch (err: any) {
      setSettingsMsg({ text: err.message || 'Lỗi khi cập nhật cấu hình.', type: 'error' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setIsCreatingRoom(true);
    try {
      const roomId = await firebaseService.createRoom(newRoomName.trim(), user.uid);
      setNewRoomName('');
      onSelectRoom(roomId);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo phòng. Vui lòng thử lại.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedId = joinRoomId.trim().toUpperCase();
    if (!formattedId) return;
    setIsJoiningRoom(true);
    setJoinError('');
    try {
      await firebaseService.requestToJoinRoom(formattedId, user);
      setJoinRoomId('');
      alert('Yêu cầu tham gia đã được gửi! Chờ trưởng phòng duyệt để bắt đầu.');
    } catch (err: any) {
      setJoinError(err.message || 'Có lỗi xảy ra.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleCancelRequest = async (roomId: string) => {
    if (confirm('Bạn muốn hủy yêu cầu tham gia phòng này?')) {
      try {
        await firebaseService.cancelJoinRequest(roomId, user.uid);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in text-black bg-halftone min-h-screen">
      
      {/* 1. Header Profile */}
      <div 
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 border-4 border-[#2d2d2d] shadow-[8px_8px_0px_0px_#2d2d2d] mb-8 select-none relative overflow-hidden"
      >
        {/* Paper tape decoration */}
        <div 
          style={{ transform: 'rotate(-1.5deg)' }}
          className="absolute -top-1 left-8 w-24 h-4.5 bg-[#e5e0d8] border-b border-dashed border-[#2d2d2d] opacity-80"
        ></div>

        <div className="flex items-center gap-4">
          <img
            src={profile?.photoURL || user.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}
            alt={profile?.displayName || user.displayName || 'Avatar'}
            className="w-16 h-16 rounded-full border-4 border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d]"
          />
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wide leading-none mb-1 font-heading">
              {profile?.displayName || user.displayName}
            </h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{user.email}</p>
            {profile?.bankInfo?.accountNumber ? (
              <span 
                style={{ borderRadius: '150px 10px 120px 10px / 10px 120px 10px 150px' }}
                className="inline-block mt-2 text-[10px] font-black uppercase bg-[#e5e0d8] text-[#2d2d2d] border-2 border-[#2d2d2d] px-2.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_#2d2d2d]"
              >
                🏦 Ví: {ALL_BANKS.find(b => b.bin === profile.bankInfo.bankId)?.code || 'Bank'} - {profile.bankInfo.accountNumber}
              </span>
            ) : (
              <span 
                style={{ borderRadius: '150px 10px 120px 10px / 10px 120px 10px 150px' }}
                className="inline-block mt-2 text-[10px] font-black uppercase bg-[#ff4d4d] text-white border-2 border-[#2d2d2d] px-2.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_#2d2d2d]"
              >
                ⚠️ Chưa thiết lập Ví nhận tiền
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
            className="neo-btn-press px-5 py-2.5 bg-[#e5e0d8] hover:bg-[#ff4d4d] hover:text-white text-[#2d2d2d] border-2 border-[#2d2d2d] font-black text-xs uppercase shadow-[3px_3px_0px_0px_#2d2d2d] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cấu hình ⚙️
          </button>
          <button
            onClick={onLogout}
            style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
            className="neo-btn-press px-5 py-2.5 bg-[#ff4d4d] text-white font-black text-xs uppercase border-2 border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d] hover:bg-[#ff4d4d]/90 transition-all cursor-pointer flex items-center gap-1.5"
          >
            Đăng xuất 🚪
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* CỘT TRÁI: Tạo và Gia nhập phòng (Gộp compact tab) */}
        <div className="md:col-span-1 space-y-8 select-none">
          <div 
            style={{ borderRadius: '20px 30px 20px 30px / 30px 20px 30px 20px' }}
            className="bg-white p-5 border-4 border-[#2d2d2d] shadow-[6px_6px_0px_0px_#2d2d2d] relative overflow-hidden"
          >
            {/* Top tape decoration */}
            <div 
              style={{ transform: 'rotate(1deg)' }}
              className="absolute -top-1 left-1/4 w-16 h-4 bg-[#e5e0d8] border-b border-[#2d2d2d] border-dashed opacity-70"
            ></div>
            
            {/* Tab buttons */}
            <div className="flex gap-2 mb-4 border-b-2 border-dashed border-[#2d2d2d] pb-2 font-heading text-xs font-black">
              <button 
                type="button"
                onClick={() => setDashboardTab('create')}
                className={`px-3 py-1 border-2 border-[#2d2d2d] transition-all cursor-pointer ${dashboardTab === 'create' ? 'bg-[#ff4d4d] text-white shadow-[2px_2px_0px_0px_#2d2d2d] translate-y-[-1px]' : 'bg-[#e5e0d8] text-[#2d2d2d]'}`}
                style={{ borderRadius: '150px 15px 100px 15px / 15px 100px 15px 150px' }}
              >
                ✏️ Tạo Phòng
              </button>
              <button 
                type="button"
                onClick={() => setDashboardTab('join')}
                className={`px-3 py-1 border-2 border-[#2d2d2d] transition-all cursor-pointer ${dashboardTab === 'join' ? 'bg-[#2d5da1] text-white shadow-[2px_2px_0px_0px_#2d2d2d] translate-y-[-1px]' : 'bg-[#e5e0d8] text-[#2d2d2d]'}`}
                style={{ borderRadius: '150px 15px 100px 15px / 15px 100px 15px 150px' }}
              >
                👥 Gia Nhập
              </button>
            </div>

            {dashboardTab === 'create' ? (
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Tên phòng (ví dụ: Đà Lạt 2026)..."
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="w-full p-2.5 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isCreatingRoom || !newRoomName.trim()}
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="neo-btn-press w-full py-2 bg-[#ff4d4d] hover:bg-[#ff4d4d]/90 text-white border-2 border-[#2d2d2d] font-black text-xs uppercase shadow-[3px_3px_0px_0px_#2d2d2d] transition-all disabled:opacity-50 cursor-pointer"
                >
                  Tạo phòng mới ➕
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Mã ID phòng (UNO-XXXX)..."
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="w-full p-2.5 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400"
                  required
                />
                {joinError && <p className="text-[10px] font-black text-[#ff4d4d] mt-1">{joinError}</p>}
                <button
                  type="submit"
                  disabled={isJoiningRoom || !joinRoomId.trim()}
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="neo-btn-press w-full py-2 bg-[#2d5da1] hover:bg-[#2d5da1]/90 text-white border-2 border-[#2d2d2d] font-black text-xs uppercase shadow-[3px_3px_0px_0px_#2d2d2d] transition-all disabled:opacity-50 cursor-pointer"
                >
                  Gửi yêu cầu gia nhập 📨
                </button>
              </form>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Danh sách phòng & các yêu cầu đang chờ duyệt */}
        <div className="md:col-span-2 space-y-8">
          {/* Phòng đã gia nhập */}
          <div 
            style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
            className="bg-white p-6 border-4 border-[#2d2d2d] shadow-[8px_8px_0px_0px_#2d2d2d] min-h-[400px] flex flex-col"
          >
            <h3 className="text-2xl font-heading font-black uppercase tracking-wider mb-6 flex items-center gap-2 border-b-2 border-dashed border-[#2d2d2d] pb-3 select-none">
              👥 Phòng chia tiền của bạn ({rooms.length})
            </h3>

            {rooms.length === 0 ? (
              <div className="flex-grow flex flex-col justify-center items-center py-12 text-center select-none">
                <div 
                  style={{ transform: 'rotate(6deg)', borderRadius: '20px 300px 20px 200px / 200px 20px 300px 20px' }}
                  className="w-14 h-14 border-4 border-[#2d2d2d] bg-[#e5e0d8] flex items-center justify-center font-bold text-2xl shadow-[5px_5px_0px_0px_#2d2d2d] mb-4"
                >
                  💸
                </div>
                <p className="font-black text-lg uppercase font-heading">Bạn chưa tham gia phòng nào!</p>
                <p className="text-xs font-bold text-gray-500 mt-2 max-w-sm">
                  Hãy nhấn nút **Cấu hình** ở trên để thiết lập Ví nhận tiền của bạn trước, sau đó tạo phòng mới hoặc gia nhập phòng bạn bè nhé.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {rooms.map((room, idx) => {
                  const isOwner = room.ownerId === user.uid;
                  const randomTilt = idx % 2 === 0 ? 'rotate-[0.6deg]' : 'rotate-[-0.6deg]';
                  return (
                    <div
                      key={room.id}
                      onClick={() => onSelectRoom(room.id)}
                      style={{ borderRadius: '20px 300px 20px 200px / 200px 20px 300px 20px' }}
                      className={`group relative bg-white hover:bg-[#e5e0d8]/10 border-4 border-[#2d2d2d] p-5 cursor-pointer transition-all shadow-[6px_6px_0px_0px_#2d2d2d] hover:shadow-[10px_10px_0px_0px_#2d2d2d] hover:-translate-x-1 hover:-translate-y-1 duration-200 ${randomTilt}`}
                    >
                      {/* Thumbtack style decoration */}
                      <div className="absolute top-2.5 right-3 w-3 h-3 bg-[#ff4d4d] border-2 border-[#2d2d2d] rounded-full shadow-[1px_1px_0px_0px_#2d2d2d]"></div>

                      <h4 className="font-heading font-black text-lg uppercase tracking-wide truncate pr-8 group-hover:text-[#ff4d4d] transition-colors">
                        {room.name}
                      </h4>
                      <p className="text-xs font-black text-gray-500 uppercase tracking-wider mt-1.5">
                        ID phòng: <span className="text-[#2d2d2d] bg-[#e5e0d8] px-1.5 py-0.5 rounded border border-[#2d2d2d] border-dashed select-all font-sans font-bold">{room.id}</span>
                      </p>
                      <div className="flex items-center justify-between mt-5 text-xs font-black select-none">
                        <span className="bg-gray-150 border border-[#2d2d2d] px-2.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_#2d2d2d] text-[10px] uppercase rounded-full">
                          👥 {room.memberCount} Thành viên
                        </span>
                        {isOwner ? (
                          <span className="text-white bg-[#ff4d4d] border border-[#2d2d2d] px-2.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_#2d2d2d] text-[10px] uppercase rounded-full">
                            Trưởng phòng
                          </span>
                        ) : (
                          <span className="text-white bg-[#2d5da1] border border-[#2d2d2d] px-2.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_#2d2d2d] text-[10px] uppercase rounded-full">
                            Thành viên
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phòng đang chờ duyệt */}
          {pendingRequests.length > 0 && (
            <div 
              style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
              className="bg-white p-6 border-4 border-[#2d2d2d] shadow-[8px_8px_0px_0px_#2d2d2d] select-none"
            >
              <h3 className="text-lg font-heading font-black uppercase tracking-wider mb-4 flex items-center gap-2 border-b-2 border-dashed border-[#2d2d2d] pb-2">
                ⏳ Yêu cầu đang chờ duyệt ({pendingRequests.length})
              </h3>
              <div className="space-y-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{ borderRadius: '20px 300px 20px 200px / 200px 20px 300px 20px' }}
                    className="flex justify-between items-center bg-gray-50 p-4 border-2 border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d]"
                  >
                    <div>
                      <h4 className="font-heading font-black text-sm uppercase tracking-wide">{req.name}</h4>
                      <p className="text-xs font-bold text-gray-500">Mã ID: {req.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase text-gray-700 bg-[#e5e0d8] border border-[#2d2d2d] px-2.5 py-1 shadow-[2px_2px_0px_0px_#2d2d2d] animate-pulse rounded-full">
                        Đang chờ duyệt
                      </span>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                        className="neo-btn-press p-2 bg-[#ff4d4d] hover:bg-[#ff4d4d]/90 border border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d] text-white cursor-pointer"
                        title="Hủy yêu cầu"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Modal Cài đặt cá nhân */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div 
            style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
            className="bg-[#fdfbf7] w-full max-w-lg border-4 border-[#2d2d2d] shadow-[8px_8px_0px_0px_#2d2d2d] p-6 overflow-hidden flex flex-col max-h-[90vh]"
          >
            
            {/* Header modal */}
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2d2d2d] pb-3 mb-4 flex-shrink-0">
              <h3 className="text-sm font-heading font-black uppercase tracking-wider text-[#2d2d2d] flex items-center gap-1.5">
                ⚙️ Cài đặt cá nhân
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                className="neo-btn-press w-8 h-8 border-2 border-[#2d2d2d] bg-white flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#2d2d2d] rounded-full cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSettings} className="flex-grow overflow-y-auto space-y-4 pr-1 no-scrollbar min-h-[300px]">
              
              {/* Tên hiển thị */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Nhập tên hiển thị..."
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="w-full p-3 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400 transition-all duration-150"
                  required
                />
              </div>

              {/* Ảnh đại diện */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
                  Ảnh đại diện (Chọn preset hoặc dán URL)
                </label>
                
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.name}
                      type="button"
                      onClick={() => setSettingsAvatar(av.url)}
                      style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                      className={`p-1 border-2 ${settingsAvatar === av.url ? 'border-[#ff4d4d] bg-[#ff4d4d]/10 shadow-[2px_2px_0px_0px_#2d2d2d]' : 'border-[#2d2d2d] bg-white shadow-[2px_2px_0px_0px_#2d2d2d]'} hover:bg-gray-50 rounded-full cursor-pointer transition-all duration-150`}
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} className="w-10 h-10 object-contain rounded-full" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSettingsAvatar(user.photoURL || '')}
                    style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                    className={`px-3 py-1.5 text-[10px] font-black border-2 ${settingsAvatar === user.photoURL ? 'border-[#ff4d4d] bg-[#ff4d4d]/10 shadow-[2px_2px_0px_0px_#2d2d2d]' : 'border-[#2d2d2d] bg-white shadow-[2px_2px_0px_0px_#2d2d2d]'} hover:bg-gray-50 rounded-full cursor-pointer transition-all duration-150`}
                  >
                    Google Avatar
                  </button>
                </div>

                <input
                  type="text"
                  value={settingsAvatar}
                  onChange={(e) => setSettingsAvatar(e.target.value)}
                  placeholder="Nhập URL ảnh đại diện..."
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="w-full p-3 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400 transition-all duration-150"
                />
                
                <div 
                  style={{ borderRadius: '20px 300px 20px 200px / 200px 20px 300px 20px' }}
                  className="mt-3 flex items-center gap-3 bg-white p-2.5 border-2 border-[#2d2d2d] border-dashed"
                >
                  <p className="text-[10px] font-black uppercase text-gray-500 font-heading">Xem trước avatar:</p>
                  <img
                    src={settingsAvatar || 'https://www.gravatar.com/avatar/?d=mp'}
                    alt="Preview"
                    className="w-10 h-10 rounded-full border-2 border-[#2d2d2d] shadow-[1.5px_1.5px_0px_0px_#2d2d2d] object-cover bg-white"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://www.gravatar.com/avatar/?d=mp';
                    }}
                  />
                </div>
              </div>

              {/* Ngân hàng */}
              <div className="border-t-2 border-dashed border-[#2d2d2d] pt-3">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                  Chọn Ngân hàng nhận tiền
                </label>
                <select
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="w-full p-3 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] transition-all duration-150 select-none"
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {ALL_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Số tài khoản */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                  Số tài khoản nhận tiền
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập số tài khoản ngân hàng..."
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="w-full p-3 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400 transition-all duration-150"
                />
              </div>

              {settingsMsg.text && (
                <p
                  className={`text-xs font-black uppercase tracking-wider ${
                    settingsMsg.type === 'success' ? 'text-green-600' : 'text-[#ff4d4d]'
                  }`}
                >
                  {settingsMsg.text}
                </p>
              )}

              {/* Actions */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="neo-btn-press w-1/3 py-3 bg-white hover:bg-gray-50 text-[#2d2d2d] border-2 border-[#2d2d2d] font-black text-xs uppercase shadow-[4px_4px_0px_0px_#2d2d2d] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="neo-btn-press w-2/3 py-3 bg-[#ff4d4d] hover:bg-[#ff4d4d]/90 text-white border-2 border-[#2d2d2d] font-black text-xs uppercase shadow-[4px_4px_0px_0px_#2d2d2d] cursor-pointer disabled:opacity-50"
                >
                  {isSavingSettings ? 'Đang lưu...' : 'Lưu cài đặt 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
