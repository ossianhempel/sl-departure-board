# Examples (curl)

These examples are meant to be copy-paste friendly. Replace ids and query strings as needed.

Tip: add `| jq` if you have `jq` installed.

## SL Transport

### List sites (to find a siteId)

```bash
curl -s "https://transport.integration.sl.se/v1/sites?expand=true" | head
```

You usually want to search the response by name. If you have jq:

```bash
curl -s "https://transport.integration.sl.se/v1/sites?expand=true" \
  | jq '.[] | select(.name | test("Odenplan"; "i")) | {id, name, lat, lon}'
```

### Fetch departures for a siteId (example: Slussen 9192)

```bash
curl -s "https://transport.integration.sl.se/v1/sites/9192/departures"
```

### List lines for a transport authority

```bash
curl -s "https://transport.integration.sl.se/v1/lines?transport_authority_id=1" | head
```

### List transport authorities

```bash
curl -s "https://transport.integration.sl.se/v1/transport-authorities"
```

## SL Deviations

### Deviations for one site (example: site=9192)

```bash
curl -s "https://deviations.integration.sl.se/v1/messages?site=9192"
```

### Deviations for multiple sites and a mode

```bash
curl -s "https://deviations.integration.sl.se/v1/messages?site=9192&site=1002&transport_mode=METRO"
```

### Include future deviations

```bash
curl -s "https://deviations.integration.sl.se/v1/messages?future=true"
```

## SL Journey-planner v2

### Stop lookup by name (stops only)

```bash
curl -s "https://journeyplanner.integration.sl.se/v2/stop-finder?name_sf=odenplan&any_obj_filter_sf=2&type_sf=any"
```

### Stop lookup by coordinates

The docs specify coordinate syntax as:
`<lon>:<lat>:WGS84[dd.ddddd]`

```bash
curl -s "https://journeyplanner.integration.sl.se/v2/stop-finder?name_sf=18.013809:59.335104:WGS84[dd.ddddd]&type_sf=coord"
```

### Trip planning between two stop ids

```bash
curl -s "https://journeyplanner.integration.sl.se/v2/trips?type_origin=any&type_destination=any&name_origin=9091001000009182&name_destination=9091001000009192&calc_number_of_trips=3"
```

### System info

```bash
curl -s "https://journeyplanner.integration.sl.se/v2/system-info"
```
