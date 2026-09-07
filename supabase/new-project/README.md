# Migrasi Arunika ke Supabase baru

Target project: `https://drezwxfgykkdnnwjrnnt.supabase.co`

SQL tidak dapat dijalankan dengan anon key. Buka target project di Supabase Dashboard sebagai pemilik, lalu gunakan **SQL Editor** dan jalankan file sesuai urutan berikut.

## Urutan eksekusi

1. Jalankan `01_schema.sql` seluruhnya.
2. Jalankan `02_recovered_content.sql` seluruhnya untuk memulihkan 3 kursus, 2 profil mentor, dan 1 konfigurasi branding dari database lama.
3. Opsional: jalankan `private/03_recovered_analytics.sql` untuk memulihkan snapshot 2.017 event analytics lama.

File analytics sengaja tidak disimpan di Git karena memuat visitor ID, user-agent, dan referrer. File tersebut tersedia hanya di workspace lokal tempat proses recovery dilakukan. Parameter `cfg` lama yang pernah membawa konfigurasi database di URL sudah dibuang dari kolom `full_path`.

## Pemeriksaan setelah migrasi

Jalankan query berikut setelah semua file yang dipilih selesai:

```sql
select 'courses' as table_name, count(*) as row_count from public.courses
union all
select 'mentor', count(*) from public.mentor
union all
select 'branding', count(*) from public.branding
union all
select 'events', count(*) from public.events
union all
select 'course_quizzes', count(*) from public.course_quizzes
union all
select 'quiz_attempts', count(*) from public.quiz_attempts;
```

Hasil minimum setelah langkah 1 dan 2:

- `courses`: 3
- `mentor`: 2
- `branding`: 1
- `events`: 0 bila analytics dilewati, atau 2.017 bila langkah 3 dijalankan
- `course_quizzes`: 0 karena tabel ini belum ada di database lama
- `quiz_attempts`: 0 karena tabel ini belum ada di database lama

Kelas Recording dan post-test baru dapat dibuat dari dashboard Arunika setelah schema tersedia.

## Konfigurasi aplikasi

Source aplikasi dan `.env.example` sudah diarahkan ke URL dan anon key project baru. Konfigurasi lama yang tersimpan di `localStorage` akan otomatis diganti bila URL-nya masih menunjuk project lama. Setelah deploy, lakukan hard refresh sekali pada browser atau PWA.

Jika platform deployment memiliki environment variable `VITE_PUBLIC_SUPABASE_URL` dan `VITE_PUBLIC_SUPABASE_ANON_KEY`, perbarui keduanya dengan nilai project baru juga.

## Catatan keamanan

Arsitektur admin saat ini masih memakai login lokal di browser dan mengakses database memakai anon key. Agar fitur lama tetap berjalan, schema bootstrap memberi akses baca/tulis langsung kepada role `anon` dan `authenticated`; ini belum cocok untuk menyimpan data hasil peserta yang sensitif pada penggunaan produksi.

Tahap pengamanan berikutnya adalah memindahkan login admin ke Supabase Auth, menambahkan role admin, mencabut akses tulis anon ke tabel admin/hasil, lalu mengaktifkan RLS. Jangan pernah menaruh service-role key di frontend.

## Membuat ulang snapshot

`scripts/export_legacy_supabase_data.mjs` dapat membuat ulang SQL recovery selama REST API project lama masih dapat dibaca. Script membaca URL/key lama dari environment variable dan tidak menuliskannya ke output atau log.
