// SettleUpScreen.tsx
import React, { useState, useMemo } from 'react';
import { SettledBill, Member, SplitMethod } from '../types';
import { BANK_INFO } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

/* ---------- 1. Hàm tạo PDF dùng chung ---------- */
const buildPdfBlob = (bill: SettledBill, members: Member[]) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  const formatNumber = (amount: number) => Math.round(amount).toLocaleString('en-US');
  const expenseNames = [...new Set(bill.expenses.map(e => e.itemName))].sort();
  const participatingMembers = members.filter(m =>
    bill.expenses.some(e => e.payer === m || e.participants.includes(m))
  );

  const memberData: any = {};
  participatingMembers.forEach(m => (memberData[m] = { totalPaid: 0, totalShare: 0, shares: {} }));

  bill.expenses.forEach(ex => {
    memberData[ex.payer].totalPaid += ex.amount;
    const share = ex.splitMethod === SplitMethod.EVENLY ? ex.amount / ex.participants.length : 0;
    ex.participants.forEach(p => {
      const s = ex.splitMethod === SplitMethod.EVENLY ? share : (ex.manualSplits?.[p] ?? 0);
      if (!memberData[p]) memberData[p] = { totalPaid: 0, totalShare: 0, shares: {} };
      memberData[p].totalShare += s;
      memberData[p].shares[ex.itemName] = (memberData[p].shares[ex.itemName] || 0) + s;
    });
  });

  const head = [['Member', ...expenseNames, 'Amount Paid', 'Net Balance']];
  const body: any[][] = participatingMembers.map(m => {
    const { totalPaid, totalShare, shares } = memberData[m];
    const net = totalPaid - totalShare;
    return [
      m,
      ...expenseNames.map(n => formatNumber(shares[n] || 0)),
      formatNumber(totalPaid),
      { content: formatNumber(net), styles: { textColor: net >= 0 ? [0, 100, 0] : [220, 38, 38] } }
    ];
  });

  // sum row
  const sumRow = [{ content: 'SUM', styles: { fontStyle: 'bold' } }];
  expenseNames.forEach(n => sumRow.push({ content: formatNumber(bill.expenses.filter(e => e.itemName === n).reduce((s, e) => s + e.amount, 0)), styles: { fontStyle: 'bold' } }));
  const totalPaidSum = (Object.values(memberData) as any[]).reduce((s, d) => s + d.totalPaid, 0);
  const totalNetSum = (Object.values(memberData) as any[]).reduce((s, d) => s + (d.totalPaid - d.totalShare), 0);
  sumRow.push({ content: formatNumber(totalPaidSum), styles: { fontStyle: 'bold' } });
  sumRow.push({ content: formatNumber(totalNetSum), styles: { fontStyle: 'bold' } });
  body.push(sumRow);

  autoTable(doc, {
    startY: 40,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: '#FFD93D', textColor: '#000000', fontStyle: 'bold' },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1) data.cell.styles.fillColor = '#C4B5FD';
      if (data.column.index > 0) data.cell.styles.halign = 'right';
    }
  });

  return doc.output('blob');
};

/* ---------- 2. Component QR + Share ---------- */
const QrCodeDisplay: React.FC<{
  amount: number;
  debtorName: string;
  creditorName: Member;
  expensesPaid: { name: string; amount: number }[];
  expensesParticipated: { name: string; amount: number }[];
  bill: SettledBill;
  members: Member[];
  memberProfiles: { [uid: string]: any };
  getMemberName: (name: string) => string;
}> = ({ amount, debtorName, creditorName, expensesPaid, expensesParticipated, bill, members, memberProfiles, getMemberName }) => {
  const profile = Object.values(memberProfiles || {}).find(
    (p: any) => p.displayName === creditorName
  ) as any;
  const creditorBankInfo = profile?.bankInfo || BANK_INFO[creditorName];

  if (!creditorBankInfo || !creditorBankInfo.bankId || !creditorBankInfo.accountNumber)
    return <p className="text-[10px] font-black uppercase text-neo-accent my-2">⚠️ {getMemberName(creditorName)} chưa cấu hình Ví thanh toán.</p>;

  const { bankId, accountNumber } = creditorBankInfo;
  const addInfo = encodeURIComponent(`TT bill UNO ${debtorName}`);
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${Math.round(
    amount
  )}&addInfo=${addInfo}`;

  const shareMessage = useMemo(() => {
    let msg = `💸 ${debtorName} cần chuyển ${formatCurrency(amount)} cho ${getMemberName(creditorName)}\n\n`;
    if (expensesPaid.length) {
      msg += '💰 Đã chi:\n';
      expensesPaid.forEach((e) => (msg += `• ${e.name}: ${formatCurrency(e.amount)}\n`));
    }
    if (expensesParticipated.length) {
      msg += '\n🤝 Tham gia:\n';
      expensesParticipated.forEach((e) => (msg += `• ${e.name}: ${formatCurrency(e.amount)}\n`));
    }
    return msg.trim();
  }, [amount, creditorName, debtorName, expensesPaid, expensesParticipated, getMemberName]);

  /* Tải QR */
  const handleDownloadQr = async () => {
    try {
      const r = await fetch(qrUrl);
      const blob = await r.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `QR_TT_${debtorName}_cho_${getMemberName(creditorName)}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(qrUrl, '_blank');
    }
  };

  /* Chia sẻ QR + PDF bảng tổng hợp */
  const handleShare = async () => {
    try {
      const pdfBlob = buildPdfBlob(bill, members);
      const pdfFile = new File(
        [pdfBlob],
        `UNO_Report_${bill.date.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        { type: 'application/pdf' }
      );

      const qrBlob = await (await fetch(qrUrl)).blob();
      const qrFile = new File(
        [qrBlob],
        `QR_TT_${debtorName}_cho_${getMemberName(creditorName)}.png`,
        { type: 'image/png' }
      );

      if (navigator.share && navigator.canShare({ files: [pdfFile, qrFile] })) {
        await navigator.share({
          title: 'Thanh toán UNO',
          text: shareMessage,
          files: [pdfFile, qrFile],
        });
      } else {
        navigator.clipboard.writeText(`${shareMessage}\nQR: ${qrUrl}\nPDF: (vui lòng tải thủ công)`);
        alert('Đã sao chép vào clipboard!');
      }
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  return (
    <div className="text-center flex flex-col items-center">
      <div className="bg-white p-3 inline-block border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] my-3 rounded-2xl">
        <img src={qrUrl} alt={`VietQR for ${creditorName}`} className="w-[160px] h-[160px] rounded-xl" />
      </div>

      <div className="mt-2 flex justify-center gap-3 select-none">
        <button
          onClick={handleDownloadQr}
          className="neo-btn-press inline-flex items-center gap-1.5 bg-neo-muted hover:bg-neo-muted/90 text-black text-xs font-black uppercase py-2 px-3 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full transition-colors cursor-pointer"
        >
          Tải QR
        </button>

        <button
          onClick={handleShare}
          className="neo-btn-press inline-flex items-center gap-1.5 bg-neo-secondary hover:bg-neo-secondary/90 text-black text-xs font-black uppercase py-2 px-3 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full transition-colors cursor-pointer"
        >
          Chia sẻ
        </button>
      </div>
    </div>
  );
};

/* ---------- 3. ExpenseDetails ---------- */
const ExpenseDetails: React.FC<{ title: string; expenses: { name: string; amount: number }[] }> = ({ title, expenses }) => {
  if (expenses.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">{title}</h4>
      <div className="space-y-2.5">
        {expenses.map((ex, i) => (
          <div key={i} className="flex justify-between items-center bg-white border-2 border-black p-3 shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-xl">
            <span className="text-xs font-black uppercase truncate pr-4">{ex.name}</span>
            <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{formatCurrency(ex.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- 4. Main SettleUpScreen ---------- */
interface SettleUpScreenProps {
  bill: SettledBill;
  members: Member[];
  memberProfiles: { [uid: string]: any };
  nicknames?: { [uidOrName: string]: string };
  onGoHome: () => void;
  isHistoryView?: boolean;
}

export default function SettleUpScreen({
  bill,
  members,
  memberProfiles,
  nicknames = {},
  onGoHome,
  isHistoryView = false
}: SettleUpScreenProps) {
  const [personIndex, setPersonIndex] = useState(0);

  const getMemberName = (displayNameOrUid: string) => {
    if (!displayNameOrUid) return 'Ẩn danh';
    if (nicknames[displayNameOrUid]) return nicknames[displayNameOrUid];
    
    const profile = memberProfiles[displayNameOrUid];
    if (profile) return profile.displayName;

    const found = Object.entries(memberProfiles).find(([_, p]) => p.displayName === displayNameOrUid);
    if (found) {
      const [uid] = found;
      if (nicknames[uid]) return nicknames[uid];
    }
    return displayNameOrUid;
  };

  const balances = useMemo(() => {
    const b: { [key: Member]: { paid: number; owes: number } } = {};
    members.forEach((m) => (b[m] = { paid: 0, owes: 0 }));

    if (!bill.expenses) return b;

    bill.expenses.forEach((ex) => {
      b[ex.payer].paid += ex.amount;
      const share = ex.splitMethod === SplitMethod.EVENLY ? ex.amount / ex.participants.length : 0;
      ex.participants.forEach((p) => {
        if (ex.splitMethod === SplitMethod.EVENLY) b[p].owes += share;
        else b[p].owes += ex.manualSplits?.[p] ?? 0;
      });
    });
    return b;
  }, [bill, members]);

  const sortedMembers = useMemo(
    () => members.filter((m) => balances[m] && (balances[m].paid > 0.01 || balances[m].owes > 0.01)),
    [members, balances]
  );

  const handleNext = () => setPersonIndex((prev) => (prev + 1) % sortedMembers.length);
  const handleBack = () => setPersonIndex((prev) => (prev - 1 + sortedMembers.length) % sortedMembers.length);

  if (sortedMembers.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white p-4 animate-fade-in select-none">
        <div className="text-center my-3">
          <h2 className="inline-block bg-neo-secondary border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full mb-2">
            {isHistoryView ? '📜 Chi tiết lịch sử' : '⚖️ Kết quả quyết toán'}
          </h2>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{bill.date}</p>
        </div>

        <div className="flex-grow flex flex-col justify-center items-center p-6 border-4 border-black border-dashed min-h-[300px] rounded-2xl">
          <p className="font-bold text-xs text-gray-500 uppercase">Không có chi tiêu trong hóa đơn này.</p>
        </div>

        <button
          onClick={onGoHome}
          className="neo-btn-press mt-6 w-full bg-neo-accent hover:bg-neo-accent/95 text-white font-black text-xs uppercase py-3.5 border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] rounded-full cursor-pointer"
        >
          {isHistoryView ? 'QUAY LẠI LỊCH SỬ' : 'TRANG CHỦ'}
        </button>
      </div>
    );
  }

  const currentPerson = sortedMembers[personIndex];
  const personData = balances[currentPerson];
  const netBalance = personData ? personData.paid - personData.owes : 0;

  const expensesPaid = bill.expenses.filter((e) => e.payer === currentPerson).map((e) => ({ name: e.itemName, amount: e.amount }));
  const expensesParticipated = bill.expenses
    .filter((e) => e.participants.includes(currentPerson))
    .map((e) => {
      const share = e.splitMethod === SplitMethod.EVENLY ? e.amount / e.participants.length : e.manualSplits?.[currentPerson] ?? 0;
      return { name: e.itemName, amount: share };
    });

  const isMainCreditor = bill.mainCreditor === currentPerson;
  const paymentsToMake = isMainCreditor ? bill.transactions?.filter((t) => t.from === currentPerson) ?? [] : [];
  const paymentsToReceive = !isMainCreditor ? bill.transactions?.filter((t) => t.to === currentPerson) ?? [] : [];

  return (
    <div className="flex flex-col h-full bg-white p-4 animate-fade-in select-none">
      
      {/* Title */}
      <div className="text-center my-3">
        <h2 className="inline-block bg-neo-secondary border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full mb-2">
          {isHistoryView ? '📜 Chi tiết lịch sử' : '⚖️ Kết quả quyết toán'}
        </h2>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{bill.date}</p>
      </div>

      {/* Main card */}
      <div className="flex-grow flex flex-col p-5 border-4 border-black bg-white shadow-[8px_8px_0px_0px_#1E293B] rounded-3xl overflow-hidden min-h-[400px]">
        
        {/* Person Selector Carousel */}
        <div className="flex items-center justify-between flex-shrink-0 border-b-4 border-black pb-4">
          <button
            onClick={handleBack}
            className="neo-btn-press w-9 h-9 border-2 border-black flex items-center justify-center bg-neo-secondary shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full disabled:opacity-30 cursor-pointer"
            disabled={sortedMembers.length <= 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h3 className="text-lg font-black uppercase tracking-wider text-black bg-neo-muted px-4 py-1.5 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full truncate max-w-[150px]">
            {getMemberName(currentPerson)}
          </h3>
          
          <button
            onClick={handleNext}
            className="neo-btn-press w-9 h-9 border-2 border-black flex items-center justify-center bg-neo-secondary shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-full disabled:opacity-30 cursor-pointer"
            disabled={sortedMembers.length <= 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Balance Status Display */}
        <div className="text-center my-4 flex-shrink-0">
          <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
            {netBalance >= 0 ? 'Tổng tiền được thu về' : 'Tổng tiền cần thanh toán'}
          </p>
          <p className={`text-3xl font-black ${netBalance >= 0 ? 'text-green-600' : 'text-neo-accent'}`}>
            {formatCurrency(Math.abs(netBalance))}
          </p>
        </div>

        {/* Scrollable details and actions */}
        <div className="flex-grow overflow-y-auto pr-1 no-scrollbar space-y-4">
          
          {netBalance < -0.01 && bill.mainCreditor && (
            <div className="mb-4 text-center border-t-2 border-black border-dashed pt-4">
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                Gửi {formatCurrency(Math.abs(netBalance))} cho <span className="text-black font-black">{getMemberName(bill.mainCreditor)}</span>
              </p>
              <QrCodeDisplay
                amount={Math.abs(netBalance)}
                debtorName={getMemberName(currentPerson)}
                creditorName={bill.mainCreditor}
                expensesPaid={expensesPaid}
                expensesParticipated={expensesParticipated}
                bill={bill}
                members={members}
                memberProfiles={memberProfiles}
                getMemberName={getMemberName}
              />
            </div>
          )}

          {netBalance > 0.01 && isMainCreditor && paymentsToMake.length > 0 && (
            <div className="mb-4 border-t-2 border-black border-dashed pt-4">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">Các khoản cần chuyển đi</h4>
              <div className="space-y-4">
                {paymentsToMake.map((t, i) => (
                  <div key={i} className="text-center">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                      Chuyển {formatCurrency(t.amount)} cho <span className="text-black font-black">{getMemberName(t.to)}</span>
                    </p>
                    <QrCodeDisplay
                      amount={t.amount}
                      debtorName={getMemberName(currentPerson)}
                      creditorName={t.to}
                      expensesPaid={expensesPaid}
                      expensesParticipated={expensesParticipated}
                      bill={bill}
                      members={members}
                      memberProfiles={memberProfiles}
                      getMemberName={getMemberName}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {netBalance > 0.01 && !isMainCreditor && paymentsToReceive.length > 0 && (
            <div className="mb-4 border-t-2 border-black border-dashed pt-4">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">Các khoản cần nhận lại</h4>
              <div className="space-y-2.5">
                {paymentsToReceive.map((t, i) => (
                  <div key={i} className="flex justify-between items-center bg-white border-2 border-black p-3 shadow-[2.5px_2.5px_0px_0px_#1E293B] rounded-xl">
                    <span className="text-xs font-black uppercase">Nhận từ {getMemberName(t.from)}</span>
                    <span className="text-xs font-bold text-green-600">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t-2 border-black border-dashed pt-4">
            <ExpenseDetails title="Các khoản đã tự chi trả" expenses={expensesPaid} />
            <ExpenseDetails title="Các khoản tham gia chia sẻ" expenses={expensesParticipated} />
          </div>

        </div>

      </div>

      {/* Footer Return Button */}
      <button
        onClick={onGoHome}
        className="neo-btn-press mt-6 w-full bg-neo-accent hover:bg-neo-accent/95 text-white font-black text-xs uppercase py-3.5 border-4 border-black shadow-[4px_4px_0px_0px_#1E293B] rounded-full cursor-pointer"
      >
        {isHistoryView ? 'QUAY LẠI LỊCH SỬ' : 'TRANG CHỦ'}
      </button>
    </div>
  );
}
