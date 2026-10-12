const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mxjyktdozmtekushaknm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_ZFVj5XbhfNh3zYyKC_F6Cg_gSKDyTsR';

async function sb(path, init) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return txt ? JSON.parse(txt) : null;
}

async function main() {
  try {
    // 1. Get 1 post that is published
    const posts = await sb('posts?select=id,title,status,published_at,created_at&status=eq.published&limit=1');
    console.log('Sample post:', posts[0]);
    if (!posts || posts.length === 0) {
      console.log('No posts found');
      return;
    }

    const testPost = posts[0];
    console.log('Attempting to update status to "archived"...');
    // Try updating status to archived
    const updateRes = await sb(`posts?id=eq.${testPost.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'archived' })
    });
    console.log('Successfully updated to archived! Result:', updateRes);

    // Revert it back to published
    console.log('Reverting back to published...');
    await sb(`posts?id=eq.${testPost.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'published' })
    });
    console.log('Reverted successfully!');
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

main();
