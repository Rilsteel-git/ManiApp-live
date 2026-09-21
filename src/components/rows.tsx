/* ============================================================
   rows.tsx — partial yang dipakai berulang di beberapa halaman.
   Markup-nya adalah salinan 1:1 dari partial di js/render.js
   (walletCard, walletRow, addWalletRow, transactionRow).
   ============================================================ */

import type { Currency, Category, Transaction, Wallet, WalletWithBalance } from '../types';
import { formatSigned, formatDateRelative, txCount } from '../lib/format';
import { resolveCategory } from '../lib/selectors';
import { Icon, type IconName } from './IconSprite';

/** Kartu wallet (dashboard). `onEdit`/`onDelete` kosong = tanpa tombol aksi. */
export function WalletCard({
  wallet,
  formatBalance,
  onEdit,
  onDelete
}: {
  wallet: WalletWithBalance;
  formatBalance: (value: number, currency?: Currency) => string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const negative = wallet.balance < 0;
  return (
    <div className={`wallet${negative ? ' negative' : ''}`}>
      <div className="wallet-top">
        <div className="wallet-name">
          <span className="wallet-icon"><Icon name={wallet.icon as IconName} /></span>
          {wallet.name}
        </div>
        {(onEdit || onDelete) && (
          <div className="wallet-actions">
            {onEdit && (
              <button
                className="wallet-menu"
                type="button"
                aria-label={`Edit wallet ${wallet.name}`}
                title="Edit"
                onClick={() => onEdit(wallet.id)}
              >
                <Icon name="edit" />
              </button>
            )}
            {onDelete && (
              <button
                className="wallet-menu"
                type="button"
                aria-label={`Delete wallet ${wallet.name}`}
                title="Delete"
                onClick={() => onDelete(wallet.id)}
              >
                <Icon name="close" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="wallet-balance num">{formatBalance(wallet.balance, wallet.currency)}</div>
      <div className="wallet-meta">{wallet.typeLabel} · {txCount(wallet.transactionCount)}</div>
      {negative && <div className="wallet-hint">This wallet is in the red — check its transactions.</div>}
    </div>
  );
}

export function AddWalletCard({ onClick }: { onClick: () => void }) {
  return (
    <button className="wallet add-wallet" type="button" onClick={onClick}>
      <div className="wallet-name"><span className="wallet-icon"><Icon name="plus" /></span>Add wallet</div>
      <div className="wallet-meta" style={{ marginTop: 18 }}>Somewhere new to keep money</div>
    </button>
  );
}

/** Baris ringkas untuk halaman Wallets; seluruh baris membuka detail. */
export function WalletRow({
  wallet,
  formatBalance,
  onOpen
}: {
  wallet: WalletWithBalance;
  formatBalance: (value: number, currency?: Currency) => string;
  onOpen: (id: string) => void;
}) {
  const negative = wallet.balance < 0;
  return (
    <button
      className={`wallet-row${negative ? ' negative' : ''}`}
      type="button"
      aria-label={`Open ${wallet.name}`}
      onClick={() => onOpen(wallet.id)}
    >
      <span className="wallet-icon"><Icon name={wallet.icon as IconName} /></span>
      <span className="wallet-row-body">
        <span className="wallet-row-name">{wallet.name}</span>
        <small>{wallet.typeLabel} · {txCount(wallet.transactionCount)}</small>
      </span>
      <span className="wallet-row-balance num">{formatBalance(wallet.balance, wallet.currency)}</span>
      <span className="wallet-row-chevron" aria-hidden="true"><Icon name="chevron-right" /></span>
    </button>
  );
}

export function AddWalletRow({ onClick }: { onClick: () => void }) {
  return (
    <button className="add-wallet-row" type="button" onClick={onClick}>
      <span className="wallet-icon"><Icon name="plus" /></span>
      <span className="wallet-row-body">
        <span className="wallet-row-name">Add wallet</span>
        <small>Somewhere new to keep money</small>
      </span>
    </button>
  );
}

/**
 * Satu baris transaksi. Seluruh baris bisa ditekan untuk membuka
 * detail/edit; tanpa `onOpen` baris dirender sebagai div statis.
 */
export function TransactionRow({
  transaction,
  categories,
  wallets,
  showDate = false,
  onOpen
}: {
  transaction: Transaction;
  categories: Category[];
  wallets: Wallet[];
  showDate?: boolean;
  onOpen?: (id: string) => void;
}) {
  const category = resolveCategory(categories, transaction.categoryId);
  const wallet = wallets.find((item) => item.id === transaction.walletId);
  const walletName = wallet ? wallet.name : 'Deleted wallet';
  const metaParts = [category.name, walletName];
  if (showDate) metaParts.unshift(formatDateRelative(transaction.date));
  const title = transaction.note || category.name;

  const body = (
    <>
      <span className="transaction-icon" aria-hidden="true">{category.icon}</span>
      <span className="transaction-body">
        <span className="transaction-title">{title}</span>
        <span className="transaction-meta">{metaParts.join(' · ')}</span>
      </span>
      <span className={`transaction-amount ${transaction.type} num`}>
        {formatSigned(transaction.amount, transaction.type, transaction.currency)}
      </span>
    </>
  );

  if (!onOpen) {
    return <div className="transaction" data-id={transaction.id}>{body}</div>;
  }

  return (
    <button
      className="transaction"
      data-id={transaction.id}
      type="button"
      aria-label={`Edit ${title}`}
      onClick={() => onOpen(transaction.id)}
    >
      {body}
    </button>
  );
}
