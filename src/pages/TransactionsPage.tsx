/* ============================================================
   TransactionsPage.tsx — salinan section #page-transactions dari
   personal-wallet/index.html + logika render.transactions().
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import type { Currency, Transaction, TransactionType } from '../types';
import { useAppData } from '../context/AppDataContext';
import { EMPTY_FILTERS, useUi } from '../context/UiContext';
import { collapseTransfers, filterTransactions, totals, transferPeers } from '../lib/selectors';
import { formatDateRelative, txCount } from '../lib/format';
import { Icon } from '../components/IconSprite';
import { Dropdown, EmptyState, Loading } from '../components/Ui';
import { RangeDatePicker } from '../components/DatePicker';
import { TransactionRow } from '../components/rows';
import { useDeleteTransfer } from '../components/Modals';
import { useReport } from '../hooks/useReport';
import { useIncrementalList } from '../hooks/useIncrementalList';
import { currencyOptions, reportTransactions } from '../lib/currency';

const TRANSACTION_BATCH_SIZE = 10;

export function TransactionsPage() {
  const { wallets, categories, transactions } = useAppData();
  const { currency, rate, formatCurrency, formatCompact } = useReport();
  const [display, setDisplay] = useState('original');
  const { filters, setFilters, openModal, toast } = useUi();
  const removeTransfer = useDeleteTransfer();
  // Tanggal yang sedang dilipat — sama seperti collapsedDates di render.js.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Tanpa filter wallet, dua leg transfer digabung jadi satu baris. Begitu
  // difilter per wallet, leg wallet itu ditampilkan apa adanya.
  const filtered = useMemo(() => {
    const list = filterTransactions(transactions, wallets, categories, filters);
    return filters.walletId ? list : collapseTransfers(list);
  }, [transactions, wallets, categories, filters]);
  const peers = useMemo(() => transferPeers(transactions), [transactions]);

  useEffect(() => {
    const walletId = wallets.some((wallet) => wallet.id === filters.walletId) ? filters.walletId : '';
    const categoryId = categories.some((category) => category.id === filters.categoryId) ? filters.categoryId : '';
    if (walletId !== filters.walletId || categoryId !== filters.categoryId) {
      setFilters({ ...filters, walletId, categoryId });
    }
  }, [wallets, categories, filters, setFilters]);

  const filterKey = [
    filters.search,
    filters.currency,
    filters.walletId,
    filters.categoryId,
    filters.type,
    filters.from,
    filters.to
  ].join('|');
  const { visible, hasMore, loading, sentinel } = useIncrementalList(
    filtered.length,
    TRANSACTION_BATCH_SIZE,
    { delayMs: 800, resetKey: filterKey, rootMargin: '0px 0px 80px 0px' }
  );
  const visibleItems = filtered.slice(0, visible);
  const sums = totals(reportTransactions(filtered, currency, rate));

  // Kelompokkan per tanggal supaya riwayat mudah dipindai.
  const groups = useMemo(() => {
    const index = new Map<string, Transaction[]>();
    visibleItems.forEach((transaction) => {
      const bucket = index.get(transaction.date);
      if (bucket) bucket.push(transaction);
      else index.set(transaction.date, [transaction]);
    });
    return Array.from(index, ([date, items]) => ({ date, items }));
  }, [visibleItems]);

  const walletOptions = [{ value: '', label: 'All Wallets' }].concat(
    wallets.map((wallet) => ({ value: wallet.id, label: wallet.name }))
  );

  const categoryOptions = [{ value: '', label: 'All Categories' }].concat(
    categories.map((category) => ({
      value: category.id,
      label: category.icon + ' ' + category.name + (category.archived ? ' (archived)' : '')
    }))
  );

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' }
  ];

  function update(patch: Partial<typeof filters>) {
    setFilters({ ...filters, ...patch });
  }

  return (
    <section className="page active" id="page-transactions" aria-label="Transactions">
      <article className="card">
        <div className="card-head">
          <div>
            <h2>All transactions</h2>
            <p id="tx-result-label">
              {filtered.length
                ? `${txCount(filtered.length)} · in ${formatCompact(sums.income)} · out ${formatCompact(sums.expense)}`
                : 'No transactions match your filters'}
            </p>
          </div>
        </div>

        <div className="tx-filters">
          <div className="filter-search-row">
            <input
              type="search"
              id="tx-search"
              placeholder="Search transactions"
              aria-label="Search transactions"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
            />
            <button
              className="btn ghost chip-reset"
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear filters
            </button>
          </div>

          <div className="filter-chips" role="group" aria-label="Transaction filters">
            <Dropdown label="Filter currency" value={filters.currency} options={[{ value: '', label: 'All Currencies' }, ...currencyOptions]} onChange={(value) => update({ currency: value as '' | Currency })} />
            <Dropdown label="Display amounts" value={display} options={[{ value: 'original', label: 'Original Amounts' }, { value: 'report', label: 'Show in ' + currency }, ...(currency !== 'IDR' ? [{ value: 'idr', label: 'Show in IDR' }] : [])]} onChange={setDisplay} />
            <Dropdown
              label="Filter by wallet"
              options={walletOptions}
              value={filters.walletId}
              onChange={(value) => update({ walletId: value })}
            />
            <Dropdown
              label="Filter by category"
              options={categoryOptions}
              value={filters.categoryId}
              onChange={(value) => update({ categoryId: value })}
            />
            <Dropdown
              label="Filter by type"
              options={typeOptions}
              value={filters.type}
              onChange={(value) => update({ type: value as '' | TransactionType })}
            />
            <RangeDatePicker
              from={filters.from}
              to={filters.to}
              onApply={(from, to) => update({ from, to })}
              onClear={() => update({ from: '', to: '' })}
              onError={(message) => toast(message, { variant: 'error' })}
            />
          </div>
        </div>

        <div className="divider" />
        <div id="tx-list">
          {visibleItems.length ? (
            groups.map((group) => {
              const dayTotals = totals(reportTransactions(group.items, currency, rate));
              const isCollapsed = Boolean(collapsed[group.date]);
              return (
                <div
                  className={`tx-date-group${isCollapsed ? ' collapsed' : ''}`}
                  data-date={group.date}
                  key={group.date}
                >
                  <button
                    className="tx-date-label"
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => setCollapsed({ ...collapsed, [group.date]: !isCollapsed })}
                  >
                    <span className="tx-date-chevron" aria-hidden="true"><Icon name="chevron-down" /></span>
                    <span className="tx-date-title">
                      {formatDateRelative(group.date)}
                      <small>{txCount(group.items.length)}</small>
                    </span>
                    <span className="num">{formatCurrency(dayTotals.net)}</span>
                  </button>
                  <div className="transactions">
                    {group.items.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={display === 'original' ? transaction : reportTransactions([transaction], display === 'idr' ? 'IDR' : currency, display === 'idr' ? 1 : rate)[0]}
                        categories={categories}
                        wallets={wallets}
                        transfer={transaction.transferPairId ? peers.get(transaction.transferPairId) : undefined}
                        onOpen={(id) => transaction.transferPairId
                          ? removeTransfer(transaction.transferPairId)
                          : openModal({ kind: 'transaction', id })}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : transactions.length ? (
            <EmptyState
              icon="search"
              title="Tidak ada hasil"
              message="Try a different search, or clear the filters."
            />
          ) : (
            <EmptyState
              icon="receipt"
              title="No transactions yet"
              message="Record your first one to start seeing the pattern."
              actionLabel="Add transaction"
              onAction={() => openModal({ kind: 'transaction' })}
            />
          )}
        </div>
        {hasMore && <div className="incremental-list-sentinel" ref={sentinel} aria-hidden="true" />}
        {loading && <Loading message="Memuat transaksi berikutnya" />}
      </article>
    </section>
  );
}
