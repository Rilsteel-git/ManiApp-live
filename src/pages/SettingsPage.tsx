import { CurrencySettings } from '../components/CurrencySettings';
import { useAppData } from '../context/AppDataContext';

export function SettingsPage() {
  const { profile } = useAppData();
  return (
    <section className="page active" id="page-settings" aria-label="Settings">
      <div className="stack">
        <CurrencySettings key={`${profile?.reportCurrency}-${profile?.reportRate}`} />
      </div>
    </section>
  );
}
