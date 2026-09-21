import { useState } from 'react';
import type { Currency } from '../types';
import { useAppData } from '../context/AppDataContext';
import { useUi } from '../context/UiContext';
import { currencyOptions, readDecimal, validRate } from '../lib/currency';
import { Dropdown } from './Ui';

export function CurrencySettings() {
  const { profile, saveCurrencySettings } = useAppData();
  const { toast } = useUi();
  const [currency, setCurrency] = useState<Currency>(profile?.reportCurrency || 'IDR');
  const [rate, setRate] = useState(String(profile?.reportRate || ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = currency === 'IDR' ? 1 : readDecimal(rate);
    if (!validRate(value)) { setError('Enter a positive exchange rate.'); return; }
    setBusy(true);
    try {
      await saveCurrencySettings(currency, value);
      toast('Report currency updated');
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Could not save currency.', { variant: 'error' });
    } finally { setBusy(false); }
  }
  return <article className="card">
    <div className="card-head"><div><h2>Report currency</h2><p>Dashboard, totals and statistics</p></div></div>
    <form onSubmit={save} className="stack">
      <Dropdown label="Report currency" value={currency} options={currencyOptions} onChange={(value) => { setCurrency(value as Currency); setRate(''); setError(''); }} />
      {currency !== 'IDR' && <div className={`input${error ? ' error' : ''}`}>
        <label htmlFor="report-rate">1 {currency} = … IDR</label>
        <input id="report-rate" inputMode="decimal" value={rate} onChange={(e) => { setRate(e.target.value); setError(''); }} placeholder="Your manual report rate" />
        {error && <small className="field-error">{error}</small>}
      </div>}
      <small className="hint-info">Wallet totals use each wallet’s manual rate; income and expense reports use saved transaction rates. This display rate converts both to your chosen currency. Original amounts stay unchanged. Estimates only, not live quotes.</small>
      <button className="btn primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save currency'}</button>
    </form>
  </article>;
}
