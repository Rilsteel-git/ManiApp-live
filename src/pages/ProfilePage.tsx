/* ============================================================
   ProfilePage.tsx — salinan section #page-profile dari
   personal-wallet/index.html + logika render.profile().
   ============================================================ */

import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useUi } from '../context/UiContext';
import { activeCategories } from '../lib/selectors';
import { MONTHS } from '../lib/format';
import { Avatar } from '../components/Avatar';
import { Icon, type IconName } from '../components/IconSprite';
import { navigate } from '../components/AppShell';

/** "Tracking since March 2026" — dihitung dari saat profil dibuat. */
function memberSince(iso?: string) {
  const date = iso ? new Date(iso) : null;
  if (!date || isNaN(date.getTime())) return 'Your money, tracked in one place';
  return 'Tracking since ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear();
}

function MenuRow({
  icon,
  title,
  meta,
  danger = false,
  onClick
}: {
  icon: IconName;
  title: string;
  meta: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`menu-row${danger ? ' danger' : ''}`} type="button" onClick={onClick}>
      <span className="menu-icon"><Icon name={icon} /></span>
      <span className="menu-body"><strong>{title}</strong><small>{meta}</small></span>
      <span className="menu-chevron" aria-hidden="true"><Icon name="chevron-right" /></span>
    </button>
  );
}

export function ProfilePage() {
  const { signOut } = useAuth();
  const { profile, wallets, categories, transactions, deleteAccount } = useAppData();
  const { openModal, confirm, toast } = useUi();

  const categoryCount = activeCategories(categories).length;
  const name = profile?.name || '';


  function logout() {
    confirm({
      title: 'Log out?',
      message: 'Your session will end. Wallets, categories, and transactions stay in your account.',
      confirmLabel: 'Log out',
      onConfirm: () => { void signOut().catch(() => toast('Could not log out. Please try again.', { variant: 'error' })); }
    });
  }

  function deleteAccountFlow() {
    confirm({
      title: 'Delete your account?',
      message: 'This permanently deletes your profile, wallets, categories, and every transaction. This cannot be undone.',
      confirmLabel: 'Delete account',
      onConfirm: () => {
        void (async () => {
          try {
            await deleteAccount();
          } catch {
            toast('Could not delete your account. Please try again.', { variant: 'error' });
            return;
          }
          // The account is already gone server-side at this point; if
          // signOut() itself fails (e.g. the now-invalid session can't be
          // revoked remotely), there's nothing left to roll back.
          try {
            await signOut();
          } catch {
            /* ignore */
          }
        })();
      }
    });
  }

  return (
    <section className="page active" id="page-profile" aria-label="Profile">
      <div className="grid-2">
        <article className="card">
          <div className="profile-summary">
            <button
              className="profile-photo"
              type="button"
              aria-label="Change profile photo"
              onClick={() => openModal({ kind: 'profile' })}
            >
              <Avatar
                id="profile-avatar"
                className="profile-avatar"
                name={name}
                photo={profile?.photoUrl}
              />
              <span className="profile-photo-badge" aria-hidden="true"><Icon name="camera" /></span>
            </button>
            <div className="profile-identity">
              <strong id="profile-name" className={name ? undefined : 'is-placeholder'}>
                {name || 'Add your name'}
              </strong>
              <small id="profile-meta">{memberSince(profile?.createdAt)}</small>
            </div>
            <button
              className="icon-btn"
              type="button"
              aria-label="Edit profile"
              title="Edit profile"
              onClick={() => openModal({ kind: 'profile' })}
            >
              <Icon name="edit" />
            </button>
          </div>
          <div className="profile-stats">
            <div className="profile-stat"><small>Wallets</small><strong className="num" id="profile-wallets">{wallets.length}</strong></div>
            <div className="profile-stat"><small>Transactions</small><strong className="num" id="profile-tx">{transactions.length}</strong></div>
            <div className="profile-stat"><small>Categories</small><strong className="num" id="profile-categories">{categoryCount}</strong></div>
          </div>
        </article>

        <article className="card manage-account-card">
          <div className="card-head">
            <div><h2>Manage account</h2><p>Your profile, money sources, and app data</p></div>
          </div>
          <div className="menu-list">
            <MenuRow
              icon="user"
              title="Edit profile"
              meta="Change your name and photo"
              onClick={() => openModal({ kind: 'profile' })}
            />
            <MenuRow
              icon="wallet"
              title="Wallets"
              meta={wallets.length ? `${wallets.length} wallet${wallets.length > 1 ? 's' : ''}` : 'Nothing added yet'}
              onClick={() => navigate('wallets')}
            />
            <MenuRow
              icon="category"
              title="Categories"
              meta={`${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`}
              onClick={() => navigate('categories')}
            />

            <MenuRow
              icon="settings"
              title="Settings"
              meta={`Report currency · ${profile?.reportCurrency || 'IDR'}`}
              onClick={() => navigate('settings')}
            />
            <MenuRow
              icon="logout"
              title="Log out"
              meta="End this session"
              danger
              onClick={logout}
            />
            <MenuRow
              icon="trash"
              title="Delete account"
              meta="Permanently erase your profile and data"
              danger
              onClick={deleteAccountFlow}
            />
          </div>
        </article>
      </div>
    </section>
  );
}
