import React, { useState, useEffect, useRef } from 'react';
import { firebaseService, User } from '../utils/firebase';
import { BANK_INFO } from '../constants';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  text: string;
  type: 'chat' | 'system' | 'settlement';
  timestamp: number;
}

interface RoomChatProps {
  roomId: string;
  user: User;
  memberProfiles?: { [uid: string]: any };
  nicknames?: { [uid: string]: string };
}

export default function RoomChat({ roomId, user, memberProfiles = {}, nicknames = {} }: RoomChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeQrInfo, setActiveQrInfo] = useState<{
    amount: number;
    debtorName: string;
    creditorName: string;
    bankId: string;
    accountNumber: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to chat messages
  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToChatMessages(roomId, (msgsList) => {
      setMessages(msgsList);
    });
    return () => unsubscribe();
  }, [roomId]);

  // 2. Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await firebaseService.writeChatMessage(roomId, user, inputText.trim(), 'chat');
      setInputText('');
    } catch (err) {
      console.error(err);
      alert('Không gửi được tin nhắn.');
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getMemberName = (displayNameOrUid: string) => {
    if (!displayNameOrUid) return 'Ẩn danh';
    if (nicknames && nicknames[displayNameOrUid]) return nicknames[displayNameOrUid];
    
    if (memberProfiles) {
      const profile = memberProfiles[displayNameOrUid];
      if (profile) return profile.displayName;

      const found = Object.entries(memberProfiles).find(([_, p]: any) => p.displayName === displayNameOrUid);
      if (found) {
        const [uid] = found;
        if (nicknames && nicknames[uid]) return nicknames[uid];
        return displayNameOrUid;
      }
    }
    return displayNameOrUid;
  };

  const renderQuickPayButton = (creditorName: string, amount: number, debtorName: string) => {
    let profile: any = null;
    let uidKey: string = '';
    if (memberProfiles) {
      if (memberProfiles[creditorName]) {
        profile = memberProfiles[creditorName];
        uidKey = creditorName;
      } else {
        const found = Object.entries(memberProfiles).find(
          ([_, p]: any) => p.displayName === creditorName
        );
        if (found) {
          uidKey = found[0];
          profile = found[1];
        }
      }
    }

    const creditorBankInfo = profile?.bankInfo || BANK_INFO[creditorName] || BANK_INFO[uidKey];

    if (!creditorBankInfo || !creditorBankInfo.bankId || !creditorBankInfo.accountNumber) {
      return null;
    }

    return (
      <button
        onClick={() => {
          setActiveQrInfo({
            amount,
            debtorName: getMemberName(debtorName),
            creditorName: getMemberName(creditorName),
            bankId: creditorBankInfo.bankId,
            accountNumber: creditorBankInfo.accountNumber
          });
        }}
        className="neo-btn-press py-1 px-2.5 bg-neo-accent hover:bg-neo-accent/90 text-white text-[10px] font-black uppercase border border-black shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full transition-colors cursor-pointer select-none"
      >
        💳 QR
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_#1E293B] rounded-2xl overflow-hidden">
      {/* Header chat */}
      <div className="bg-neo-secondary border-b-4 border-black p-3 flex items-center justify-between font-heading">
        <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-neo-mint border-2 border-black animate-pulse"></span>
          Trò chuyện nhóm 💬
        </h3>
        <span className="text-xs font-bold border-2 border-black bg-white px-2 py-0.5 shadow-[2px_2px_0px_0px_#1E293B] rounded-full">
          {messages.length} TIN NHẮN
        </span>
      </div>

      {/* Messages list */}
      <div className="flex-grow p-3 overflow-y-auto space-y-3 bg-halftone/10 min-h-[300px] max-h-[500px] lg:max-h-none">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <div className="w-12 h-12 border-4 border-black bg-white flex items-center justify-center font-bold text-xl rotate-6 shadow-[4px_4px_0px_0px_#1E293B] rounded-2xl mb-3">
              💬
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 font-heading">Chưa có tin nhắn nào</p>
            <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">Hãy gửi tin nhắn đầu tiên để kết nối mọi người!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user.uid;

            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="inline-block bg-neo-secondary/20 text-[10px] font-bold border-2 border-black border-dashed px-3 py-1 text-gray-700 tracking-wide rounded-full">
                    ⚙️ {msg.text}
                  </span>
                </div>
              );
            }

            if (msg.type === 'settlement') {
              let payload: any = null;
              try {
                payload = JSON.parse(msg.text);
              } catch (e) {
                console.error("Failed to parse settlement message:", e);
              }

              if (payload) {
                return (
                  <div key={msg.id} className="w-full my-4 border-4 border-black bg-[#FFFDF5] p-4 shadow-[4px_4px_0px_0px_#1E293B] rounded-2xl text-black">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neo-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                        </svg>
                        <h4 className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">BẢNG QUYẾT TOÁN</h4>
                      </div>
                      <span className="text-[10px] font-black uppercase border-2 border-black bg-white px-2 py-0.5 rounded-full shadow-[2px_2px_0px_0px_#1E293B]">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payload.totalAmount)}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-gray-700 mb-3 leading-relaxed">
                      👤 Người quyết toán: <span className="text-neo-accent font-black">{payload.settledBy}</span>
                    </p>

                    {payload.transactions && payload.transactions.length > 0 ? (
                      <div className="space-y-2">
                        {payload.transactions.map((tx: any, idx: number) => {
                          const fromName = getMemberName(tx.from);
                          const toName = getMemberName(tx.to);
                          return (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border-2 border-black bg-white p-2.5 rounded-xl shadow-[2px_2px_0px_0px_#1E293B] gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                <span className="font-black text-neo-muted bg-neo-muted/10 border border-neo-muted/30 px-1.5 py-0.5 rounded">
                                  {fromName}
                                </span>
                                <span className="text-gray-500 font-bold">chuyển cho</span>
                                <span className="font-black text-neo-mint bg-neo-mint/10 border border-neo-mint/30 px-1.5 py-0.5 rounded">
                                  {toName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="font-heading font-black text-xs text-black">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount)}
                                </span>
                                {renderQuickPayButton(tx.to, tx.amount, tx.from)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] font-black text-center text-gray-500 py-3 border-2 border-black border-dashed rounded-xl bg-gray-50">
                        🎉 Không có giao dịch chuyển khoản nào cần thực hiện!
                      </p>
                    )}
                    <span className="block text-[8px] text-gray-500 mt-3 text-right font-bold leading-none">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                );
              }
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 items-start ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <img
                  src={msg.senderPhoto || 'https://www.gravatar.com/avatar/?d=mp'}
                  alt={msg.senderName}
                  className="w-7 h-7 rounded-full border-2 border-black flex-shrink-0 shadow-[1px_1px_0px_0px_#1E293B]"
                  title={msg.senderName}
                />

                {/* Bubble message */}
                <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Name */}
                  {!isMe && (
                    <span className="text-[10px] font-black uppercase text-gray-600 mb-0.5 tracking-wider font-heading">
                      {msg.senderName.split(' ')[0]}
                    </span>
                  )}

                  {/* Text bubble */}
                  <div
                    className={`p-2.5 border-2 border-black text-xs font-bold shadow-[2.5px_2.5px_0px_0px_#1E293B] relative
                      ${isMe ? 'bg-neo-muted text-black rounded-2xl rounded-tr-none' : 'bg-white text-black rounded-2xl rounded-tl-none'}
                    `}
                  >
                    <p className="break-words leading-relaxed">{msg.text}</p>
                    <span className="block text-[8px] text-gray-500 mt-1 text-right leading-none">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input chat form */}
      <form onSubmit={handleSendMessage} className="border-t-4 border-black flex items-center bg-white p-2 gap-2 flex-shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-grow p-2.5 text-xs font-bold border-2 border-black rounded-lg focus:outline-none focus:shadow-[2px_2px_0px_0px_#8B5CF6] focus:bg-neo-secondary/15 transition-all text-black placeholder-gray-400"
        />
        <button
          type="submit"
          className="neo-btn-press bg-neo-accent hover:bg-neo-accent/95 py-2.5 px-4 text-xs font-black uppercase border-2 border-black shadow-[3px_3px_0px_0px_#1E293B] rounded-full flex items-center justify-center gap-1 select-none text-white cursor-pointer"
        >
          Gửi
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>

      {activeQrInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-fade-in">
          <div className="bg-white w-full max-w-sm border-4 border-black shadow-[8px_8px_0px_0px_#1E293B] p-5 overflow-hidden flex flex-col rounded-2xl relative">
            
            <div className="flex items-center justify-between border-b-4 border-black pb-2.5 mb-4">
              <h3 className="font-heading text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <span>💸 Chuyển khoản VietQR</span>
              </h3>
              <button
                onClick={() => setActiveQrInfo(null)}
                className="neo-btn-press w-8 h-8 border-2 border-black bg-white flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col items-center py-2 text-black">
              <p className="text-xs font-bold text-gray-700 text-center leading-relaxed">
                <span className="font-black text-black">{activeQrInfo.debtorName}</span> chuyển cho <span className="font-black text-black">{activeQrInfo.creditorName}</span>
              </p>
              <p className="font-heading font-black text-base text-neo-accent mt-1">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(activeQrInfo.amount)}
              </p>

              <div className="bg-white p-3 inline-block border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] my-4 rounded-2xl">
                <img
                  src={`https://img.vietqr.io/image/${activeQrInfo.bankId}-${activeQrInfo.accountNumber}-compact2.png?amount=${Math.round(activeQrInfo.amount)}&addInfo=${encodeURIComponent(`TT bill UNO ${activeQrInfo.debtorName}`)}`}
                  alt="VietQR code"
                  className="w-[180px] h-[180px] rounded-xl"
                />
              </div>

              <div className="text-left w-full space-y-1 bg-gray-50 border-2 border-black p-2.5 rounded-xl text-[10px] font-bold text-gray-600">
                <p>🏦 Ngân hàng: <span className="text-black font-black uppercase">{activeQrInfo.bankId}</span></p>
                <p>💳 Số tài khoản: <span className="text-black font-black uppercase">{activeQrInfo.accountNumber}</span></p>
                <p>📝 Nội dung: <span className="text-neo-accent font-black">TT bill UNO {activeQrInfo.debtorName}</span></p>
              </div>
            </div>

            <div className="mt-4 flex-shrink-0">
              <button
                onClick={() => setActiveQrInfo(null)}
                className="neo-btn-press w-full py-3 bg-neo-muted hover:bg-neo-muted/95 border-2 border-black font-heading font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1E293B] rounded-full cursor-pointer text-black"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
