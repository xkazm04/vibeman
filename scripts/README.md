# Vibeman Scripts

This directory contains utility scripts for the Vibeman project.

## Available Scripts

### `refactor-ci.ts`

**CI/CD Automated Refactor Tool**

Runs the Refactor Wizard in headless mode, aggregates code quality suggestions, and automatically creates refactor PRs.

**Usage:**
```bash
npm run refactor:ci -- [options]
```

**Examples:**
```bash
# Dry run (analysis only)
npm run refactor:ci -- --dry-run

# Auto-fix only, medium+ severity
npm run refactor:ci -- --auto-fix-only --severity medium

# Performance and security only
npm run refactor:ci -- --category performance,security

# Custom PR details
npm run refactor:ci -- --pr-title "Refactor: Code quality" --pr-branch refactor/improvements
```

**Documentation:**
See [docs/CI_CD_REFACTOR.md](../docs/CI_CD_REFACTOR.md) for comprehensive documentation.

## Development

Scripts are written in TypeScript and can be executed using `ts-node`:

```bash
npx ts-node scripts/your-script.ts
```

## Dependencies

Scripts may use:
- Node.js built-in modules (`fs`, `path`, `child_process`)
- Project dependencies from `package.json`
- TypeScript types from `src/`

## Contributing

When adding new scripts:

1. Use TypeScript for type safety
2. Add proper JSDoc comments
3. Include usage examples in comments
4. Update this README with script description
5. Add npm script to `package.json` if user-facing
