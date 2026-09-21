/* ============================================================
   WalletsPage.tsx — salinan section #page-wallets dari
   personal-wallet/index.html + logika render.wallets().
   ============================================================ */

import { useReport } from '../hooks/useReport';
import { useAppData } from '../context/AppDataContext';
import { useUi } from '../context/UiContext';
import { withBalances } from '../lib/selectors';
import { EmptyState } from '../components/Ui';
import { AddWalletRow, WalletRow } from '../components/rows';

export function WalletsPage() {
  const { wallets, transactions } = useAppData();
  const { openModal, formatBalance } = useUi();

  const list = withBalances(wallets, transactions);
  const { total, formatBalance: reportBalance, currency } = useReport();

  return (
    <section className="page active" id="page-wallets" aria-label="Wallets">
      <div className="stack">
        <article className="card">
          <div className="card-head">
            <div><h2>Combined balance ({currency})</h2><p>Estimated using manual wallet rates</p></div>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <small>Total balance</small>
              <strong className="num" id="wallets-total">{reportBalance(total)}</strong>
            </div>
            <div className="stat">
              <small>Wallets</small>
              <strong className="num" id="wallets-count">{list.length}</strong>
            </div>
            <div className="stat">
              <small>Transactions</small>
              <strong className="num" id="wallets-tx-count">{transactions.length}</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-head">
            <div><h2>All wallets</h2><p>Balances update automatically as you add transactions</p></div>
          </div>
          <div className="wallet-list" id="wallets-list">
            {list.length ? (
              <>
                {list.map((wallet) => (
                  <WalletRow
                    key={wallet.id}
                    wallet={wallet}
                    formatBalance={formatBalance}
                    onOpen={(id) => openModal({ kind: 'wallet-detail', id })}
                  />
                ))}
                <AddWalletRow onClick={() => openModal({ kind: 'wallet' })} />
              </>
            ) : (
              <EmptyState
                icon="wallet"
                title="No wallets yet"
                message="Create one for each place you keep money — a bank, an e-wallet, or cash."
                actionLabel="Add wallet"
                onAction={() => openModal({ kind: 'wallet' })}
              />
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
