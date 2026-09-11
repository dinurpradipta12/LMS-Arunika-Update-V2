# Migrasi Arunika ke Supabase baru

Target project: `https://drezwxfgykkdnnwjrnnt.supabase.co`

SQL tidak dapat dijalankan dengan anon key. Buka target project di Supabase Dashboard sebagai pemilik, lalu gunakan **SQL Editor** dan jalankan file sesuai urutan berikut.

## Project baru dari nol

1. Jalankan `01_schema.sql` seluruhnya.
2. Jalankan `02_recovered_content.sql` seluruhnya untuk memulihkan 3 kursus, 2 profil mentor, dan 1 konfigurasi branding dari database lama.
3. Opsional: jalankan `private/03_recovered_analytics.sql` untuk memulihkan snapshot 2.017 event analytics lama.
4. Jalankan `../migrations/20260907010000_secure_admin_auth_and_rls.sql` seluruhnya.
5. Jalankan `../migrations/20260907030000_long_answer_and_class_feedback.sql` seluruhnya untuk jawaban panjang dan feedback post-test.
6. Jalankan `../migrations/20260907040000_class_feedback_and_completion.sql` seluruhnya untuk feedback akhir kelas dan email sertifikat.
7. Jalankan `../migrations/20260908000000_overall_feedback_visibility.sql` seluruhnya untuk pengaturan tampil/sembunyi tab feedback akhir kelas.
8. Jalankan `../migrations/20260909000000_form_maker.sql` seluruhnya untuk ruang Form Maker, form publik, responder, dan status pembayaran/konfirmasi.
9. Jalankan `../migrations/20260909010000_form_payment_contact.sql` seluruhnya untuk nominal pembayaran, QR Code, nomor rekening, dan konfirmasi WhatsApp.
10. Jalankan `../migrations/20260909020000_form_branding.sql` seluruhnya untuk header banner publik dan pilihan tema warna form.
11. Jalankan `../migrations/20260911000000_qna_audience.sql` seluruhnya untuk sesi Q&A publik, moderasi, voting, dan layar presenter realtime.
12. Buka **Authentication > Users > Add user** dan buat akun memakai email serta password admin Anda sendiri.
13. Buka `04_create_admin.sql`, ganti `GANTI_DENGAN_EMAIL_ADMIN`, lalu jalankan seluruh file.

`01_schema.sql` sekarang fail-closed: semua tabel langsung memakai RLS tanpa policy terbuka. Halaman publik baru aktif setelah migration keamanan pada langkah 4 membuat policy yang hanya membaca konten `published`.

## Project baru yang sudah terlanjur UNRESTRICTED

Untuk project `drezwxfgykkdnnwjrnnt` yang tabelnya sudah berisi data, tidak perlu menjalankan ulang recovery:

1. Buat akun admin di **Authentication > Users > Add user**.
2. Jalankan `../migrations/20260907010000_secure_admin_auth_and_rls.sql` seluruhnya.
3. Jalankan migration `20260907030000_long_answer_and_class_feedback.sql` dan `20260907040000_class_feedback_and_completion.sql` seluruhnya.
4. Jalankan migration `20260908000000_overall_feedback_visibility.sql` seluruhnya.
5. Jalankan migration `20260909000000_form_maker.sql` seluruhnya.
6. Jalankan migration `20260909010000_form_payment_contact.sql` seluruhnya.
7. Jalankan migration `20260909020000_form_branding.sql` seluruhnya.
8. Jalankan migration `20260911000000_qna_audience.sql` seluruhnya.
9. Jalankan `04_create_admin.sql` setelah email placeholder diganti.

Migration keamanan idempotent dan tidak menghapus kursus, analytics, quiz, ataupun hasil peserta. Begitu migration selesai, login lokal lama tidak berlaku lagi; gunakan email/password Supabase Auth yang dibuat pada langkah 1.

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
select 'quiz_attempts', count(*) from public.quiz_attempts
union all
select 'class_feedback_submissions', count(*) from public.class_feedback_submissions
union all
select 'form_forms', count(*) from public.form_forms
union all
select 'form_responses', count(*) from public.form_responses
union all
select 'qna_sessions', count(*) from public.qna_sessions
union all
select 'qna_questions', count(*) from public.qna_questions;
```

Hasil minimum setelah langkah 1 dan 2:

- `courses`: 3
- `mentor`: 2
- `branding`: 1
- `events`: 0 bila analytics dilewati, atau 2.017 bila langkah 3 dijalankan
- `course_quizzes`: 0 karena tabel ini belum ada di database lama
- `quiz_attempts`: 0 karena tabel ini belum ada di database lama
- `form_forms`: 0 sebelum form pertama dibuat dari dashboard
- `form_responses`: 0 sebelum form publik menerima responder
- `qna_sessions`: 0 sebelum sesi Q&A pertama dibuat dari dashboard
- `qna_questions`: 0 sebelum audience mengirim pertanyaan

Kelas Recording dan post-test baru dapat dibuat dari dashboard Arunika setelah schema keamanan dan akun admin tersedia.

## Konfigurasi aplikasi

Source aplikasi dan `.env.example` sudah diarahkan ke URL dan anon key project baru. Aplikasi menghapus konfigurasi database, cache materi, dan flag login admin lama dari `localStorage`. Setelah deploy, lakukan hard refresh sekali pada browser atau PWA.

Jika platform deployment memiliki environment variable `VITE_PUBLIC_SUPABASE_URL` dan `VITE_PUBLIC_SUPABASE_ANON_KEY`, perbarui keduanya dengan nilai project baru juga.

## Pemeriksaan keamanan

Jalankan query ini setelah migration keamanan. Semua baris harus menunjukkan `rls_enabled = true`:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'courses', 'mentor', 'branding', 'events',
    'course_quizzes', 'quiz_attempts', 'class_feedback_submissions',
    'form_forms', 'form_responses', 'qna_sessions', 'qna_questions',
    'qna_question_votes', 'public_content_revisions'
  )
order by c.relname;
```

Realtime hanya memublikasikan `public_content_revisions`, yaitu satu baris sinyal tanpa isi materi atau data pribadi:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in (
    'courses', 'mentor', 'branding', 'events', 'course_quizzes',
    'quiz_attempts', 'form_forms', 'form_responses', 'qna_sessions',
    'qna_questions', 'qna_question_votes', 'public_content_revisions'
  )
order by tablename;
```

Hasil query kedua untuk tabel Arunika harus hanya `public.public_content_revisions`.

Anon key memang berada di bundle dan terlihat di Network; itu adalah publishable credential, bukan password admin. Batas keamanan sebenarnya diterapkan di database: anon hanya dapat membaca kursus `published`, profil publik, branding publik, dan sinyal Realtime. Tabel analytics, konfigurasi quiz lengkap, jawaban benar, hasil peserta, serta allow-list admin tidak memiliki akses baca publik. Jangan pernah menaruh service-role key di frontend.

Konten yang memang tampil pada page publik tetap dapat dilihat pengunjung melalui Network karena browser harus mengunduhnya untuk dirender. Jangan simpan rahasia di `courses.modules` atau `courses.assets` yang dipublikasikan.

## Membuat ulang snapshot

`scripts/export_legacy_supabase_data.mjs` dapat membuat ulang SQL recovery selama REST API project lama masih dapat dibaca. Script membaca URL/key lama dari environment variable dan tidak menuliskannya ke output atau log.
