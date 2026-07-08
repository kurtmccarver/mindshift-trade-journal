const buckets = new Map();

export function checkRateLimit(key, { windowMs = 60_000, max = 60 } = {}) {
  const now = Date.now();
  const bucketKey = String(key || 'anonymous');
  const current = buckets.get(bucketKey);

  if (!current || now > current.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  current.count += 1;
  buckets.set(bucketKey, current);

  return {
    allowed: current.count <= max,
    remaining: Math.max(0, max - current.count),
    resetAt: current.resetAt
  };
}

