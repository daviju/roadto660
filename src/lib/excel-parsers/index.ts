import { bbvaParser } from './bbva';
import { unicajaParser } from './unicaja';
import { caixabankParser } from './caixabank';
import type { BankParser } from './types';

export type { BankParser, RawTransaction, ParseError, ParseResult } from './types';

export const bankParsers: Record<string, BankParser> = {
  bbva: bbvaParser,
  unicaja: unicajaParser,
  caixabank: caixabankParser,
  // santander: santanderParser, // TODO
  // ing: ingParser,             // TODO
};

/** All banks including disabled ones for the UI selector */
export const BANK_LIST: { id: string; name: string; enabled: boolean }[] = [
  { id: 'bbva', name: 'BBVA', enabled: true },
  { id: 'unicaja', name: 'Unicaja', enabled: true },
  { id: 'caixabank', name: 'CaixaBank', enabled: true },
  { id: 'santander', name: 'Santander', enabled: false },
  { id: 'ing', name: 'ING', enabled: false },
  { id: 'otro', name: 'Otro', enabled: false },
];
