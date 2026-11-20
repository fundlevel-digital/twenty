# Handoff: CRM call recordings audit and repair

Fork session `7cc4d118-11a7-442f-84c0-b9e895344e40`, forked from the "Twenty - Fundlevel Dashboard" session `16b3ec70-…`. Worked 2026-11-19 to 2026-11-20. This fork changed **CRM data only**: there are no app or server code changes. This branch (`fundlevel/call-recordings-cleanup`) is cut from `main` (`91e6edbf31`) and adds only this handoff and the one-off scripts used.

## What this fork was about

The owner asked four questions about calls in the Fundlevel CRM (https://crm.fundlevel.co, self-hosted on `ssh claudy`):

1. Are all Fathom calls in the CRM?
2. Are all older Fireflies calls in, and how many have audio, video or transcripts?
3. Are the calls migrated from Attio stored properly (video, audio, text)?
4. Why has Fathom stopped joining calls?

Then the owner asked me to fix what could be fixed, minus a few calls they chose to drop.

## Where things stand (end of fork)

Nothing is running and nothing is half-applied.

### Attio-migrated calls (`externalRecordingId` = `attio:<attio call_recording_id>`)

- **87 rows, 86 with video.**
- **84 videos uploaded** from Attio on 2026-11-19 (9.31 GB, 0 failures). The smallest (330 KB) and largest (Tameem x Kareem, 328 MB) were spot-checked; both play and are complete.
- **New row:** "Fundlevel Media Intro - Influencer Marketing between Kareem Yakubu and Ella Sway", Oct 20, 2026.
  - Id `8b505ba9-4859-4ad3-af1e-d8a410c6c9fe`.
  - 342-turn transcript converted from Attio segments, plus the 120 MB video.
  - Linked to calendar event `b0be8d72-5e64-478f-85fa-46ef44f51a3c`.
  - The migration had missed it because it was recorded the day before cutover.
- **Trashed:** Twenty's own call-recorder entry for the same meeting ("Call recording - Oct 20, 2026, 7:00 PM UTC", `db614acd-3c67-4c03-8b24-5c2022b55835`). It was a failed 10-second clip with an empty transcript, and the owner asked for it to go. It's a soft delete, so it can be restored.
- **Only "Kareem <> TrulyInbox" has no video.** The migration manifest lists it, but the recording no longer exists in Attio, and no copy was found.
- **Transcripts:** 81 of 86 migrated rows had them from the migration. Attio itself has transcripts for 81 recordings, so nothing is missing there.
- **Why videos were missing:** the Oct 21 migration wrote a manifest of all 86 mp4s (Google Drive, account kareem@mail.fundlevel.co: "Attio recording manifest.json") but never copied the files. The Drive folder "Attio Call Recordings - 2026-10-21" is empty, and Twenty held only 3 videos.

### Fireflies

- **Fireflies has 49 calls** found by participant (kareem@mail.fundlevel.co and kareem@fundlevel.co). That search caps at 50 per participant, and calls where neither address is a participant wouldn't appear.
- **41 are in the CRM, all with transcripts and none with audio or video.** The Fireflies app never imports media.
- **17 duplicates merged.** The agent "Hermes" had imported the same calls as `fireflies:call:<id>`, alongside the app's rows (raw Fireflies id).
  - I kept the app rows and filled gaps from the Hermes copies: calendar links on 3 ("Conference Link: …vnz-hfwd-fex", one "Floqer Influencer Marketing", "Sunny Intro … Aaron Joseph") and the summary on "hashir x kareem".
  - The Hermes copies are soft-deleted. 0 duplicate groups remain.
- **Not importable (6), so nothing was written:**
  - "Super Secret … Adam Badar" (2025-11-27) and "Super Secret … Tamas" (2026-02-11): Fireflies has no transcript or summary.
  - "Kareem & Mitch | Apollo.io Meeting" (2025-12-01), "Super Secret … Abdul Haseeb" (2025-12-25), "Kareem and Jonathan Perez" (2026-01-12) and "Annual Client Webinar & Tax Season Kickoff" (2026-02-10): the owner's API key gets `object_not_found`. They're probably hosted on other people's Fireflies accounts.
- **Dropped by the owner:**
  - "Kareem Yakubu and Bec" (Bec Hu, Channeled, bec@withchanneled.com, 2026-01-26, 2 hours): https://app.fireflies.ai/view/01KFS03D6JWM3Z52HJP8RAXQ4C
  - "Consultation Meeting (Billable)" (2026-03-18): https://app.fireflies.ai/view/01KKW2QNK9JDSSP9440PH95REM

### Fathom

- **Fathom has 22 recordings** (21 real plus a 2021 demo), dated 2025-09-23 to **2025-12-19**. There's nothing after that.
- **19 are in the CRM,** imported earlier by Hermes as `fathom:call:<id>`, with transcripts and summaries and no media.
- **2 not imported, by the owner's choice:**
  - Jae Park (2025-10-13): https://fathom.video/calls/439136235
  - Impromptu Google Meet (2025-11-11, 44 min): https://fathom.video/calls/470784078
- **The Fathom app** (installed Nov 14, connected Nov 14 and Nov 17) has imported 0 rows, because its connect-time backfill only covers 31 days. Its webhooks are registered, and the endpoint `https://crm-login.fundlevel.co/webhooks/server/72b52885-e1ba-419f-8e2e-052700f2c9f2?connectionId=<id>` returns `{"queued":true}`.
  - During diagnosis I sent one empty test POST to it. It fails the signature check, so nothing is created.

### Why Fathom stopped joining (diagnosis, not fixed)

- The owner's Fathom setting is "Auto-record: All meetings", with Google Meet fully enabled and auto-capture of unscheduled Meet on.
- Every Fathom recording was made by **kareem@fundlevel.co**, and the last one was 2025-12-19.
- The calendar synced to Twenty and Composio is **kareem@mail.fundlevel.co**. Both domains have Google MX records.
- Likely cause: Fathom's calendar connection is on the fundlevel.co account, which no longer receives your invites. Fireflies is signed in with mail.fundlevel.co, which is why it keeps recording.
- **Next step:** in Fathom, go to Settings → Calendar and reconnect as kareem@mail.fundlevel.co, or confirm the two addresses are one Google account and dig further.
- "Auto-capture unscheduled Meet" also needs the Fathom Chrome extension, signed in as the Fathom account.

## Open items

1. **Revoke the Attio API key** the owner pasted in chat (full read-write scopes). The copy saved locally was deleted. The old Infisical `ATTIO_API_KEY` (`/packages/jobs`) is already revoked.
2. **Fathom calendar:** fix it as described above.
3. **Optional, Fireflies media:** add audio and video import to the Fireflies app. Fireflies only exposes media on paid plans.
4. **Optional, Fathom media:** add video to the 19 Hermes Fathom rows. The Fathom app uses recording ids while Hermes used call ids, so match the rows rather than re-importing them.
5. **Optional cleanup:** the trash now holds 17 Hermes Fireflies duplicates and the 10-second recorder entry.

## How the repairs were done (to repeat them)

All writes went through the Twenty API as the owner, via the CLI `npx -y twenty@2.59.0 --no-input --json api graphql [--metadata]` (remote `fundlevel`). No raw SQL writes were made.

### Attaching a video to a `callRecording` (`video` field id `3afc7720-3770-4565-9ca5-05c224f13348`, max 1 file)

1. `createFileUpload(filename, size, fileFolder: FilesField, fieldMetadataId: <video field id>)` on the metadata API returns `fileId`, `uploadUrl` and `contentType`. `size` must be the real byte count.
2. On claudy, stream the source straight to the server, bypassing Cloudflare's 100 MB limit:
   `curl -sfL <source> | curl -sf -T - -H "Content-Type: <contentType>" "http://127.0.0.1:3350/file-upload/<fileId>?token=<token from uploadUrl>"`
3. Call `completeFileUpload(fileId)` on the metadata API.
4. Run `updateCallRecording(id, data: { video: [{ fileId, label }] })` on the core API.

### Gotchas

- GraphQL `mergeCallRecordings` refuses to run, because `callRecording` is a system object. Dedupe by filling gaps and then calling `deleteCallRecording` (a soft delete).
- The API exposes the summary as the composite `summary { markdown blocknote }`. `summaryMarkdown` reads as null.
- Attio video URLs (`video.attio.com/...mp4`) download without auth, but Cloudflare blocks Python's default user agent (error 1010). Use curl.
- Attio API: `GET /v2/meetings` (448 meetings), then `/meetings/{id}/call_recordings`, then `/call_recordings/{id}`, which returns `video_url` and `transcript.segments`.
- **Transcript format** used by migrated rows: `[{ participant: { name }, words: [{ text, start_timestamp: { relative }, end_timestamp: { relative } }] }]`.
- **Fireflies app functions** used read-only through `npx -y twenty@2.59.0 app exec --path packages/twenty-apps/public/fireflies --name <fn> --payload '{…}'` (run `yarn install` in the app directory first):
  - `fireflies-list-calls-by-participant` (max 50)
  - `fireflies-sync-call` (`{ transcriptId }`)
- The Fathom app has the same kind of function: `fathom-list-calls-by-participant`.

### Scripts (`handoffs/call-recordings/scripts/`)

These are one-off and kept for reference. They expect a scratch directory holding the inputs they name.

| Script | What it did |
|---|---|
| `attio-calls.py` | Inventoried every Attio call recording into `attio-calls.json`. Reads the key from a local `attio-key` file, which isn't committed. |
| `attach-attio-videos.py` | Created uploads, streamed each video on claudy, completed the upload and attached it. Idempotent through `attach-attio-videos.log.jsonl`. Input: `attio-video-jobs.json`. |
| `merge-ff-dupes.py` | Dry-runs by default; `--apply` fills gaps and soft-deletes the Hermes duplicates. Input: `ff-pairs.txt`. |
| `create-ella.py` | Created the Oct 20 Ella Sway call with transcript and video. Imports `attach_attio_videos` (a symlink to `attach-attio-videos.py`). |

## Context

- **Host:** `ssh claudy`, deploy directory `/mnt/storage/twenty-crm`, workspace `3b424be9-f8da-41b6-b564-16c9da2df4e1`, schema `workspace_3iaq1z1s1jv5ol6qhlcwulwbl`.
- **SQL (read-only, as used):** `ssh claudy "cd /mnt/storage/twenty-crm && docker compose exec -T db psql -U postgres -d default"`.
- **Owner rules:** never take backups or pg_dumps on claudy; no AI attribution in commits.
- **Wider deployment and build notes:** see `handoff.md` on branch `fundlevel/dashboard-lookups-youtube-analytics` and the memory notes in `~/.claude/projects/-Users-kareem-dev-projects-twenty/memory/` (`call-recordings-state.md`, `claudy-twenty-deployment.md`).
