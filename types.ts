export interface DailyRecord {
  date: string; // ISO Date String YYYY-MM-DD
  cow: boolean; // true = Taken (Yes), false = Not Taken (No)
  buffalo: boolean; // true = Taken (Yes), false = Not Taken (No)
}

export interface MonthlyStats {
  totalCowDays: number;
  totalBuffaloDays: number;
  totalCost: number;
}