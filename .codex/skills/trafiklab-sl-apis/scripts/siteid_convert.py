#!/usr/bin/env python3
"""
Convert legacy SL Stop Lookup SiteId values to SL Transport siteId.

Trafiklab's SL Transport docs note that legacy SL Stop Lookup SiteId values do not match
Transport /sites ids. They propose converting values in the form 3BA1CDEFG to ABCDEFG.

Example from the docs:
- 300109001 -> 9001

Rule implemented here:
- Keep digits 2-3 and 5-9 (skip digit 1 and digit 4), then parse as int.
  (This is equivalent to "drop the first digit and the 4th digit".)

Usage:
  python scripts/siteid_convert.py 300109001
"""

from __future__ import annotations

import re
import sys


def convert_legacy_siteid(value: str) -> int:
    digits = re.sub(r"\D", "", value)

    # If it's already a 4-7 digit siteId, just return it.
    if 4 <= len(digits) <= 7:
        return int(digits)

    if len(digits) != 9:
        raise ValueError(
            f"Expected either a Transport siteId (4-7 digits) or a legacy 9-digit id like 300109001. Got: {value!r}"
        )

    converted = digits[1:3] + digits[4:]  # keep BA + CDEFG
    return int(converted)


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] in {"-h", "--help"}:
        print(__doc__.strip())
        return 2

    try:
        out = convert_legacy_siteid(argv[1])
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
