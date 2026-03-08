# @bitperfect/shared

Shared utilities and API client for the bitperfect monorepo.

## Exports

```typescript
// Main entry
import { ... } from '@bitperfect/shared'

// API client and types
import { api } from '@bitperfect/shared/api'
import type { Track, Album, Artist } from '@bitperfect/shared/api/types'

// Utilities
import { ... } from '@bitperfect/shared/utils'
```

## Structure

```
packages/shared/
├── api/
│   ├── client.ts    # API client with instance selection and caching
│   ├── types.ts     # TypeScript types for API responses
│   ├── cache.ts     # Response caching
│   └── utils.ts     # API helper functions
├── utils/           # General utility functions
└── index.ts         # Main entry point
```

## API Client

The API client connects to multiple backend instances and automatically handles:
- Instance selection and failover
- Response caching
- Type-safe responses

## Dependencies

- **axios** - HTTP client
