import fetch from 'node-fetch';

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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

async function run() {
  try {
    const totalCountRes = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=id`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
        Range: '0-0'
      }
    });
    console.log('Total posts in Supabase:', totalCountRes.headers.get('content-range'));

    const scheduledRes = await fetch(`${SUPABASE_URL}/rest/v1/posts?status=eq.scheduled&select=id`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
        Range: '0-0'
      }
    });
    console.log('Scheduled posts in Supabase:', scheduledRes.headers.get('content-range'));

    const settings = await sb('settings?id=eq.automation');
    console.log('Automation settings:', JSON.stringify(settings, null, 2));

    // Test inserting a dummy post with a slug and then deleting it
    const testSlug = 'test-automation-probe-' + Date.now();
    const inserted = await sb('posts', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        slug: testSlug,
        title: 'Teste Probe Automação',
        excerpt: 'Teste de agendamento probe',
        content: '<p>Teste probe</p>',
        source_content: 'Teste probe',
        category: 'Goiânia',
        city: 'Goiânia',
        author: 'Redação',
        image_url: 'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=1200&q=80',
        image_credit: 'Foto: Reprodução',
        video_url: '',
        featured: false,
        status: 'scheduled',
        published_at: new Date(Date.now() + 600000).toISOString(),
        source_name: 'Teste',
        source_url: 'https://exemplo.com/' + testSlug,
        source_author: '',
        seo_title: 'Teste Probe Automação',
        seo_description: 'Teste de agendamento probe',
        seo_keywords: 'teste'
      })
    });
    console.log('Test post inserted successfully:', inserted?.[0]?.id, inserted?.[0]?.slug);

    // Clean up test post
    if (inserted?.[0]?.id) {
      await sb(`posts?id=eq.${inserted[0].id}`, { method: 'DELETE' });
      console.log('Test post deleted successfully');
    }
  } catch (e) {
    console.error('Diagnostic error:', e);
  }
}

run();
