# Verification · November 5, 2026

- Production deployment built from GitHub and reached READY on Vercel.
- Canonical production URL returned HTTP 200 to an unauthenticated request: https://orderdesk-recovery.vercel.app.
- Live workspace endpoint returned the intended HTTP 503 / explicit unconfigured message. It did not claim a live Switch connection.
- Browser flow verified: open workspace → report four damaged kettles → build recovery plan → confirm branch stock → approve transfer → pack → release.
- Browser replacement refusal verified: decline replacement → release reservation → propose partial order/refund → new consent → pack → release.
- Completed all four affected orders in the browser: incident Resolved, orders recovered 4/4, order value at risk $0, approved transfer expense $12 (sample values).
- Fixed packing status to show Packed instead of Ready to pick.
- Automated tests include recovery rules, stock conservation, consent gates, staff identity checks and mock Switch transport round trip.
- Live Switch server connectivity and model inference remain unverified and require configuration before submission.
- Vercel’s default project protection settings were retained. The standard production alias was independently accessible without disabling those settings.
