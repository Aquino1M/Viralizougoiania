export type NewsSourceConfig = {
  id: string;
  name: string;
  url: string;
  domain: string;
  scope: "goias" | "goiania";
  pathPrefixes?: string[];
  requireRegionalTerms?: boolean;
};

export const NEWS_SOURCES: NewsSourceConfig[] = [
  {
    id: "g1-goias",
    name: "G1 Goiás",
    url: "https://g1.globo.com/go/goias/",
    domain: "g1.globo.com",
    scope: "goias",
    pathPrefixes: ["/go/goias/"],
  },
  {
    id: "metropoles-goias",
    name: "Metrópoles • Entorno e Goiás",
    url: "https://www.metropoles.com/distrito-federal/entorno",
    domain: "metropoles.com",
    scope: "goias",
    pathPrefixes: ["/distrito-federal/entorno/"],
  },
  {
    id: "mais-goias",
    name: "Mais Goiás",
    url: "https://www.maisgoias.com.br/noticias/",
    domain: "maisgoias.com.br",
    scope: "goias",
    requireRegionalTerms: true,
  },
  {
    id: "diario-goiania",
    name: "Diário de Goiás • Goiânia",
    url: "https://diariodegoias.com.br/cidades/goiania-noticias/",
    domain: "diariodegoias.com.br",
    scope: "goiania",
  },
  {
    id: "o-popular-daqui",
    name: "O Popular / Daqui",
    url: "https://daqui.opopular.com.br/",
    domain: "daqui.opopular.com.br",
    scope: "goias",
    requireRegionalTerms: true,
  },
];
