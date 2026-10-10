const fs = require('fs');

async function check() {
  const url = process.env.SUPABASE_URL || 'https://mxjyktdozmtekushaknm.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_ZFVj5XbhfNh3zYyKC_F6Cg_gSKDyTsR';
  const res = await fetch(url + '/rest/v1/posts?select=id,title,category,city,source_name,source_url,content,excerpt&category=eq.Goiânia&limit=500', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const posts = await res.json();
  console.log('Total in Goiânia category:', posts.length);
  
  const goiasSources = [
    'a redação', 'diário de goiás', 'curta mais', 'dia online', 
    'metrópoles goiás', 'entorno e goiás', 'goiás 24 horas', 'g1 > goiás', 'g1 goiás', 'ge goiás & clubes', 'portal 6'
  ];
  
  let localCount = 0;
  let nonLocalCount = 0;
  const nonLocalExamples = [];
  
  for (const p of posts) {
    const src = (p.source_name || '').toLowerCase();
    const isFromGoiasSource = goiasSources.some(s => src.includes(s));
    const text = ((p.title || '') + ' ' + (p.excerpt || '') + ' ' + (p.source_url || '')).toLowerCase();
    const mentionsGoias = /\b(goi[aá]nia|goi[aá]s|goiano|goiana|aparecida|an[aá]polis|rio verde|trindade|senador canedo|setor bueno|setor marista|pmgo|caiado)\b/i.test(text);
    
    if (isFromGoiasSource || mentionsGoias) {
      localCount++;
    } else {
      nonLocalCount++;
      if (nonLocalExamples.length < 20) {
        nonLocalExamples.push({ title: p.title, source: p.source_name });
      }
    }
  }
  
  console.log({ localCount, nonLocalCount });
  console.log('Non-local examples in Goiânia category:', nonLocalExamples);
}

check().catch(console.error);
