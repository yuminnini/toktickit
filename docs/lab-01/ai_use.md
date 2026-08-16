# Lab 1 — AI Use and Reflection

**LLM/agent used:** Claude (Claude Sonnet 5), used directly through the claude.ai chat interface

## Selected key prompts (8)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Read all Lab 1 files (labsheet, starter scaffold zip, my own prep notes) and guide me through each Issue in order, and create the GitHub repo | Got the scaffold inspected, a 4-Issue dependency plan, and step-by-step repo/branch/Project-board setup commands |
| 2 | Create the repo without using the `gh` CLI, here's the repo link I made instead | Got web-UI based commands (`git remote add origin`, `git push -u origin main`) adapted to my situation |
| 3 | Walk me through Issue 1 (project foundation) and show me how to test it | Got install/Docker/`.env`/Prisma-generate steps explained one by one, plus expected (partially failing) test output for this stage |
| 4 | Pasted a `prisma generate` error ("no models defined") — asked if this needed fixing for Issue 1 | Got confirmation this was expected (Category model is added later, in Issue 3) and safe to ignore for now |
| 5 | Ready to start Issue 2 (health check); confirmed I want to keep going through Issue 4 | Got the `/api/health` route, `api.ts` fetch logic, and `App.tsx` UI states implemented, with an explanation for each |
| 6 | Sent a screenshot of the Offline state showing a raw "Failed to fetch" instead of a proper message | Got the bug diagnosed (unhandled network-level fetch error) and a fixed `api.ts` with `try/catch` added |
| 7 | Asked for a deeper explanation of each Issue 3 acceptance criterion, to use for peer-reviewing my partner's PR | Got a per-criterion breakdown of what was implemented and what to specifically check when reviewing someone else's PR |
| 8 | Pasted a "No space left on device" error during `git pull` | Got it diagnosed as disk space (not a git/code problem) with a troubleshooting order (Docker prune, npm cache, node_modules) |

## Reflection
Prompts worked best when I pasted the exact terminal output or screenshot instead of describing
the problem in words — the AI could pinpoint the real cause (e.g. a stopped Docker container vs. a
full disk) instead of guessing. One place I had to push back and ask for a fix: the first version of
`checkSystem()` in `api.ts` only handled a non-2xx HTTP response, not a network-level failure, so the
Offline case leaked the browser's raw `"Failed to fetch"` message instead of the required
`"Unable to connect to TokTickIT API"` — I had to point this out with a screenshot before it got corrected.