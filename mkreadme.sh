#!/usr/bin/env bash
# usage: mkreadme.sh <slug> <Name> <Replaces> "<what works>" "<gaps>"
cat > /workspace/$1/README.md <<EOT
# $2

Free, open-source $3 alternative. Part of the [IsDead series](https://yourappisdead.com). Served at \`https://yourappisdead.com/$1\`.

**Status: local only** (not pushed, not deployed). Surfaces follow \`templates/marketing-site.md\` in \`@isdead/design\`: one marketing page (\`/\`, price comparison at \`#pricing\`), \`/login\`, and the app at \`/app\`.

## What works
$4

## Known gaps
$5

## Auth
Shared Firebase project \`yourappisdead\` (email/password + Google), helpers in \`lib/isdead-auth\` (vendored from \`isdead-design/auth\`). The session cookie \`isdead_session\` has path \`/\`, so one sign-in covers every IsDead app. Env: \`NEXT_PUBLIC_FIREBASE_*\`, \`FIREBASE_SERVICE_ACCOUNT_JSON\`. Without them, \`/login\` shows "Sign-in not configured". The single demo account ("Use the demo account") is available outside production or with \`DEMO_MODE=1\`.

## Develop
\`\`\`
npm install
npm run dev        # http://localhost:3000/$1
npm test           # unit tests
npm run typecheck
npm run build && npm run shots   # product screenshots + end-to-end smoke test (Playwright)
\`\`\`
Theme and font: \`vendor/isdead-design\` (OFL fonts, see \`fonts/*/OFL-*.txt\`). Not affiliated with $3; all trademarks belong to their owners. Apache-2.0.
EOT
