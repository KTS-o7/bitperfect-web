const CANONICAL_TOKEN_MAP: Record<string, string> = {
  "ft": "feat",
  "ft.": "feat",
  "feat": "feat",
  "feat.": "feat",
  "featuring": "feat",
  "pt": "part",
  "pt.": "part",
  "part": "part",
  "vs": "versus",
  "vs.": "versus",
  "versus": "versus",
  "r&b": "rnb",
  "rnb": "rnb",
  "fe!n": "fein",
};

const CANONICAL_PHRASE_REPLACEMENTS: Array<{
  pattern: RegExp;
  replacement: string;
}> = [
  {
    pattern: /\br\s*(?:&|and)\s*b\b/gi,
    replacement: " rnb ",
  },
];

const QUERY_ALIAS_MAP: Record<string, string[]> = {
  "feat": ["featuring", "ft"],
  "rnb": ["r&b"],
  "dogs": ["dawgs"],
  "dawgs": ["dogs"],
  "dog": ["dawg"],
  "dawg": ["dog"],
  "lil": ["little"],
  "little": ["lil"],
  "fein": ["fe!n"],
  "fe!n": ["fein"],
};

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function stripTokenEdges(token: string): string {
  return token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
}

function normalizeToken(token: string): string {
  const lowered = token.toLowerCase();
  const edgeTrimmed = stripTokenEdges(lowered);

  if (!edgeTrimmed) {
    return "";
  }

  const directCanonical = CANONICAL_TOKEN_MAP[edgeTrimmed];
  if (directCanonical) {
    return directCanonical;
  }

  const stripped = edgeTrimmed.replace(/[^a-z0-9]/g, "");
  if (!stripped) {
    return "";
  }

  return CANONICAL_TOKEN_MAP[stripped] ?? stripped;
}

function createQueryKey(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function normalizeSearchQuery(query: string): string {
  if (!query || query.trim().length === 0) {
    return "";
  }

  let normalized = query.toLowerCase();
  for (const replacement of CANONICAL_PHRASE_REPLACEMENTS) {
    normalized = normalized.replace(
      replacement.pattern,
      replacement.replacement
    );
  }

  const tokens = normalizeWhitespace(normalized)
    .split(" ")
    .map(normalizeToken)
    .filter(Boolean);

  return tokens.join(" ");
}

export function generateAliasQueries(
  query: string,
  maxAliases: number = 2
): string[] {
  if (!query || query.trim().length === 0 || maxAliases <= 0) {
    return [];
  }

  const canonicalQuery = normalizeSearchQuery(query);
  if (!canonicalQuery) {
    return [];
  }

  const seen = new Set<string>([
    createQueryKey(query),
    createQueryKey(canonicalQuery),
  ]);
  const tokens = canonicalQuery.split(" ");
  const aliases: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const tokenAliases = QUERY_ALIAS_MAP[token];

    if (!tokenAliases) {
      continue;
    }

    for (const alias of tokenAliases) {
      const candidateTokens = [...tokens];
      candidateTokens[index] = alias;
      const candidate = candidateTokens.join(" ");
      const candidateKey = createQueryKey(candidate);

      if (seen.has(candidateKey)) {
        continue;
      }

      seen.add(candidateKey);
      aliases.push(candidate);

      if (aliases.length >= maxAliases) {
        return aliases;
      }
    }
  }

  return aliases;
}

export function buildTrackSearchQueries(
  query: string,
  maxAliasQueries: number = 2
): {
  originalQuery: string;
  canonicalQuery?: string;
  aliasQueries: string[];
} {
  const originalQuery = normalizeWhitespace(query);
  const originalKey = createQueryKey(originalQuery);
  const canonicalQuery = normalizeSearchQuery(originalQuery);
  const canonicalKey = canonicalQuery ? createQueryKey(canonicalQuery) : "";

  const aliasQueries = generateAliasQueries(
    canonicalQuery || originalQuery,
    maxAliasQueries + 2
  )
    .filter((candidate) => {
      const candidateKey = createQueryKey(candidate);
      return candidateKey !== originalKey && candidateKey !== canonicalKey;
    })
    .slice(0, maxAliasQueries);

  return {
    originalQuery,
    canonicalQuery:
      canonicalQuery && canonicalKey !== originalKey ? canonicalQuery : undefined,
    aliasQueries,
  };
}

export function generateSearchVariations(
  query: string,
  maxVariations: number = 3
): string[] {
  if (!query || query.trim().length === 0 || maxVariations <= 0) {
    return [];
  }

  const { originalQuery, canonicalQuery, aliasQueries } = buildTrackSearchQueries(
    query,
    Math.max(0, maxVariations - 2)
  );

  return [originalQuery, canonicalQuery, ...aliasQueries]
    .filter((value): value is string => Boolean(value))
    .slice(0, maxVariations);
}

export function shouldUseFallback(
  resultCount: number,
  threshold: number = 5
): boolean {
  return resultCount < threshold;
}
