# Reference: Trafiklab SL APIs

This file is meant to be a practical reference when you already know *which* SL API to use.

## SL Transport (transport.integration.sl.se)

Purpose: stops, stop points, lines, transport authorities, and departure boards.

### Concepts

- **Site**: grouping of StopAreas used to simplify searching in the journey planner.
- **StopArea**: grouping of StopPoints with the same traffic type and name within a defined geographic area (such as a terminal).
- **StopPoint**: a stopping point (quay) that is part of a StopArea.

### Endpoints

1) **Lines**
- `GET https://transport.integration.sl.se/v1/lines?transport_authority_id=<id>`
- Docs show `transport_authority_id=1` and `transport_authority_id=8`.

Response shape (from examples in the docs):
- Top-level object keyed by transport modes like `metro`, `tram`, `train`, `bus`, `ship`, `ferry`, `taxi`, each an array of line objects.
- Line object fields include: `id`, `gid`, `name`, `designation`, `transport_mode`, `group_of_lines`, plus nested `transport_authority`, `contractor`, and `valid`.

2) **Sites**
- `GET https://transport.integration.sl.se/v1/sites?expand=true`
- `expand` (boolean) includes stop area ids (`stop_areas`) in the response.

Response fields include:
- `id` (this is the Transport `siteId` you use for departures)
- `gid`, `name`, `abbreviation`, `lat`, `lon`, `stop_areas` (when expanded), `valid`

3) **Departures from site**
- `GET https://transport.integration.sl.se/v1/sites/{siteId}/departures`
- Requires `siteId` (integer). Example: Slussen is 9192 in the docs.

Response shape includes:
- `departures[]`: each item includes
  - destination and direction fields (`direction`, `direction_code`, `via`, `destination`)
  - time fields (`scheduled`, `expected`, `display`)
  - `journey` object (id, state, prediction_state, passenger_level)
  - nested `stop_area`, `stop_point`, `line`
  - `deviations` (may be a string or structure depending on OpenAPI schema)
- `stop_deviations[]`: stop-level messages with fields like `importance`, `consequence`, `message`

4) **Stop points**
- `GET https://transport.integration.sl.se/v1/stop-points`
- Use this for quay/platform-level metadata.

5) **Transport authorities**
- `GET https://transport.integration.sl.se/v1/transport-authorities`
- Use this to discover authority ids you can filter lines by.

### ID notes (Transport siteId)

The docs state:
- A `siteId` is required for departures.
- `siteId` values from the legacy SL Stop Lookup API do not match Transport site ids.
- If you must use legacy SiteId values, you may need to convert them (see gotchas).

For a complete list of optional parameters and the canonical response schemas, consult the Transport OpenAPI specification on the bottom of the Transport docs page.

## SL Deviations (deviations.integration.sl.se)

Purpose: deviation/disruption messages (replaces older Service Alerts and Traffic Status APIs).

### Endpoint

- `GET https://deviations.integration.sl.se/v1/messages`

### Query parameters (all optional)

- `future` (boolean): include future deviations (default false)
- `site` (integer, 4-7 digits, repeatable): filter by siteId
- `line` (integer, repeatable): filter by lineId
- `transport_authority` (integer): filter by authority id
- `transport_mode` (string, repeatable): BUS, METRO, TRAM, TRAIN, SHIP, FERRY, TAXI

### Headers

- `Accept-Encoding`: can request gzip/deflate; typical HTTP clients manage this
- `age`: seconds since the cached response was generated (useful for caching logic)

### Rate limiting

Fair use: only request once per minute.

## SL Journey-planner v2 (journeyplanner.integration.sl.se)

Purpose: stop lookup + travel proposals within Stockholm County (also includes Waxholmsbolaget in the planner).

### Endpoints

1) System info
- `GET https://journeyplanner.integration.sl.se/v2/system-info`

2) Stop lookup (stop-finder)
- `GET https://journeyplanner.integration.sl.se/v2/stop-finder`

Key parameters:
- `name_sf`: stop/street/POI name OR coordinates in the form `<lon>:<lat>:WGS84[dd.ddddd]`
- `type_sf`: `any` (names) or `coord` (coordinates)
- `any_obj_filter_sf` (bitmask, used when `type_sf=any`):
  - 2 = stops
  - 12 = streets and addresses
  - 32 = POI
  - 46 = all above

3) Trip search
- `GET https://journeyplanner.integration.sl.se/v2/trips`

Minimum required parameters in the docs:
- `type_origin` (any|coord)
- `name_origin` (location id OR coordinates)
- `type_destination` (any|coord)
- `name_destination` (location id OR coordinates)
- `calc_number_of_trips` (1-3)

For the complete trip parameter list (time, accessibility, filters, etc.) consult the OpenAPI specification on the bottom of the Journey-planner page.
