# Mani App React

Versi remake dari `personal-wallet` menggunakan:

- React + TypeScript + Vite
- Supabase Auth, Postgres, Row Level Security, dan Storage
- Tailwind CSS v4 + design system Mani App
- Chart.js melalui `react-chartjs-2`

## Menjalankan secara lokal

1. Install dependency:

   ```bash
   npm install
   ```

2. Buat project Supabase, lalu jalankan seluruh isi `supabase/schema.sql` lewat **Supabase Dashboard → SQL Editor**.

3. Salin environment template:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Isi `.env.local` menggunakan nilai dari **Supabase Dashboard → Project Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

Buka URL Vite yang ditampilkan, biasanya `http://localhost:5173`.

## Fitur yang tersedia

- Register, login, logout dengan Supabase Auth
- Dashboard saldo total, ringkasan bulanan, wallet, dan aktivitas terbaru
- CRUD wallet dengan saldo berjalan dari saldo awal dan transaksi
- CRUD transaksi dengan tipe, kategori, wallet, nominal, tanggal, catatan, filter, edit, dan hapus
- CRUD kategori dengan archive/restore ketika masih dipakai histori transaksi
- Statistik mingguan/bulanan dengan navigasi periode, doughnut chart, bar chart, dan perbandingan periode
- Profil nama dan foto avatar
- Reset data finansial tanpa menghapus profil
- Mobile-only shell maksimum 430px sesuai PRD

## Script

```bash
npm run dev
npm run typecheck
npm run build
npm run preview
```

`personal-wallet-react` belum merupakan Git repository. Jika ingin menjadikannya repository terpisah, jalankan `git init` dari folder ini.

## Multi-currency setup

After running `supabase/schema.sql`, run `supabase/migrations/20260921_multi_currency.sql` in the Supabase SQL Editor (required for both new and existing projects). The migration adds columns and validation triggers; existing wallets and transactions remain IDR at rate 1. It does not delete records. Apply it before using this version's wallet or transaction forms.

- Create a wallet with its native currency. Currency is immutable after creation.
- Enter the opening balance and the wallet’s manual valuation rate: **IDR per 1 unit** of the wallet currency.
- Transactions inherit wallet currency; enter the transaction-date rate for each foreign-currency entry. Editing a transaction preserves its rate unless explicitly changed.
- Profile → Settings → Report currency chooses the dashboard/statistics currency and manual display rate.
- Activity → Filter currency filters original currencies. Display amounts switches between original and report amounts.
- Income and expense reports convert each transaction using its saved rate to IDR, then divide by the chosen report rate. Combined wallet balances convert native balances using each wallet’s manual valuation rate. A zero native balance therefore remains zero. These are estimates, not live portfolio valuation or realized FX gain/loss accounting.
- Native wallet balances always use original amounts. Switching report currency never overwrites those amounts.
- IDR/KRW/JPY accept whole units; USD/EUR/SGD/MYR accept up to two decimal places. Inputs accept a decimal dot or comma without thousands separators.
- Automated market rates and inter-wallet foreign-exchange transfers are not included in v1.

Run `npm test` and `npm run build` for local verification. Database trigger integration requires applying the SQL migration to your Supabase project.
