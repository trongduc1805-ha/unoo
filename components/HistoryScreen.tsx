// components/HistoryScreen.tsx
import React, { useState } from 'react';
import { SettledBill, Member, SplitMethod } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const toUnaccented = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const ROBOTO_FONT_URL = 'https://cdn.jsdelivr.net/npm/roboto-fontface@0.10.0/fonts/roboto/Roboto-Regular.ttf';

const fetchFontAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Font fetch failed');
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const handleDownloadPdf = async (bill: SettledBill, allMembers: Member[], onLoadingChange?: (loading: boolean) => void) => {
  if (onLoadingChange) onLoadingChange(true);
  
  let fontBase64 = '';
  try {
    fontBase64 = await fetchFontAsBase64(ROBOTO_FONT_URL);
  } catch (e) {
    console.warn("Failed to fetch Vietnamese font, falling back to Helvetica unaccented:", e);
  } finally {
    if (onLoadingChange) onLoadingChange(false);
  }

  const doc = new jsPDF({ orientation: 'landscape' });
  const isVietnameseLoaded = !!fontBase64;

  if (isVietnameseLoaded) {
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  const cleanText = (txt: string) => {
    return isVietnameseLoaded ? txt : toUnaccented(txt);
  };

  // Report Header
  doc.setFontSize(18);
  doc.text(cleanText('UNO BÁO CÁO QUYẾT TOÁN CHI TIÊU'), 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    cleanText(`Ngày quyết toán: ${bill.date} - Quyết toán bởi: ${bill.settledBy || 'Thành viên nhóm'}`),
    14,
    29
  );

  // --- Data Preparation ---
  const formatNumber = (amount: number) => new Intl.NumberFormat('en-US').format(Math.round(amount));

  const expenseNames = [...new Set(bill.expenses.map(e => e.itemName))].sort();

  // Find all members who either paid or participated
  const participatingMembers = allMembers.filter(m =>
    bill.expenses.some(e => {
      const isPayer = e.payers ? Object.keys(e.payers).includes(m) : e.payer === m;
      return isPayer || e.participants.includes(m);
    })
  );

  const memberData: {
    [key: Member]: {
      totalPaid: number;
      totalShare: number;
      shares: { [expenseName: string]: number };
    }
  } = {};

  participatingMembers.forEach(m => {
    memberData[m] = { totalPaid: 0, totalShare: 0, shares: {} };
  });

  bill.expenses.forEach(expense => {
    // 1. Calculate how much they paid (supports multiple payers)
    if (expense.payers) {
      Object.entries(expense.payers).forEach(([m, paidAmt]) => {
        if (!memberData[m]) {
          memberData[m] = { totalPaid: 0, totalShare: 0, shares: {} };
        }
        memberData[m].totalPaid += paidAmt;
      });
    } else {
      if (!memberData[expense.payer]) {
        memberData[expense.payer] = { totalPaid: 0, totalShare: 0, shares: {} };
      }
      memberData[expense.payer].totalPaid += expense.amount;
    }

    // 2. Calculate share split
    let share = 0;
    if (expense.splitMethod === SplitMethod.EVENLY && expense.participants.length > 0) {
      share = expense.amount / expense.participants.length;
    }

    expense.participants.forEach(p => {
      const individualShare = expense.splitMethod === SplitMethod.EVENLY ? share : (expense.manualSplits?.[p] ?? 0);
      if (!memberData[p]) {
        memberData[p] = { totalPaid: 0, totalShare: 0, shares: {} };
      }
      memberData[p].totalShare += individualShare;
      memberData[p].shares[expense.itemName] = (memberData[p].shares[expense.itemName] || 0) + individualShare;
    });
  });

  // --- Table Creation ---
  const head = [[
    cleanText('Thành viên'),
    ...expenseNames.map(cleanText),
    cleanText('Số đã trả'),
    cleanText('Số dư ròng')
  ]];

  const body: (string | object)[][] = participatingMembers.map(member => {
    const data = memberData[member];
    const netBalance = data.totalPaid - data.totalShare;
    const expenseShares = expenseNames.map(name =>
      formatNumber(data.shares[name] || 0)
    );
    return [
      cleanText(member),
      ...expenseShares,
      formatNumber(data.totalPaid),
      {
        content: formatNumber(netBalance),
        styles: { textColor: netBalance >= 0 ? [0, 100, 0] : [220, 38, 38] } // Dark Green / Red
      }
    ];
  });

  // --- SUM Row ---
  const sumRow: (string | object)[] = [{ content: cleanText('TỔNG CỘNG'), styles: { fontStyle: 'bold' } }];

  const expenseTotals = expenseNames.map(name => {
    return bill.expenses
      .filter(e => e.itemName === name)
      .reduce((sum, e) => sum + e.amount, 0);
  });
  sumRow.push(...expenseTotals.map(t => ({ content: formatNumber(t), styles: { fontStyle: 'bold' } })));

  const totalPaidSum = Object.values(memberData).reduce((sum, data) => sum + data.totalPaid, 0);
  sumRow.push({ content: formatNumber(totalPaidSum), styles: { fontStyle: 'bold' } });

  const totalNetSum = Object.values(memberData).reduce((sum, data) => sum + (data.totalPaid - data.totalShare), 0);
  sumRow.push({ content: formatNumber(totalNetSum), styles: { fontStyle: 'bold' } });

  body.push(sumRow);

  autoTable(doc, {
    startY: 40,
    head: head,
    body: body,
    theme: 'grid',
    styles: isVietnameseLoaded ? { font: 'Roboto', fontStyle: 'normal' } : undefined,
    headStyles: { fillColor: '#FFD93D', textColor: '#000000', fontStyle: 'bold' },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fillColor = '#C4B5FD';
      }
      if (data.column.index > 0) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  const pdfName = cleanText(`UNO_BaoCao_${bill.date.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  doc.save(pdfName);
};

interface HistoryScreenProps {
  bills: SettledBill[];
  members: Member[];
  onViewBill: (bill: SettledBill) => void;
  onBack: () => void;
  onClearAllData?: () => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({
  bills,
  members,
  onViewBill,
  onBack,
  onClearAllData
}) => {
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const handleClearData = () => {
    if (onClearAllData && confirm('BẠN CÓ CHẮC CHẮN muốn xóa toàn bộ lịch sử quyết toán của phòng này? Hành động này không thể khôi phục!')) {
      onClearAllData();
    }
  };

  const getTotalExpenses = () => {
    return bills.reduce((total, bill) => total + bill.expenses.length, 0);
  };

  const getTotalAmount = () => {
    return bills.reduce((total, bill) => {
      const billTotal = bill.expenses.reduce((sum, expense) => sum + expense.amount, 0);
      return total + billTotal;
    }, 0);
  };

  return (
    <div className="flex flex-col h-full bg-white p-4 animate-fade-in select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b-2 border-black border-dashed pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="neo-btn-press w-9 h-9 border-2 border-black flex items-center justify-center bg-neo-secondary shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="inline-block bg-neo-muted border-2 border-black px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full">
            📜 Lịch sử quyết toán
          </h2>
        </div>

        {/* Clear data button */}
        {onClearAllData && bills.length > 0 && (
          <button
            onClick={handleClearData}
            className="neo-btn-press w-9 h-9 border-2 border-black flex items-center justify-center bg-neo-accent text-white shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full hover:bg-neo-accent/95 cursor-pointer"
            title="Xóa tất cả lịch sử"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Statistics */}
      {bills.length > 0 && (
        <div className="mb-4 p-4 border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] bg-white rounded-2xl">
          <div className="grid grid-cols-2 gap-4 text-center border-b-2 border-black border-dashed pb-3">
            <div>
              <p className="text-xl font-black text-black">{bills.length}</p>
              <p className="text-[9px] font-black uppercase text-gray-500">Lần quyết toán</p>
            </div>
            <div>
              <p className="text-xl font-black text-black">{getTotalExpenses()}</p>
              <p className="text-[9px] font-black uppercase text-gray-500">Khoản chi</p>
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-sm font-black uppercase">
              Tổng tiền: <span className="bg-neo-secondary px-2.5 py-0.5 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#1E293B]">{formatCurrency(getTotalAmount())}</span>
            </p>
          </div>
        </div>
      )}

      {/* Bills List */}
      <div className="flex-grow overflow-y-auto pr-1 no-scrollbar space-y-4 min-h-[300px]">
        {bills.length === 0 ? (
          <div className="text-center py-16 px-4 bg-gray-50 border-4 border-black border-dashed rounded-2xl">
            <div className="w-12 h-12 border-4 border-black bg-white flex items-center justify-center font-bold text-xl -rotate-6 shadow-[3px_3px_0px_0px_#1E293B] mx-auto mb-3 rounded-xl">
              📝
            </div>
            <h2 className="text-sm font-black uppercase tracking-wider">Chưa có lịch sử</h2>
            <p className="text-[10px] font-bold text-gray-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
              Các hóa đơn sau khi hoàn thành thanh toán sẽ được lưu trữ tự động tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill, index) => {
              const totalAmount = bill.expenses.reduce((sum, expense) => sum + expense.amount, 0);
              const isRecent = index === 0;

              return (
                <div
                  key={bill.id}
                  className="p-4 border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] bg-white hover:shadow-[6px_6px_0px_0px_#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex justify-between items-center animate-fade-in rounded-2xl"
                >
                  <div onClick={() => onViewBill(bill)} className="flex-grow cursor-pointer pr-4 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-xs uppercase tracking-wide truncate">
                        Quyết toán #{bills.length - index}
                      </p>
                      {isRecent && (
                        <span className="text-[8px] font-black uppercase bg-neo-secondary border-2 border-black px-2 py-0.5 rounded-full">
                          MỚI
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[9px] font-bold text-gray-500 mb-1">
                      {bill.date}
                    </p>
                    
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase">
                      <span className="text-gray-500">
                        {bill.expenses.length} khoản chi
                      </span>
                      <span className="text-black bg-neo-muted/50 px-2 py-0.5 border-2 border-black border-dashed rounded-lg">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>

                    {bill.settledBy && (
                      <p className="text-[9.5px] font-black text-neo-accent mt-2 uppercase flex items-center gap-1">
                        <span>👤 Người chốt:</span>
                        <span className="bg-neo-secondary/30 px-2 py-0.5 border border-black rounded-lg">{bill.settledBy}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 select-none">
                    {/* View details button */}
                    <button
                      onClick={() => onViewBill(bill)}
                      className="neo-btn-press w-9 h-9 border-2 border-black bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_#1E293B] flex items-center justify-center rounded-full cursor-pointer"
                      title="Xem chi tiết"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>

                    {/* Download PDF button */}
                    <button
                      onClick={async () => {
                        if (loadingPdfId) return;
                        setLoadingPdfId(bill.id);
                        try {
                          await handleDownloadPdf(bill, members);
                        } catch (err) {
                          console.error(err);
                          alert('Lỗi khi xuất PDF.');
                        } finally {
                          setLoadingPdfId(null);
                        }
                      }}
                      className="neo-btn-press w-9 h-9 border-2 border-black bg-neo-secondary hover:bg-neo-secondary/95 shadow-[2px_2px_0px_0px_#1E293B] flex items-center justify-center rounded-full cursor-pointer disabled:opacity-50"
                      title="Tải báo cáo PDF"
                      disabled={loadingPdfId !== null}
                    >
                      {loadingPdfId === bill.id ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default HistoryScreen;
