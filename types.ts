export type Member = string;

export enum SplitMethod {
  EVENLY,
  MANUALLY,
}

export interface Expense {
  id: string;
  payer: Member; // Primary payer (backward compatibility)
  payers?: { [member: Member]: number }; // Multiple payers mapping: member name -> paid amount
  participants: Member[];
  amount: number;
  itemName: string;
  splitMethod: SplitMethod;
  manualSplits?: { [member: Member]: number };
}

export interface Transaction {
  from: Member;
  to: Member;
  amount: number;
}

export interface SettledBill {
  id: string;
  date: string;
  expenses: Expense[];
  transactions: Transaction[];
  mainCreditor?: Member;
  settledBy?: string; // Display name of the user who performed settle-up
}

export interface TripPlan {
  id: string;
  title: string;
  note: string;
  time: string;
  votes?: { [uid: string]: boolean }; // uid -> true
  createdBy: string; // display name of creator
  creatorUid: string; // uid of creator
}

export enum Screen {
  HOME,
  ADD_EXPENSE,
  SETTLE_UP,
  HISTORY,
  HISTORY_DETAIL,
}