import React, { useState, useMemo } from 'react';
import { Member, Expense, SplitMethod } from '../types';

enum WizardStep {
  SELECT_PAYER,
  SELECT_PARTICIPANTS,
  ENTER_AMOUNT,
  ENTER_ITEM_NAME,
  SELECT_SPLIT_METHOD,
  MANUAL_SPLIT,
  ADD_MEMBER,
}

interface AddExpenseWizardProps {
  members: Member[];
  onAddMember: (name: string) => void;
  onComplete: (expense: Expense) => void;
  onCancel: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const AddExpenseWizard: React.FC<AddExpenseWizardProps> = ({ members, onAddMember, onComplete, onCancel }) => {
  const [step, setStep] = useState<WizardStep>(WizardStep.SELECT_PAYER);
  const [payer, setPayer] = useState<Member | null>(null);
  const [participants, setParticipants] = useState<Member[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [itemName, setItemName] = useState('');
  const [manualSplits, setManualSplits] = useState<{ [key: Member]: number }>({});
  const [newMemberName, setNewMemberName] = useState('');
  const [cameFromStep, setCameFromStep] = useState<WizardStep>(WizardStep.SELECT_PAYER);

  // Multiple Payer state
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);
  const [multiplePayers, setMultiplePayers] = useState<{ [key: Member]: number }>({});

  const totalMultiplePayersPaid = useMemo(() => {
    return Object.values(multiplePayers).reduce((sum: number, val) => sum + ((val as number) || 0), 0);
  }, [multiplePayers]);

  const totalManualSplit = useMemo(() => {
    return Object.values(manualSplits).reduce((sum: number, val) => sum + ((val as number) || 0), 0);
  }, [manualSplits]);

  const handleAddNewMember = () => {
    const trimmedName = newMemberName.trim();
    if (trimmedName && !members.includes(trimmedName)) {
      onAddMember(trimmedName);
    }
    setNewMemberName('');
  };

  const handleSelectPayer = (member: Member) => {
    setPayer(member);
    setParticipants([member]);
    setStep(WizardStep.SELECT_PARTICIPANTS);
  };

  const handleNextMultiplePayers = () => {
    if (totalMultiplePayersPaid <= 0) return;
    setAmount(totalMultiplePayersPaid);
    setPayer("Nhiều người");
    // Default to all room members participating in the split
    setParticipants([...members]);
    setStep(WizardStep.SELECT_PARTICIPANTS);
  };

  const handleToggleParticipant = (member: Member) => {
    setParticipants(prev =>
      prev.includes(member) ? prev.filter(p => p !== member) : [...prev, member]
    );
  };

  const handleCompleteManualSplit = () => {
    if (Math.abs(totalManualSplit - amount) > 0.01) {
      alert("Tổng số tiền chia thủ công phải bằng tổng chi phí.");
      return;
    }
    if (payer && participants.length > 0 && amount > 0 && itemName) {
      onComplete({
        id: `exp-${Date.now()}`,
        payer,
        payers: isMultiplePayers ? multiplePayers : undefined,
        participants,
        amount,
        itemName,
        splitMethod: SplitMethod.MANUALLY,
        manualSplits,
      });
    }
  };

  const renderStep = () => {
    switch (step) {
      case WizardStep.SELECT_PAYER:
        return (
          <div className="flex flex-col h-full bg-white p-4">
            
            {/* Toggle Single vs Multiple Payers */}
            <div className="flex p-1.5 border-4 border-black mb-5 select-none bg-white rounded-full">
              <button
                type="button"
                onClick={() => setIsMultiplePayers(false)}
                className={`w-1/2 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-full cursor-pointer ${!isMultiplePayers ? 'bg-neo-accent text-white shadow-[2px_2px_0px_0px_#1E293B] border-2 border-black' : 'bg-transparent text-gray-500 hover:text-black border-2 border-transparent'}`}
              >
                Một người trả 👤
              </button>
              <button
                type="button"
                onClick={() => setIsMultiplePayers(true)}
                className={`w-1/2 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-full cursor-pointer ${isMultiplePayers ? 'bg-neo-accent text-white shadow-[2px_2px_0px_0px_#1E293B] border-2 border-black' : 'bg-transparent text-gray-500 hover:text-black border-2 border-transparent'}`}
              >
                Nhiều người trả 👥
              </button>
            </div>

            <div className="text-center mb-5">
              <h2 className="inline-block bg-neo-muted border-2 border-black px-4 py-1.5 text-xs font-heading font-black uppercase tracking-wider rounded-full shadow-[3px_3px_0px_0px_#1E293B] text-black">
                {isMultiplePayers ? '👥 Nhập số tiền từng người đã trả' : '👤 Ai là người trả tiền?'}
              </h2>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-1 no-scrollbar space-y-3 min-h-[300px]">
              {!isMultiplePayers ? (
                // Single Payer list
                members.map(item => (
                  <button
                    key={item}
                    onClick={() => handleSelectPayer(item)}
                    className="neo-btn-press w-full text-left p-4 bg-white border-4 border-black hover:bg-neo-muted/10 text-black font-black uppercase text-xs shadow-[4px_4px_0px_0px_#1E293B] rounded-2xl transition-all cursor-pointer"
                  >
                    {item}
                  </button>
                ))
              ) : (
                // Multiple Payers inputs
                members.map(member => (
                  <div key={member} className="flex items-center justify-between border-4 border-black bg-white p-3 shadow-[3px_3px_0px_0px_#1E293B] rounded-2xl">
                    <span className="text-xs font-black uppercase">{member}</span>
                    <input
                      type="number"
                      placeholder="Đã trả 0"
                      value={multiplePayers[member] || ''}
                      onChange={e => setMultiplePayers({ ...multiplePayers, [member]: parseFloat(e.target.value) || 0 })}
                      className="w-32 p-2 border-2 border-black text-right text-xs font-black focus:outline-none focus:bg-neo-secondary/15 text-black rounded-lg focus:shadow-[2px_2px_0px_0px_#8B5CF6] focus:border-neo-accent transition-all"
                    />
                  </div>
                ))
              )}
            </div>

            <div className="flex-shrink-0 pt-4 mt-2 border-t-4 border-black border-dashed flex flex-col gap-3">
              {isMultiplePayers && (
                <div className="flex justify-between items-center bg-white p-3 border-2 border-black font-black text-xs uppercase rounded-xl shadow-[3px_3px_0px_0px_#1E293B]">
                  <span>Tổng tiền đã trả:</span>
                  <span className="text-neo-accent">{formatCurrency(totalMultiplePayersPaid)}</span>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCameFromStep(WizardStep.SELECT_PAYER);
                    setStep(WizardStep.ADD_MEMBER);
                  }}
                  className="neo-btn-press flex-grow py-3 bg-neo-muted hover:bg-neo-muted/90 text-black border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_#1E293B] rounded-full cursor-pointer"
                >
                  ➕ Thêm người tạm thời
                </button>
                
                {isMultiplePayers ? (
                  <button
                    onClick={handleNextMultiplePayers}
                    disabled={totalMultiplePayersPaid <= 0}
                    className="neo-btn-press w-1/2 py-3 bg-neo-accent hover:bg-neo-accent/90 text-white border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_#1E293B] rounded-full cursor-pointer disabled:opacity-50"
                  >
                    Tiếp theo
                  </button>
                ) : (
                  <button
                    onClick={onCancel}
                    className="neo-btn-press w-1/3 py-3 bg-white hover:bg-gray-50 text-black border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_#1E293B] rounded-full cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case WizardStep.SELECT_PARTICIPANTS:
        return (
          <div className="flex flex-col h-full bg-white p-4">
            <div className="text-center my-4">
              <h2 className="inline-block bg-neo-secondary border-2 border-black px-4 py-1.5 text-xs font-heading font-black uppercase tracking-wider rounded-full shadow-[3px_3px_0px_0px_#1E293B] text-black">
                👥 Ai cùng tham gia chia tiền?
              </h2>
            </div>

            <div className="flex-grow overflow-y-auto pr-1 no-scrollbar space-y-3 min-h-[300px]">
              {members.map(item => {
                const isSelected = participants.includes(item);
                return (
                  <div
                    key={item}
                    onClick={() => handleToggleParticipant(item)}
                    className={`w-full flex items-center justify-between p-4 border-4 border-black cursor-pointer shadow-[3px_3px_0px_0px_#1E293B] transition-all rounded-2xl
                      ${isSelected ? 'bg-neo-muted/15' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <span className="text-xs font-black uppercase">{item}</span>
                    <div className={`w-6 h-6 border-2 border-black rounded-md flex items-center justify-center transition-all shadow-[1.5px_1.5px_0px_0px_#1E293B]
                      ${isSelected ? 'bg-neo-secondary' : 'bg-white'}`}
                    >
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex-shrink-0 pt-4 mt-2 border-t-4 border-black border-dashed space-y-3">
              <button
                onClick={() => {
                  setCameFromStep(WizardStep.SELECT_PARTICIPANTS);
                  setStep(WizardStep.ADD_MEMBER);
                }}
                className="neo-btn-press w-full py-3 bg-white hover:bg-gray-50 text-black border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_#1E293B] rounded-full cursor-pointer"
              >
                ➕ Thêm thành viên tạm thời
              </button>
              <div className="flex justify-between items-center gap-3">
                <button
                  onClick={() => setStep(WizardStep.SELECT_PAYER)}
                  className="neo-btn-press w-12 h-12 bg-white hover:bg-gray-50 border-4 border-black shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center rounded-full cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (isMultiplePayers) {
                      setStep(WizardStep.ENTER_ITEM_NAME);
                    } else {
                      setStep(WizardStep.ENTER_AMOUNT);
                    }
                  }}
                  disabled={participants.length === 0}
                  className="neo-btn-press w-12 h-12 bg-neo-accent hover:bg-neo-accent/90 text-white border-4 border-black shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center rounded-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );

      case WizardStep.ADD_MEMBER:
        return (
          <div className="flex flex-col h-full bg-white p-4">
            <div className="text-center my-4">
              <h2 className="inline-block bg-neo-secondary border-2 border-black px-4 py-1.5 text-xs font-heading font-black uppercase tracking-wider rounded-full shadow-[3px_3px_0px_0px_#1E293B] text-black">
                👤 Thêm thành viên mới
              </h2>
            </div>
            
            <div className="flex-grow flex flex-col overflow-hidden min-h-[300px]">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newMemberName.trim() && !members.includes(newMemberName.trim())) {
                        handleAddNewMember();
                      }
                    }
                  }}
                  placeholder="Nhập tên thành viên..."
                  className="flex-grow p-3 border-4 border-black rounded-xl text-xs font-black focus:outline-none focus:bg-neo-secondary/10 text-black placeholder-gray-400 focus:shadow-[2px_2px_0px_0px_#8B5CF6] focus:border-neo-accent transition-all"
                  autoFocus
                />
                <button
                  onClick={handleAddNewMember}
                  className="neo-btn-press px-4 py-3 bg-neo-accent hover:bg-neo-accent/90 text-white border-4 border-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1E293B] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={!newMemberName.trim() || members.includes(newMemberName.trim())}
                >
                  Thêm
                </button>
              </div>

              <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Thành viên phòng hiện tại:</p>
              <div className="flex-grow overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {members.map(member => (
                  <div key={member} className="bg-white border-2 border-black p-2.5 font-bold text-xs uppercase rounded-xl shadow-[2px_2px_0px_0px_#1E293B]">
                    {member}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 pt-4 mt-4 border-t-4 border-black border-dashed">
              <button
                onClick={() => setStep(cameFromStep)}
                className="neo-btn-press w-full py-3 bg-neo-secondary hover:bg-neo-secondary/90 text-black border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_#1E293B] rounded-full cursor-pointer"
              >
                Xong
              </button>
            </div>
          </div>
        );

      case WizardStep.ENTER_AMOUNT:
        return (
          <div className="flex flex-col h-full bg-white p-4 justify-between min-h-[400px]">
            <div className="text-center my-4">
              <h2 className="inline-block bg-neo-secondary border-2 border-black px-4 py-1.5 text-xs font-heading font-black uppercase tracking-wider rounded-full shadow-[3px_3px_0px_0px_#1E293B] text-black">
                💰 Chi phí hết bao nhiêu tiền?
              </h2>
            </div>
            
            <div className="flex items-center gap-3 px-5 py-3 border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] bg-white rounded-2xl focus-within:shadow-[4px_4px_0px_0px_#8B5CF6] focus-within:border-neo-accent transition-all">
              <input
                type="number"
                value={amount || ''}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full p-2 text-right text-4xl font-black bg-transparent focus:outline-none text-neo-accent placeholder-gray-300"
                placeholder="0"
                autoFocus
              />
              <span className="text-2xl font-black text-black select-none">VNĐ</span>
            </div>

            <div className="pt-4 border-t-4 border-black border-dashed flex justify-between items-center gap-3">
              <button
                onClick={() => setStep(WizardStep.SELECT_PARTICIPANTS)}
                className="neo-btn-press w-12 h-12 bg-white hover:bg-gray-50 border-4 border-black shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center rounded-full cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => amount > 0 && setStep(WizardStep.ENTER_ITEM_NAME)}
                disabled={amount <= 0}
                className="neo-btn-press w-12 h-12 bg-neo-accent hover:bg-neo-accent/90 text-white border-4 border-black shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center rounded-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        );

      case WizardStep.ENTER_ITEM_NAME:
        return (
          <div className="flex flex-col h-full bg-white p-4 justify-between min-h-[400px]">
            <div className="text-center my-4">
              <h2 className="inline-block bg-neo-secondary border-2 border-black px-4 py-1.5 text-xs font-heading font-black uppercase tracking-wider rounded-full shadow-[3px_3px_0px_0px_#1E293B] text-black">
                📝 Chi tiêu cho khoản gì?
              </h2>
            </div>
            
            <div className="px-2">
              <input
                type="text"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                className="w-full p-4 border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] bg-white text-xl font-black text-black placeholder-gray-300 focus:outline-none focus:bg-neo-secondary/10 rounded-2xl focus:shadow-[4px_4px_0px_0px_#8B5CF6] focus:border-neo-accent transition-all"
                placeholder="VD: Tiền phòng, Ăn tối..."
                autoFocus
              />
            </div>

            <div className="pt-4 border-t-4 border-black border-dashed flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  if (isMultiplePayers) {
                    setStep(WizardStep.SELECT_PARTICIPANTS);
                  } else {
                    setStep(WizardStep.ENTER_AMOUNT);
                  }
                }}
                className="neo-btn-press w-12 h-12 bg-white hover:bg-gray-50 border-4 border-black shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center rounded-full cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => itemName.trim() && setStep(WizardStep.SELECT_SPLIT_METHOD)}
                disabled={!itemName.trim()}
                className="neo-btn-press w-12 h-12 bg-neo-accent hover:bg-neo-accent/90 text-white border-4 border-black shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center rounded-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        );

      case WizardStep.SELECT_SPLIT_METHOD:
        return (
          <div className="flex flex-col items-center justify-center h-full bg-white p-6 space-y-6 min-h-[400px]">
            <h2 className="inline-block bg-neo-secondary border-2 border-black px-4 py-1.5 text-xs font-heading font-black uppercase tracking-wider rounded-full shadow-[3px_3px_0px_0px_#1E293B] text-black mb-4">
              ⚖️ Lựa chọn phương án chia
            </h2>
            <button
              onClick={() => onComplete({
                id: `exp-${Date.now()}`,
                payer: payer!,
                payers: isMultiplePayers ? multiplePayers : undefined,
                participants,
                amount,
                itemName,
                splitMethod: SplitMethod.EVENLY
              })}
              className="neo-btn-press w-full bg-neo-secondary hover:bg-neo-secondary/90 border-4 border-black font-black uppercase py-4 shadow-[6px_6px_0px_0px_#1E293B] text-black cursor-pointer text-sm tracking-wider rounded-2xl"
            >
              Chia đều cho mọi người
            </button>
            <button
              onClick={() => setStep(WizardStep.MANUAL_SPLIT)}
              className="neo-btn-press w-full bg-neo-muted hover:bg-neo-muted/90 border-4 border-black font-black uppercase py-4 shadow-[6px_6px_0px_0px_#1E293B] text-black cursor-pointer text-sm tracking-wider rounded-2xl"
            >
              Chia tiền thủ công
            </button>
            <button
              className="mt-6 text-xs font-black uppercase border-b-2 border-black cursor-pointer hover:text-gray-600 transition-colors"
              onClick={() => setStep(WizardStep.ENTER_ITEM_NAME)}
            >
              Quay lại bước trước
            </button>
          </div>
        );

      case WizardStep.MANUAL_SPLIT:
        return (
          <div className="flex flex-col h-full bg-white p-4">
            <div className="text-center my-4">
              <h2 className="inline-block bg-neo-secondary border-2 border-black px-4 py-1.5 text-xs font-heading font-black uppercase tracking-wider rounded-full shadow-[3px_3px_0px_0px_#1E293B] text-black">
                ✍️ Nhập số tiền cụ thể
              </h2>
            </div>
            
            <p className={`text-center font-black text-xs uppercase mb-4 border-2 border-black inline-block mx-auto px-4 py-1.5 rounded-full shadow-[2.5px_2.5px_0px_0px_#1E293B]
              ${Math.abs(totalManualSplit - amount) < 0.01 ? 'bg-neo-mint/20 text-neo-fg' : 'bg-neo-muted/20 text-neo-accent'}`}
            >
              Tổng chia: {formatCurrency(totalManualSplit)} / {formatCurrency(amount)}
            </p>

            <div className="flex-grow overflow-y-auto pr-1 no-scrollbar space-y-3 min-h-[250px]">
              {participants.map(p => (
                <div key={p} className="flex items-center justify-between border-4 border-black bg-white p-3 shadow-[3px_3px_0px_0px_#1E293B] rounded-2xl">
                  <span className="text-xs font-black uppercase">{p}</span>
                  <input
                    type="number"
                    placeholder="Số tiền"
                    value={manualSplits[p] || ''}
                    onChange={e => setManualSplits({ ...manualSplits, [p]: parseFloat(e.target.value) || 0 })}
                    className="w-32 p-2 border-2 border-black text-right text-xs font-black focus:outline-none focus:bg-neo-secondary/15 text-black rounded-lg focus:shadow-[2px_2px_0px_0px_#8B5CF6] focus:border-neo-accent transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t-4 border-black border-dashed flex justify-between items-center gap-3">
              <button
                onClick={() => setStep(WizardStep.SELECT_SPLIT_METHOD)}
                className="neo-btn-press w-12 h-12 bg-white hover:bg-gray-50 border-4 border-black shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center rounded-full cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleCompleteManualSplit}
                disabled={Math.abs(totalManualSplit - amount) > 0.01}
                className="neo-btn-press w-12 h-12 bg-neo-accent hover:bg-neo-accent/90 text-white border-4 border-black shadow-[3px_3px_0px_0px_#1E293B] flex items-center justify-center rounded-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        );
    }
  };

  return <div className="flex flex-col h-full animate-fade-in">{renderStep()}</div>;
};

export default AddExpenseWizard;