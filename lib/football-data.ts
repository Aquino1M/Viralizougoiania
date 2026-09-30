export interface FootballTeam {
  id: string;
  name: string;
  shortName: string;
  code: string;
  popularRank: number;
  primaryColor: string;
  secondaryColor: string;
  badgeUrl: string;
  keywords: string[];
}

export interface StandingRow {
  position: number;
  teamCode: string;
  teamName: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  percentage: number;
  recentForm: ("W" | "D" | "L")[];
}

export interface MatchFixture {
  id: string;
  round: number;
  dateStr: string;
  timeStr: string;
  stadium: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore?: number;
  awayScore?: number;
  status: "finished" | "live" | "scheduled";
}

// Times com os mais populares na frente conforme pedido pelo usuário
export const FOOTBALL_TEAMS: FootballTeam[] = [
  {
    id: "corinthians",
    name: "Corinthians",
    shortName: "Corinthians",
    code: "COR",
    popularRank: 1,
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/corinthians/corinthians-logo-footylogos.svg",
    keywords: ["corinthians", "timão", "timao", "alvinegro", "neo química", "yuri alberto", "memphis depay", "ramón díaz", "fagner"],
  },
  {
    id: "flamengo",
    name: "Flamengo",
    shortName: "Flamengo",
    code: "FLA",
    popularRank: 2,
    primaryColor: "#c21822",
    secondaryColor: "#000000",
    badgeUrl: "https://assets.footylogos.com/logos/flamengo/flamengo-logo-footylogos.svg",
    keywords: ["flamengo", "mengão", "mengao", "rubro-negro", "maracanã", "gabi", "gabigol", "arrascaeta", "filipe luís", "pedro"],
  },
  {
    id: "sao-paulo",
    name: "São Paulo",
    shortName: "São Paulo",
    code: "SAO",
    popularRank: 3,
    primaryColor: "#e11d48",
    secondaryColor: "#000000",
    badgeUrl: "https://assets.footylogos.com/logos/sao-paulo/sao-paulo-logo-footylogos.svg",
    keywords: ["são paulo", "sao paulo", "tricolor", "morumbi", "calleri", "lucas moura", "zubeldía"],
  },
  {
    id: "palmeiras",
    name: "Palmeiras",
    shortName: "Palmeiras",
    code: "PAL",
    popularRank: 4,
    primaryColor: "#047857",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/palmeiras/palmeiras-logo-footylogos.svg",
    keywords: ["palmeiras", "verdão", "verdao", "alviverde", "allianz parque", "abel ferreira", "estêvão", "veiga"],
  },
  {
    id: "santos",
    name: "Santos",
    shortName: "Santos",
    code: "SAN",
    popularRank: 5,
    primaryColor: "#111827",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/santos-fc/santos-fc-logo-footylogos.svg",
    keywords: ["santos", "peixe", "vila belmiro", "santista", "alvinegro praiano"],
  },
  {
    id: "vasco",
    name: "Vasco da Gama",
    shortName: "Vasco",
    code: "VAS",
    popularRank: 6,
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/vasco-da-gama/vasco-da-gama-logo-footylogos.svg",
    keywords: ["vasco", "vasco da gama", "cruzmaltino", "são januário", "vegetti", "coutinho"],
  },
  {
    id: "gremio",
    name: "Grêmio",
    shortName: "Grêmio",
    code: "GRE",
    popularRank: 7,
    primaryColor: "#0284c7",
    secondaryColor: "#000000",
    badgeUrl: "https://assets.footylogos.com/logos/gremio/gremio-logo-footylogos.svg",
    keywords: ["grêmio", "gremio", "imortal", "tricolor gaúcho", "arena do grêmio", "renato gaúcho"],
  },
  {
    id: "internacional",
    name: "Internacional",
    shortName: "Internacional",
    code: "INT",
    popularRank: 8,
    primaryColor: "#dc2626",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/sc-internacional/sc-internacional-logo-footylogos.svg",
    keywords: ["internacional", "inter", "colorado", "beira-rio", "alan patrick", "borré"],
  },
  {
    id: "cruzeiro",
    name: "Cruzeiro",
    shortName: "Cruzeiro",
    code: "CRU",
    popularRank: 9,
    primaryColor: "#1d4ed8",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/cruzeiro/cruzeiro-logo-footylogos.svg",
    keywords: ["cruzeiro", "raposa", "celeste", "mineirão", "diniz", "matheus pereira"],
  },
  {
    id: "atletico-mg",
    name: "Atlético-MG",
    shortName: "Atlético-MG",
    code: "CAM",
    popularRank: 10,
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/atletico-mineiro/atletico-mineiro-logo-footylogos.svg",
    keywords: ["atlético-mg", "atletico-mg", "galo", "alvinegro", "arena mrv", "hulk", "paulino", "milito"],
  },
  {
    id: "botafogo",
    name: "Botafogo",
    shortName: "Botafogo",
    code: "BOT",
    popularRank: 11,
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/botafogo/botafogo-logo-footylogos.svg",
    keywords: ["botafogo", "fogão", "glorioso", "nilton santos", "artur jorge", "luiz henrique", "savarino"],
  },
  {
    id: "fluminense",
    name: "Fluminense",
    shortName: "Fluminense",
    code: "FLU",
    popularRank: 12,
    primaryColor: "#831843",
    secondaryColor: "#047857",
    badgeUrl: "https://assets.footylogos.com/logos/fluminense/fluminense-logo-footylogos.svg",
    keywords: ["fluminense", "flu", "tricolor carioca", "maracanã", "cano", "marlon", "arias", "thiago silva"],
  },
  {
    id: "bahia",
    name: "Bahia",
    shortName: "Bahia",
    code: "BAH",
    popularRank: 13,
    primaryColor: "#0284c7",
    secondaryColor: "#dc2626",
    badgeUrl: "https://assets.footylogos.com/logos/bahia/bahia-logo-footylogos.svg",
    keywords: ["bahia", "tricolor de aço", "fonte nova", "rogério ceni", "everton ribeiro"],
  },
  {
    id: "fortaleza",
    name: "Fortaleza",
    shortName: "Fortaleza",
    code: "FOR",
    popularRank: 14,
    primaryColor: "#1e3a8a",
    secondaryColor: "#dc2626",
    badgeUrl: "https://assets.footylogos.com/logos/fortaleza/fortaleza-logo-footylogos.svg",
    keywords: ["fortaleza", "leão", "tricolor do pici", "castelão", "vojvoda", "lucero"],
  },
  {
    id: "athletico-pr",
    name: "Athletico-PR",
    shortName: "Athletico-PR",
    code: "CAP",
    popularRank: 15,
    primaryColor: "#dc2626",
    secondaryColor: "#000000",
    badgeUrl: "https://assets.footylogos.com/logos/athletico-paranaense/athletico-paranaense-logo-footylogos.svg",
    keywords: ["athletico-pr", "furacão", "ligga arena", "rubro-negro"],
  },
  {
    id: "vitoria",
    name: "Vitória",
    shortName: "Vitória",
    code: "VIT",
    popularRank: 16,
    primaryColor: "#dc2626",
    secondaryColor: "#000000",
    badgeUrl: "https://assets.footylogos.com/logos/vitoria/vitoria-logo-footylogos.svg",
    keywords: ["vitória", "vitoria", "leão da barra", "barradão", "rubro-negro baiano"],
  },
  {
    id: "red-bull-bragantino",
    name: "Red Bull Bragantino",
    shortName: "Bragantino",
    code: "RBB",
    popularRank: 17,
    primaryColor: "#dc2626",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/rb-bragantino/rb-bragantino-logo-footylogos.svg",
    keywords: ["bragantino", "red bull", "massa bruta", "nabi abi chedid"],
  },
  // CLUBES DE GOIÁS
  {
    id: "goias",
    name: "Goiás E.C.",
    shortName: "Goiás",
    code: "GOI",
    popularRank: 18,
    primaryColor: "#047857",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/goias/goias-logo-footylogos.svg",
    keywords: ["goiás", "goias", "esmeraldino", "verdão da serra", "haile pinheiro", "serrinha"],
  },
  {
    id: "vila-nova",
    name: "Vila Nova F.C.",
    shortName: "Vila Nova",
    code: "VIL",
    popularRank: 19,
    primaryColor: "#dc2626",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/vila-nova/vila-nova-logo-footylogos.svg",
    keywords: ["vila nova", "tigre", "colorado", "oba", "onésio brasileiro alvarenga"],
  },
  {
    id: "atletico-go",
    name: "Atlético Goianiense",
    shortName: "Atlético-GO",
    code: "ACG",
    popularRank: 20,
    primaryColor: "#dc2626",
    secondaryColor: "#000000",
    badgeUrl: "https://assets.footylogos.com/logos/atletico-goianiense/atletico-goianiense-logo-footylogos.svg",
    keywords: ["atlético-go", "atletico-go", "dragão", "antônio accioly", "rubro-negro goiano"],
  },
  {
    id: "coritiba",
    name: "Coritiba",
    shortName: "Coritiba",
    code: "CFC",
    popularRank: 21,
    primaryColor: "#047857",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/coritiba/coritiba-logo-footylogos.svg",
    keywords: ["coritiba", "coxa", "couto pereira"],
  },
  {
    id: "mirassol",
    name: "Mirassol",
    shortName: "Mirassol",
    code: "MIR",
    popularRank: 22,
    primaryColor: "#eab308",
    secondaryColor: "#047857",
    badgeUrl: "https://assets.footylogos.com/logos/mirassol-fc/mirassol-fc-logo-footylogos.svg",
    keywords: ["mirassol", "leão da alta araraquarense", "maião"],
  },
  {
    id: "chapecoense",
    name: "Chapecoense",
    shortName: "Chapecoense",
    code: "CHA",
    popularRank: 23,
    primaryColor: "#047857",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/chapecoense/chapecoense-logo-footylogos.svg",
    keywords: ["chapecoense", "chape", "arena condá"],
  },
  {
    id: "remo",
    name: "Remo",
    shortName: "Remo",
    code: "REM",
    popularRank: 24,
    primaryColor: "#1e3a8a",
    secondaryColor: "#ffffff",
    badgeUrl: "https://assets.footylogos.com/logos/club-de-remo/club-de-remo-logo-footylogos.svg",
    keywords: ["remo", "leão azul", "baenão", "mangueirão"],
  },
];

// Classificação Brasileirão Série A (reproduzindo exatamente o campeonato da imagem enviada pelo usuário)
export const BRASILEIRAO_STANDINGS: StandingRow[] = [
  { position: 1, teamCode: "FLA", teamName: "Flamengo", points: 60, played: 28, won: 18, drawn: 6, lost: 4, goalsFor: 55, goalsAgainst: 23, goalDiff: 32, percentage: 71, recentForm: ["W", "W", "W", "W", "W"] },
  { position: 2, teamCode: "PAL", teamName: "Palmeiras", points: 57, played: 28, won: 16, drawn: 9, lost: 3, goalsFor: 47, goalsAgainst: 21, goalDiff: 26, percentage: 68, recentForm: ["W", "W", "D", "W", "W"] },
  { position: 3, teamCode: "CAP", teamName: "Athletico-PR", points: 49, played: 28, won: 14, drawn: 7, lost: 7, goalsFor: 43, goalsAgainst: 32, goalDiff: 11, percentage: 58, recentForm: ["L", "W", "W", "W", "W"] },
  { position: 4, teamCode: "FLU", teamName: "Fluminense", points: 48, played: 28, won: 13, drawn: 9, lost: 6, goalsFor: 44, goalsAgainst: 36, goalDiff: 8, percentage: 57, recentForm: ["W", "W", "W", "D", "W"] },
  { position: 5, teamCode: "BAH", teamName: "Bahia", points: 46, played: 28, won: 12, drawn: 10, lost: 6, goalsFor: 43, goalsAgainst: 35, goalDiff: 8, percentage: 55, recentForm: ["W", "D", "W", "W", "W"] },
  { position: 6, teamCode: "CRU", teamName: "Cruzeiro", points: 45, played: 28, won: 13, drawn: 6, lost: 9, goalsFor: 42, goalsAgainst: 40, goalDiff: 2, percentage: 54, recentForm: ["W", "L", "W", "W", "W"] },
  { position: 7, teamCode: "CAM", teamName: "Atlético-MG", points: 40, played: 27, won: 11, drawn: 7, lost: 9, goalsFor: 36, goalsAgainst: 32, goalDiff: 4, percentage: 49, recentForm: ["W", "W", "D", "W", "W"] },
  { position: 8, teamCode: "SAN", teamName: "Santos", points: 38, played: 27, won: 10, drawn: 8, lost: 9, goalsFor: 41, goalsAgainst: 40, goalDiff: 1, percentage: 47, recentForm: ["D", "W", "W", "W", "L"] },
  { position: 9, teamCode: "CFC", teamName: "Coritiba", points: 38, played: 28, won: 10, drawn: 8, lost: 10, goalsFor: 37, goalsAgainst: 43, goalDiff: -6, percentage: 45, recentForm: ["W", "W", "W", "W", "L"] },
  { position: 10, teamCode: "RBB", teamName: "Bragantino", points: 36, played: 27, won: 10, drawn: 6, lost: 11, goalsFor: 33, goalsAgainst: 31, goalDiff: 2, percentage: 44, recentForm: ["W", "L", "L", "W", "W"] },
  { position: 11, teamCode: "SAO", teamName: "São Paulo", points: 36, played: 27, won: 10, drawn: 6, lost: 11, goalsFor: 32, goalsAgainst: 30, goalDiff: 2, percentage: 44, recentForm: ["L", "W", "W", "L", "W"] },
  { position: 12, teamCode: "BOT", teamName: "Botafogo", points: 35, played: 28, won: 9, drawn: 8, lost: 11, goalsFor: 41, goalsAgainst: 45, goalDiff: -4, percentage: 42, recentForm: ["W", "W", "L", "L", "W"] },
  { position: 13, teamCode: "VIT", teamName: "Vitória", points: 33, played: 28, won: 9, drawn: 6, lost: 13, goalsFor: 28, goalsAgainst: 42, goalDiff: -14, percentage: 39, recentForm: ["W", "L", "L", "W", "L"] },
  { position: 14, teamCode: "COR", teamName: "Corinthians", points: 32, played: 28, won: 8, drawn: 8, lost: 12, goalsFor: 29, goalsAgainst: 32, goalDiff: -3, percentage: 38, recentForm: ["L", "L", "L", "L", "W"] },
  { position: 15, teamCode: "MIR", teamName: "Mirassol", points: 32, played: 28, won: 8, drawn: 8, lost: 12, goalsFor: 33, goalsAgainst: 42, goalDiff: -9, percentage: 38, recentForm: ["W", "L", "W", "W", "W"] },
  { position: 16, teamCode: "VAS", teamName: "Vasco da Gama", points: 31, played: 27, won: 8, drawn: 7, lost: 12, goalsFor: 34, goalsAgainst: 41, goalDiff: -7, percentage: 38, recentForm: ["W", "L", "L", "L", "L"] },
  { position: 17, teamCode: "GRE", teamName: "Grêmio", points: 29, played: 28, won: 7, drawn: 8, lost: 13, goalsFor: 30, goalsAgainst: 38, goalDiff: -8, percentage: 35, recentForm: ["D", "D", "W", "L", "L"] },
  { position: 18, teamCode: "INT", teamName: "Internacional", points: 28, played: 28, won: 6, drawn: 10, lost: 12, goalsFor: 30, goalsAgainst: 36, goalDiff: -6, percentage: 33, recentForm: ["L", "L", "L", "D", "L"] },
  { position: 19, teamCode: "REM", teamName: "Remo", points: 23, played: 28, won: 5, drawn: 8, lost: 15, goalsFor: 32, goalsAgainst: 47, goalDiff: -15, percentage: 27, recentForm: ["L", "L", "L", "L", "L"] },
  { position: 20, teamCode: "CHA", teamName: "Chapecoense", points: 18, played: 27, won: 3, drawn: 9, lost: 15, goalsFor: 29, goalsAgainst: 53, goalDiff: -24, percentage: 22, recentForm: ["D", "L", "L", "L", "L"] },
];

// Jogos da rodada (26ª Rodada, conforme a Imagem 2 do usuário)
export const ROUND_FIXTURES: MatchFixture[] = [
  { id: "m1", round: 26, dateStr: "SÁB, 19/09", timeStr: "16:00", stadium: "Arena MRV", homeTeamCode: "CAM", awayTeamCode: "CHA", homeScore: 1, awayScore: 1, status: "finished" },
  { id: "m2", round: 26, dateStr: "SÁB, 19/09", timeStr: "17:00", stadium: "Campos Maia", homeTeamCode: "MIR", awayTeamCode: "BOT", homeScore: 2, awayScore: 0, status: "finished" },
  { id: "m3", round: 26, dateStr: "SÁB, 19/09", timeStr: "18:30", stadium: "Mangueirão", homeTeamCode: "REM", awayTeamCode: "SAN", homeScore: 1, awayScore: 2, status: "finished" },
  { id: "m4", round: 26, dateStr: "SÁB, 19/09", timeStr: "20:30", stadium: "São Januário", homeTeamCode: "VAS", awayTeamCode: "CFC", homeScore: 5, awayScore: 0, status: "finished" },
  { id: "m5", round: 26, dateStr: "SÁB, 19/09", timeStr: "21:00", stadium: "Morumbi", homeTeamCode: "SAO", awayTeamCode: "INT", homeScore: 1, awayScore: 0, status: "finished" },
  { id: "m6", round: 26, dateStr: "DOM, 20/09", timeStr: "11:00", stadium: "Arena do Grêmio", homeTeamCode: "GRE", awayTeamCode: "PAL", homeScore: 0, awayScore: 0, status: "finished" },
  { id: "m7", round: 26, dateStr: "DOM, 20/09", timeStr: "16:00", stadium: "Barradão", homeTeamCode: "VIT", awayTeamCode: "CRU", homeScore: 1, awayScore: 3, status: "finished" },
  { id: "m8", round: 26, dateStr: "DOM, 20/09", timeStr: "16:00", stadium: "Neo Química Arena", homeTeamCode: "COR", awayTeamCode: "FLU", homeScore: 1, awayScore: 3, status: "finished" },
  { id: "m9", round: 26, dateStr: "DOM, 20/09", timeStr: "18:30", stadium: "Maracanã", homeTeamCode: "FLA", awayTeamCode: "RBB", homeScore: 2, awayScore: 1, status: "finished" },
  { id: "m10", round: 26, dateStr: "DOM, 20/09", timeStr: "19:30", stadium: "Arena da Baixada", homeTeamCode: "CAP", awayTeamCode: "BAH", homeScore: 2, awayScore: 1, status: "finished" },
];
