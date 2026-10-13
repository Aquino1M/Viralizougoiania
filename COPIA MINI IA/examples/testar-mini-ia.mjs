import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMiniEditBrain, planVideoEdit } from '../pipeline/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contextDir = path.resolve(__dirname, '..', 'context');

console.log('================================================================');
console.log('  TESTE DO CEREBRO E MEMORIAL ATUAL DA MINI IA');
console.log('================================================================\n');

try {
  const { brain } = readMiniEditBrain(contextDir);

  console.log(`[Versao do Motor]  : ${brain.version || 'mini-edit-ai'}`);
  console.log(`[Total Experiencias]: ${brain.totalExperiences || 0}`);
  console.log(`[Edicoes Locais Validas]: ${brain.successfulLocal || 0}`);
  console.log(`[Professores Real IA]   : ${brain.realTeacher || 0}`);
  console.log(`[Licoes Unicas Consolidadas]: ${brain.uniqueEligibleLearning || 0}`);
  console.log(`[Falhas Catalogadas]    : ${brain.failed || 0}`);

  if (brain.learningModel) {
    console.log(`\n[Modelo Consolidado v${brain.learningModel.version}]:`);
    console.log(`  - Linhas de treino: ${brain.learningModel.uniqueEligibleRows}`);
    console.log(`  - Media de qualidade: ${brain.learningModel.quality?.professionalScoreAvg}/100`);
    console.log(`  - Perfil Viral Presets:`, Object.keys(brain.learningModel.profiles?.presets || {}));
  }

  console.log('\n--- Testando Geracao de Plano com Memoria Ativa ---');
  const plano = planVideoEdit({
    transcriptText: 'Esse negócio começou do zero e hoje fatura milhões. O segredo foi focar no produto e não desistir.',
    duration: 35,
    title: 'O SEGREDO DO FATURAMENTO',
    preset: 'viral',
    contextDir
  });

  console.log(`Plano gerado com sucesso!`);
  console.log(`- Duracao: ${plano.duration}s`);
  console.log(`- Zooms calculados: ${plano.zooms?.length || 0}`);
  console.log(`- Cenas semanticas: ${plano.scenes?.length || 0}`);
  console.log(`- Transicoes calculadas: ${plano.transitions?.length || 0}`);
  console.log(`- Reacoes calculadas: ${plano.reactions?.length || 0}`);
  console.log(`- Beats calmos (quiet beats): ${plano.mini_edit_ai?.quietBeats || 0}`);
  console.log(`- Confianca do Cerebro: ${plano.mini_edit_ai?.experienceBrain?.confidence}`);

  console.log('\n================================================================');
  console.log('  [SUCESSO] O cerebro da Mini IA esta 100% ativo e funcional!');
  console.log('================================================================\n');
} catch (err) {
  console.error('[ERRO NO TESTE]:', err.message);
  process.exit(1);
}
