/**
 * Rate limiter smoke test.
 *
 * Fires requests at /api/single-transcript as fast as possible until
 * it gets a 429, then prints a summary.
 *
 * Run:  node scratch/test-rate-limit.mjs
 * Dev server must be running on localhost:3000.
 */

const BASE_URL = "http://localhost:3000";
const ROUTE = "/api/single-transcript";
const MAX_REQUESTS = 30; // more than the 20-req limit to ensure we trip it

// A dummy body — the route will 400 on an invalid video ID,
// but the rate limit check runs BEFORE that, so we'll still see the 429.
const BODY = JSON.stringify({ videoUrl: "https://www.youtube.com/watch?v=rate_limit_test" });

let allowed = 0;
let denied = 0;
let firstDeniedAt = null;

console.log(`\nFiring ${MAX_REQUESTS} requests at ${BASE_URL}${ROUTE}...\n`);

for (let i = 1; i <= MAX_REQUESTS; i++) {
  const res = await fetch(`${BASE_URL}${ROUTE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: BODY,
  });

  if (res.status === 429) {
    denied++;
    if (firstDeniedAt === null) firstDeniedAt = i;
    const data = await res.json();
    process.stdout.write(`  [${i}] 429 RATE LIMITED — ${data.error}\n`);
  } else {
    allowed++;
    // Could be 400 (bad video ID) or 422 (no transcript) — both mean limit passed
    process.stdout.write(`  [${i}] ${res.status} OK (passed rate check)\n`);
  }
}

console.log(`
────────────────────────────────
Results:
  Passed rate check : ${allowed}
  Rate limited (429): ${denied}
  First 429 at req  : ${firstDeniedAt ?? "never"}
────────────────────────────────`);

if (denied === 0) {
  console.log("⚠️  No 429 received — rate limiter may not be working.");
  console.log("   Check UPSTASH_REDIS_REST_URL and _TOKEN in .env.local.");
} else {
  console.log("✅  Rate limiter is working correctly.");
  console.log(`   First block at request #${firstDeniedAt} (limit: 20/min).`);
}
