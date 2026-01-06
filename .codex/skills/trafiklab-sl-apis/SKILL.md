---
name: trafiklab-sl-apis
description: Use when you need to work with Stockholm (SL) public transport data via Trafiklab's SL APIs. Covers SL Transport (stops, lines, departures), SL Deviations (disruption messages), and SL Journey-planner v2 (stop lookup + trip planning) at transport.integration.sl.se, deviations.integration.sl.se, and journeyplanner.integration.sl.se.
---

# Trafiklab SL APIs

This Skill helps you reliably navigate Trafiklab's **SL APIs** (Stockholm public transport data):

- **SL Transport**: stops, lines, stop points, and next departures
- **SL Deviations**: disruption and deviation messages
- **SL Journey-planner v2**: stop lookup + travel proposals (journey planning)

These three APIs are intended for interactive use cases like departure boards and trip planning. For heavy analytics or very high traffic, Trafiklab recommends using GTFS data instead.

## Quick routing: pick the right API

Use these decision rules first:

1. **"Next departures from a stop"**, **"lines"**, **"stop metadata"**
   → SL Transport (`transport.integration.sl.se`)

2. **"Is there a disruption?"**, **"service alerts"**, **"deviations for a line/stop"**
   → SL Deviations (`deviations.integration.sl.se`)

3. **"Plan a route from A to B"**, **"find stop ids"**, **"nearby stops by coordinate"**
   → SL Journey-planner v2 (`journeyplanner.integration.sl.se`)

If the user asks for data outside SL's coverage (other parts of Sweden), use ResRobot instead of SL's APIs.

## Global rules

1. **HTTP + JSON**
   All endpoints are HTTP requests and return JSON.

2. **No API keys (currently)**
   SL Transport, SL Deviations, and SL Journey-planner v2 do not require an API key. Still follow fair-use guidance (avoid excessive polling).

3. **Prefer canonical IDs from SL Transport**
   - For departure boards, use a Transport `siteId` from `/v1/sites`.
   - For disruptions by line, get `lineId` from `/v1/lines`.
   Only use legacy conversion if you must (see [gotchas.md](gotchas.md)).

4. **Be explicit about timestamps**
   Present both scheduled and expected times when available. If the API returns ISO timestamps, keep them as-is and optionally also show local time.

## Standard workflows

### Workflow A: next departures for a stop (departure board)

Goal: show real-time departures for a stop like "Slussen".

1. Resolve the **Transport `siteId`**:
   - Call: `GET https://transport.integration.sl.se/v1/sites?expand=true`
   - Find the best match by `name` (and optionally proximity using `lat/lon`).

2. Fetch departures:
   - Call: `GET https://transport.integration.sl.se/v1/sites/{siteId}/departures`

3. Present results:
   - Use `departures[]` for departure rows.
   - Show any `stop_deviations[]` prominently.

Notes:
- The Transport docs warn that `siteId` values from the legacy SL Stop Lookup API do not match Transport site ids. Use `/v1/sites` where possible. If you must convert, use the rules in [gotchas.md](gotchas.md) or run `python scripts/siteid_convert.py 300109001`.

### Workflow B: find stops/addresses and plan a trip (journey planning)

Goal: "How do I travel from Odenplan to Slussen?"

1. Stop lookup (search):
   - Call: `GET https://journeyplanner.integration.sl.se/v2/stop-finder`
   - For stop search:
     - `type_sf=any`
     - `any_obj_filter_sf=2` (stops)
     - `name_sf=<query>`
   - For coordinates:
     - `type_sf=coord`
     - `name_sf=<lon>:<lat>:WGS84[dd.ddddd]`

2. Trip search:
   - Call: `GET https://journeyplanner.integration.sl.se/v2/trips`
   - Minimal required params:
     - `type_origin`, `name_origin`
     - `type_destination`, `name_destination`
     - `calc_number_of_trips` (1-3)

3. Present results:
   - Summarize each proposed trip: total duration, number of changes, and per-leg details (walk, transit legs, etc).
   - If multiple trips are returned, order them as provided and label them clearly.

For additional parameters (time, accessibility, filtering, etc.), consult the OpenAPI specification on the Journey-planner page (and/or keep a local copy for your project).

### Workflow C: disruptions and deviations (service alerts)

Goal: "Is there anything wrong with the metro green line near Slussen?"

1. Decide how to filter:
   - By site(s): `site=<siteId>` (repeatable)
   - By line(s): `line=<lineId>` (repeatable)
   - By mode(s): `transport_mode=METRO|BUS|TRAM|TRAIN|SHIP|FERRY|TAXI` (repeatable)
   - Include future messages: `future=true`

2. Fetch messages:
   - Call: `GET https://deviations.integration.sl.se/v1/messages?...`

3. Rate limit:
   - Only make this request **once per minute** (fair use).
   - Use the `age` header to reason about cache freshness.

## Additional resources

- For endpoint summaries and key fields, see [reference.md](reference.md).
- For copy-paste HTTP examples (curl), see [examples.md](examples.md).
- For ID conversion, caching rules, and common pitfalls, see [gotchas.md](gotchas.md).

## Utility scripts

- Convert legacy Stop Lookup SiteId format to Transport `siteId`:
  ```bash
  python scripts/siteid_convert.py 300109001
  ```
