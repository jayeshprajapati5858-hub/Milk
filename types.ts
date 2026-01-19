export interface DailyRecord {
  date: string; // ISO Date String YYYY-MM-DD
  cow: boolean; // true = Taken (Yes), false = Not Taken (No)
  buffalo: boolean; // true = Taken (Yes), false = Not Taken (No)
  cowReason?: string; // Reason for not taking cow milk
  buffaloReason?: string; // Reason for not taking buffalo milk
}

export interface MonthlyStats {
  totalCowDays: number;
  totalBuffaloDays: number;
  totalCost: number;
}