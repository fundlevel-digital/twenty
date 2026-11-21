# 0003. Configure Multiple Timeframes With Validated Tags

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: youtube-analytics
- Related: [Object](0002-one-youtube-channels-object.md), [App Preferences](0004-native-app-preferences.md)

## Context

Fixed metric labels and windows did not follow configuration. Kareem wanted
independent count and percentage windows, with native CRM columns, and rejected
both CSV editing and a large catalog of day options.

## Exchange

- 2026-11-21 Kareem: "anyway to make these dynamic depending on the config?"
- 2026-11-21 Kareem: "Also can we maybe allow multiple timeframe calculations?"
- 2026-11-21 Kareem selected: "Separate CRM columns for each timeframe, available in tables, filters, and sorts"
- 2026-11-21 Kareem: "also if so, add config weather to only show %, numbers, or both; both of these formats should be configurable timeframes, and support multi-timeframe"
- 2026-11-21 Kareem confirmed: "Yes—counts and percentages, selectable separately or together"
- 2026-11-21 Attached reply initially specified: "allow 1 day increaments, min of 1; max of 266"
- 2026-11-21 Kareem: "I don't like this CSV style, I'd prefer a better UI for multi-value config"
- 2026-11-21 Agent: replaced CSV editing with a searchable multi-select of day values.
- 2026-11-21 Kareem: "What's the diff between the 12 and the 30,60,90?"
- 2026-11-21 Agent: explained recent-video count versus rolling day windows.
- 2026-11-21 Kareem: "I don't like having 266 selects; can we make it like a tag? w/ validation of min 1, max 366, and must be a acc number"
- 2026-11-21 Agent: implemented validated tags; the later 366-day request superseded the earlier 266-day attachment.
- 2026-11-21 Kareem: "Did u seed and test w/ real data?"
- 2026-11-21 Agent: verified real data, multiple window/format combinations and native filtering/sorting.

## Decision

Configure independent **Number Timeframes In Days** and **Percentage Timeframes
In Days**, plus **Numbers Only**, **Percentages Only** or **Both**. Each enabled
metric/window has its own native CRM column, usable in tables, filters and sorts.

Use Enter/Add and removable tags for actual whole-day numbers from **1 through
366**. Reject duplicates, text, decimals, exponents, hex and non-finite values.
The implementation allows at most 10 windows per group. Defaults are 30, 60 and
90 days for each group, with Both selected. Pending tag input must be committed
or cleared before saving.

**Recent Video Window** is separate: the latest **2–30** qualifying videos,
default **12**, regardless of their age. That range came from the owner's
attached reply, not the number of days or number of stored channels.

## Why

Kareem wanted native, queryable columns and a compact, validated multi-value UI.
Counts and percentages can have different windows. A recent-video count measures
a different sample from a rolling calendar window and must be labeled clearly.

## Consequences

Refresh synchronizes managed NUMBER fields on YouTube Channels. Percentage
columns use native fractional percentage storage. Stable API names encode the
metric and window. Removing a window/format hides its managed columns from the
app view and Fields widgets without deleting stored values or modifying custom
tables. Conflicting unmanaged fields are rejected instead of overwritten.

The app reads uploads once per channel and reuses them across windows. It scans
at least 365 days for posting cadence, and farther if needed for the latest-N
sample. A 100-page / 5,000-upload safety limit fails incomplete calculations
instead of writing partial metrics. Averages trim highest/lowest views when
there are at least four videos; medians use the full sample. Empty windows stay
empty. The app README owns the remaining metric semantics.

## Evidence

- Supplied replies `chat-reply-2026-11-21_08-55-13.txt` and `chat-reply-2026-11-21_09-18-08.txt`; later direct owner correction, 2026-11-21.
- [Shared validation](../../../packages/twenty-apps/internal/youtube-analytics/src/utils/parse-youtube-timeframe.util.ts) and [tag UI](../../../packages/twenty-apps/internal/youtube-analytics/src/front-components/components/TimeframeTags.tsx).
- [Field synchronization](../../../packages/twenty-apps/internal/youtube-analytics/src/logic-functions/utils/synchronize-youtube-metric-fields.util.ts).
- [Collection coverage](../../../packages/twenty-apps/internal/youtube-analytics/src/logic-functions/utils/collect-long-form-videos.util.ts).
- Preview checks accepted/saved 1 and 366, rejected invalid/duplicate inputs, tested Numbers Only / Percentages Only / Both, restored defaults, and exercised native filtering/sorting on generated columns.
