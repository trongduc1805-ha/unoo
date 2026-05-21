import React from 'react';
import { User } from '../utils/firebase';

interface HeaderProps {
  user: User | null;
  activeRoomId: string | null;
  activeRoomName: string | null;
  isOwner: boolean;
  pendingRequestsCount: number;
  onBackToDashboard: () => void;
  onOpenApprovals: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  activeRoomId,
  activeRoomName,
  isOwner,
  pendingRequestsCount,
  onBackToDashboard,
  onLogout,
}) => {
  const handleCopyId = () => {
    if (activeRoomId) {
      navigator.clipboard.writeText(activeRoomId);
      alert(`Đã sao chép mã phòng: ${activeRoomId}`);
    }
  };

  return (
    <header className="flex-shrink-0 flex items-center justify-between p-4 h-20 border-b-2 border-dashed border-[#2d2d2d] bg-[#fdfbf7] select-none">
      {/* Left side: Back to dashboard (if in room) + Logo */}
      <div className="flex items-center gap-3">
        {activeRoomId && (
          <button
            onClick={onBackToDashboard}
            style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
            className="neo-btn-press p-2 bg-[#e5e0d8] hover:bg-[#ff4d4d] hover:text-white border-2 border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d] text-[#2d2d2d] transition-all cursor-pointer flex items-center justify-center"
            aria-label="Quay lại Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div
          className="flex flex-col cursor-pointer"
          onClick={activeRoomId ? onBackToDashboard : undefined}
        >
          <h1 className="font-heading text-3xl font-black tracking-wider leading-none select-none">
            <span className="text-[#ff4d4d]">U</span>
            <span className="text-[#2d5da1]">N</span>
            <span className="text-[#2d2d2d]">O</span>
          </h1>
          <div className="h-[3px] w-full bg-[#2d2d2d] mt-1"></div>
        </div>
      </div>

      {/* Middle/Center: Active room details */}
      {activeRoomId && (
        <div 
          style={{ borderRadius: '20px 300px 20px 200px / 200px 20px 300px 20px' }}
          className="hidden sm:flex items-center gap-3 px-4 py-1.5 bg-white border-2 border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d]"
        >
          <span className="font-heading font-black text-xs uppercase tracking-wide truncate max-w-[120px] md:max-w-[200px]">
            📝 {activeRoomName}
          </span>
          <span
            onClick={handleCopyId}
            style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
            className="font-heading text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-[#2d5da1] text-white hover:bg-[#ff4d4d] border border-[#2d2d2d] cursor-pointer transition-all shadow-[2px_2px_0px_0px_#2d2d2d]"
            title="Nhấp để copy mã phòng"
          >
            Mã: {activeRoomId} 📋
          </span>
        </div>
      )}

      {/* Right side: Actions & Avatar */}
      <div className="flex items-center gap-2">
        {/* Dynamic code for displaying active room on mobile */}
        {activeRoomId && (
          <span
            onClick={handleCopyId}
            style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
            className="sm:hidden font-heading text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 bg-[#2d5da1] text-white hover:bg-[#ff4d4d] border-2 border-[#2d2d2d] cursor-pointer transition-all shadow-[2.5px_2.5px_0px_0px_#2d2d2d]"
          >
            {activeRoomId} 📋
          </span>
        )}

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l-2 border-dashed border-[#2d2d2d]">
            <img
              src={user.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}
              alt={user.displayName || 'Avatar'}
              className="w-8 h-8 rounded-full border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]"
              title={`${user.displayName} (${user.email})`}
            />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;