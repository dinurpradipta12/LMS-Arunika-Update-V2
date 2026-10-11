# Nayagement → Arunika 1:1 sync

This integration keeps `consultation_bookings` in Nayagement as the booking
source of truth. Arunika receives an idempotent projection of each selected
booking: a private mentee portal and one `one_to_one_schedule_events` record.
Reports stay authored in Arunika.

## One-time deployment

1. Apply the Arunika migrations, including:

   - `20260920000000_one_to_one_mentorship.sql`
   - `20261010000000_one_to_one_reports.sql`
   - `20261010010000_nayagement_one_to_one_sync.sql`

2. Deploy the Arunika receiver and configure a long, random shared secret.

   ```sh
   supabase functions deploy nayagement-booking-sync --project-ref drezwxfgykkdnnwjrnnt
   supabase secrets set NAYAGEMENT_SYNC_SECRET="replace-with-one-random-secret" --project-ref drezwxfgykkdnnwjrnnt
   ```

3. In the Nayagement repository, deploy the sender and use the **same** value
   for `ARUNIKA_SYNC_SECRET`.

   ```sh
   supabase functions deploy arunika-booking-sync --project-ref mkydicbdotvqvbzbeeqv
   supabase secrets set \
     ARUNIKA_BOOKING_SYNC_URL="https://drezwxfgykkdnnwjrnnt.supabase.co/functions/v1/nayagement-booking-sync" \
     ARUNIKA_SYNC_SECRET="replace-with-the-same-random-secret" \
     --project-ref mkydicbdotvqvbzbeeqv
   ```

Never put either secret in a Vite variable, source file, or commit.

## Admin workflow

1. In Nayagement's **Booking konsultasi → Pengaturan & jadwal**, copy the
   displayed **Workspace ID untuk Arunika**.
2. In Arunika, open **1:1 Mentorship → Integrasi**, paste that ID, set the
   mentor identity if needed, and save.
3. Open a Nayagement booking and choose **Sync ke Arunika**.
4. In Arunika, open **Raport mentee** and select the synced event when creating
   a report. Choose *Perorangan* or *Tim* and set one or multiple meetings as
   usual.

The sync action is deliberate rather than automatic: it is initiated by a
workspace owner/admin and is safer for contact data. Retrying a booking updates
the existing Arunika event instead of duplicating it. Nayagement's free-form
booking details are validated but intentionally never copied into the public
mentee schedule.

## Manual export/import fallback

Use this path when the server-to-server sender has not been deployed yet, or a
booking needs to be brought over in bulk.

1. Apply Arunika migration `20261011020000_nayagement_manual_booking_import.sql`.
2. In Nayagement, open **Booking konsultasi → Booking masuk** and choose
   **Ekspor untuk Arunika**. This downloads a JSON file; it does not modify or
   delete any booking in Nayagement.
3. In Arunika, open **1:1 Mentorship → Raport mentee → Buat raport baru**.
   Under **Hubungkan ke booking**, choose **Impor Nayagement**, select the JSON
   file, and choose **Impor & sinkronkan**.
4. The imported events immediately appear in the booking picker. Select one to
   prefill the report's mentee, mentor, and first session.

The file contains a workspace ID and booking IDs. Arunika accepts it only when
that workspace is already active in **Integrasi**, and only an Arunika admin can
import it. Re-importing the same file is safe: existing bookings are updated
instead of duplicated. One import supports up to 200 bookings.
