## Staging plan

The spec covers ~4 full modules. I'll ship it in 4 focused turns so each slice is production-quality, not shallow across everything. Every slice persists to Lovable Cloud.

### Turn 1 (this turn) — End-to-end connected workflow + Referrals/Follow-ups backend

The connective tissue everything else hangs off. After this turn the demo journey Community → Household → Person → Assessment → Result → Referral → Follow-up → Outcome works end-to-end against the database.

**Backend (one migration):**

- `facilities` — name, type (CHPS/health centre/district/regional/specialist), district, region, contact, services[], location
- `referrals` — extend existing table with: `category`, `facility_id`, `assessment_id`, `symptoms`, `findings`, `requested_service`, `status` (draft/submitted/acknowledged/accepted/in_progress/completed/declined/cancelled), `created_by`, `submitted_at`, `acknowledged_at`, `completed_at`
- `referral_status_history` — referral_id, from_status, to_status, actor, note, at
- `referral_outcomes` — referral_id, seen, attended_at, service_received, outcome (care_received/admitted/treated_discharged/further_referral/unable_to_attend/unreachable/other), further_action, notes, barrier
- `follow_ups` — person_id, household_id, community_id, assessment_id, referral_id, type, purpose, priority, due_date, assigned_to, contact_method, status (draft/scheduled/due/in_progress/completed/missed/cancelled), notes
- `follow_up_attempts` — follow_up_id, attempted_at, method, contacted, result, barrier, next_attempt_at
- `follow_up_outcomes` — follow_up_id, contact_status, current_condition, referral_completed, care_received, barriers[], new_symptoms, recommendations, next_follow_up_at, notes
- Seed one connected demo: Kwadaso community → Boateng household → Ama Serwaa (pregnant) → assessment → priority referral → scheduled follow-up.
- RLS: CHPS worker sees own records; supervisor/admin via `has_role`. GRANTs on every table.

**Data layer (`src/lib/`):**

- `referrals.functions.ts` — list, get, create (from assessment/person), updateStatus, submit, acknowledge, recordOutcome
- `follow-ups.functions.ts` — list (today/upcoming/overdue/completed), get, create, recordAttempt, complete
- `facilities.functions.ts` — list, get, search

**Routes (new + wired):**

- `src/routes/referral.new.tsx` — create-referral wizard, prefill from `?person=`/`?assessment=` search params, facility selector, category/priority/reason, review + confirm checkbox
- `src/routes/referral.$id.tsx` — details, status timeline, actions (submit/acknowledge/complete), record outcome, "Schedule follow-up" CTA
- `src/routes/referrals.tsx` — replace demo list with live dashboard (summary cards, filters by status/priority/community/facility/date, sort)
- `src/routes/followup.new.tsx` — create follow-up, prefill from `?person=`/`?assessment=`/`?referral=`
- `src/routes/followup.$id.tsx` — 6-step complete workflow (review → contact → status → referral status → barriers → next action)
- `src/routes/followups.tsx` — replace/upgrade to dashboard (Today/Upcoming/Overdue/Completed)
- `src/routes/assessment.$id.tsx` — add "Create Referral" + "Schedule Follow-up" CTAs (with prefilled links)
- `src/routes/person.$id.tsx` — add referrals + follow-ups tabs (live data), unified activity timeline
- `src/routes/household.$id.tsx` — add referrals + follow-ups tabs
- `src/routes/community.$id.tsx` — referrals tab reads live data
- Breadcrumbs preserved across all detail pages.

### Turn 2 — Community module deep build

- `src/routes/community.new.tsx` — full create workflow (basic/location/health service/community info/status), region + district + sub-district + CHPS zone, assigned worker/supervisor/nearest facility, primary languages, common challenges, accessibility, draft.
- `src/routes/communities.tsx` — add region/district/CHPS zone/status filters, sort, coverage %, "data coverage incomplete" indicator.
- `src/routes/community.$id.tsx` — add Health Insights tab with charts (risk distribution, maternal/child/nutrition indicators, referral stats), Activity timeline, coverage widgets.
- Migration: extend `communities` with region, sub_district, chps_zone, chps_facility_id, supervisor_id, nearest_referral_facility_id, gps_lat, gps_lng, location_desc, primary_languages[], common_health_challenges[], accessibility, status, community_code.

### Turn 3 — Household module deep build

- `src/routes/register.household.tsx` — expand to 6 sections (identification, location + "Capture Current Location", composition, living conditions, social/health barriers, notes), duplicate detection (household number / community / phone / head), completeness %, draft.
- `src/routes/household.$id.tsx` — priority badges, all tabs (members, visits, assessments, referrals, follow-ups, notes), health summary card distinguishing Known/Unknown/Missing, "Start Household Visit" workflow (multi-step).
- `src/routes/households.tsx` — priority/visit/follow-up filters, sort, pagination polish.
- Migration: extend `households` with priority_status, address_description, gps, location_notes, composition breakdown, living conditions, barriers, next_follow_up_at, data_completeness helper.

### Turn 4 — People module deep build + role-based access polish

- `src/routes/register.person.tsx` — 6-step wizard (household select → basic → identification → social → profile types[] → initial health), auto-age from DOB, duplicate detection, draft.
- `src/routes/person.$id.tsx` — full profile with conditional Maternal / Newborn / Child Health tabs based on profile types, completeness %, priority summary with contributing factors + missing info + "decision-support, not diagnosis" notice.
- `src/routes/people.tsx` — age group / profile / priority / follow-up filters.
- Role gating: sidebar + page-level checks reading `user_roles`. CHPS worker sees own communities, supervisor sees zones, admin sees system-wide.
- Migration: extend `persons` with profile_types[], preferred_name, marital_status, occupation, education, disability_status, emergency_contact, priority_status; add `person_notes` (structured clinical notes with author/date/type).

## Technical notes

- All new `.functions.ts` use `createServerFn` + `requireSupabaseAuth`; loaders under `_authenticated/` where applicable, otherwise called from components via `useServerFn` + TanStack Query.
- New routes follow existing `AppLayout` + `PageHeader` + shared components. No visual redesign.
- Every create form: zod validation, draft save (localStorage), loading/error/empty states, toast on success, confirmation dialogs for destructive actions.
- Mobile-first; existing bottom nav preserved.
- Reusable `<StatusBadge>`, `<PriorityBadge>`, `<Timeline>` extracted into `src/components/shared.tsx`.
- Existing demo data remains a fallback where the DB is empty so nothing looks broken between turns.

Proceed with Turn 1?
