import type { Currency, Transaction, Wallet } from '../types';

export const CURRENCIES: Currency[] = ['IDR', 'KRW', 'USD', 'EUR', 'JPY', 'SGD', 'MYR'];
export const currencyOptions = CURRENCIES.map((value) => ({ value, label: value }));
export function fractionDigits(currency: Currency) { return ['IDR', 'KRW', 'JPY'].includes(currency) ? 0 : 2; }
export function validAmount(value: number, currency: Currency) {
  const units = value * 10 ** fractionDigits(currency);
  return Number.isFinite(value) && Math.abs(value) < 1e12 && Math.abs(units - Math.round(units)) < 0.00001;
}
export function validRate(value: number) { return Number.isFinite(value) && value > 0 && value < 1e9; }
export function readDecimal(value: string) {
  const normalized = value.trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}
// Rates are always IDR per one unit, never the inverse. Historical rates stay
// attached to each entry; the report rate is an explicitly chosen display rate.
export function reportTransactions(list: Transaction[], currency: Currency, rate: number): Transaction[] {
  return list.map((tx) => ({ ...tx, amount: tx.currency === currency ? tx.amount : tx.amount * tx.exchangeRate / rate, currency, exchangeRate: rate }));
}
export function convertedBalance(wallets: Wallet[], transactions: Transaction[], reportRate: number, currency: Currency = 'IDR') {
  return wallets.reduce((sum, wallet) => {
    const nativeBalance = transactions.reduce((balance, tx) => tx.walletId === wallet.id
      ? balance + (tx.type === 'income' ? tx.amount : -tx.amount) : balance, wallet.initialBalance);
    return sum + (wallet.currency === currency ? nativeBalance : nativeBalance * wallet.exchangeRate / reportRate);
  }, 0);
}
