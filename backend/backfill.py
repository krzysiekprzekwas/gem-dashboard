"""
One-off backfill for the region->strategy migration. Run ONCE against the prod DB
AFTER the new code is deployed:

    DATABASE_URL='<prod-postgres-url>' python backend/backfill.py            # dry run (prints plan)
    DATABASE_URL='<prod-postgres-url>' python backend/backfill.py --commit   # actually write

What it does:
  1. Renames legacy rows: region 'US' -> 'gem-us', 'EU' -> 'gem-eu' (same instruments/slots).
  2. Recomputes the `signal` of those rows with the canonical rule from their stored
     slot momenta (legacy rows used the pre-canonical variant).
  3. Backfills `max-gem-eu` month-end history from 5y of prices (never tracked before):
     computes 12-month (252 trading day) momentum per month-end and the argmax signal.

Idempotent: safe to re-run. Step 3 clears existing max-gem-eu rows first.
"""
import sys
from bisect import bisect_right
from datetime import datetime

from sqlmodel import Session, select, delete

try:
    from .momentum import STRATEGIES, compute_signal, fetch_ticker_data
    from .database import engine, MomentumHistory
except ImportError:
    from momentum import STRATEGIES, compute_signal, fetch_ticker_data
    from database import engine, MomentumHistory

LOOKBACK = 252  # trading days, matches fetch_momentum_data
COMMIT = "--commit" in sys.argv

# Legacy region id -> new strategy id (same tickers, same slot order).
RENAME = {"US": "gem-us", "EU": "gem-eu"}


def _mom_from_slots(row, assets):
    """Rebuild a {ticker: momentum} map from the 4 fixed slot columns."""
    return {
        assets[0]: row.spy_mom,
        assets[1]: row.veu_mom,
        assets[2]: row.bnd_mom,
        assets[3]: row.tbill_mom,
    }


def rename_and_recompute(session):
    updated = 0
    for old_id, new_id in RENAME.items():
        config = STRATEGIES[new_id]
        rows = session.exec(
            select(MomentumHistory).where(MomentumHistory.region == old_id)
        ).all()
        # Also pick up rows already renamed on a previous run, so recompute is idempotent.
        rows += session.exec(
            select(MomentumHistory).where(MomentumHistory.region == new_id)
        ).all()

        for row in rows:
            row.region = new_id
            mom = _mom_from_slots(row, config["assets"])
            if any(v is None for v in mom.values()):
                continue  # can't recompute canonical without all four (esp. threshold)
            new_signal = compute_signal(config, mom)
            if row.region != old_id or new_signal != row.signal:
                updated += 1
            row.signal = new_signal
            session.add(row)
        print(f"  {old_id} -> {new_id}: {len(rows)} rows")
    return updated


def month_end_indices(dates):
    """Indices of the last trading day of each month in an ascending date list."""
    out = []
    for i in range(len(dates)):
        last_of_month = (
            i == len(dates) - 1
            or dates[i].month != dates[i + 1].month
            or dates[i].year != dates[i + 1].year
        )
        if last_of_month:
            out.append(i)
    return out


def backfill_max_gem(session):
    sid = "max-gem-eu"
    config = STRATEGIES[sid]
    assets = config["assets"]

    # Per-ticker ascending (datetime, price) series.
    series = {}
    for ticker in assets:
        data = fetch_ticker_data(ticker)
        if not data:
            print(f"  ! no data for {ticker}; aborting max-gem-eu backfill")
            return 0
        series[ticker] = sorted(
            ((datetime.fromtimestamp(d["date"]), d["price"]) for d in data),
            key=lambda x: x[0],
        )

    ref = series[assets[0]]
    ref_dates = [d for d, _ in ref]

    rows = []
    for idx in month_end_indices(ref_dates):
        sample = ref_dates[idx]
        mom = {}
        ok = True
        for ticker in assets:
            s = series[ticker]
            ts = [d for d, _ in s]
            pos = bisect_right(ts, sample) - 1  # last point on/before the sample date
            if pos < LOOKBACK:
                ok = False
                break
            cur = s[pos][1]
            past = s[pos - LOOKBACK][1]
            mom[ticker] = 0.0 if past == 0 else (cur / past) - 1.0
        if not ok:
            continue  # not enough history yet at this month-end

        rows.append(
            MomentumHistory(
                date=sample,
                region=sid,
                spy_mom=mom[assets[0]],
                veu_mom=mom[assets[1]],
                bnd_mom=mom[assets[2]],
                tbill_mom=mom[assets[3]],
                signal=compute_signal(config, mom),
            )
        )

    existing = session.exec(select(MomentumHistory).where(MomentumHistory.region == sid)).all()
    print(f"  {sid}: {len(existing)} existing rows to clear, {len(rows)} month-end rows to insert")
    if COMMIT:
        session.exec(delete(MomentumHistory).where(MomentumHistory.region == sid))
        for r in rows:
            session.add(r)
    return len(rows)


def main():
    print(f"=== Backfill ({'COMMIT' if COMMIT else 'DRY RUN — pass --commit to write'}) ===")
    with Session(engine) as session:
        print("1/2 Rename + recompute canonical signals:")
        changed = rename_and_recompute(session)
        print(f"     -> {changed} rows changed")

        print("2/2 Backfill max-gem-eu month-end history:")
        inserted = backfill_max_gem(session)

        if COMMIT:
            session.commit()
            print(f"Committed. max-gem-eu rows inserted: {inserted}")
        else:
            session.rollback()
            print("Dry run — nothing written.")


if __name__ == "__main__":
    main()
