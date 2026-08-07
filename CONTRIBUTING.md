# Contributing

How changes land on `main` in this repo.

## The rules

- Nothing lands on `main` except through a pull request.
- Every PR needs **green CI** and **one approving review from a code owner** (`@kudzaiprichard`).
- No force-pushes to `main`, and `main` is never deleted.
- Only **complete, working** changes merge. `main` must build and work at every commit.

> **These are followed by convention, not yet by enforcement.** The repository is private on a Free
> plan, where GitHub branch protection and rulesets are paid features, so `main` currently reports
> `"protected": false` and nothing mechanically stops a direct push. Treat the rules as binding
> anyway — they are what keeps CI honest and history reviewable.

CI runs two checks on every pull request: **Detect changes** and **Lint & build (web)**. Both must be
green. (`GitGuardian Security Checks` also reports, but is a third-party app and not a gate.)

## The workflow

```bash
# 1. Start from an up-to-date trunk
git switch main
git pull origin main

# 2. Short-lived branch, one working slice
#    feat/… fix/… docs/… chore/… refactor/…
git switch -c feat/short-description

# 3. Commit (see message format below)
git add -A
git commit

# 4. Push and open the PR
git push -u origin feat/short-description
gh pr create --base main --fill

# 5. Green CI + approval, then squash-merge and delete the branch
gh pr checks --watch
gh pr merge --squash --delete-branch
```

Branches are short-lived: merge a slice a day rather than a branch a month.

## Commit messages

Conventional commits, with **one bullet per file in the commit**:

```
type(scope): short summary of what was done

- path/to/file.ts: what changed in this file
- path/to/other.ts: what changed in this file
```

`type` is one of `feat`, `fix`, `refactor`, `chore`, `style`, `docs`. `scope` is the feature or
domain (`auth`, `theme`, `data`, `ui`). Keep bullets short and specific — never "update files".

## What counts as ready to merge

A branch is ready for `main` when all of these hold:

- `npm run typecheck`, `npm run lint` and `npm run build` are green locally.
- It delivers something complete on its own, not half of a feature.
- It doesn't break any existing feature.
- Any user-facing surface it adds is either finished, or hidden (unlinked route, feature flag, or
  the nav entry added last) until it is.

Plumbing that nothing calls yet is fine to merge — it's inert, so it can't break the app. A
half-wired screen is not.
