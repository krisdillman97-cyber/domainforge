import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Common TLD pricing (can be overridden via OwnerConfig)
const DEFAULT_TLD_PRICES: Record<string, number> = {
  'com': 12.99, 'net': 11.99, 'org': 11.99, 'io': 49.99,
  'co': 29.99, 'app': 19.99, 'dev': 14.99, 'ai': 79.99,
  'me': 19.99, 'info': 9.99, 'biz': 14.99, 'us': 9.99,
  'tech': 39.99, 'online': 9.99, 'site': 9.99, 'store': 29.99,
  'xyz': 4.99, 'club': 9.99, 'live': 19.99, 'news': 29.99,
};

function generateAvailability(domain: string): boolean {
  // Deterministic pseudo-availability based on domain hash
  // In production, replace with real WHOIS/registrar API call
  const hash = domain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % 3 !== 0; // ~66% available
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { query, tlds } = body;

    if (!query) {
      return Response.json({ error: 'query is required' }, { status: 400 });
    }

    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
    if (!cleanQuery) {
      return Response.json({ error: 'Invalid domain name' }, { status: 400 });
    }

    const searchTlds = tlds || ['com', 'net', 'org', 'io', 'co', 'app', 'dev', 'ai', 'xyz'];

    const results = searchTlds.map((tld: string) => {
      const fullDomain = `${cleanQuery}.${tld}`;
      const available = generateAvailability(fullDomain);
      return {
        domain: fullDomain,
        name: cleanQuery,
        tld,
        available,
        price: DEFAULT_TLD_PRICES[tld] || 14.99,
        premium: tld === 'ai' || tld === 'io',
      };
    });

    // Sort: available first, then by price
    results.sort((a: any, b: any) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return a.price - b.price;
    });

    return Response.json({ results, query: cleanQuery });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
