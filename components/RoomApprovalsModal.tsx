import React from 'react';
import { firebaseService } from '../utils/firebase';

interface RoomApprovalsModalProps {
  roomId: string;
  requests: { [uid: string]: any };
  onClose: () => void;
}

export default function RoomApprovalsModal({
  roomId,
  requests,
  onClose,
}: RoomApprovalsModalProps) {
  const requestList = Object.entries(requests || {}).map(([uid, data]) => ({
    uid,
    ...(data as any),
  }));

  const handleApprove = async (uid: string) => {
    try {
      await firebaseService.approveJoinRequest(roomId, uid);
    } catch (err) {
      console.error(err);
      alert('Không thể phê duyệt yêu cầu.');
    }
  };

  const handleReject = async (uid: string) => {
    if (confirm('Bạn có chắc muốn từ chối yêu cầu tham gia của thành viên này?')) {
      try {
        await firebaseService.rejectJoinRequest(roomId, uid);
      } catch (err) {
        console.error(err);
        alert('Không thể từ chối yêu cầu.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_#1E293B] rounded-3xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4 flex-shrink-0">
          <h3 className="text-sm font-heading font-black uppercase tracking-wider text-black flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neo-accent"></span>
            </span>
            Yêu cầu gia nhập ({requestList.length})
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

        {/* Requests List */}
        {requestList.length === 0 ? (
          <div className="flex-grow py-8 text-center flex flex-col items-center justify-center border-4 border-black border-dashed rounded-2xl bg-gray-50/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <p className="text-xs font-black uppercase text-gray-500">Không có yêu cầu chờ duyệt.</p>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto space-y-3 pr-1 no-scrollbar min-h-[200px]">
            {requestList.map((req) => (
              <div
                key={req.uid}
                className="bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_#1E293B] rounded-2xl flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={req.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}
                    alt={req.displayName}
                    className="w-10 h-10 rounded-full border-2 border-black shadow-[1px_1px_0px_0px_#1E293B]"
                  />
                  <div className="min-w-0 flex-grow">
                    <h4 className="text-xs font-black uppercase tracking-wide truncate font-heading">
                      {req.displayName}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-500 truncate">{req.email}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 text-xs font-semibold select-none">
                  <button
                    onClick={() => handleReject(req.uid)}
                    className="neo-btn-press px-3 py-1.5 bg-white hover:bg-gray-50 text-black border-2 border-black font-black text-[10px] uppercase shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleApprove(req.uid)}
                    className="neo-btn-press px-3 py-1.5 bg-neo-secondary hover:bg-neo-secondary/95 text-black border-2 border-black font-black text-[10px] uppercase shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
                  >
                    Đồng ý
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 border-t-4 border-black border-dashed pt-4 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="neo-btn-press px-5 py-2.5 bg-neo-muted hover:bg-neo-muted/95 text-black border-2 border-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1E293B] rounded-full cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
