# TwitterAPI.io Requests And Responses

The app calls two read endpoints on `https://api.twitterapi.io`. Every request
sends the selected native connection's key in the `X-API-Key` header. Keys are
never URL parameters, logged request values or response fields.

| Endpoint | Parameters | Purpose |
| --- | --- | --- |
| `GET /twitter/user/info` | `userName=typescript` | Identity, profile image, followers/following and availability |
| `GET /twitter/user/last_tweets` | `userId=<resolved numeric ID>`, `includeReplies=false`, optional `cursor` | Public posts and counters, up to one page at a time |

Initial profile lookup uses the handle; timeline requests use the stable user ID.
Pagination passes `next_cursor` unchanged while `has_next_page` is true. The
separate `pin_tweet` is not added to the post sample. No posting, DM, followers-list
or paid private-account analytics endpoint is called. Avatar image downloads go
to the public profile image URL separately from these API requests.

The following are abridged actual public TypeScript responses captured on
2026-11-22. Omitted user, tweet, media, author and nested quote fields remain in
the raw response; the sample cursor is explicitly replaced with a placeholder.

## User Info

```json
{
  "status": "success",
  "msg": "success",
  "data": {
    "id": "809233214",
    "name": "TypeScript",
    "userName": "typescript",
    "followers": 426264,
    "following": 49,
    "profilePicture": "https://pbs.twimg.com/profile_images/1648471227416346625/v84A9gXA_normal.png",
    "protected": false
  }
}
```

## Last Tweets

```json
{
  "status": "success",
  "code": 0,
  "msg": "success",
  "data": {
    "tweets": [
      {
        "id": "2112610990202507582",
        "createdAt": "Tue Oct 20 18:24:45 +0000 2026",
        "viewCount": 243757,
        "likeCount": 1465,
        "replyCount": 43,
        "retweetCount": 163,
        "quoteCount": 42,
        "isReply": false,
        "isRetweet": false
      }
    ]
  },
  "has_next_page": true,
  "next_cursor": "<opaque cursor, returned unchanged>"
}
```

Official reference: [User Info](https://docs.twitterapi.io/api-reference/endpoint/get_user_by_username)
and [Last Tweets](https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets).

## Multiple Keys And Waterfall

Add each API key separately through the app's native Add Connection interface.
Usable workspace connections are loaded at execution time and duplicate key
values are removed. New requests rotate over available keys. A 401, 402 or 403
retires that key for the current run and retries the same request with the next
key; these rotations do not consume transient retry attempts. Skipped keys are
eligible again on the next run. If all keys are unavailable, the refresh fails
and previous analytics remain intact.

Network errors, HTTP 429 and 5xx retry the same key up to four total attempts,
with 4/8/16-second backoffs and longer Retry-After delays honored. Exhausting
those retries fails the request rather than switching accounts. Each key is
paced at 5.1 seconds between requests for free-tier compatibility. This matches
the YouTube app's distinction between key exhaustion and transient retries;
several keys do not imply independent balances if they belong to one provider
account.


## Refresh Entry Points

The native **Refresh Profile and Analytics** command calls the app route
`POST /s/twitter-analytics/refresh` with `{ "profileIds": ["<profile UUID>"] }`.
An explicit empty list selects no records. Manual selection ignores the
**Scheduled Calculations** checkbox.

The installed **Refresh Twitter Profile and Analytics** workflow invokes the
`workflow-refresh-twitter-profile` logic function with
`{ "profileId": "<profile UUID>" }`. Its reusable workflow action requires one
profile ID; missing IDs and unsuccessful refreshes fail the step. It uses the
same provider endpoints and saved calculation windows as the manual command.

The minute cron dispatcher selects only enrolled profiles when the saved
Off/Hourly/Daily/Weekly UTC schedule is due. It uses native application metadata
to save its attempted window before provider work; settings reads and skipped
ticks make no TwitterAPI.io requests. These entry points add no new provider
endpoints and retain the existing multiple-key waterfall.
