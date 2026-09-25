/* ============================================================
   Modals.tsx — seluruh modal aplikasi, markup disalin dari
   personal-wallet/index.html dan alurnya dari js/main.js:
   wallet, detail wallet, kategori, transaksi, profil, confirm.
   ============================================================ */

import { useEffect, useRef, useState } from 'react';
import type {
  Currency,
  Category,
  CategoryPayload,
  Transaction,
  TransactionType,
  Wallet,
  WalletType
} from '../types';
import {
  formatCurrency,
  formatDateID,
  formatSigned,
  today,
  txCount
} from '../lib/format';
import {
  CATEGORY_ICONS,
  WALLET_TYPES,
  activeCategories,
  categoriesByType,
  categoryTransactionCount,
  resolveCategory,
  transferPeers,
  walletDetail
} from '../lib/selectors';
import { useAppData } from '../context/AppDataContext';
import { useUi } from '../context/UiContext';
import { Dropdown, EmptyState, InlineLoader, Modal, ModalHead, Segmented } from './Ui';
import { SingleDatePicker } from './DatePicker';
import { Icon, type IconName } from './IconSprite';
import { Avatar } from './Avatar';
import { useFormErrors } from '../hooks/useFormErrors';
import { useIncrementalList } from '../hooks/useIncrementalList';
import { TransactionRow } from './rows';
import { currencyOptions, fractionDigits, readDecimal, roundToCurrency, validAmount, validRate } from '../lib/currency';
import { fetchLiveRate } from '../lib/exchangeRate';

type Errors = Record<string, string>;
const CATEGORY_ICON_PREVIEW_COUNT = 9;

/** Field form design system: .input (+ .error) > label > control > .field-error */
function Field({
  name,
  label,
  error,
  full = false,
  htmlFor,
  children
}: {
  name?: string;
  label: React.ReactNode;
  error?: string;
  full?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`input${full ? ' full' : ''}${error ? ' error' : ''}`} data-field={name}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

/* ============================================================
   WALLET
   ============================================================ */
function WalletModal({ wallet }: { wallet: Wallet | null }) {
  const { addWallet, editWallet, profile } = useAppData();
  const { closeModal, toast } = useUi();
  const [name, setName] = useState(wallet ? wallet.name : '');
  const [type, setType] = useState<WalletType>(wallet ? wallet.type : 'bank');
  const [currency, setCurrency] = useState<Currency>(wallet?.currency || profile?.reportCurrency || 'IDR');
  const [rate, setRate] = useState(String(wallet?.exchangeRate || ''));
  const exchangeRate = currency === 'IDR' ? 1 : readDecimal(rate);
  const [balance, setBalance] = useState(
    wallet ? String(wallet.initialBalance) : ''
  );
  const { errors, setErrors, clearError } = useFormErrors();
  const [busy, setBusy] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);

  async function useLiveRate() {
    setFetchingRate(true);
    try {
      const value = await fetchLiveRate(currency);
      setRate(String(value));
      clearError('rate');
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Could not fetch the live rate.', { variant: 'error' });
    } finally {
      setFetchingRate(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    const amount = balance.trim() ? readDecimal(balance) : 0;
    const next: Errors = {};
    if (!trimmed) next.name = 'Give your wallet a name.';
    if (!validAmount(amount, currency)) next.balance = `Enter a valid amount (max ${fractionDigits(currency)} decimal places).`;
    if (!validRate(exchangeRate)) next.rate = 'Enter a positive IDR exchange rate.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      if (wallet) {
        await editWallet(wallet.id, { name: trimmed, type, initialBalance: amount, currency, exchangeRate });
        toast(trimmed + ' updated');
      } else {
        await addWallet({ name: trimmed, type, initialBalance: amount, currency, exchangeRate });
        toast(trimmed + ' added');
      }
      closeModal();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Could not save wallet.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      id="wallet-modal"
      labelledBy="wallet-modal-title"
      onClose={closeModal}
      head={
        <ModalHead
          id="wallet-modal-title"
          title={wallet ? 'Edit wallet' : 'New wallet'}
          desc={wallet ? 'Change the name, type, or starting balance.' : 'Add a place where your money lives.'}
          closeLabel="Close wallet dialog"
          onClose={closeModal}
        />
      }
      foot={
        <div className="modal-foot">
          <button className="btn secondary" type="button" onClick={closeModal}>Cancel</button>
          <button className="btn primary" type="submit" form="wallet-form" disabled={busy}>Save</button>
        </div>
      }
    >
      <form id="wallet-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field name="name" label="Wallet name" error={errors.name} full htmlFor="wallet-name">
            <input
              id="wallet-name"
              name="name"
              type="text"
              placeholder="e.g. BCA"
              autoComplete="off"
              value={name}
              onChange={(event) => { setName(event.target.value); clearError('name'); }}
            />
          </Field>
          <Field name="type" label="Type" htmlFor="wallet-type">
            <Dropdown
              id="wallet-type"
              label="Wallet type"
              value={type}
              onChange={(value) => setType(value as WalletType)}
              options={WALLET_TYPES.map((item) => ({ value: item.value, label: item.label }))}
            />
          </Field>
          <Field label="Wallet currency" full>
            <Dropdown
              label="Wallet currency"
              value={currency}
              options={currencyOptions}
              disabled={Boolean(wallet)}
              onChange={(value) => {
                setCurrency(value as Currency);
                setRate('');
                clearError('rate', 'balance');
              }}
            />
            {wallet && (
              <small className="hint-info">
                Currency is fixed after a wallet is created. Create another wallet to use a different currency.
              </small>
            )}
          </Field>
          {currency !== 'IDR' && <Field label={`Wallet rate: 1 ${currency} = … IDR`} error={errors.rate} full htmlFor="wallet-rate">
            <div className="rate-input-row">
              <input id="wallet-rate" inputMode="decimal" value={rate} placeholder="Enter your rate" onChange={(e) => { setRate(e.target.value); clearError('rate'); }} />
              <button className="btn secondary rate-fetch-btn" type="button" disabled={fetchingRate} onClick={useLiveRate}>
                <Icon name="refresh" className={`svg-icon${fetchingRate ? ' spin' : ''}`} /> {fetchingRate ? 'Fetching…' : 'Get live rate'}
              </button>
            </div>
            <small className="hint-info">Used to estimate this wallet’s balance in reports. Transaction rates are saved separately. Not a live rate — click "Get live rate" to fill in today's rate, then adjust if you need to.</small>
          </Field>}
          <Field name="balance" label={`Starting balance (${currency})`} error={errors.balance} htmlFor="wallet-balance">
            <input
              id="wallet-balance"
              name="balance"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={balance}
              onChange={(event) => { setBalance(event.target.value); clearError('balance'); }}
            />
            <small className="hint-ticker">Money already in this wallet before you start tracking. It won't count as this month's income — use the Income button for money coming in from now on.</small>
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   WALLET DETAIL
   ============================================================ */
function WalletDetailModal({ walletId }: { walletId: string }) {
  const { wallets, transactions, categories } = useAppData();
  const { closeModal, openModal, formatBalance, balanceHidden, toggleBalance } = useUi();
  const detail = walletDetail(walletId, wallets, transactions);
  const remove = useDeleteWallet();

  const peers = transferPeers(transactions);
  const removeTransfer = useDeleteTransfer();

  // Daftar aktivitas dimuat bertahap 10-10 saat di-scroll (bukan slice tetap + "See all").
  const { visible, hasMore, sentinel } = useIncrementalList(detail?.transactions.length ?? 0, 5);

  useEffect(() => { if (!detail) closeModal(); }, [detail, closeModal]);
  if (!detail) return null;

  const transfersNet = detail.transfersIn - detail.transfersOut;
  const hasTransfers = detail.transfersIn > 0 || detail.transfersOut > 0;

  return (
    <Modal
      id="wallet-detail-modal"
      className="wallet-detail-modal"
      labelledBy="wallet-detail-title"
      onClose={closeModal}
      head={
        <div className="modal-head">
          <div className="wallet-detail-heading">
            <span className="wallet-icon" aria-hidden="true"><Icon name={detail.icon as IconName} /></span>
            <div>
              <h2 id="wallet-detail-title">{detail.name}</h2>
              <p>{detail.typeLabel} · {txCount(detail.transactions.length)}</p>
            </div>
          </div>
          <div className="wallet-detail-actions">
            <button
              className="icon-btn"
              type="button"
              aria-label="Edit wallet"
              title="Edit wallet"
              onClick={() => openModal({ kind: 'wallet', id: walletId })}
            >
              <Icon name="edit" />
            </button>
            <button
              className="icon-btn danger"
              type="button"
              aria-label="Delete wallet"
              title="Delete wallet"
              onClick={() => remove(walletId)}
            >
              <Icon name="trash" />
            </button>
            <button className="icon-btn" type="button" aria-label="Close wallet details" onClick={closeModal}>
              <Icon name="close" />
            </button>
          </div>
        </div>
      }
    >
      <div className="modal-body">
        <div className="wallet-detail-balance">
          <small>
            Current balance
            <button
              type="button"
              className="hero-eye"
              aria-pressed={balanceHidden}
              aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
              title={balanceHidden ? 'Show balance' : 'Hide balance'}
              onClick={toggleBalance}
            >
              <Icon name={balanceHidden ? 'eye-off' : 'eye'} />
            </button>
          </small>
          <strong className="num">{formatBalance(detail.balance, detail.currency)}</strong>
        </div>
        <button
          className="btn secondary wallet-detail-transfer"
          type="button"
          onClick={() => openModal({ kind: 'transfer', fromWalletId: walletId })}
        >
          <Icon name="transfer" /> Transfer money
        </button>
        <div className={`wallet-detail-stats stat-grid${hasTransfers ? ' has-transfers' : ''}`}>
          <div className="stat"><small>Starting</small><strong className="num">{formatCurrency(detail.initialBalance, detail.currency)}</strong></div>
          <div className="stat"><small>Money in</small><strong className="num income">{formatCurrency(detail.income, detail.currency)}</strong></div>
          <div className="stat"><small>Money out</small><strong className="num expense">{formatCurrency(detail.expense, detail.currency)}</strong></div>
          {hasTransfers && (
            <div className="stat">
              <small>Transfers</small>
              <strong className="num">{(transfersNet > 0 ? '+' : transfersNet < 0 ? '−' : '') + formatCurrency(Math.abs(transfersNet), detail.currency)}</strong>
            </div>
          )}
        </div>
        <div className="wallet-detail-history-section">
          <div className="wallet-detail-history-head">
            <div><h3>Activity</h3><p>Recent transactions from this wallet</p></div>
          </div>
          <div className="transactions wallet-detail-history">
            {detail.transactions.length ? (
              <>
                {detail.transactions.slice(0, visible).map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    categories={categories}
                    wallets={wallets}
                    showDate
                    transfer={transaction.transferPairId ? peers.get(transaction.transferPairId) : undefined}
                    onOpen={(id) => transaction.transferPairId
                      ? removeTransfer(transaction.transferPairId)
                      : openModal({ kind: 'transaction', id })}
                  />
                ))}
                <div ref={sentinel} />
                {hasMore && <InlineLoader />}
              </>
            ) : (
              <EmptyState
                icon="receipt"
                title="No activity yet"
                message="Transactions from this wallet will show up here."
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   CATEGORY
   ============================================================ */
function CategoryModal({ category }: { category: Category | null }) {
  const { addCategory, editCategory } = useAppData();
  const { closeModal, toast } = useUi();
  const [name, setName] = useState(category ? category.name : '');
  const [type, setType] = useState<TransactionType>(category ? category.type : 'expense');
  const [icon, setIcon] = useState(category ? category.icon : '🍜');
  const [showAllIcons, setShowAllIcons] = useState(false);
  const { errors, setErrors, clearError } = useFormErrors();
  const [busy, setBusy] = useState(false);
  const currentIconOption = CATEGORY_ICONS.find((item) => item.icon === icon) ||
    (category ? { icon: category.icon, label: 'Current' } : null);
  const availableIcons = currentIconOption && !CATEGORY_ICONS.some((item) => item.icon === currentIconOption.icon)
    ? [currentIconOption, ...CATEGORY_ICONS]
    : CATEGORY_ICONS;
  const previewIcons = availableIcons.slice(0, CATEGORY_ICON_PREVIEW_COUNT);
  const visibleIcons = showAllIcons
    ? availableIcons
    : currentIconOption && !previewIcons.some((item) => item.icon === currentIconOption.icon)
      ? [...previewIcons, currentIconOption]
      : previewIcons;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setErrors({ name: 'Give your category a name.' }); return; }
    setErrors({});
    setBusy(true);
    const payload: CategoryPayload = { name: trimmed, type, icon };
    try {
      if (category) {
        await editCategory(category.id, payload);
        toast(trimmed + ' updated');
      } else {
        await addCategory(payload);
        toast(trimmed + ' added');
      }
      closeModal();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Could not save category.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      id="category-modal"
      className="category-modal"
      labelledBy="category-modal-title"
      onClose={closeModal}
      head={
        <ModalHead
          id="category-modal-title"
          title={category ? 'Edit category' : 'New category'}
          desc="Name it, pick a type, and choose an icon."
          closeLabel="Close category dialog"
          onClose={closeModal}
        />
      }
      foot={
        <div className="modal-foot">
          <button className="btn secondary" type="button" onClick={closeModal}>Cancel</button>
          <button className="btn primary" type="submit" form="category-form" disabled={busy}>Save</button>
        </div>
      }
    >
      <form id="category-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field name="name" label="Category name" error={errors.name} full htmlFor="category-name">
            <input
              id="category-name"
              name="name"
              type="text"
              placeholder="e.g. Hobbies"
              autoComplete="off"
              value={name}
              onChange={(event) => { setName(event.target.value); clearError('name'); }}
            />
          </Field>
          <Field name="type" label="Type" htmlFor="category-type">
            <Dropdown
              id="category-type"
              label="Category type"
              value={type}
              onChange={(value) => setType(value as TransactionType)}
              options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
            />
          </Field>
          <div className="input full">
            <label id="category-icon-label">Icon</label>
            <div className="category-picker" id="category-picker" role="listbox" aria-labelledby="category-icon-label">
              {visibleIcons.map((item) => (
                <button
                  key={item.icon}
                  className={`category-choice${item.icon === icon ? ' selected' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={item.icon === icon}
                  data-icon={item.icon}
                  onClick={() => setIcon(item.icon)}
                >
                  <span className="category-icon" aria-hidden="true">{item.icon}</span>
                  <small>{item.label}</small>
                </button>
              ))}
            </div>
            {availableIcons.length > CATEGORY_ICON_PREVIEW_COUNT && (
              <button
                className="btn ghost category-picker-toggle"
                type="button"
                aria-expanded={showAllIcons}
                aria-controls="category-picker"
                onClick={() => setShowAllIcons((value) => !value)}
              >
                {showAllIcons ? 'Show fewer' : `See all categories (${availableIcons.length})`}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   TRANSACTION
   ============================================================ */
function TransactionModal({
  transaction,
  initialType
}: {
  transaction: Transaction | null;
  initialType?: TransactionType;
}) {
  const { wallets, categories, addTransaction, editTransaction } = useAppData();
  const { closeModal, toast } = useUi();
  const remove = useDeleteTransaction();

  const [type, setType] = useState<TransactionType>(
    transaction ? transaction.type : (initialType || 'expense')
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : ''
  );
  const [date, setDate] = useState(transaction ? transaction.date : today());
  const [walletId, setWalletId] = useState(transaction ? transaction.walletId || '' : '');
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
  const currency = selectedWallet?.currency || 'IDR';
  const exchangeRate = currency === 'IDR' ? 1 : (selectedWallet?.exchangeRate || 0);
  const [categoryId, setCategoryId] = useState(transaction ? transaction.categoryId || '' : '');
  const [note, setNote] = useState(transaction ? transaction.note : '');
  const { errors, setErrors, clearError } = useFormErrors();
  const [busy, setBusy] = useState(false);

  const walletOptions = wallets.length
    ? [{ value: '', label: 'Choose a wallet' }].concat(
        wallets.map((wallet) => ({ value: wallet.id, label: wallet.name + ' (' + wallet.currency + ')' }))
      )
    : [{ value: '', label: 'No wallets yet' }];

  const typeCategories = categoriesByType(activeCategories(categories), type);
  const categoryOptions = typeCategories.length
    ? [{ value: '', label: 'Choose a category' }].concat(
        typeCategories.map((category) => ({
          value: category.id,
          label: category.icon + ' ' + category.name
        }))
      )
    : [{ value: '', label: 'No ' + (type === 'income' ? 'income' : 'expense') + ' categories yet' }];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = readDecimal(amount);
    const next: Errors = {};
    if (!validAmount(value, currency) || value <= 0) next.amount = `Enter an amount greater than 0 (max ${fractionDigits(currency)} decimal places).`;
    if (!validRate(exchangeRate)) next.rate = 'This wallet has no valid exchange rate. Fix it in wallet settings first.';
    if (!walletId) next.walletId = 'Choose a wallet first.';
    if (!categoryId) next.categoryId = 'Choose a category first.';
    if (!date) next.date = 'Pick a date.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const payload = { walletId, categoryId, type, amount: value, note, date, currency, exchangeRate };
      if (transaction) {
        await editTransaction(transaction.id, payload);
        toast('Transaction updated');
      } else {
        await addTransaction(payload);
        toast((type === 'income' ? 'Income' : 'Expense') + ' of ' + formatCurrency(value, currency) + ' saved');
      }
      closeModal();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Could not save transaction.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      id="transaction-modal"
      labelledBy="transaction-modal-title"
      onClose={closeModal}
      head={
        <ModalHead
          id="transaction-modal-title"
          title={transaction ? 'Edit transaction' : 'New transaction'}
          desc="Record money coming in or going out."
          closeLabel="Close transaction dialog"
          onClose={closeModal}
        />
      }
      foot={
        <div className="modal-foot">
          {transaction && (
            <button
              className="btn danger-ghost"
              type="button"
              onClick={() => remove(transaction.id)}
            >
              Delete
            </button>
          )}
          <button className="btn secondary" type="button" onClick={closeModal}>Cancel</button>
          <button className="btn primary" type="submit" form="transaction-form" disabled={busy}>Save</button>
        </div>
      }
    >
      <form id="transaction-form" className="transaction-form" onSubmit={submit} noValidate>
        <Segmented
          id="transaction-type"
          label="Transaction type"
          block
          value={type}
          onChange={(value) => { setType(value); setCategoryId(''); clearError('categoryId'); }}
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
        />
        <div style={{ height: 16 }} />
        <div className="form-grid">
          <Field name="amount" label={`Amount (${currency})`} error={errors.amount} htmlFor="transaction-amount">
            <input
              id="transaction-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(event) => { setAmount(event.target.value); clearError('amount'); }}
            />
          </Field>

          {currency !== 'IDR' && <Field label="Amount (IDR estimate)" error={errors.rate} full htmlFor="transaction-idr-estimate">
            <input
              id="transaction-idr-estimate"
              disabled
              value={validRate(exchangeRate) && Number.isFinite(readDecimal(amount)) && readDecimal(amount) > 0 ? formatCurrency(readDecimal(amount) * exchangeRate) : ''}
              placeholder="No rate set"
            />
            <small className="hint-info">1 {currency} = {validRate(exchangeRate) ? exchangeRate : '…'} IDR, from this wallet's settings.</small>
          </Field>}
          <Field name="date" label="Date" error={errors.date} htmlFor="transaction-date">
            <SingleDatePicker value={date} onChange={(value) => { setDate(value); clearError('date'); }} />
          </Field>

          <Field name="walletId" label="Wallet" error={errors.walletId} htmlFor="transaction-wallet">
            <Dropdown
              id="transaction-wallet"
              label="Choose a wallet"
              value={walletId}
              onChange={(value) => {
                setWalletId(value);
                clearError('walletId', 'rate', 'amount');
              }}
              options={walletOptions}
            />
          </Field>

          <Field name="categoryId" label="Category" error={errors.categoryId} htmlFor="transaction-category">
            <Dropdown
              id="transaction-category"
              label="Choose a category"
              value={categoryId}
              onChange={(value) => { setCategoryId(value); clearError('categoryId'); }}
              options={categoryOptions}
            />
          </Field>

          <div className="input full">
            <label htmlFor="transaction-note">Note <span className="muted">(optional)</span></label>
            <textarea
              id="transaction-note"
              name="note"
              placeholder="e.g. Lunch with the team"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   TRANSFER
   ============================================================ */
function TransferModal({ fromWalletId }: { fromWalletId?: string }) {
  const { wallets, addTransfer } = useAppData();
  const { closeModal, toast } = useUi();
  const [fromId, setFromId] = useState(fromWalletId || '');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const { errors, setErrors, clearError } = useFormErrors();
  const [busy, setBusy] = useState(false);

  const fromWallet = wallets.find((wallet) => wallet.id === fromId);
  const toWallet = wallets.find((wallet) => wallet.id === toId);
  const fromCurrency = fromWallet?.currency || 'IDR';
  const toCurrency = toWallet?.currency || 'IDR';
  const fromAmount = readDecimal(amount);
  const amountValid = validAmount(fromAmount, fromCurrency) && fromAmount > 0;
  const toAmount = fromWallet && toWallet
    ? (fromCurrency === toCurrency ? fromAmount : roundToCurrency(fromAmount * fromWallet.exchangeRate / toWallet.exchangeRate, toCurrency))
    : 0;

  const fromOptions = [{ value: '', label: 'Choose a wallet' }].concat(
    wallets.map((wallet) => ({ value: wallet.id, label: `${wallet.name} (${wallet.currency})` }))
  );
  const toOptions = [{ value: '', label: 'Choose a wallet' }].concat(
    wallets.filter((wallet) => wallet.id !== fromId).map((wallet) => ({ value: wallet.id, label: `${wallet.name} (${wallet.currency})` }))
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!fromId) next.fromId = 'Choose a wallet to send from.';
    if (!toId) next.toId = 'Choose a wallet to send to.';
    if (fromId && toId && fromId === toId) next.toId = 'Choose a different wallet.';
    if (!amountValid) next.amount = `Enter an amount greater than 0 (max ${fractionDigits(fromCurrency)} decimal places).`;
    else if (fromWallet && toWallet && toAmount <= 0) next.amount = `Amount is too small to convert to ${toCurrency}.`;
    if (!date) next.date = 'Pick a date.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await addTransfer({
        fromWalletId: fromId, fromCurrency, fromRate: fromWallet!.exchangeRate, fromAmount,
        toWalletId: toId, toCurrency, toRate: toWallet!.exchangeRate, toAmount,
        note, date
      });
      toast(`Transferred ${formatCurrency(fromAmount, fromCurrency)} to ${toWallet!.name}`);
      closeModal();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Could not complete the transfer.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      id="transfer-modal"
      labelledBy="transfer-modal-title"
      onClose={closeModal}
      head={
        <ModalHead
          id="transfer-modal-title"
          title="Transfer money"
          desc="Move money between your own wallets. Doesn't count as income or expense."
          closeLabel="Close transfer dialog"
          onClose={closeModal}
        />
      }
      foot={
        <div className="modal-foot">
          <button className="btn secondary" type="button" onClick={closeModal}>Cancel</button>
          <button className="btn primary" type="submit" form="transfer-form" disabled={busy}>{busy ? 'Transferring…' : 'Transfer'}</button>
        </div>
      }
    >
      <form id="transfer-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field name="fromId" label="From wallet" error={errors.fromId} full htmlFor="transfer-from">
            <Dropdown
              id="transfer-from"
              label="From wallet"
              value={fromId}
              options={fromOptions}
              onChange={(value) => { setFromId(value); if (value === toId) setToId(''); clearError('fromId', 'toId'); }}
            />
          </Field>
          <Field name="toId" label="To wallet" error={errors.toId} full htmlFor="transfer-to">
            <Dropdown
              id="transfer-to"
              label="To wallet"
              value={toId}
              options={toOptions}
              onChange={(value) => { setToId(value); clearError('toId'); }}
            />
          </Field>
          <Field name="amount" label={`Amount (${fromCurrency})`} error={errors.amount} htmlFor="transfer-amount">
            <input
              id="transfer-amount"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(event) => { setAmount(event.target.value); clearError('amount'); }}
            />
          </Field>
          <Field name="date" label="Date" error={errors.date} htmlFor="transfer-date">
            <SingleDatePicker id="transfer-date-picker" triggerId="transfer-date" value={date} onChange={(value) => { setDate(value); clearError('date'); }} />
          </Field>
          {fromCurrency !== toCurrency && toWallet && (
            <Field label="They'll receive" full>
              <input disabled value={amountValid ? formatCurrency(toAmount, toCurrency) : ''} placeholder="Enter an amount first" />
              <small className="hint-info">Converted using each wallet's own exchange rate.</small>
            </Field>
          )}
          <Field name="note" label="Note (optional)" full htmlFor="transfer-note">
            <input
              id="transfer-note"
              type="text"
              name="note"
              placeholder="e.g. Moving savings"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   PROFILE
   ============================================================ */
const PHOTO_SIZE = 256;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function ProfileModal() {
  const { profile, saveProfile } = useAppData();
  const { closeModal, toast } = useUi();
  const [name, setName] = useState(profile?.name || '');
  const [photo, setPhoto] = useState(profile?.photoUrl || '');
  const { errors, setErrors, clearError } = useFormErrors();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Crop tengah + resize ke kotak PHOTO_SIZE supaya avatar selalu penuh. */
  function readPhoto(file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      toast('That photo is larger than 5 MB', { variant: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        const canvas = document.createElement('canvas');
        canvas.width = PHOTO_SIZE;
        canvas.height = PHOTO_SIZE;
        canvas.getContext('2d')?.drawImage(
          image,
          (image.width - side) / 2, (image.height - side) / 2, side, side,
          0, 0, PHOTO_SIZE, PHOTO_SIZE
        );
        setPhoto(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => toast('We could not read that image', { variant: 'error' });
      image.src = String(reader.result);
    };
    reader.onerror = () => toast('We could not read that file', { variant: 'error' });
    reader.readAsDataURL(file);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setErrors({ name: 'Please enter your name.' }); return; }
    setErrors({});
    setBusy(true);
    try {
      await saveProfile(trimmed, photo);
      closeModal();
      toast('Profile updated');
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Could not update profile.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      id="profile-modal"
      labelledBy="profile-modal-title"
      onClose={closeModal}
      head={
        <ModalHead
          id="profile-modal-title"
          title="Edit profile"
          desc="Your name and photo appear across the app."
          closeLabel="Close profile dialog"
          onClose={closeModal}
        />
      }
      foot={
        <div className="modal-foot">
          <button className="btn secondary" type="button" onClick={closeModal}>Cancel</button>
          <button className="btn primary" type="submit" form="profile-form" disabled={busy}>Save</button>
        </div>
      }
    >
      <form id="profile-form" onSubmit={submit} noValidate>
        <div className="profile-photo-field">
          <Avatar
            id="profile-photo-preview"
            className="profile-avatar profile-avatar-lg"
            name={name}
            photo={photo}
          />
          <div className="profile-photo-actions">
            <div className="controls">
              <button className="btn secondary" type="button" onClick={() => fileInput.current?.click()}>
                <Icon name="camera" /> Upload photo
              </button>
              {photo && (
                <button className="btn ghost" type="button" onClick={() => setPhoto('')}>Remove</button>
              )}
            </div>
            <small>JPG or PNG, up to 5 MB. We resize it for you.</small>
          </div>
        </div>
        <input
          type="file"
          id="profile-photo-input"
          ref={fileInput}
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readPhoto(file);
            event.target.value = '';
          }}
        />
        <Field name="name" label="Name" error={errors.name} full htmlFor="profile-name-input">
          <input
            id="profile-name-input"
            name="name"
            type="text"
            maxLength={40}
            placeholder="e.g. Alex"
            autoComplete="name"
            value={name}
            onChange={(event) => { setName(event.target.value); clearError('name'); }}
          />
        </Field>
      </form>
    </Modal>
  );
}

/* ============================================================
   CONFIRM
   ============================================================ */
function ConfirmModal() {
  const { confirmState, closeConfirm } = useUi();
  if (!confirmState) return null;
  return (
    <Modal
      id="confirm-modal"
      className="confirm-modal"
      labelledBy="confirm-title"
      onClose={closeConfirm}
      head={
        <ModalHead
          id="confirm-title"
          title={confirmState.title || 'Are you sure?'}
          desc={confirmState.message || 'This cannot be undone.'}
          closeLabel="Close confirmation"
          onClose={closeConfirm}
        />
      }
      foot={
        <div className="modal-foot">
          <button className="btn secondary" type="button" onClick={closeConfirm}>Cancel</button>
          <button
            className="btn danger-btn"
            type="button"
            id="confirm-accept"
            onClick={() => { const action = confirmState.onConfirm; closeConfirm(); action(); }}
          >
            {confirmState.confirmLabel || 'Delete'}
          </button>
        </div>
      }
    />
  );
}

/* ============================================================
   AKSI HAPUS (dipakai lintas halaman & modal)
   ============================================================ */
export function useDeleteWallet() {
  const { wallets, transactions, removeWallet } = useAppData();
  const { confirm, toast, closeModal } = useUi();

  return function remove(id: string) {
    const wallet = wallets.find((item) => item.id === id);
    if (!wallet) return;
    const count = transactions.filter((item) => item.walletId === id).length;

    confirm({
      title: 'Delete ' + wallet.name + '?',
      message: count
        ? 'This wallet still has ' + count + ' transaction' + (count > 1 ? 's' : '') + '. Deleting it removes them too.'
        : 'This cannot be undone.',
      confirmLabel: count ? 'Delete wallet & transactions' : 'Delete wallet',
      onConfirm: async () => {
        try {
          await removeWallet(id);
          closeModal();
          toast(wallet.name + ' deleted' + (count ? ' with ' + count + ' transaction' + (count > 1 ? 's' : '') : ''));
        } catch (reason) {
          toast(reason instanceof Error ? reason.message : 'Could not delete wallet.', { variant: 'error' });
        }
      }
    });
  };
}

export function useDeleteCategory() {
  const { categories, transactions, removeCategory, archiveCategory } = useAppData();
  const { confirm, toast } = useUi();

  return function remove(id: string) {
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    const count = categoryTransactionCount(transactions, id);

    confirm({
      title: 'Delete ' + category.name + '?',
      message: count
        ? count + ' transaction' + (count > 1 ? 's use' : ' uses') +
          ' this category. We will archive it instead, so your history keeps its name and icon. You can restore it any time.'
        : 'This cannot be undone.',
      confirmLabel: count ? 'Archive category' : 'Delete category',
      onConfirm: async () => {
        try {
          if (count) {
            await archiveCategory(id);
            toast(category.name + ' moved to archive');
          } else {
            await removeCategory(id);
            toast(category.name + ' deleted');
          }
        } catch (reason) {
          toast(reason instanceof Error ? reason.message : 'Could not delete category.', { variant: 'error' });
        }
      }
    });
  };
}

export function useDeleteTransaction() {
  const { categories, transactions, removeTransaction } = useAppData();
  const { confirm, toast, closeModal } = useUi();

  return function remove(id: string) {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;
    const label = transaction.note || resolveCategory(categories, transaction.categoryId).name;

    confirm({
      title: 'Delete this transaction?',
      message: label + ' · ' + formatSigned(transaction.amount, transaction.type, transaction.currency) +
        ' on ' + formatDateID(transaction.date) + '. The wallet balance will be recalculated.',
      confirmLabel: 'Delete transaction',
      onConfirm: async () => {
        try {
          await removeTransaction(id);
          closeModal();
          toast('Transaction deleted');
        } catch (reason) {
          toast(reason instanceof Error ? reason.message : 'Could not delete transaction.', { variant: 'error' });
        }
      }
    });
  };
}

/** Transfer nggak bisa dibuka di form transaksi biasa (form itu mewajibkan
 *  kategori), jadi tap pada baris transfer menampilkan ringkasannya plus
 *  satu-satunya aksi yang masuk akal: hapus kedua leg sekaligus. */
export function useDeleteTransfer() {
  const { wallets, transactions, removeTransfer } = useAppData();
  const { confirm, toast, closeModal } = useUi();

  return function remove(pairId: string) {
    const legs = transactions.filter((item) => item.transferPairId === pairId);
    if (!legs.length) return;
    const out = legs.find((item) => item.type === 'expense');
    const into = legs.find((item) => item.type === 'income');
    const nameOf = (id: string | null | undefined) =>
      wallets.find((wallet) => wallet.id === id)?.name || 'Deleted wallet';
    const amount = out || into!;

    confirm({
      title: 'Delete this transfer?',
      message: `${nameOf(out?.walletId)} → ${nameOf(into?.walletId)} · ` +
        `${formatCurrency(amount.amount, amount.currency)} on ${formatDateID(amount.date)}. ` +
        'Both sides are removed and the wallet balances are recalculated.',
      confirmLabel: 'Delete transfer',
      onConfirm: async () => {
        try {
          await removeTransfer(pairId);
          closeModal();
          toast('Transfer deleted');
        } catch (reason) {
          toast(reason instanceof Error ? reason.message : 'Could not delete transfer.', { variant: 'error' });
        }
      }
    });
  };
}

/* ============================================================
   HOST — merender modal yang sedang aktif
   ============================================================ */
export function ModalHost() {
  const { modal, openModal, toast } = useUi();
  const { wallets, categories, transactions } = useAppData();

  // Sama seperti app vanilla: transaksi butuh minimal satu wallet.
  useEffect(() => {
    if (modal?.kind === 'transaction' && !modal.id && !wallets.length) {
      toast('Add a wallet before recording transactions', { variant: 'error' });
      openModal({ kind: 'wallet' });
    }
    if (modal?.kind === 'transfer' && wallets.length < 2) {
      toast('Add a second wallet before transferring money', { variant: 'error' });
      openModal({ kind: 'wallet' });
    }
  }, [modal, wallets.length, openModal, toast]);

  return (
    <>
      {modal?.kind === 'wallet' && (
        <WalletModal key={modal.id || 'new'} wallet={wallets.find((item) => item.id === modal.id) || null} />
      )}
      {modal?.kind === 'wallet-detail' && <WalletDetailModal walletId={modal.id} />}
      {modal?.kind === 'category' && (
        <CategoryModal key={modal.id || 'new'} category={categories.find((item) => item.id === modal.id) || null} />
      )}
      {modal?.kind === 'transaction' && wallets.length > 0 && (
        <TransactionModal
          key={modal.id || modal.type || 'new'}
          transaction={transactions.find((item) => item.id === modal.id) || null}
          initialType={modal.type}
        />
      )}
      {modal?.kind === 'transfer' && wallets.length > 1 && (
        <TransferModal key={modal.fromWalletId || 'new'} fromWalletId={modal.fromWalletId} />
      )}
      {modal?.kind === 'profile' && <ProfileModal />}
      <ConfirmModal />
    </>
  );
}
