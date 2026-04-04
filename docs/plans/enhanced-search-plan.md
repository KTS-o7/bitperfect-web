# Enhanced Search Plan v2

## Problem Statement

The current music search experience misses results that users reasonably expect to find.

Primary failure modes:

1. Punctuation-sensitive titles are easy to miss.
   Example: searching `fein` does not reliably find `FE!N`.

2. Common music-specific aliases are not normalized.
   Example: searching `Drake ft Lil Wayne` may miss results indexed as `feat` or `featuring`.

3. A small number of high-confidence spelling variants are not handled.
   Example: searching `Big Dogs` should still surface `Big Dawgs`.

4. Results are not ranked strongly enough by user intent.
   Example: for `Sunflower`, a widely known track should appear before a low-popularity duplicate, but only after match quality is considered.

---

## Goal

Improve search recall for a narrow, high-confidence set of cases without turning search into a broad fuzzy-matching system that introduces false positives, unstable ranking, or excessive API fan-out.

---

## Non-Goals

- Do not build full fuzzy search in the client.
- Do not generate large numbers of speculative query variants.
- Do not apply aggressive slang or leetspeak substitutions by default.
- Do not break infinite scroll semantics.
- Do not add server-side lyrics search in this phase.

---

## Product Principles

1. Exact intent beats popularity.
2. Normalization should be predictable and explainable.
3. High-confidence transformations are better than broad fuzzy guessing.
4. Fallback should be cheap and bounded.
5. Page 1 quality matters most; deeper pagination can remain conservative in v1.

---

## Example-Driven Scope

These examples define the intended behavior for v1.

### Example 1: Punctuation-insensitive matching

User query:

```text
fein
```

Expected outcome:

- `FE!N` should be discoverable.

Why this should work:

- `fein` and `FE!N` normalize to the same canonical search key after lowercasing and removing punctuation noise.

### Example 2: Curated token alias matching

User query:

```text
Big Dogs
```

Expected outcome:

- `Big Dawgs` should be discoverable.

Why this should work:

- `dogs -> dawgs` is a curated token alias with proven value.
- This is a token-level substitution, not broad fuzzy matching.

### Example 3: Connector normalization

User query:

```text
Drake ft Lil Wayne
```

Expected outcome:

- Results containing `feat` or `featuring` should be discoverable.

Why this should work:

- `ft`, `feat`, `feat.`, and `featuring` represent the same connector concept and should normalize to one canonical form.

### Example 4: Popularity as a secondary sort

User query:

```text
Sunflower
```

Expected outcome:

- The more popular, more relevant `Sunflower` result should rank above obscure duplicates.

Why this should work:

- Popularity should break ties within the same match tier, not override stronger lexical matches.

---

## Proposed Approach

### Summary

Use a staged fallback pipeline:

1. Search the original query.
2. If results are weak, search a canonical normalized query.
3. If results are still weak, search a very small set of curated alias-expanded queries.
4. Merge, dedupe, assign match tiers, and rank by:

```text
match tier > popularity > original order
```

This is intentionally narrower than a generic variation generator.

---

## Search Pipeline

```text
User query
   |
   v
Search original query
   |
   +-- enough good results --> return
   |
   v
Search canonical normalized query
   |
   +-- enough good results --> merge + rank + return
   |
   v
Search 1-2 curated alias queries
   |
   v
Merge + dedupe + assign match tier + rank
   |
   v
Return page 1
```

---

## Canonical Normalization

Canonical normalization should be deterministic and cheap.

Recommended normalization rules:

1. Lowercase the query.
2. Trim leading and trailing whitespace.
3. Collapse repeated internal whitespace.
4. Remove punctuation that usually does not change intent.
5. Normalize common connector tokens to a canonical form.

Examples:

| Raw Query | Canonical Form |
|-----------|----------------|
| `FE!N` | `fein` |
| `Drake ft Lil Wayne` | `drake feat lil wayne` |
| `R&B Mix` | `rnb mix` |
| `AC/DC` | `acdc` |

Notes:

- Apostrophes, dashes, ampersands, slashes, and punctuation-heavy titles should be normalized carefully.
- Normalization should operate on whole tokens when possible.
- Canonicalization should not invent new words.

---

## Curated Alias Rules

Alias expansion should be intentionally small.

### Allowed in v1

Music connector aliases:

- `ft`, `ft.`, `feat`, `feat.`, `featuring` -> `feat`
- `pt`, `pt.`, `part` -> `part`
- `vs`, `vs.`, `versus` -> `versus`
- `r&b`, `r and b`, `rnb` -> `rnb`

High-confidence search aliases:

- `dogs` <-> `dawgs`
- `dawg` <-> `dog`
- `lil` <-> `little`

### Explicitly out of scope in v1

- Leetspeak generation such as `e -> 3` or `a -> @`
- Single-letter substitutions
- Open-ended slang dictionaries
- Ambiguous expansions such as `dr -> drake`
- ML-driven synonym generation

The rule for inclusion is simple:

- Only include an alias if it is common in music metadata and low-risk in search.

---

## Fallback Trigger

Fallback should not run for every query.

Recommended rule:

- Run the original search first.
- Only run fallback if the original result count is below a threshold, such as `< 5`.

Why `< 5` instead of `< 10`:

- It reduces unnecessary API traffic.
- It still covers the examples in scope.
- It lowers the chance that fallback results pollute already-good result sets.

This threshold should remain configurable.

---

## Ranking Model

The current plan overweights popularity. v2 should use a tiered rank model.

### Match Tiers

Assign each result to the best tier it matched through:

1. `exact`
   Exact result from the original user query.

2. `canonical`
   Result found through canonical normalization only.

3. `alias`
   Result found through curated alias expansion.

### Sort Order

Sort by:

1. Higher match tier
2. Higher popularity
3. Earlier source order

Pseudo-logic:

```typescript
results.sort((a, b) => {
  if (a.matchTier !== b.matchTier) {
    return tierWeight[b.matchTier] - tierWeight[a.matchTier];
  }

  const popularityDelta = (b.popularity ?? 0) - (a.popularity ?? 0);
  if (popularityDelta !== 0) {
    return popularityDelta;
  }

  return a.sourceOrder - b.sourceOrder;
});
```

This preserves user intent better than global popularity sorting.

---

## Dedupe Rules

Deduplicate by stable track identity:

- Primary key: `track.id`
- If needed later, add a fallback composite key from normalized title + primary artist

When the same track appears from multiple searches:

- Keep the best match tier seen for that track.
- Keep the highest popularity value seen.
- Keep the earliest source order inside the best tier.

---

## Pagination Strategy

This is the most important implementation constraint.

Merged fallback search does not naturally preserve offset-based pagination across multiple queries. Because the UI uses infinite scroll, v1 must avoid pretending that aggregated fallback pages behave like the original backend pagination.

### Recommended v1 behavior

- Apply fallback logic only for page 1 (`offset = 0`).
- For page 2+, continue using the original query only.
- Keep the existing `offset`, `limit`, and `totalNumberOfItems` semantics stable.

Why:

- It avoids broken or duplicate pagination after merge and dedupe.
- It improves first-page quality, which has the highest user impact.
- It keeps implementation risk low.

### Future option

If we later want fallback across all pages, we should cache a query-level aggregated result set and paginate locally from that merged list. That is a separate design and should not be bundled into v1.

---

## API Strategy

### Recommended method shape

Add a track-specific helper:

```typescript
async searchTracksWithFallback(
  query: string,
  options?: { signal?: AbortSignal; offset?: number; limit?: number }
): Promise<SearchResponse<Track>>
```

Behavior:

1. If `offset > 0`, call `searchTracks(query, options)` directly.
2. Execute the original query.
3. If the result count is above threshold, return it unchanged.
4. Build at most:
   - one canonical query
   - one or two curated alias queries
5. Execute those fallback searches.
6. Merge, dedupe, tier, and rank results.
7. Return a page-1-compatible response.

### Guardrails

- Never generate more than 3 total search calls in fallback mode for v1.
- Reuse the existing abort signal for every subrequest.
- If the caller aborts, stop the whole fallback chain.

---

## Caching and Request Control

The existing API client already caches raw search responses. Fallback introduces a second cache layer at the merged-result level.

Recommended additions:

1. Cache aggregated page-1 fallback results by:
   - original query
   - threshold
   - normalization version

2. Avoid duplicate in-flight fallback work for the same query.

3. Log which stage produced the winning result set:
   - `original`
   - `canonical`
   - `alias`

This is enough to learn whether the extra logic is actually useful.

---

## Implementation Plan

### Phase 1: Narrow v1

Files:

- `packages/shared/utils/variations.ts`
- `packages/shared/utils/index.ts`
- `packages/shared/api/client.ts`
- `apps/web/hooks/useSearch.ts`

Tasks:

1. Refactor the existing variations utility into a smaller, deterministic query-normalization and alias-expansion utility.
2. Remove broad leetspeak and speculative substitutions from the v1 path.
3. Export the new helpers from the shared utils index.
4. Implement `searchTracksWithFallback()` with page-1-only fallback logic.
5. Integrate the new method into the track search flow.

### Phase 2: Measure and tune

Tasks:

1. Track fallback usage frequency.
2. Track which fallback stage returned results.
3. Track whether users select results from fallback-heavy queries.
4. Promote or remove alias rules based on observed value.

### Phase 3: Optional later improvements

Tasks:

1. Introduce server-side indexed search keys.
2. Add artist-aware ranking features.
3. Consider lyrics text search as a separate capability.

---

## Testing Strategy

### Unit Tests

Normalization:

- `FE!N` -> canonical form `fein`
- `Drake ft Lil Wayne` -> canonical form `drake feat lil wayne`
- `R&B` -> canonical form `rnb`

Alias expansion:

- `Big Dogs` produces `big dawgs`
- `feat` and `featuring` normalize consistently
- ambiguous inputs such as `dr` do not expand to artist names

Ranking:

- exact matches rank above canonical matches
- canonical matches rank above alias matches
- popularity only changes order within the same tier

Dedupe:

- duplicate track IDs collapse into one result
- merged duplicates retain the best match tier

Pagination:

- `offset = 0` uses fallback logic
- `offset > 0` bypasses fallback logic

Abort behavior:

- aborting the caller aborts all subrequests

### Integration Tests

1. Search `fein` -> `FE!N` is discoverable.
2. Search `Big Dogs` -> `Big Dawgs` is discoverable.
3. Search `Drake ft Lil Wayne` -> `feat` and `featuring` results are discoverable.
4. Search `Sunflower` -> the stronger, more popular result ranks above obscure duplicates within the same tier.
5. Infinite scroll after page 1 remains stable and free of duplicates.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Too many API calls | Cap fallback to one canonical query plus one or two alias queries |
| False positives from broad substitution | Keep alias rules curated and token-level only |
| Pagination regressions | Restrict fallback to page 1 in v1 |
| Ranking surprises | Rank by match tier first, popularity second |
| Feature creep into fuzzy search | Keep leetspeak, open-ended slang, and ML approaches out of scope |

---

## Acceptance Criteria

- [ ] Searching `fein` can surface `FE!N`
- [ ] Searching `Big Dogs` can surface `Big Dawgs`
- [ ] Searching `Drake ft Lil Wayne` can surface `feat` and `featuring` variants
- [ ] Exact matches rank above fallback-only matches
- [ ] Popularity only affects ordering within the same match tier
- [ ] Fallback is only applied to page 1 in v1
- [ ] No duplicate tracks appear in merged results
- [ ] Fallback mode performs at most 3 total search requests
- [ ] Infinite scroll behavior remains stable

---

## Recommended Next Steps

1. Replace the current broad variation logic with a smaller canonicalization + alias helper.
2. Implement `searchTracksWithFallback()` with page-1-only fallback.
3. Add unit tests for normalization, aliasing, ranking, and pagination behavior.
4. Validate the feature against the example queries in this plan.
5. Remove `fuse.js` if it is not used elsewhere in the codebase.
