// App.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Screen, Expense, SettledBill, Transaction } from './types';
import HomeScreen from './components/HomeScreen';
import AddExpenseWizard from './components/AddExpenseWizard';
import SettleUpScreen from './components/SettleUpScreen';
import HistoryScreen from './components/HistoryScreen';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RoomApprovalsModal from './components/RoomApprovalsModal';
import { SplitMethod } from './types';
import { firebaseService, FirebaseConfig, User, hasDefaultConfig } from './utils/firebase';

const App: React.FC = () => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(firebaseService.getIsInitialized());

  // Room state
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    return localStorage.getItem('uno_active_room_id');
  });
  const [activeRoomDetails, setActiveRoomDetails] = useState<any | null>(null);
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [myPendingRequests, setMyPendingRequests] = useState<any[]>([]);

  // UI state
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [activeBill, setActiveBill] = useState<SettledBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);

  // Manual Firebase Config UI state (for local deployment / development)
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [dbUrlInput, setDbUrlInput] = useState('');
  const [projectIdInput, setProjectIdInput] = useState('');
  const [authDomainInput, setAuthDomainInput] = useState('');

  // 1. Initial configuration check
  useEffect(() => {
    const savedConfig = localStorage.getItem('uno_custom_firebase_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        firebaseService.init(parsed);
        setIsInitialized(true);
      } catch (e) {
        console.error('Failed to parse saved firebase config', e);
      }
    }
  }, []);

  // 2. Auth listener
  useEffect(() => {
    if (!isInitialized) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = firebaseService.onAuthChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load and sync user profile
        const userProfile = await firebaseService.getUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
        setActiveRoomId(null);
        localStorage.removeItem('uno_active_room_id');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isInitialized]);

  // 3. User rooms and requests subscription
  useEffect(() => {
    if (!user || !isInitialized) return;

    const unsubRooms = firebaseService.subscribeToUserRooms(user.uid, (roomsList) => {
      setMyRooms(roomsList);
    });

    const unsubRequests = firebaseService.subscribeToJoinRequests(user.uid, (reqsList) => {
      setMyPendingRequests(reqsList);
    });

    return () => {
      unsubRooms();
      unsubRequests();
    };
  }, [user, isInitialized]);

  // 4. Active room subscription
  useEffect(() => {
    if (!activeRoomId || !user || !isInitialized) {
      setActiveRoomDetails(null);
      return;
    }

    setIsLoading(true);
    const unsubscribe = firebaseService.subscribeToRoomDetails(
      activeRoomId,
      (details) => {
        // Double-check user is still in members list
        const isMember = Object.keys(details.members || {}).includes(user.uid);
        if (!isMember && details.metadata.ownerId !== user.uid) {
          alert('Bạn không còn quyền truy cập vào phòng này.');
          handleBackToDashboard();
          return;
        }

        setActiveRoomDetails(details);
        setIsLoading(false);
      },
      (error) => {
        console.error('Room details subscription error:', error);
        alert('Lỗi kết nối phòng: ' + error.message);
        handleBackToDashboard();
      }
    );

    return () => unsubscribe();
  }, [activeRoomId, user, isInitialized]);

  // Handle custom config submit
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: FirebaseConfig = {
      apiKey: apiKeyInput.trim(),
      databaseURL: dbUrlInput.trim(),
      projectId: projectIdInput.trim(),
      authDomain: authDomainInput.trim() || `${projectIdInput.trim()}.firebaseapp.com`,
    };

    const success = firebaseService.init(newConfig);
    if (success) {
      localStorage.setItem('uno_custom_firebase_config', JSON.stringify(newConfig));
      setIsInitialized(true);
      setShowConfigForm(false);
      alert('Cấu hình Firebase thành công!');
    } else {
      alert('Cấu hình không hợp lệ. Vui lòng kiểm tra lại các trường.');
    }
  };

  // Google Login / Logout handlers
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await firebaseService.loginWithGoogle();
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      alert('Đăng nhập thất bại: ' + (error.message || 'Hủy bỏ'));
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Bạn chắc chắn muốn đăng xuất?')) {
      setIsLoading(true);
      try {
        await firebaseService.logout();
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Room selections
  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    localStorage.setItem('uno_active_room_id', roomId);
    setCurrentScreen(Screen.HOME);
  };

  const handleBackToDashboard = () => {
    setActiveRoomId(null);
    localStorage.removeItem('uno_active_room_id');
    setActiveRoomDetails(null);
  };

  const handleUpdateProfile = useCallback(async () => {
    if (user && firebaseService.getIsInitialized()) {
      const userProfile = await firebaseService.getUserProfile(user.uid);
      setProfile(userProfile);
    }
  }, [user]);

  // Active room computed members
  const allMembers = useMemo(() => {
    if (!activeRoomDetails) return [];
    const googleMembers = Object.values(activeRoomDetails.members || {}).map(
      (m: any) => m.displayName
    );
    const customMembers = activeRoomDetails.customMembers || [];
    return [...new Set([...googleMembers, ...customMembers])];
  }, [activeRoomDetails]);

  // Active room data
  const expenses = activeRoomDetails?.expenses || [];
  const settledBills = activeRoomDetails?.settledBills || [];
  const plans = activeRoomDetails?.plans || [];
  const nicknames = activeRoomDetails?.nicknames || {};

  // Add Member (Temporary)
  const handleAddMember = useCallback(
    (newMember: string) => {
      const trimmed = newMember.trim();
      if (trimmed && activeRoomId && firebaseService.getIsInitialized()) {
        const currentCustom = activeRoomDetails?.customMembers || [];
        if (!allMembers.includes(trimmed) && !currentCustom.includes(trimmed)) {
          firebaseService.writeCustomMembers(activeRoomId, [...currentCustom, trimmed]);
          if (user) {
            firebaseService.writeChatMessage(
              activeRoomId,
              user,
              `đã thêm thành viên "${trimmed}" vào phòng`,
              'system'
            );
          }
        }
      }
    },
    [allMembers, activeRoomId, activeRoomDetails, user]
  );

  // Add Expense
  const handleAddExpense = useCallback(
    (expense: Expense) => {
      if (activeRoomId && firebaseService.getIsInitialized()) {
        const updated = [...expenses, expense];
        firebaseService.writeExpenses(activeRoomId, updated);
        if (user) {
          firebaseService.writeChatMessage(
            activeRoomId,
            user,
            `đã thêm khoản chi "${expense.itemName}" - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(expense.amount)}`,
            'system'
          );
        }
      }
      setCurrentScreen(Screen.HOME);
    },
    [expenses, activeRoomId, user]
  );

  // Delete Expense
  const handleDeleteExpense = useCallback(
    (expenseId: string) => {
      if (activeRoomId && firebaseService.getIsInitialized()) {
        const expenseToDelete = expenses.find((expense) => expense.id === expenseId);
        const updated = expenses.filter((expense) => expense.id !== expenseId);
        firebaseService.writeExpenses(activeRoomId, updated);
        if (user && expenseToDelete) {
          firebaseService.writeChatMessage(
            activeRoomId,
            user,
            `đã xóa khoản chi "${expenseToDelete.itemName}" - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(expenseToDelete.amount)}`,
            'system'
          );
        }
      }
    },
    [expenses, activeRoomId, user]
  );

  // Clear data (Clear active expenses and history)
  const handleClearAllData = useCallback(() => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn xóa toàn bộ lịch sử chi tiêu và hóa đơn trong phòng này? Hành động không thể hoàn tác.'
      )
    ) {
      if (activeRoomId && firebaseService.getIsInitialized()) {
        firebaseService.clearRoomData(activeRoomId);
        if (user) {
          firebaseService.writeChatMessage(
            activeRoomId,
            user,
            `đã xóa toàn bộ dữ liệu lịch sử và chi tiêu của phòng`,
            'system'
          );
        }
        setCurrentScreen(Screen.HOME);
      }
    }
  }, [activeRoomId, user]);

  const handleSavePlans = useCallback(async (newPlans: any[]) => {
    if (activeRoomId && firebaseService.getIsInitialized()) {
      await firebaseService.writeRoomPlans(activeRoomId, newPlans);
    }
  }, [activeRoomId]);

  const handleUpdateNickname = useCallback(async (uidOrName: string, nickname: string) => {
    if (activeRoomId && firebaseService.getIsInitialized()) {
      await firebaseService.writeRoomNickname(activeRoomId, uidOrName, nickname);
    }
  }, [activeRoomId]);

  // Settle Up calculation
  const handleSettleUp = useCallback(() => {
    const balances: { [key: string]: number } = allMembers.reduce(
      (acc, member) => ({ ...acc, [member]: 0 }),
      {}
    );

    expenses.forEach((expense) => {
      // Support multiple payers
      if (expense.payers) {
        Object.entries(expense.payers).forEach(([m, amt]) => {
          if (balances[m] === undefined) balances[m] = 0;
          balances[m] += amt as number;
        });
      } else {
        if (balances[expense.payer] === undefined) balances[expense.payer] = 0;
        balances[expense.payer] += expense.amount;
      }

      if (expense.splitMethod === SplitMethod.EVENLY) {
        const share = expense.amount / expense.participants.length;
        expense.participants.forEach((p) => {
          if (balances[p] === undefined) balances[p] = 0;
          balances[p] -= share;
        });
      } else {
        expense.participants.forEach((p) => {
          if (balances[p] === undefined) balances[p] = 0;
          balances[p] -= expense.manualSplits?.[p] ?? 0;
        });
      }
    });

    const debtors = Object.entries(balances)
      .filter(([, balance]) => balance < -0.01)
      .map(([person, balance]) => ({ person, amount: balance }));

    const creditors = Object.entries(balances)
      .filter(([, balance]) => balance > 0.01)
      .map(([person, balance]) => ({ person, amount: balance }));

    const transactions: Transaction[] = [];
    const mainCreditor = creditors.sort((a, b) => b.amount - a.amount)[0];

    if (mainCreditor && debtors.length > 0) {
      // Debtors pay main creditor
      for (const debtor of debtors) {
        transactions.push({
          from: debtor.person,
          to: mainCreditor.person,
          amount: Math.abs(debtor.amount),
        });
      }

      // Main creditor pays other creditors
      const otherCreditors = creditors.filter((c) => c.person !== mainCreditor.person);
      for (const creditor of otherCreditors) {
        transactions.push({
          from: mainCreditor.person,
          to: creditor.person,
          amount: creditor.amount,
        });
      }
    }

    const newSettledBill: SettledBill = {
      id: `settled-${Date.now()}`,
      date: new Date().toLocaleString('vi-VN'),
      expenses: [...expenses],
      transactions,
      mainCreditor: mainCreditor?.person,
      settledBy: profile?.displayName || user?.displayName || 'Thành viên'
    };

    if (activeRoomId && firebaseService.getIsInitialized()) {
      firebaseService.writeExpenses(activeRoomId, []);
      firebaseService.writeSettledBills(activeRoomId, [newSettledBill, ...settledBills]);
      if (user) {
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const payload = {
          settledBy: profile?.displayName || user?.displayName || 'Thành viên',
          totalAmount,
          transactions: transactions.map(tx => ({
            from: tx.from,
            to: tx.to,
            amount: tx.amount
          }))
        };
        firebaseService.writeChatMessage(
          activeRoomId,
          user,
          JSON.stringify(payload),
          'settlement'
        );
      }
    }

    setActiveBill(newSettledBill);
    setCurrentScreen(Screen.SETTLE_UP);
  }, [expenses, settledBills, allMembers, activeRoomId, user, profile]);

  const viewHistoryDetail = (bill: SettledBill) => {
    setActiveBill(bill);
    setCurrentScreen(Screen.HISTORY_DETAIL);
  };

  // Rendering logic
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-halftone text-[#2d2d2d] p-4">
        <div 
          style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
          className="w-full max-w-sm bg-white border-4 border-[#2d2d2d] shadow-[6px_6px_0px_0px_#2d2d2d] p-8 flex flex-col items-center justify-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-[#ff4d4d] border-[#2d2d2d]/10"></div>
          <p className="mt-4 text-[#2d2d2d] font-black text-sm uppercase tracking-wide font-heading">Đang vẽ giao diện... ✏️</p>
        </div>
      </div>
    );
  }

  // SCREEN 1: LOGIN (Unauthenticated or Database not configured)
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen font-sans bg-halftone text-[#2d2d2d] p-4">
        <div 
          style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
          className="w-full max-w-md bg-white border-4 border-[#2d2d2d] shadow-[8px_8px_0px_0px_#2d2d2d] flex flex-col p-8 relative overflow-hidden"
        >
          {/* Decorative tape at top */}
          <div 
            style={{ transform: 'rotate(-2deg)' }}
            className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#e5e0d8]/60 border border-[#2d2d2d] border-dashed"
          ></div>

          <div className="text-center mb-8 mt-2">
            <h1 className="text-6xl font-black font-heading tracking-wider text-[#ff4d4d] mb-1 leading-none select-none">
              UNO
            </h1>
            <div className="h-[3px] w-24 bg-[#2d2d2d] mx-auto mt-2 mb-3"></div>
            <p className="text-[#2d2d2d] text-xs font-bold uppercase tracking-wider">
              Sổ chia tiền phòng đồng bộ Realtime 📝
            </p>
          </div>

          {isInitialized ? (
            <button
              onClick={handleLogin}
              style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
              className="neo-btn-press w-full py-3 bg-[#e5e0d8] hover:bg-[#ff4d4d] hover:text-white text-[#2d2d2d] border-2 border-[#2d2d2d] font-black flex items-center justify-center gap-3 transition-all shadow-[4px_4px_0px_0px_#2d2d2d] mb-6 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.22 1.91 15.52 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.74-.08-1.305-.176-1.859H12.24z" />
              </svg>
              Đăng nhập bằng Google
            </button>
          ) : (
            <div 
              style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
              className="p-4 bg-[#ff4d4d]/10 border-2 border-dashed border-[#ff4d4d] text-[#2d2d2d] font-black uppercase tracking-wider text-xs mb-6 text-center shadow-[3px_3px_0px_0px_#2d2d2d]"
            >
              ⚠️ Server chưa cấu hình Database. Vui lòng điền thông tin Firebase bên dưới để chạy nhé!
            </div>
          )}

          <div className="border-t-2 border-[#2d2d2d] border-dashed pt-4">
            <button
              onClick={() => setShowConfigForm(!showConfigForm)}
              style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
              className="neo-btn-press w-full py-2 border-2 border-[#2d2d2d] bg-[#fdfbf7] hover:bg-[#e5e0d8] text-[#2d2d2d] font-bold text-xs uppercase shadow-[3px_3px_0px_0px_#2d2d2d] transition-all cursor-pointer"
            >
              {showConfigForm ? 'Ẩn cấu hình Server' : 'Cấu hình Server thủ công'}
            </button>

            {showConfigForm && (
              <form onSubmit={handleSaveConfig} className="mt-4 space-y-3 animate-fade-in text-left">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#2d2d2d] mb-1">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                    className="w-full p-2 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#2d2d2d] mb-1">
                    Database URL
                  </label>
                  <input
                    type="text"
                    value={dbUrlInput}
                    onChange={(e) => setDbUrlInput(e.target.value)}
                    placeholder="https://your-db.firebaseio.com"
                    style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                    className="w-full p-2 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#2d2d2d] mb-1">
                    Project ID
                  </label>
                  <input
                    type="text"
                    value={projectIdInput}
                    onChange={(e) => setProjectIdInput(e.target.value)}
                    style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                    className="w-full p-2 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#2d2d2d] mb-1">
                    Auth Domain (Không bắt buộc)
                  </label>
                  <input
                    type="text"
                    value={authDomainInput}
                    onChange={(e) => setAuthDomainInput(e.target.value)}
                    placeholder="your-project.firebaseapp.com"
                    style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                    className="w-full p-2 bg-white border-2 border-[#2d2d2d] text-xs font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#2d5da1] text-[#2d2d2d] placeholder-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  style={{ borderRadius: '255px 20px 225px 20px / 20px 225px 20px 255px' }}
                  className="neo-btn-press w-full py-2 bg-[#2d5da1] hover:bg-[#ff4d4d] text-white font-black border-2 border-[#2d2d2d] text-xs uppercase shadow-[3px_3px_0px_0px_#2d2d2d] transition-all cursor-pointer"
                >
                  Kết nối & Lưu cấu hình 💾
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: DASHBOARD (Logged in, but no active room)
  if (!activeRoomId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-halftone p-2 sm:p-4 text-[#2d2d2d]">
        <div 
          style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
          className="w-full max-w-5xl min-h-[85vh] bg-[#fdfbf7] border-4 border-[#2d2d2d] shadow-[10px_10px_0px_0px_#2d2d2d] flex flex-col relative overflow-hidden"
        >
          <Dashboard
            user={user}
            profile={profile}
            rooms={myRooms}
            pendingRequests={myPendingRequests}
            onSelectRoom={handleSelectRoom}
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
          />
        </div>
      </div>
    );
  }

  // SCREEN 3: ACTIVE ROOM (Main Splitter screens)
  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.ADD_EXPENSE:
        return (
          <AddExpenseWizard
            members={allMembers}
            onAddMember={handleAddMember}
            onComplete={handleAddExpense}
            onCancel={() => setCurrentScreen(Screen.HOME)}
          />
        );
      case Screen.SETTLE_UP:
        return activeBill ? (
          <SettleUpScreen
            bill={activeBill}
            members={allMembers}
            memberProfiles={activeRoomDetails?.members || {}}
            nicknames={nicknames}
            onGoHome={() => {
              setActiveBill(null);
              setCurrentScreen(Screen.HOME);
            }}
          />
        ) : null;
      case Screen.HISTORY:
        return (
          <HistoryScreen
            bills={settledBills}
            members={allMembers}
            onViewBill={viewHistoryDetail}
            onBack={() => setCurrentScreen(Screen.HOME)}
            onClearAllData={handleClearAllData}
          />
        );
      case Screen.HISTORY_DETAIL:
        return activeBill ? (
          <SettleUpScreen
            bill={activeBill}
            members={allMembers}
            memberProfiles={activeRoomDetails?.members || {}}
            nicknames={nicknames}
            onGoHome={() => {
              setActiveBill(null);
              setCurrentScreen(Screen.HISTORY);
            }}
            isHistoryView={true}
          />
        ) : null;
      case Screen.HOME:
      default:
        return (
          <HomeScreen
            roomId={activeRoomId || ''}
            user={user!}
            expenses={expenses}
            memberProfiles={activeRoomDetails?.members || {}}
            customMembers={activeRoomDetails?.customMembers || []}
            pendingRequestsCount={Object.keys(activeRoomDetails?.requests || {}).length}
            nicknames={nicknames}
            plans={plans}
            onOpenApprovals={() => setIsApprovalsOpen(true)}
            onAddExpense={() => setCurrentScreen(Screen.ADD_EXPENSE)}
            onSettleUp={handleSettleUp}
            onShowHistory={() => setCurrentScreen(Screen.HISTORY)}
            onDeleteExpense={handleDeleteExpense}
            onSavePlans={handleSavePlans}
            onUpdateNickname={handleUpdateNickname}
          />
        );
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-halftone p-2 sm:p-4 text-[#2d2d2d]">
      <div 
        style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
        className="w-full max-w-md lg:max-w-5xl h-[95vh] max-h-[900px] bg-white border-4 border-[#2d2d2d] shadow-[8px_8px_0px_0px_#2d2d2d] lg:shadow-[12px_12px_0px_0px_#2d2d2d] flex flex-col relative overflow-hidden"
      >
        <Header
          user={user}
          activeRoomId={activeRoomId}
          activeRoomName={activeRoomDetails?.metadata?.name || 'Đang nạp...'}
          isOwner={activeRoomDetails?.metadata?.ownerId === user.uid}
          pendingRequestsCount={Object.keys(activeRoomDetails?.requests || {}).length}
          onBackToDashboard={handleBackToDashboard}
          onOpenApprovals={() => setIsApprovalsOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-grow flex flex-col overflow-y-auto p-4 lg:p-6 no-scrollbar">
          {renderScreen()}
        </main>
      </div>

      {isApprovalsOpen && activeRoomId && (
        <RoomApprovalsModal
          roomId={activeRoomId}
          requests={activeRoomDetails?.requests || {}}
          onClose={() => setIsApprovalsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
