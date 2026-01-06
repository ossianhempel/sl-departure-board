# Gotchas and best practices

## 1) SL has 3 APIs now (and they replaced older ones)

Trafiklab's SL offering is now:
- SL Transport
- SL Deviations
- SL Journey-planner v2

If you see code referring to older SL APIs like Departures v4, Stops and lines v2, Service Alerts, Traffic Status, Route-planner, or Stop lookup, it is likely legacy.

## 2) Do not confuse Site vs StopArea vs StopPoint

In SL Transport:
- Use **siteId** (Site) for departure boards.
- StopAreas are higher-level groupings.
- StopPoints are quays/platforms and are useful when you need platform-level detail.

## 3) siteId conversion (legacy SL Stop Lookup)

Transport docs explicitly warn that Transport `siteId` does not match ids returned by the legacy SL Stop Lookup API.

If you are forced to use a legacy SiteId that looks like `3BA1CDEFG` (example: `300109001`), convert it to a Transport site id `ABCDEFG` by:
- dropping the first digit (the leading `3`)
- dropping the 4th digit (the `1`)
- keeping the remaining 7 digits, then parsing as an integer (leading zeros are fine)

Example:
- `300109001` -> digits kept are `00` + `09001` = `0009001` -> `9001`

Use the helper script:
```bash
python scripts/siteid_convert.py 300109001
```

## 4) Fair use and caching

- Transport and Journey-planner do not require API keys, but you should avoid excessive requests.
- Deviations should only be fetched once per minute.
- Deviations returns an `age` header that indicates how old the cached response is. Use it to avoid unnecessary repeated requests.

## 5) Repeated query parameters

Some endpoints support repeating the same query parameter multiple times:
- Deviations: `site=...&site=...`, `line=...&line=...`, `transport_mode=...&transport_mode=...`

Make sure your HTTP client supports repeated parameters (many libraries do).

## 6) Coordinate formatting for Journey-planner

Journey-planner uses a very specific coordinate syntax:
`<lon>:<lat>:WGS84[dd.ddddd]`

Example:
`18.013809:59.335104:WGS84[dd.ddddd]`

## 7) Licensing and attribution

Trafiklab's license requires attribution when you use their data in a service, application, or publication.

Also be careful with:
- selling tickets or competing with the transport operators' own sales channels
- trademark use

If your use case touches ticketing, commercial resale, or branding, review Trafiklab's license page and ensure compliance.
