# NEON OVERDRIVE — database phase (planned, not connected)

**Do this only after the first static deployment is live and smoke-tested.** M10 deliberately remains a static browser game. Coins, purchased cars/drivers, and campaign progress currently use browser `localStorage`; they are not cloud-synced and can be lost if browser storage is cleared.

## Suggested next-phase design
- **Provider:** Supabase Postgres (free tier for an initial prototype), selected only after deployment is stable.
- **Authentication:** optional guest mode first; add Supabase Auth before storing account-linked progress.
- **Tables:** `profiles` (user id, display name, created_at), `player_wallets` (user id, balance), `garage_cars` (user id, car_id, purchased_at), `garage_drivers` (user id, driver_id, purchased_at), `campaign_progress` (user id, unlocked_level, best_times JSONB), `race_results` (id, user id, level, finish_time, reward, created_at).
- **Integrity:** coin rewards and purchases must be validated server-side with database transactions/RPC; never trust a client-provided balance or price. Add unique constraints for `(user_id, car_id)` and `(user_id, driver_id)` and row-level security policies.
- **Migration:** when the backend is ready, offer a one-time import of local progress after sign-in, validate all IDs and limits, and do not let imported client balances create arbitrary coins.
- **Secrets:** Supabase service-role keys must only exist on a server, never in Vite `VITE_*` client variables.

## Out of scope for M10
No database SDK, API keys, server endpoints, accounts, or cloud persistence are enabled in this release. This file records the idea for later; it is not a working database integration.
