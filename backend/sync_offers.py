#!/usr/bin/env python3
"""
SubWatch Offer Sync
===================
Reads offers.json and syncs to Supabase (self-hosted Postgres via docker exec).

Logic:
1. Expire ALL old offers (end_date < today OR is_active manually set false)
2. Deactivate all existing offers (clean slate for this cycle)
3. Insert fresh weekly offers (valid 7 days from run date)
4. Insert fresh monthly offers ONLY on the 1st of the month (valid until month end)
   — if not the 1st, re-activate existing monthly offers that haven't expired yet

Usage:
  python3 sync_offers.py           # normal run (weekly mode)
  python3 sync_offers.py --force   # force-refresh both weekly + monthly now
  python3 sync_offers.py --dry-run # preview what would change, no writes

Cron: Every Monday 00:00 server time
"""

import json
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OFFERS_FILE = SCRIPT_DIR / "offers.json"


def psql(query: str, silent: bool = False) -> str:
    """Run a SQL query against the Supabase Postgres container."""
    cmd = ["docker", "exec", "supabase-db", "psql", "-U", "postgres", "-t", "-A", "-c", query]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 and not silent:
        print(f"  ❌ SQL error: {result.stderr.strip()}", file=sys.stderr)
    return result.stdout.strip()


def load_offers() -> dict:
    with open(OFFERS_FILE) as f:
        return json.load(f)


def sql_escape(val) -> str:
    """Escape a value for safe SQL insertion."""
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    # Escape single quotes
    return "'" + str(val).replace("'", "''") + "'"


def expire_old_offers(dry_run: bool = False):
    """Mark offers past their end_date as inactive."""
    today = date.today().isoformat()
    q = f"UPDATE public.offers SET is_active = false WHERE end_date < '{today}' AND is_active = true;"
    if dry_run:
        count = psql(f"SELECT count(*) FROM public.offers WHERE end_date < '{today}' AND is_active = true;")
        print(f"  [DRY RUN] Would expire {count} stale offers")
        return
    psql(q)
    print(f"  ✅ Expired offers past {today}")


def deactivate_badge(badge: str, dry_run: bool = False):
    """Deactivate all offers of a given badge (weekly/monthly) for clean refresh."""
    q = f"UPDATE public.offers SET is_active = false WHERE badge = '{badge}';"
    if dry_run:
        count = psql(f"SELECT count(*) FROM public.offers WHERE badge = '{badge}' AND is_active = true;")
        print(f"  [DRY RUN] Would deactivate {count} existing '{badge}' offers")
        return
    psql(q)


def insert_offers(offers_list: list, badge: str, dry_run: bool = False):
    """Insert fresh offers for the given badge."""
    if not offers_list:
        print(f"  ⚠️  No '{badge}' offers in {OFFERS_FILE.name}, skipping")
        return

    # Compute date range based on badge
    today = date.today()
    if badge == "weekly":
        start = today
        end = today + timedelta(days=7)
    else:  # monthly
        start = today.replace(day=1)
        # End = last day of current month
        if today.month == 12:
            end = date(today.year + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(today.year, today.month + 1, 1) - timedelta(days=1)

    inserted = 0
    for offer in offers_list:
        cols = [
            "name", "description", "category_id", "provider",
            "normal_price", "offer_price", "currency", "billing_cycle",
            "referral_url", "badge", "start_date", "end_date",
            "icon", "color", "is_active", "sort_order",
        ]
        vals = [
            sql_escape(offer.get("name")),
            sql_escape(offer.get("description")),
            sql_escape(offer.get("category_id")),
            sql_escape(offer.get("provider")),
            sql_escape(offer.get("normal_price")),
            sql_escape(offer.get("offer_price")),
            sql_escape(offer.get("currency", "USD")),
            sql_escape("monthly"),  # all offer prices are monthly
            sql_escape(offer.get("referral_url")),
            sql_escape(badge),
            sql_escape(start.isoformat()),
            sql_escape(end.isoformat()),
            sql_escape(offer.get("icon", "🎁")),
            sql_escape(offer.get("color", "#007AFF")),
            "true",  # is_active
            sql_escape(offer.get("sort_order", 0)),
        ]

        q = f"INSERT INTO public.offers ({', '.join(cols)}) VALUES ({', '.join(vals)});"
        if dry_run:
            print(f"  [DRY RUN] Would insert: {offer.get('provider')} ({badge}) ${offer.get('offer_price')}/mo")
        else:
            result = psql(q)
            if "ERROR" not in result:
                inserted += 1
            else:
                print(f"  ❌ Failed to insert {offer.get('provider')}: {result}")

    if not dry_run:
        print(f"  ✅ Inserted {inserted}/{len(offers_list)} '{badge}' offers (valid {start} to {end})")


def reactivate_monthly(dry_run: bool = False):
    """If it's not the 1st of the month, re-activate monthly offers still in date range."""
    today = date.today()
    if today.day == 1:
        return  # fresh insert handled above

    q = f"""
        UPDATE public.offers
        SET is_active = true
        WHERE badge = 'monthly'
          AND end_date >= '{today.isoformat()}'
          AND start_date <= '{today.isoformat()}';
    """
    if dry_run:
        count = psql(f"""
            SELECT count(*) FROM public.offers
            WHERE badge = 'monthly'
              AND end_date >= '{today.isoformat()}'
              AND start_date <= '{today.isoformat()}'
              AND is_active = false;
        """)
        print(f"  [DRY RUN] Would re-activate {count} existing monthly offers still in date range")
        return
    psql(q)


def show_summary():
    """Print current state of offers table."""
    rows = psql("SELECT badge, count(*) FILTER (WHERE is_active), count(*) FROM public.offers GROUP BY badge ORDER BY badge;")
    print("\n📊 Current offers in DB:")
    print(f"  {'Badge':<10} {'Active':<8} {'Total':<8}")
    print(f"  {'─'*10} {'─'*8} {'─'*8}")
    for row in rows.split('\n'):
        if row.strip():
            parts = row.split('|')
            if len(parts) == 3:
                print(f"  {parts[0]:<10} {parts[1]:<8} {parts[2]:<8}")


def main():
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv

    today = date.today()
    is_first_of_month = today.day == 1

    print(f"🏪 SubWatch Offer Sync — {today.isoformat()}")
    print(f"   Mode: {'DRY RUN' if dry_run else 'LIVE'} | Monthly refresh: {'YES (1st of month)' if is_first_of_month or force else 'no (reactivate existing)'}")
    print()

    data = load_offers()

    # 1. Expire stale offers
    print("1️⃣  Expiring stale offers...")
    expire_old_offers(dry_run)

    # 2. Refresh weekly offers (always)
    print("\n2️⃣  Refreshing weekly offers...")
    deactivate_badge("weekly", dry_run)
    insert_offers(data.get("weekly", []), "weekly", dry_run)

    # 3. Handle monthly offers
    print("\n3️⃣  Monthly offers...")
    if is_first_of_month or force:
        print(f"   {'Today is the 1st' if is_first_of_month else 'Force mode'} — refreshing monthly deals")
        deactivate_badge("monthly", dry_run)
        insert_offers(data.get("monthly", []), "monthly", dry_run)
    else:
        print(f"   Not the 1st — reactivating existing monthly offers still in date range")
        reactivate_monthly(dry_run)

    # 4. Summary
    if not dry_run:
        show_summary()

    print("\n✅ Sync complete!")


if __name__ == "__main__":
    main()
