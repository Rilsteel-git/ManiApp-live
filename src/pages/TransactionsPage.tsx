/* ============================================================
   TransactionsPage.tsx — salinan section #page-transactions dari
   personal-wallet/index.html + logika render.transactions().
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import type { Currency, Transaction, TransactionType } from '../types';
import { useAppData } from '../context/AppDataContext';
import { EMPTY_FILTERS, useUi } from '../context/UiContext';
import { filterTransactions, totals } from '../lib/selectors';
import { formatDateRelative, txCount } from '../lib/format';
import { Icon } from '../components/IconSprite';
import { Dropdown, EmptyState } from '../components/Ui';
import { RangeDatePicker } from '../components/DatePicker';
import { TransactionRow } from '../components/rows';
import { useReport } from '../hooks/useReport';
import { currencyOptions, reportTransactions } from '../lib/currency';

const PAGE_SIZE = 12;

export function TransactionsPage() {
  const { wallets, categories, transactions } = useAppData();
  const { currency, rate, formatCurrency, formatCompact } = useReport();
  const [display, setDisplay] = useState('original');
  const { filters, setFilters, txPage, setTxPage, openModal, toast } = useUi();
  // Tanggal yang sedang dilipat — sama seperti collapsedDates di render.js.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () => filterTransactions(transactions, wallets, categories, filters),
    [transactions, wallets, categories, filters]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(txPage, totalPages);
  useEffect(() => { if (txPage !== page) setTxPage(page); }, [txPage, page, setTxPage]);
  useEffect(() => {
    const walletId = wallets.some((wallet) => wallet.id === filters.walletId) ? filters.walletId : '';
    const categoryId = categories.some((category) => category.id === filters.categoryId) ? filters.categoryId : '';
    if (walletId !== filters.walletId || categoryId !== filters.categoryId) {
      setFilters({ ...filters, walletId, categoryId });
      setTxPage(1);
    }
  }, [wallets, categories, filters, setFilters, setTxPage]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);
  const sums = totals(reportTransactions(filtered, currency, rate));

  // Kelompokkan per tanggal supaya riwayat mudah dipindai.
  const groups = useMemo(() => {
    const index = new Map<string, Transaction[]>();
    pageItems.forEach((transaction) => {
      const bucket = index.get(transaction.date);
      if (bucket) bucket.push(transaction);
      else index.set(transaction.date, [transaction]);
    });
    return Array.from(index, ([date, items]) => ({ date, items }));
  }, [pageItems]);

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
    setTxPage(1);
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
              onClick={() => { setFilters(EMPTY_FILTERS); setTxPage(1); }}
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
          {pageItems.length ? (
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
                        onOpen={(id) => openModal({ kind: 'transaction', id })}
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

        {filtered.length > PAGE_SIZE && (
          <div className="pager" id="tx-pager">
            <button
              className="btn secondary"
              type="button"
              disabled={page <= 1}
              onClick={() => setTxPage(page - 1)}
            >
              <Icon name="chevron-left" /> Previous
            </button>
            <small id="tx-pager-label">Halaman {page} dari {totalPages}</small>
            <button
              className="btn secondary"
              type="button"
              disabled={page >= totalPages}
              onClick={() => setTxPage(page + 1)}
            >
              Next <Icon name="chevron-right" />
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
