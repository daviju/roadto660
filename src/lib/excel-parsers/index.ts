import { bbvaParser } from './bbva';
import type { BankParser } from './types';

export type { BankParser, RawTransaction, ParseError, ParseResult } from './types';

export const bankParsers: Record<string, BankParser> = {
  bbva: bbvaParser,
  // unicaja: unicajaParser,   // TODO
  // santander: santanderParser, // TODO
  // caixabank: caixabankParser, // TODO
  // ing: ingParser,            // TODO
};

/** All banks including disabled ones for the UI selector */
export const BANK_LIST: { id: string; name: string; enabled: boolean }[] = [
  { id: 'bbva', name: 'BBVA', enabled: true },
  { id: 'unicaja', name: 'Unicaja', enabled: false },
  { id: 'santander', name: 'Santander', enabled: false },
  { id: 'caixabank', name: 'CaixaBank', enabled: false },
  { id: 'ing', name: 'ING', enabled: false },
  { id: 'otro', name: 'Otro', enabled: false },
];
