/* ============================================================
   selectors.ts — sisi baca dari wallets.js / transactions.js /
   categories.js: kalkulasi saldo, filter, dan agregasi.
   Semua murni fungsi dari array yang sudah ada di memori.
   ============================================================ */

import type {
  Category,
  Totals,
  Transaction,
  TransactionFilters,
  Wallet,
  WalletDetail,
  WalletType,
  WalletWithBalance
} from '../types';

export const WALLET_TYPES: { value: WalletType; label: string; icon: string }[] = [
  { value: 'bank', label: 'Bank', icon: 'bank' },
  { value: 'e-wallet', label: 'E-wallet', icon: 'ewallet' },
  { value: 'cash', label: 'Cash', icon: 'cash' }
];

export const CATEGORY_ICONS = [
  { icon: '🍜', label: 'Makanan' }, { icon: '🛵', label: 'Transportasi' },
  { icon: '🛒', label: 'Belanja' }, { icon: '🎁', label: 'Bonus' },
  { icon: '💼', label: 'Gaji' }, { icon: '🏠', label: 'Rumah' },
  { icon: '💊', label: 'Kesehatan' }, { icon: '📚', label: 'Pendidikan' },
  { icon: '🎬', label: 'Hiburan' }, { icon: '🧾', label: 'Tagihan' },
  { icon: '📱', label: 'Pulsa' }, { icon: '✈️', label: 'Travel' },
  { icon: '🐾', label: 'Hewan' }, { icon: '📈', label: 'Investasi' },
  { icon: '🤝', label: 'Donasi' }, { icon: '⚽', label: 'Olahraga' },
  { icon: '✨', label: 'Lainnya' }
];

/** Dipakai saat kategori sebuah transaksi sudah dihapus permanen. */
export const DELETED_CATEGORY = {
  id: null,
  name: 'Deleted category',
  icon: '✳',
  type: 'expense' as const,
  deleted: true
};

export function walletTypeMeta(value: string) {
  return (
    WALLET_TYPES.find((t) => t.value === value) || { value, label: 'Lainnya', icon: 'cash' }
  );
}

/** Selalu mengembalikan objek yang bisa dirender, walau kategori diarsipkan/hilang. */
export function resolveCategory(categories: Category[], id: string | null) {
  return categories.find((c) => c.id === id) || DELETED_CATEGORY;
}

/** Saldo berjalan = saldo awal + Σ income − Σ expense (FR-2.4). */
export function balanceOf(wallet: Wallet, transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => {
    if (tx.walletId !== wallet.id) return sum;
    return tx.type === 'income' ? sum + tx.amount : sum - tx.amount;
  }, wallet.initialBalance);
}

export function withBalances(
  wallets: Wallet[],
  transactions: Transaction[]
): WalletWithBalance[] {
  return wallets.map((wallet) => {
    const meta = walletTypeMeta(wallet.type);
    return {
      ...wallet,
      typeLabel: meta.label,
      icon: meta.icon,
      balance: balanceOf(wallet, transactions),
      transactionCount: transactions.filter((tx) => tx.walletId === wallet.id).length
    };
  });
}

export function totalBalance(wallets: Wallet[], transactions: Transaction[]): number {
  return wallets.reduce((sum, wallet) => sum + balanceOf(wallet, transactions), 0);
}

/** Terbaru dulu; tanggal sama diurutkan dari yang paling baru dicatat. */
export function sortTransactions(list: Transaction[]): Transaction[] {
  return list.slice().sort((a, b) => {
    if (a.date === b.date) return String(b.createdAt).localeCompare(String(a.createdAt));
    return a.date < b.date ? 1 : -1;
  });
}

export function inRange(list: Transaction[], from: string, to: string): Transaction[] {
  return list.filter((tx) => {
    if (from && tx.date < from) return false;
    if (to && tx.date > to) return false;
    return true;
  });
}

export function totals(list: Transaction[]): Totals {
  return list.reduce<Totals>(
    (acc, tx) => {
      if (tx.type === 'income') acc.income += tx.amount;
      else acc.expense += tx.amount;
      acc.net = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, net: 0 }
  );
}

/** Filter + pencarian teks; nilai kosong berarti "semua". */
export function filterTransactions(
  transactions: Transaction[],
  wallets: Wallet[],
  categories: Category[],
  filters: TransactionFilters
): Transaction[] {
  const keyword = String(filters.search || '').trim().toLowerCase();

  return sortTransactions(
    transactions.filter((tx) => {
      if (filters.currency && tx.currency !== filters.currency) return false;
      if (filters.walletId && tx.walletId !== filters.walletId) return false;
      if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
      if (filters.type && tx.type !== filters.type) return false;
      if (filters.from && tx.date < filters.from) return false;
      if (filters.to && tx.date > filters.to) return false;
      if (keyword) {
        const category = resolveCategory(categories, tx.categoryId);
        const wallet = wallets.find((w) => w.id === tx.walletId);
        const haystack = [tx.note, category.name, wallet ? wallet.name : '', String(tx.amount)]
          .join(' ')
          .toLowerCase();
        if (haystack.indexOf(keyword) === -1) return false;
      }
      return true;
    })
  );
}

export function walletDetail(
  walletId: string,
  wallets: Wallet[],
  transactions: Transaction[]
): WalletDetail | null {
  const wallet = wallets.find((w) => w.id === walletId);
  if (!wallet) return null;

  const meta = walletTypeMeta(wallet.type);
  const list = sortTransactions(transactions.filter((tx) => tx.walletId === walletId));
  const sums = totals(list);

  return {
    ...wallet,
    typeLabel: meta.label,
    icon: meta.icon,
    balance: balanceOf(wallet, transactions),
    transactionCount: list.length,
    transactions: list,
    income: sums.income,
    expense: sums.expense
  };
}

/** Kategori aktif (bisa dipilih untuk transaksi baru), urut sesuai `position`. */
export function activeCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !c.archived);
}

export function categoriesByType(
  categories: Category[],
  type: 'income' | 'expense',
  options: { archived?: boolean } = {}
): Category[] {
  return categories
    .filter((c) => c.type === type && c.archived === !!options.archived)
    .slice()
    .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
}

export function categoryTransactionCount(transactions: Transaction[], categoryId: string): number {
  return transactions.filter((tx) => tx.categoryId === categoryId).length;
}
