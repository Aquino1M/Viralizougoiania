import { classifyEditorial, inferLocation, isGoiasOrigin } from '../lib/category-classifier.ts';

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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function run() {
  console.log('Carregando posts do Supabase...');
  const posts = await sb('posts?select=*&order=created_at.desc&limit=2000');
  console.log(`Total de posts carregados: ${posts.length}`);

  let changedCount = 0;
  const changes = [];

  for (const post of posts) {
    const isGoias = isGoiasOrigin(post);
    const loc = inferLocation(post);
    const targetCat = classifyEditorial(post);

    let targetCity = post.city;
    if (!targetCity || (targetCity === 'Goiânia' && !isGoias)) {
      targetCity = loc.city;
    } else if (loc.isBairro && loc.city) {
      targetCity = loc.city;
    }

    let featuredFix = undefined;
    if (!isGoias && post.featured) {
      featuredFix = false;
    }

    if (post.category !== targetCat || post.city !== targetCity || featuredFix !== undefined) {
      changes.push({
        id: post.id,
        oldCat: post.category,
        newCat: targetCat,
        oldCity: post.city,
        newCity: targetCity,
        featuredFix
      });
    }
  }

  console.log(`Total de posts que precisam de correção: ${changes.length}`);
  console.log('Exemplos de correções:');
  console.log(changes.slice(0, 10));

  // Agrupa para atualização em massa
  const grouped = new Map();
  for (const c of changes) {
    const key = `${c.newCat}:::${c.newCity}:::${c.featuredFix === undefined ? '' : c.featuredFix}`;
    if (!grouped.has(key)) {
      grouped.set(key, { category: c.newCat, city: c.newCity, featured: c.featuredFix, ids: [] });
    }
    grouped.get(key).ids.push(c.id);
  }

  const updatedAt = new Date().toISOString();
  let updatedSoFar = 0;

  for (const [, grp] of grouped) {
    for (let i = 0; i < grp.ids.length; i += 75) {
      const chunk = grp.ids.slice(i, i + 75);
      const filter = chunk.map((id) => `"${id.replace(/"/g, '')}"`).join(',');
      const patchBody = {
        category: grp.category,
        city: grp.city,
        updated_at: updatedAt
      };
      if (grp.featured !== undefined) {
        patchBody.featured = grp.featured;
      }

      await sb(`posts?id=in.(${filter})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patchBody)
      });
      updatedSoFar += chunk.length;
      console.log(`Atualizados ${updatedSoFar}/${changes.length}...`);
    }
  }

  // Garante que o post mais recente de Goiás tenha featured: true
  const goiasPosts = posts
    .filter((p) => isGoiasOrigin(p) && p.status === 'published')
    .sort((a, b) => +new Date(b.published_at || b.created_at) - +new Date(a.published_at || a.created_at));

  if (goiasPosts.length > 0) {
    const topLead = goiasPosts[0];
    console.log(`Definindo post em destaque de Goiânia: "${topLead.title}"`);
    await sb(`posts?id=eq.${topLead.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ featured: true, updated_at: updatedAt })
    });
  }

  console.log('Reclassificação concluída com sucesso!');
}

run().catch(console.error);
