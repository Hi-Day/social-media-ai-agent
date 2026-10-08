# Contributing

## Production branch

`main` is the production branch.

Do not push directly to `main`. All changes should go through a pull request.

## Development workflow

1. Start from the latest `main`.
2. Create a focused branch:
   - `feature/<name>` for new functionality
   - `fix/<name>` for bug fixes
   - `chore/<name>` for maintenance
   - `docs/<name>` for documentation
3. Make as many local commits as needed.
4. Push the branch when the change is ready for review.
5. Open a pull request against `main`.
6. Wait for the required CI checks to pass.
7. Review the Vercel Preview deployment when available.
8. Merge the PR into `main`.
9. Vercel production deployment happens from the merged `main` commit.

## Why this workflow

This keeps production stable while allowing rapid iteration. Multiple local commits can be consolidated into one PR, and production changes become explicit release points.

## Pull request expectations

Every PR should briefly describe:

- What changed
- Why it changed
- How it was tested
- Any database migration or environment-variable impact
- Any known limitations or follow-up work

For database changes, production migrations must remain tied to merges into `main`. Never point a feature-branch workflow at the production Supabase project.

## Recommended merge strategy

Use **Squash and merge** for normal feature/fix PRs. This keeps `main` clean while preserving the PR as the review and release unit.
