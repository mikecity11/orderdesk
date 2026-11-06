# Verification · November 5, 2026

- Production deployment built from GitHub and reached READY on Vercel.
- Canonical production URL returned HTTP 200 to an unauthenticated request: https://orderdesk-recovery.vercel.app.
- Live workspace endpoint returned the intended HTTP 503 / explicit unconfigured message. It did not claim a live Switch connection.
- Browser flow verified: open workspace → report four damaged kettles → build recovery plan → confirm branch stock → approve transfer → pack → release.
- Browser replacement refusal verified: decline replacement → release reservation → propose partial order/refund → new consent → pack → release.
- Completed all four affected orders in the browser: incident Resolved, orders recovered 4/4, order value at risk $0, approved transfer expense $12 (sample values).
- Fixed packing status to show Packed instead of Ready to pick.
- Automated tests include recovery rules, stock conservation, consent gates, staff identity checks and mock Switch transport round trip.
- Live local Switch/Mattermost connectivity demonstrated November 6: authenticated custom agent, addressed stock report, recovery plan, branch confirmation, manager approval, packing and release for OD-1041. Four sample orders were affected; one became ready for dispatch; remaining sample order value at risk was $298. One operator simulated all five staff roles. AI inference remains unverified until the configured explanation command succeeds.
- Vercel’s default project protection settings were retained. The standard production alias was independently accessible without disabling those settings.
