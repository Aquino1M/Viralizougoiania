const GOIAS_SOURCES_REGEX =
  /a reda[cç][aã]o|aredacao\.com\.br|di[aá]rio de goi[aá]s|diariodegoias\.com\.br|curta mais|curtamais\.com\.br|dia online|diaonline\.ig\.com\.br|metr[oó]poles goi[aá]s|entorno e goi[aá]s|goi[aá]s 24 horas|goias24horas\.com\.br|g1 > goi[aá]s|g1 goi[aá]s|g1\.globo\.com\/go\/goias|ge goi[aá]s|portal 6|portal6\.com\.br|jornal op[cç][aã]o|mais goi[aá]s|o popular/i;

const GOIANIA_BAIRROS_REGEX =
  /\b(setor bueno|setor marista|setor oeste|setor central|centro de goiania|setor universitario|setor coimbra|setor sul|jardim goias|negrao de lima|vila viana|vila nova|setor nova vila|setor pedro ludovico|campinas|urias magalhaes|parque amazonia|jardim america|setor bela vista|setor eldorado|parque das laranjeiras|vila redencao|jardim atlantico|vila itatiaia|goiania 2|goiania ii|faicalville|setor sudoeste|setor jao|bairro feliz|setor aeroporto|cidade jardim|vila alpes|vila uniao|parque oeste industrial|vila vera cruz|jardim presidente|jardim curitiba|vila mutirao|regiao noroeste|regiao leste|regiao norte|parque vaca brava|parque flamboyant|parque areiao|bosque dos buritis|lago das rosas|parque cascavel)\b/i;

const GOIAS_TERMS_REGEX =
  /\b(goiania|goianiense|goianienses|goias|goiano|goiana|goianos|goianas|aparecida de goiania|anapolis|rio verde|jatai|caldas novas|trindade|senador canedo|catalao|itumbiara|aguas lindas|valparaiso de goias|valparaiso|luziania|formosa|goianesia|morrinhos|ceres|rialma|pirenopolis|cidade de goias|mineiros|cristalina|inhumas|porangatu|jaragua|niquelandia|posse|santa helena de goias|ipora|sao luis de montes belos|palmeiras de goias|uruacu|planaltina de goias|santo antonio do descoberto|novo gama|bela vista de goias|alexania|hidrolandia|piracanjuba|guapo|neropolis|goianira|abadia de goias|silvania|ipameri|vianopolis|quirinopolis|crixas|arauana|chapada dos veadeiros|alto paraiso|caiado|ronaldo caiado|gracinha caiado|daniel vilela|sandro mabel|rogerio cruz|maguito|iris rezende|prefeitura de goiania|governo de goias|paco municipal|alego|tjgo|mpgo|pmgo|pcgo|goinfra|saneago|equatorial goias|metrobus|eixo anhanguera|vila nova|goias ec|goias e\.c|atletico-go|atletico goianiense|goiania ec|goianatur|goianiatur|serra dourada|antonio accioly|estadio da serrinha|onesio brasileiro)\b/i;

function normalize(value = '') {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hit(text, re) {
  return re.test(text);
}

function isGoiasOrigin(input) {
  const sourceName = input.source_name || '';
  const sourceUrl = input.source_url || '';
  if (GOIAS_SOURCES_REGEX.test(sourceName) || GOIAS_SOURCES_REGEX.test(sourceUrl)) {
    return true;
  }
  const text = normalize(`${input.title || ''} ${input.excerpt || ''} ${input.source_url || ''} ${input.city || ''}`);
  return GOIAS_TERMS_REGEX.test(text) || GOIANIA_BAIRROS_REGEX.test(text);
}

function inferLocation(input) {
  const isGoias = isGoiasOrigin(input);
  const text = normalize(`${input.title || ''} ${input.excerpt || ''}`);

  if (isGoias) {
    const bMatch = text.match(GOIANIA_BAIRROS_REGEX);
    if (bMatch) {
      const cap = bMatch[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return { city: cap, isGoias: true, isBairro: true };
    }
    if (/\baparecida de goiania|aparecida\b/.test(text)) return { city: 'Aparecida de Goiânia', isGoias: true, isBairro: false };
    if (/\banapolis\b/.test(text)) return { city: 'Anápolis', isGoias: true, isBairro: false };
    if (/\brio verde\b/.test(text)) return { city: 'Rio Verde', isGoias: true, isBairro: false };
    if (/\bjatai\b/.test(text)) return { city: 'Jataí', isGoias: true, isBairro: false };
    if (/\bcaldas novas\b/.test(text)) return { city: 'Caldas Novas', isGoias: true, isBairro: false };
    if (/\btrindade\b/.test(text)) return { city: 'Trindade', isGoias: true, isBairro: false };
    if (/\bsenador canedo\b/.test(text)) return { city: 'Senador Canedo', isGoias: true, isBairro: false };
    if (/\bgoias\b/.test(text) && !/\bgoiania\b/.test(text)) return { city: 'Goiás', isGoias: true, isBairro: false };
    return { city: 'Goiânia', isGoias: true, isBairro: false };
  }

  if (/\b(belo horizonte|metro de bh|minas gerais|bh)\b/.test(text)) return { city: 'Belo Horizonte', isGoias: false, isBairro: false };
  if (/\b(sao paulo|capital paulista|sp)\b/.test(text)) return { city: 'São Paulo', isGoias: false, isBairro: false };
  if (/\b(rio de janeiro|rj)\b/.test(text)) return { city: 'Rio de Janeiro', isGoias: false, isBairro: false };
  if (/\b(brasilia|distrito federal|df|stf|congresso nacional)\b/.test(text)) return { city: 'Brasília', isGoias: false, isBairro: false };
  if (/\b(curitiba|parana)\b/.test(text)) return { city: 'Paraná', isGoias: false, isBairro: false };
  if (/\b(santarem|para|belem)\b/.test(text)) return { city: 'Pará', isGoias: false, isBairro: false };
  if (/\b(trump|biden|eua|estados unidos|florida)\b/.test(text)) return { city: 'Estados Unidos', isGoias: false, isBairro: false };
  if (/\b(ucrania|russia|putin|zelensky)\b/.test(text)) return { city: 'Mundo', isGoias: false, isBairro: false };
  if (/\b(xangai|china)\b/.test(text)) return { city: 'Xangai', isGoias: false, isBairro: false };
  if (/\b(champions|europa)\b/.test(text)) return { city: 'Europa', isGoias: false, isBairro: false };

  return { city: 'Brasil', isGoias: false, isBairro: false };
}

function classifyEditorial(input) {
  const title = normalize(input.title || '');
  const excerpt = normalize(input.excerpt || '');
  const source = normalize((input.source_name || '') + ' ' + (input.source_url || ''));
  const isGoias = isGoiasOrigin(input);

  if (/portal leo ?dias|metropoles celebridades|revista quem|hugo gloss|uol entretenimento|uol famosos|ofuxico|a fazenda/.test(source)) return 'Fofocas';
  if (hit(title, /\b(tenis|xangai|us open|wimbledon|alcaraz|jodar|tirante|medvedev|aliassime|motogp|marquez|gp da|f1|formula 1|basquete|volei)\b/)) return 'Esportes';
  if (/ge brasileirao|ge futebol|ge goias|gazeta esportiva|metropoles futebol|lance/.test(source)) return 'Futebol';

  const scores = {
    'Goiânia': isGoias ? 15 : 0,
    'Bairros': 0, 'Trânsito': 0, 'Segurança': 0, 'Política': 0,
    'Empregos': 0, 'Esportes': 0, 'Eventos': 0, 'Economia': 0,
    'Serviços': 0, 'Futebol': 0, 'Fofocas': 0
  };

  if (hit(title, /\b(vaga|vagas|emprego|empregos|concurso|concursos|processo seletivo|oportunidades? de trabalho|salarios? de ate|edital)\b/)) scores['Empregos'] += 60;
  if (hit(title, /\b(futebol|brasileirao|serie a|serie b|copa do brasil|libertadores|sul-americana|cbf|campeonato goiano|escalacao|onde assistir|gol|gols|palmeiras|flamengo|corinthians|sao paulo|santos|botafogo|vasco|fluminense|gremio|internacional|cruzeiro|atletico-mg|atletico-go|atletico goianiense|goias ec|vila nova|champions league|real madrid|barcelona|manchester|chelsea|bayern)\b/)) scores['Futebol'] += 75;
  if (hit(title, /\b(volei|basquete|tenis|tênis|masters 1000|atletismo|corrida|mma|ufc|formula 1|f1|motogp|sprint|nfl|alcaraz|jodar|tirante|medvedev)\b/)) scores['Esportes'] += 70;

  const explicitTraffic = hit(title, /\b(transito|engarraf|interdi[cç]|bloqueio|desvio|semaforo|recapeamento|asfalto|marginal botafogo|eixo anhanguera)\b/);
  const crash = hit(title, /\b(acidente|colisao|batida|capot|atropel|sai da pista|tomba|tombamento)\b/);
  const roadOrVehicle = hit(title, /\b(rodovia|br-\d+|go-\d+|avenida|rua|via |pista|motorista|carreta|caminhao|moto|carro|onibus)\b/);
  if (explicitTraffic) scores['Trânsito'] += 50;
  if (crash && roadOrVehicle) scores['Trânsito'] += 45;
  else if (crash) scores['Trânsito'] += 28;

  if (hit(title, /\b(policia|pmgo|pcgo|pf |preso|presa|prisao|crime|homicidio|assassinad|assassinato|morte|morre|morto|mortos|balead|tiroteio|assalt|roubo|furto|delegacia|suspeito|arma|trafico|drogas|feminicidio|estupro|agredid|sequestro|golpe|incendio|queda de aviao|aviao monomotor|queda de aeronave|acidente aereo|desastre|temporal|temporais|arranca telhado|destruicao|furacao|estado de emergencia|inundacao|alagamento)\b/)) scores['Segurança'] += 55;
  if (hit(title, /\b(eleicao|eleicoes|candidato|candidata|prefeito|vereador|deputado|governador|senado|tse|tre-go|stf|stj|congresso|camara dos deputados|partido|caiado|sandro mabel|rogerio cruz|lula|bolsonaro|moraes|fachin|pavanato|trump|putin|biden|ucrania|zelensky|acordo|diplomata|onu|ministro|ministerio|governo)\b/)) scores['Política'] += 75;
  if (hit(title, /\b(dolar|inflacao|ipca|selic|juros|pix|banco central|credito|ibovespa|petroleo|combustiveis|diesel|gasolina|economia|empresa|empresas|comercio|negocio|investimento|imposto|pib|safra|agro|carro eletrico|leilao|leiloes|lances)\b/)) scores['Economia'] += 50;
  if (hit(title, /\b(vacina|saude|sus|hospital|upa|energia|conta de luz|agua|cnh|ipva|iptu|educacao|escola|universidade|ufg|beneficio|servico|servicos|temperatura|onda de calor|previsao do tempo|clima|chimarrao|bacterias|mofo|veja como|como limpar|dicas|faculdade|diploma)\b/)) scores['Serviços'] += 52;
  if (hit(title, /\b(show|festival|feira|teatro|cinema|concerto|agenda cultural|ingresso|ingressos|exposicao|gastronomia|rodeio|carnaval|turne|espetaculo)\b/)) scores['Eventos'] += 40;
  if (hit(title, /\b(atriz|ator|cantor|cantora|sertanejo|celebridade|famoso|famosa|influenciador|influenciadora|namoro|separacao|gravidez|reality|bbb|a fazenda|novela|virginia fonseca|ze felipe|gusttavo lima|anitta|neymar|leonardo|murilo huff)\b/)) scores['Fofocas'] += 50;

  if (isGoias) {
    const hasBairro = GOIANIA_BAIRROS_REGEX.test(title) || GOIANIA_BAIRROS_REGEX.test(excerpt);
    const hasNeighborhoodIssue = hit(title, /\b(bairro|bairros|setor|setores|recapeamento|asfalto novo|obras no setor|moradores do|praca do|limpeza no bairro)\b/);
    if (hasBairro && hasNeighborhoodIssue) scores['Bairros'] += 80;
    else if (hasBairro) scores['Bairros'] += 50;
    else if (hasNeighborhoodIssue) scores['Bairros'] += 35;
  }

  const priorityGoias = ['Bairros', 'Trânsito', 'Segurança', 'Política', 'Empregos', 'Eventos', 'Economia', 'Serviços', 'Fofocas', 'Futebol', 'Esportes', 'Goiânia'];
  const priorityNacional = ['Política', 'Segurança', 'Economia', 'Fofocas', 'Futebol', 'Esportes', 'Empregos', 'Serviços', 'Trânsito', 'Eventos'];

  if (isGoias) {
    let winner = 'Goiânia';
    let best = scores['Goiânia'];
    for (const cat of priorityGoias) {
      if (scores[cat] > best) {
        best = scores[cat];
        winner = cat;
      }
    }
    return winner;
  }

  let winner = 'Serviços';
  let best = 0;
  for (const cat of priorityNacional) {
    if (scores[cat] > best) {
      best = scores[cat];
      winner = cat;
    }
  }

  if (best === 0) {
    if (hit(title, /\b(governo|autoridade|justica|lei|tribunal|relatorio|decisao|posse|acordo|diplomacia)\b/)) return 'Política';
    if (hit(title, /\b(acidente|morre|morte|preso|bombeiro|chuva|vento|tempestade)\b/)) return 'Segurança';
    if (hit(title, /\b(preco|mercado|venda|compra|dinheiro|taxa|imposto)\b/)) return 'Economia';
    return 'Serviços';
  }

  return winner;
}

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

async function main() {
  console.log('--- INICIANDO RECLASSIFICAÇÃO DE NOTÍCIAS ---');
  const posts = await sb('posts?select=*&order=created_at.desc&limit=2000');
  console.log(`Carregados ${posts.length} posts do Supabase.`);

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
        title: post.title,
        oldCat: post.category,
        newCat: targetCat,
        oldCity: post.city,
        newCity: targetCity,
        featuredFix
      });
    }
  }

  console.log(`Total de posts modificados: ${changes.length}`);
  console.log('Exemplos de correções feitas:');
  changes.slice(0, 8).forEach(c => {
    console.log(`- [${c.oldCat} -> ${c.newCat}] [${c.oldCity} -> ${c.newCity}] "${c.title.slice(0, 60)}"`);
  });

  // Agrupa para atualização em lotes
  const grouped = new Map();
  for (const c of changes) {
    const key = `${c.newCat}:::${c.newCity}:::${c.featuredFix === undefined ? '' : c.featuredFix}`;
    if (!grouped.has(key)) {
      grouped.set(key, { category: c.newCat, city: c.newCity, featured: c.featuredFix, ids: [] });
    }
    grouped.get(key).ids.push(c.id);
  }

  const updatedAt = new Date().toISOString();
  let done = 0;
  for (const [, grp] of grouped) {
    for (let i = 0; i < grp.ids.length; i += 75) {
      const chunk = grp.ids.slice(i, i + 75);
      const filter = chunk.map(id => `"${id.replace(/"/g, '')}"`).join(',');
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
      done += chunk.length;
    }
  }
  console.log(`Atualizados com sucesso ${done} posts no Supabase.`);

  // Garante o destaque de Goiânia
  const publishedGoias = posts
    .filter(p => isGoiasOrigin(p) && p.status === 'published')
    .sort((a, b) => +new Date(b.published_at || b.created_at) - +new Date(a.published_at || a.created_at));

  if (publishedGoias.length > 0) {
    const topLead = publishedGoias[0];
    console.log(`Definindo destaque de Goiânia: "${topLead.title}"`);
    await sb(`posts?id=eq.${topLead.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ featured: true, updated_at: updatedAt })
    });
  }

  // Também atualiza o posts.json local se houver
  try {
    const fs = require('fs');
    const path = require('path');
    const localPath = path.join(process.cwd(), 'data', 'posts.json');
    if (fs.existsSync(localPath)) {
      const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      let localCount = 0;
      for (const item of changes) {
        const p = local.find(l => l.id === item.id);
        if (p) {
          p.category = item.newCat;
          p.city = item.newCity;
          if (item.featuredFix !== undefined) p.featured = item.featuredFix;
          p.updated_at = updatedAt;
          localCount++;
        }
      }
      fs.writeFileSync(localPath, JSON.stringify(local, null, 2), 'utf8');
      console.log(`Atualizados ${localCount} posts no data/posts.json local.`);
    }
  } catch (err) {
    console.warn('Aviso local:', err.message);
  }

  console.log('--- RECLASSIFICAÇÃO CONCLUÍDA COM ÊXITO! ---');
}

main().catch(console.error);
