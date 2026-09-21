---
name: git-workflow
description: Alur kerja git & rilis untuk project Mani App (personal-wallet-react) — kapan kerja cukup di lokal, kapan bikin branch per modul, kapan boleh push ke dev, dan syarat sebelum merge ke Master (production, di-deploy Vercel). Gunakan setiap kali akan commit, push, atau merge branch di project ini.
---

# Git workflow — Mani App (personal-wallet-react)

Branch produksi di repo ini adalah **`Master`** (huruf M besar — bukan `main`),
di-track langsung oleh Vercel untuk production deploy. Branch integrasi adalah
**`dev`**. Ikuti urutan di bawah, jangan lompat tahap.

## Model branch

```
module/<nama-modul>   ← kerja harian per fitur/modul, dari sini
        │  (setelah aman lokal)
        ▼
       dev             ← integrasi, staging sebelum production
        │  (setelah cek CI/CD hijau)
        ▼
      Master            ← production, live di Vercel
```

## Aturan

1. **Default: kerja tetap di lokal dulu.** Setelah edit file, JANGAN langsung
   `git push` kecuali user eksplisit minta ("push", "deploy", "naikin ke dev",
   dst). Commit lokal boleh, tapi push ke remote manapun (`dev` atau `Master`)
   selalu tunggu konfirmasi user.

2. **Setiap modul/fitur baru → branch baru dari `dev`.**
   ```bash
   git checkout dev && git pull origin dev
   git checkout -b module/<nama-modul>
   ```
   Nama branch pakai `module/<nama-modul>` (mis. `module/multi-currency`,
   `module/live-rate`). Satu branch = satu modul/fitur, jangan campur beberapa
   perubahan tidak terkait dalam satu branch.

3. **Sebelum merge branch modul ke `dev`, pastikan modul itu "aman" secara lokal:**
   ```bash
   npm run build       # tsc -b && vite build — harus sukses, exit 0
   npm run typecheck    # kalau ada, atau: npx tsc --noEmit -p tsconfig.app.json
   npm test              # kalau ada test yang relevan dengan modul ini
   ```
   Kalau salah satu gagal, JANGAN merge — perbaiki dulu di branch modulnya.
   Cek juga `git diff`/`git status` sebelum staging, jangan ada file yang
   nggak sengaja ikut (`.env.local`, `node_modules`, dll — harusnya sudah
   di-gitignore, tapi tetap double-check).

4. **Setelah lokal aman, merge ke `dev` lalu push:**
   ```bash
   git checkout dev
   git merge module/<nama-modul>
   git push origin dev
   ```
   Baru branch modul boleh dianggap selesai (boleh dihapus setelah merge
   kalau user mau, tapi jangan hapus tanpa diminta).

5. **Sebelum merge/push `dev` → `Master`, WAJIB cek CI/CD dulu:**
   - Repo ini belum punya GitHub Actions — "CI/CD" yang dimaksud saat ini
     adalah **build Vercel**. Setelah `dev` di-push, tunggu/cek di dashboard
     Vercel apakah preview/deploy dari commit `dev` itu **sukses** (bukan
     merah/gagal) sebelum lanjut ke `Master`.
   - Kalau nanti ditambahkan GitHub Actions (`.github/workflows/*.yml`),
     cek status check itu dulu (`gh run list` / `gh pr checks`) sebelum
     merge ke `Master` — jangan merge kalau ada check yang merah.
   - Build lokal (`npm run build`) yang sukses BUKAN pengganti cek CI/CD —
     itu cuma syarat minimum sebelum masuk `dev` (langkah 3), bukan syarat
     sebelum masuk `Master`.

6. **Push ke `Master` cuma setelah CI/CD di `dev` hijau, dan cuma kalau user minta:**
   ```bash
   git push origin dev:Master
   ```
   (Fast-forward — Master tidak boleh punya commit sendiri di luar yang
   datang dari `dev`. Kalau fast-forward gagal/ada divergensi, STOP dan
   laporkan ke user, jangan force-push.)

## Ringkasan cepat

| Tahap | Branch | Syarat lanjut |
|---|---|---|
| Kerja harian per fitur | `module/<nama>` | — |
| Modul dianggap aman | `module/<nama>` → `dev` | Build lokal sukses (`npm run build`) |
| Siap production | `dev` → `Master` | CI/CD (Vercel build dari `dev`) hijau |

Kapan pun ragu tahap mana yang lagi dikerjakan, tanya user daripada asumsi —
terutama soal "sudah boleh push ke `Master` belum".
