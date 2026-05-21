import React, { useState, useMemo } from 'react';
import { Expense, SplitMethod, TripPlan } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import RoomChat from './RoomChat';
import { User } from '../utils/firebase';

interface HomeScreenProps {
  roomId: string;
  user: User;
  expenses: Expense[];
  memberProfiles: { [uid: string]: any };
  customMembers: string[];
  pendingRequestsCount: number;
  nicknames: { [uid: string]: string };
  plans: TripPlan[];
  onOpenApprovals: () => void;
  onAddExpense: () => void;
  onSettleUp: () => void;
  onShowHistory: () => void;
  onDeleteExpense: (expenseId: string) => void;
  onSavePlans: (newPlans: TripPlan[]) => Promise<void>;
  onUpdateNickname: (uidOrName: string, nickname: string) => Promise<void>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const ExpenseDetailModal = ({
  expense,
  getMemberName,
  onClose
}: {
  expense: Expense;
  getMemberName: (nameOrUid: string) => string;
  onClose: () => void;
}) => {
  const shares = useMemo(() => {
    if (expense.splitMethod === SplitMethod.EVENLY) {
      const shareAmount = expense.amount / expense.participants.length;
      return expense.participants.map(p => ({ name: p, amount: shareAmount }));
    } else {
      return expense.participants.map(p => ({ name: p, amount: expense.manualSplits?.[p] ?? 0 }));
    }
  }, [expense]);

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-center p-4" onClick={onClose}>
      <motion.div
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
        className="bg-[#fdfbf7] p-6 border-4 border-[#2d2d2d] shadow-[8px_8px_0px_0px_#2d2d2d] w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-xl font-black uppercase tracking-wider border-b-2 border-dashed border-[#2d2d2d] pb-2 mb-4 truncate">
          {expense.itemName}
        </h3>

        {expense.payers ? (
          <div 
            style={{ borderRadius: '120px 10px 100px 10px / 10px 100px 10px 120px' }}
            className="mb-4 bg-[#e5e0d8]/35 p-3 border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]"
          >
            <h4 className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Đóng góp trả tiền:
            </h4>
            <div className="space-y-1.5">
              {Object.entries(expense.payers).map(([p, amt]) => (
                <div key={p} className="flex justify-between items-center text-xs font-black uppercase">
                  <span>{getMemberName(p)}</span>
                  <span className="text-[#ff4d4d]">{formatCurrency(amt)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs font-bold text-gray-700 leading-relaxed mb-4">
            Tổng cộng <span className="bg-[#2d5da1]/15 px-2 py-0.5 border border-[#2d2d2d] border-dashed font-heading font-black" style={{ borderRadius: '150px 10px 120px 10px / 10px 120px 10px 150px' }}>{formatCurrency(expense.amount)}</span> do <span className="font-black text-[#2d2d2d]">{getMemberName(expense.payer)}</span> trả tiền.
          </p>
        )}
        
        <div className="max-h-60 overflow-y-auto pr-1 no-scrollbar border-t-2 border-[#2d2d2d] border-dashed pt-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Chi tiết phần chia:</h4>
          <div className="space-y-2.5">
            {shares.map(share => (
              <div 
                key={share.name} 
                style={{ borderRadius: '10px 120px 10px 100px / 100px 10px 120px 10px' }}
                className="flex justify-between items-center bg-[#e5e0d8]/20 border-2 border-[#2d2d2d] p-2.5 shadow-[2px_2px_0px_0px_#2d2d2d]"
              >
                <span className="text-xs font-black uppercase">{getMemberName(share.name)}</span>
                <span className="text-xs font-bold text-gray-700">{formatCurrency(share.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
            className="neo-btn-press px-5 py-2.5 bg-[#e5e0d8] hover:bg-[#e5e0d8]/90 text-[#2d2d2d] border-2 border-[#2d2d2d] font-heading font-black text-xs uppercase shadow-[3px_3px_0px_0px_#2d2d2d] cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({
  roomId,
  user,
  expenses,
  memberProfiles,
  customMembers,
  pendingRequestsCount,
  nicknames,
  plans,
  onOpenApprovals,
  onAddExpense,
  onSettleUp,
  onShowHistory,
  onDeleteExpense,
  onSavePlans,
  onUpdateNickname,
}) => {
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  
  // Navigation tabs: 'expenses' | 'plans' | 'chat'
  const [activeTab, setActiveTab] = useState<'expenses' | 'plans' | 'chat'>('expenses');

  // Nicknames Modal
  const [isNicknamesOpen, setIsNicknamesOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [tempNickname, setTempNickname] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  const handleDeleteConfirm = () => {
    if (expenseToDelete) {
      onDeleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  // Helper translate displayName or UID to nickname
  const getMemberName = (displayNameOrUid: string) => {
    if (!displayNameOrUid) return 'Ẩn danh';
    if (nicknames[displayNameOrUid]) return nicknames[displayNameOrUid];
    
    // Find profile
    const profile = memberProfiles[displayNameOrUid];
    if (profile) return profile.displayName;

    // Find profile by original displayName match
    const found = Object.entries(memberProfiles).find(([_, p]: any) => p.displayName === displayNameOrUid);
    if (found) {
      const [uid] = found;
      if (nicknames[uid]) return nicknames[uid];
      return displayNameOrUid;
    }
    return displayNameOrUid;
  };

  // Get full member list (display names)
  const memberList = useMemo(() => {
    const firebaseMembers = Object.values(memberProfiles).map((p: any) => p.displayName);
    return Array.from(new Set([...firebaseMembers, ...customMembers]));
  }, [memberProfiles, customMembers]);

  const handleEditNicknameClick = (uidOrName: string) => {
    setEditingUid(uidOrName);
    setTempNickname(nicknames[uidOrName] || '');
  };

  const handleSaveNickname = async (uidOrName: string) => {
    setIsSavingNickname(true);
    try {
      await onUpdateNickname(uidOrName, tempNickname.trim());
      setEditingUid(null);
    } catch (e) {
      console.error(e);
      alert('Không thể lưu biệt danh');
    } finally {
      setIsSavingNickname(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in select-none">
      
      {/* 1. Active Members Roll at Top */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-[#2d2d2d] border-dashed mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {Object.entries(memberProfiles).slice(0, 5).map(([uid, profile]: any) => (
            <img
              key={uid}
              src={profile.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}
              alt={getMemberName(uid)}
              title={getMemberName(uid)}
              className="w-7 h-7 rounded-full border-2 border-[#2d2d2d] shadow-[1.5px_1.5px_0px_0px_#2d2d2d] flex-shrink-0"
            />
          ))}
          {memberList.length > 5 && (
            <span className="w-7 h-7 flex items-center justify-center bg-[#2d5da1] border-2 border-[#2d2d2d] text-[10px] font-heading font-black text-white rounded-full shadow-[1.5px_1.5px_0px_0px_#2d2d2d] flex-shrink-0">
              +{memberList.length - 5}
            </span>
          )}

          {/* Edit nicknames button */}
          <button
            onClick={() => setIsNicknamesOpen(true)}
            style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
            className="neo-btn-press flex items-center justify-center w-7 h-7 bg-white hover:bg-gray-50 border-2 border-[#2d2d2d] shadow-[1.5px_1.5px_0px_0px_#2d2d2d] cursor-pointer flex-shrink-0 ml-1"
            title="Quản lý thành viên & Biệt danh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>

        {/* Approvals notification */}
        {pendingRequestsCount > 0 && (
          <button
            onClick={onOpenApprovals}
            style={{ borderRadius: '150px 10px 120px 10px / 10px 120px 10px 150px' }}
            className="neo-btn-press text-[9px] font-heading font-black uppercase bg-[#ff4d4d] text-white border-2 border-[#2d2d2d] px-3.5 py-1.5 shadow-[2.5px_2.5px_0px_0px_#2d2d2d] animate-pulse cursor-pointer flex items-center gap-1"
          >
            Duyệt ({pendingRequestsCount})
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 stroke-[3px] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        )}
      </div>

      {/* 2. Responsive Layout Splitter */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-hidden">
        
        {/* LEFT COLUMN: Expenses OR Plans (Width: 3/5 on laptop, full on mobile if not in chat tab) */}
        <div className={`lg:col-span-3 flex flex-col h-full overflow-hidden ${activeTab !== 'chat' ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* Navigation tab switcher */}
          <div 
            style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
            className="flex border-4 border-[#2d2d2d] mb-4 select-none bg-[#fdfbf7] p-1 gap-1 shadow-[4px_4px_0px_0px_#2d2d2d]"
          >
            <button
              onClick={() => setActiveTab('expenses')}
              style={{ borderRadius: '150px 15px 100px 15px / 15px 100px 15px 150px' }}
              className={`flex-1 py-2.5 text-xs font-heading font-black uppercase tracking-wider transition-all duration-300 rounded-full cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'expenses' ? 'bg-[#ff4d4d] text-white border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]' : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-black border-2 border-transparent'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span>Chi tiêu ({expenses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              style={{ borderRadius: '150px 15px 100px 15px / 15px 100px 15px 150px' }}
              className={`flex-1 py-2.5 text-xs font-heading font-black uppercase tracking-wider transition-all duration-300 rounded-full cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'plans' ? 'bg-[#ff4d4d] text-white border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]' : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-black border-2 border-transparent'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Kế hoạch ({plans.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              style={{ borderRadius: '150px 15px 100px 15px / 15px 100px 15px 150px' }}
              className={`lg:hidden flex-1 py-2.5 text-xs font-heading font-black uppercase tracking-wider transition-all duration-300 rounded-full cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'chat' ? 'bg-[#2d5da1] text-white border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]' : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-black border-2 border-transparent'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Trò chuyện</span>
            </button>
          </div>

          {activeTab === 'expenses' ? (
            // ================== TAB 1: EXPENSES LIST ==================
            <div className="flex flex-col h-full overflow-hidden justify-between">
              <div className="flex-grow overflow-y-auto pr-1 no-scrollbar space-y-3.5 min-h-[250px]">
                {expenses.length === 0 ? (
                  <div 
                    style={{ borderRadius: '20px 300px 20px 200px / 200px 20px 300px 20px' }}
                    className="text-center py-16 px-4 bg-white border-4 border-[#2d2d2d] border-dashed shadow-[4px_4px_0px_0px_#2d2d2d]"
                  >
                    <div 
                      style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                      className="w-14 h-14 border-4 border-[#2d2d2d] bg-[#2d5da1] text-white flex items-center justify-center rotate-6 shadow-[3.5px_3.5px_0px_0px_#2d2d2d] mx-auto mb-4"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                    </div>
                    <h2 className="text-xs font-heading font-black uppercase tracking-wider text-black">Không nợ ai, đời thanh thản!</h2>
                    <p className="text-[10px] font-bold text-gray-500 mt-2 max-w-[240px] mx-auto leading-relaxed">
                      Hãy chia sẻ mọi chi phí phát sinh trong chuyến đi cùng bạn bè một cách rõ ràng và minh bạch nhất.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expenses.map(expense => (
                      <div 
                        key={expense.id} 
                        style={{ borderRadius: '15px 255px 15px 225px / 225px 15px 255px 15px' }}
                        className="relative w-full border-4 border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d] bg-white group hover:shadow-[6px_6px_0px_0px_#2d2d2d] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-[-0.5deg] transition-all duration-300 overflow-hidden"
                      >
                        
                        {/* Slide/Delete background */}
                        <div className="absolute top-0 right-0 h-full w-14 bg-[#e5e0d8] flex items-center justify-center border-l-4 border-[#2d2d2d]">
                          <button
                            onClick={() => setExpenseToDelete(expense)}
                            className="text-[#2d2d2d] hover:scale-110 transition-transform cursor-pointer"
                            aria-label="Xóa khoản chi"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Actual expense card */}
                        <div
                          onClick={() => setViewingExpense(expense)}
                          className="relative bg-white p-4 cursor-pointer flex justify-between items-center pr-16 bg-halftone"
                        >
                          <div>
                            <p className="font-heading font-black text-sm uppercase tracking-wide truncate max-w-[150px] sm:max-w-[220px]">
                              {expense.itemName}
                            </p>
                            
                            <p className="text-[10px] font-bold text-gray-500 mt-1">
                                Trả bởi: {expense.payers ? (
                                <span className="text-[#ff4d4d] font-black inline-flex items-center gap-1">
                                  Nhiều người
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                </span>
                              ) : (
                                <span 
                                  style={{ borderRadius: '150px 10px 120px 10px / 10px 120px 10px 150px' }}
                                  className="text-[#2d2d2d] bg-[#2d5da1]/15 px-1.5 py-0.5 border border-[#2d2d2d] border-dashed font-sans font-bold"
                                >
                                  {getMemberName(expense.payer)}
                                </span>
                              )}
                            </p>
                          </div>
                          
                          <p 
                            style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                            className="font-heading font-black text-xs tracking-wide text-[#2d2d2d] border-2 border-[#2d2d2d] bg-[#2d5da1]/15 px-3 py-1 shadow-[2.5px_2.5px_0px_0px_#2d2d2d]"
                          >
                            {formatCurrency(expense.amount)}
                          </p>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="pt-4 border-t-4 border-[#2d2d2d] border-dashed bg-white mt-4 flex items-center gap-3">
                <button
                  onClick={onShowHistory}
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="neo-btn-press flex-1 bg-[#e5e0d8] hover:bg-[#e5e0d8]/90 text-[#2d2d2d] font-heading font-black uppercase text-xs tracking-wider py-3 border-4 border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Lịch sử
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                
                {expenses.length > 0 && (
                  <button
                    onClick={onSettleUp}
                    style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                    className="neo-btn-press flex-1 bg-[#2d5da1] hover:bg-[#2d5da1]/90 text-white font-heading font-black uppercase text-xs tracking-wider py-3 border-4 border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Quyết toán
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={onAddExpense}
                  className="neo-btn-press w-12 h-12 bg-[#ff4d4d] hover:bg-[#ff4d4d]/90 text-white rounded-full border-4 border-[#2d2d2d] flex items-center justify-center shadow-[4px_4px_0px_0px_#2d2d2d] flex-shrink-0 cursor-pointer transition-all hover:scale-110 hover:rotate-6"
                  aria-label="Thêm khoản chi"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            // ================== TAB 2: TRIP PLANNER ==================
            <div className="flex-grow overflow-hidden flex flex-col">
              <TripPlannerSection
                plans={plans}
                onSavePlans={onSavePlans}
                user={user}
                memberProfiles={memberProfiles}
              />
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Chat box (Width: 2/5 on laptop, full on mobile if in chat tab) */}
        <div className={`lg:col-span-2 flex flex-col h-full overflow-hidden ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
          <RoomChat roomId={roomId} user={user} memberProfiles={memberProfiles} nicknames={nicknames} />
        </div>

      </div>

      {/* MODAL 1: Nicknames & Members Manager */}
      {isNicknamesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="bg-white w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_#1E293B] p-5 overflow-hidden flex flex-col max-h-[85vh] rounded-2xl">
            
            <div className="flex items-center justify-between border-b-4 border-black pb-2.5 mb-4">
              <h3 className="font-heading text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Biệt danh của phòng
              </h3>
              <button
                onClick={() => {
                  setEditingUid(null);
                  setIsNicknamesOpen(false);
                }}
                className="neo-btn-press w-8 h-8 border-2 border-black bg-white flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3.5 pr-1 no-scrollbar">
              
              {/* Firebase accounts */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Thành viên tham gia phòng:</p>
                
                {Object.entries(memberProfiles).map(([uid, profile]: any) => {
                  const isEditing = editingUid === uid;
                  const currentNickname = nicknames[uid] || '';

                  return (
                    <div key={uid} className="border-2 border-black bg-gray-50 p-3 shadow-[3px_3px_0px_0px_#1E293B] flex justify-between items-center rounded-xl">
                      <div className="flex items-center gap-2 flex-grow min-w-0">
                        <img
                          src={profile.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}
                          alt={profile.displayName}
                          className="w-8 h-8 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_0px_#1E293B]"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs uppercase truncate">{profile.displayName}</p>
                          {currentNickname ? (
                            <p className="text-[10px] font-black text-neo-accent uppercase tracking-wide truncate">
                              Biệt danh: {currentNickname}
                            </p>
                          ) : (
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                              Chưa đặt biệt danh
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempNickname}
                              onChange={e => setTempNickname(e.target.value)}
                              placeholder="Đặt biệt danh..."
                              className="w-24 p-1.5 border-2 border-black text-[10px] font-black rounded-lg focus:outline-none focus:bg-white text-black focus:shadow-[2px_2px_0px_0px_#8B5CF6] transition-all"
                              maxLength={18}
                            />
                            <button
                              onClick={() => handleSaveNickname(uid)}
                              disabled={isSavingNickname}
                              className="neo-btn-press p-1.5 bg-neo-secondary border border-black shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditNicknameClick(uid)}
                            className="neo-btn-press p-1.5 bg-white border border-black shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Members list */}
              {customMembers.length > 0 && (
                <div className="space-y-3 pt-3 border-t-2 border-black border-dashed">
                  <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Thành viên tự thêm (Custom):</p>
                  
                  {customMembers.map(name => {
                    const isEditing = editingUid === name;
                    const currentNickname = nicknames[name] || '';

                    return (
                      <div key={name} className="border-2 border-black bg-gray-50 p-3 shadow-[3px_3px_0px_0px_#1E293B] flex justify-between items-center rounded-xl">
                        <div className="min-w-0">
                          <p className="font-bold text-xs uppercase truncate">{name}</p>
                          {currentNickname ? (
                            <p className="text-[10px] font-black text-neo-accent uppercase tracking-wide truncate">
                              Biệt danh: {currentNickname}
                            </p>
                          ) : (
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                              Chưa đặt biệt danh
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={tempNickname}
                                onChange={e => setTempNickname(e.target.value)}
                                placeholder="Đặt biệt danh..."
                                className="w-24 p-1.5 border-2 border-black text-[10px] font-black rounded-lg focus:outline-none focus:bg-white text-black focus:shadow-[2px_2px_0px_0px_#8B5CF6] transition-all"
                                maxLength={18}
                              />
                              <button
                                onClick={() => handleSaveNickname(name)}
                                disabled={isSavingNickname}
                                className="neo-btn-press p-1.5 bg-neo-secondary border border-black shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditNicknameClick(name)}
                              className="neo-btn-press p-1.5 bg-white border border-black shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3.5 border-t-2 border-black border-dashed flex-shrink-0">
              <button
                onClick={() => {
                  setEditingUid(null);
                  setIsNicknamesOpen(false);
                }}
                className="neo-btn-press w-full py-3 bg-neo-muted hover:bg-neo-muted/95 border-2 border-black font-heading font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1E293B] rounded-full cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Delete Expense */}
      <AnimatePresence>
        {expenseToDelete && (
          <div className="absolute inset-0 z-50 bg-black/50 flex justify-center items-center p-4">
            <motion.div
              className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_#1E293B] rounded-2xl w-full max-w-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="font-heading text-xl font-black uppercase tracking-wider border-b-2 border-black pb-2 mb-3">
                Xác nhận xóa
              </h3>
              <p className="text-xs font-bold text-gray-600 mb-6 leading-relaxed">
                Bạn có chắc chắn muốn xóa khoản chi "<span className="text-black font-black">{expenseToDelete.itemName}</span>" không? Hành động này không thể hoàn tác.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setExpenseToDelete(null)}
                  className="neo-btn-press px-5 py-2.5 bg-white hover:bg-gray-50 text-black border-2 border-black font-heading font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1E293B] rounded-full cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="neo-btn-press px-5 py-2.5 bg-neo-accent hover:bg-neo-accent/95 text-white border-2 border-black font-heading font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1E293B] rounded-full cursor-pointer"
                >
                  Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL: View Expense Details */}
      <AnimatePresence>
        {viewingExpense && (
          <ExpenseDetailModal
            expense={viewingExpense}
            getMemberName={getMemberName}
            onClose={() => setViewingExpense(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ================== SUB-COMPONENT: TRIP PLANNER ==================
const TripPlannerSection = ({
  plans,
  onSavePlans,
  user,
  memberProfiles
}: {
  plans: TripPlan[];
  onSavePlans: (newPlans: TripPlan[]) => Promise<void>;
  user: User;
  memberProfiles: { [uid: string]: any };
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const categories = [
    { emoji: '🍽️', label: 'Ăn uống' },
    { emoji: '📸', label: 'Check-in' },
    { emoji: '🚗', label: 'Di chuyển' },
    { emoji: '🏨', label: 'Lưu trú' },
    { emoji: '🎟️', label: 'Vui chơi' }
  ];

  const handleTagClick = (cat: { emoji: string; label: string }) => {
    const tagPrefix = `${cat.emoji} ${cat.label}: `;
    let cleanTitle = newTitle;
    for (const c of categories) {
      const prefix = `${c.emoji} ${c.label}: `;
      if (cleanTitle.startsWith(prefix)) {
        cleanTitle = cleanTitle.substring(prefix.length);
        break;
      }
    }
    setNewTitle(tagPrefix + cleanTitle);
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newPlan: TripPlan = {
      id: `plan-${Date.now()}`,
      title: newTitle.trim(),
      note: newNote.trim(),
      time: newTime.trim() || 'Tự do',
      createdBy: memberProfiles[user.uid]?.displayName || user.displayName || 'Anonymous',
      creatorUid: user.uid,
      votes: {}
    };
    const updated = [newPlan, ...plans];
    await onSavePlans(updated);
    setNewTitle('');
    setNewNote('');
    setNewTime('');
    setIsAdding(false);
  };

  const handleToggleVote = async (planId: string) => {
    const updated = plans.map(p => {
      if (p.id === planId) {
        const votes = { ...p.votes };
        if (votes[user.uid]) {
          delete votes[user.uid];
        } else {
          votes[user.uid] = true;
        }
        return { ...p, votes };
      }
      return p;
    });
    await onSavePlans(updated);
  };

  const handleDeletePlan = async (planId: string) => {
    if (confirm('Bạn chắc chắn muốn xóa kế hoạch hoạt động này?')) {
      const updated = plans.filter(p => p.id !== planId);
      await onSavePlans(updated);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white justify-between overflow-hidden">
      
      <div className="flex-shrink-0">
        {/* Add Plan Button/Form Toggle */}
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="neo-btn-press w-full py-3 mb-4 bg-neo-accent text-white font-heading font-black text-xs uppercase border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] rounded-full cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm kế hoạch vui chơi mới
          </button>
        ) : (
          <form onSubmit={handleAddPlan} className="bg-neo-secondary/10 p-5 border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] mb-5 space-y-3.5 select-none rounded-2xl">
            <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2">
              <h4 className="text-xs font-heading font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px] text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Tạo kế hoạch mới
              </h4>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-[10px] font-black uppercase border-b-2 border-black hover:text-gray-600 transition-colors"
              >
                Hủy
              </button>
            </div>
            
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1">Thời gian</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  placeholder="Ví dụ: 15:00 - Ngày 1, Sáng mai..."
                  className="w-full pl-9 pr-3 p-2 border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-white placeholder-gray-400 rounded-lg focus:shadow-[3px_3px_0px_0px_#8B5CF6] transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1">Tên hoạt động *</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Cùng đi ngắm hoàng hôn Tà Năng..."
                  className="w-full pl-9 pr-3 p-2 border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-white placeholder-gray-400 rounded-lg focus:shadow-[3px_3px_0px_0px_#8B5CF6] transition-all"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTagClick(cat)}
                    className="neo-btn-press text-[9px] font-heading font-black bg-white hover:bg-neo-secondary border border-black px-2 py-1 shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1">Ghi chú chi tiết</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Ghi chú địa điểm cụ thể, chi phí dự trù hoặc quần áo phù hợp..."
                  className="w-full pl-9 pr-3 pt-2 pb-2 border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-white h-16 resize-none placeholder-gray-400 rounded-lg focus:shadow-[3px_3px_0px_0px_#8B5CF6] transition-all"
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="neo-btn-press w-full py-2.5 bg-neo-accent text-white font-heading font-black text-xs uppercase border-2 border-black shadow-[3px_3px_0px_0px_#1E293B] cursor-pointer rounded-full"
            >
              Lưu kế hoạch
            </button>
          </form>
        )}
      </div>

      {/* Plan items list */}
      <div className="flex-grow overflow-y-auto pr-1 no-scrollbar space-y-4 min-h-[250px]">
        {plans.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white border-4 border-black border-dashed rounded-2xl shadow-[4px_4px_0px_0px_#1E293B]">
            <div className="w-12 h-12 border-4 border-black bg-white flex items-center justify-center rotate-6 shadow-[3px_3px_0px_0px_#1E293B] mx-auto mb-3 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-xs font-heading font-black uppercase tracking-wider text-black">Chưa có kế hoạch nào</h2>
            <p className="text-[10px] font-bold text-gray-500 mt-2 max-w-[220px] mx-auto leading-relaxed">
              Bạn muốn cùng nhóm đi đâu tiếp theo? Hãy thêm hoạt động vui chơi và cùng nhau bình chọn.
            </p>
          </div>
        ) : (
          plans.map(plan => {
            const voteCount = Object.keys(plan.votes || {}).length;
            const hasVoted = !!plan.votes?.[user.uid];
            const isCreator = plan.creatorUid === user.uid;
            
            return (
              <div key={plan.id} className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#1E293B] flex justify-between items-start gap-4 hover:shadow-[6px_6px_0px_0px_#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-[0.5deg] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-2xl">
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="bg-neo-secondary border border-black px-2.5 py-0.5 text-[9px] font-heading font-black uppercase shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full inline-flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {plan.time}
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase">
                      Bởi: {plan.createdBy}
                    </span>
                  </div>
                  <h4 className="font-heading font-black text-sm uppercase text-black mb-1 truncate">
                    {plan.title}
                  </h4>
                  {plan.note && (
                    <p className="text-[10px] font-bold text-gray-600 bg-gray-50 p-2.5 border-2 border-black border-dashed rounded-xl leading-relaxed mt-2">
                      {plan.note}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 select-none min-h-[60px]">
                  {isCreator ? (
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-black hover:scale-110 transition-transform cursor-pointer"
                      title="Xóa kế hoạch"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  ) : (
                    <div></div>
                  )}
                  
                  {/* Vote button */}
                  <button
                    onClick={() => handleToggleVote(plan.id)}
                    className={`neo-btn-press px-3 py-1 border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#1E293B] cursor-pointer text-[10px] font-heading font-black transition-colors rounded-full ${hasVoted ? 'bg-neo-accent text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3.5 w-3.5 stroke-[2.5px] ${hasVoted ? 'fill-current text-white' : 'text-black'}`}
                      fill={hasVoted ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{voteCount}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default HomeScreen;