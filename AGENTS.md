# AGENTS.md — Agent & Contributor Engineering Guidelines

> **Notice on Expo Framework**:  
> Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing or updating platform and navigation code. Always adhere to Expo SDK 57 idioms and current React Native patterns.

For the complete architectural blueprint and engineering standards, refer to [.agents/AGENTS.md](./.agents/AGENTS.md).

---

## Pre-Commit Quality Gate & Verification Protocol

Code quality, strict type safety, and formatting are automatically enforced at the git commit phase via Husky and lint-staged:

- **Pre-commit checks**:
  - `pnpm typecheck` (`tsc --noEmit` with strict checks: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`).
  - `eslint --fix --no-warn-ignored --max-warnings=0` on staged code.
  - `prettier --write` on staged files.

- **Agent Guidance on Redundant Commands**:
  - **Do not run redundant check commands repeatedly**: There is no need to manually call `pnpm typecheck`, `pnpm lint`, or formatting scripts multiple times during intermediate editing steps. The pre-commit hook automatically verifies and formats staged changes on `git commit`.
  - **Run targeted tests only when necessary**: Run `pnpm test` (or `pnpm test <filename>`) when modifying business logic or calculations to verify algorithmic behavior.
  - **Single full check**: If comprehensive validation is desired, run `pnpm check-all` once rather than invoking individual commands repetitively.
