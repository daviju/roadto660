// ─── Bank parser architecture ─────────────────────────────────

export interface RawTransaction {
  transaction_date: string;   // YYYY-MM-DD
  concept: string;            // Commercial name / main description
  original_concept: string;   // Raw detail / observation
  amount: number;             // Always positive
  type: 'income' | 'expense';
  source: 'excel_import';
}

export interface ParseError {
  row: number;    // 1-indexed for user display
  reason: string;
}

export interface ParseResult {
  transactions: RawTransaction[];
  errors: ParseError[];
  totalRows: number;
}

export interface BankParser {
  bankId: string;
  bankName: string;
  enabled: boolean;
  /** Verify the raw rows match this bank's expected format */
  validate(rows: unknown[][]): boolean;
  /** Parse validated rows into transactions */
  parse(rows: unknown[][]): ParseResult;
}
