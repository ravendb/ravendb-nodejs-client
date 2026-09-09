### Issue link

https://issues.hibernatingrhinos.com/issue/RDBC-...

### Description

...Include details of the change made in this Pull Request or additional notes for the solution. Anything that can be useful for reviewers of this PR...

### Type of change

- [ ] Bug fix
- [ ] Regression bug fix
- [ ] Optimization
- [ ] New feature
- [ ] Sync with the C# client (version `x.y.z` -> `x.y.z`)
- [ ] Dependency / tooling / CI update

### Target branch and backports

- [ ] This PR targets the correct release branch (e.g. `v7.2`, `v7.1`, `v7.0`, `v6.0`)
- [ ] The change needs to be ported to other release branches. Please list them.
- [ ] No other release branch is affected

### How risky is the change?

- [ ] Low
- [ ] Moderate
- [ ] High
- [ ] Not relevant

### Backward compatibility

- [ ] Non breaking change
- [ ] Ensured. Please explain how has it been implemented?
- [ ] Breaking change (public API, exported types, default behavior). Please describe the migration path.
- [ ] Not relevant

### Server compatibility

- [ ] Works with all RavenDB server versions covered by CI
- [ ] Requires a minimum server version. Please specify which one and make sure the tests are gated accordingly.
- [ ] Not relevant

### Affected runtimes

- [ ] Node.js
- [ ] Bun
- [ ] Deno
- [ ] Cloudflare Workers
- [ ] Not runtime specific

### Public API

- [ ] New or changed public API. New types are exported from `src/index.ts` (`npm run check-exports` passes).
- [ ] Version bump: `package.json` and `CLIENT_VERSION` in `src/Http/RequestExecutor.ts` (sync / release PRs only)
- [ ] No public API changes

### Documentation update

- [ ] `README.md` has been updated
- [ ] No documentation update is needed

### Testing by Contributor

- [ ] Tests have been added that prove the fix is effective or that the feature works
- [ ] Existing tests verify the correct behavior
- [ ] It has been verified by manual testing
- [ ] `npm run lint`, `npm run build`, `npm run check-exports` and `npm run check-imports` pass locally
- [ ] Tests have been run locally against a RavenDB server (`RAVENDB_TEST_SERVER_PATH` / `RAVENDB_SERVER_VERSION`)
- [ ] Runtime-specific changes have been verified on the affected runtime (Bun / Deno / Cloudflare Workers)

### Dependencies

- [ ] New or updated runtime dependency. Please explain why it is needed and confirm it works on all affected runtimes.
- [ ] Dev dependency only
- [ ] No dependency changes

### Is there any existing behavior change of other features due to this change?

- [ ] Yes. Please list the affected features/subsystems and provide appropriate explanation
- [ ] No
