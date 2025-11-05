# Scan Adapter Framework

## Overview

The Modular Scan Adapter Framework enables multi-technology support for project onboarding scans through a plugin architecture.

## Quick Start

1. Create adapter class extending BaseAdapter
2. Implement execute() and buildDecision() methods
3. Register adapter in initialize.ts

## Example

See adapters/nextjs/ for full examples.

## Documentation

For detailed documentation, see:
- Type definitions in adapters/types.ts
- Base adapter in adapters/BaseAdapter.ts
- Registry in adapters/ScanRegistry.ts
