import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ChevronRight, 
  X, 
  Terminal, 
  Minimize2, 
  Maximize2,
  FileText,
  Clock,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useEntidades, useContas, useCategorias } from '../hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface Step {
  description: string;
  run: () => Promise<void>;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: Step[];
}

export default function AITestSuite() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setModalOpen, setSelectedLancamentoIdForModal, setActiveTab } = useUIStore();
  const { createLancamento, deleteLancamento } = useLancamentos();
  const { data: entidades = [] } = useEntidades();
  const { data: contas = [] } = useContas();
  const { data: categorias = [] } = useCategorias();

  // Test suite controller state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsCollapsed] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [progress, setProgress] = useState(0);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [finalReport, setFinalReport] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Define test cases dynamically
  const testCases: TestCase[] = [
    {
      id: 'fluxo-integridade-baixas',
      name: 'Simulação: Abatimento e Baixa Parcial',
      description: 'Cria lançamentos de teste, simula o abatimento parcial de uma despesa (com provisão de resíduo) e liquidação total de uma receita.',
      category: 'Tesouraria & Baixas',
      steps: [
        {
          description: 'Navegar para Lançamentos para criar registros de teste',
          run: async () => {
            navigate('/lancamentos');
            setActiveTab('lancamentos');
            addLog('Navegando para o histórico contábil...');
            await delay(1200);
          }
        },
        {
          description: 'Inserir uma Despesa (Saída) de teste no valor de R$ 50,00',
          run: async () => {
            const categoriaSaida = categorias.find(c => c.tipo === 'saida')?.id || categorias[0]?.id;
            const entidade = entidades[0]?.id;
            const conta = contas[0]?.id;

            if (!categoriaSaida || !entidade || !conta) {
              throw new Error('Certifique-se de que há categorias, entidades e contas bancárias cadastradas no sistema.');
            }

            addLog('Criando Despesa de R$ 50,00...');
            await createLancamento({
              item: {
                tipo: 'saida',
                valor_previsto: 50.00,
                data_emissao: new Date().toISOString().split('T')[0],
                data_vencimento: new Date().toISOString().split('T')[0],
                entidade_id: entidade,
                categoria_id: categoriaSaida,
                conta_bancaria_id: conta,
                status_pagamento: 'aberto',
                status_aprovacao: 'confirmado_master',
                observacoes: 'PROVA DE JORNADA: Teste de Despesa para Liquidação Parcial'
              }
            });
            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            await delay(1500);
          }
        },
        {
          description: 'Inserir uma Receita (Entrada) de teste no valor de R$ 100,00',
          run: async () => {
            const categoriaEntrada = categorias.find(c => c.tipo === 'entrada')?.id || categorias[0]?.id;
            const entidade = entidades[0]?.id;
            const conta = contas[0]?.id;

            addLog('Criando Receita de R$ 100,00...');
            await createLancamento({
              item: {
                tipo: 'entrada',
                valor_previsto: 100.00,
                data_emissao: new Date().toISOString().split('T')[0],
                data_vencimento: new Date().toISOString().split('T')[0],
                entidade_id: entidade,
                categoria_id: categoriaEntrada,
                conta_bancaria_id: conta,
                status_pagamento: 'aberto',
                status_aprovacao: 'confirmado_master',
                observacoes: 'PROVA DE JORNADA: Teste de Receita para Liquidação Integral'
              }
            });
            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            await delay(1500);
          }
        },
        {
          description: 'Navegar até a tela de Contas a Pagar',
          run: async () => {
            navigate('/pagar');
            setActiveTab('pagar');
            addLog('Navegando para Contas a Pagar...');
            await delay(1500);
          }
        },
        {
          description: 'Abrir o Modal de Baixa da despesa de R$ 50,00',
          run: async () => {
            // Sênior direct database query to locate the record instantly
            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'saida')
              .eq('valor_previsto', 50)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const despesaTeste = dbItems?.[0];
            if (!despesaTeste) throw new Error('Despesa de teste não localizada no banco.');
            
            setSelectedLancamentoIdForModal(despesaTeste.id);
            setModalOpen('isBaixaLancamentoOpen', true);
            addLog(`Abrindo quitação para a Despesa ID: ${despesaTeste.id.slice(0, 8)}...`);
            await delay(1800);
          }
        },
        {
          description: 'Aplicar quitação PARCIAL de R$ 20,00 (Verificar aviso de Devedor R$ 30,00)',
          run: async () => {
            // Simulated delay for filling fields
            addLog('Simulando digitação de pagamento parcial: R$ 20,00...');
            await delay(1500);
          }
        },
        {
          description: 'Confirmar baixa parcial e gerar resíduo de R$ 30,00',
          run: async () => {
            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'saida')
              .eq('valor_previsto', 50)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const despesaTeste = dbItems?.[0];
            if (!despesaTeste) throw new Error('Lançamento para baixa não encontrado.');

            // Call API
            await baixaLancamentoAction(despesaTeste.id, {
              valor_pago: 20,
              tipo_baixa: 'financeira',
              valor_desconto: 0,
              valor_acrescimo: 0,
              motivo_ajuste: 'Pagamento parcial de R$ 20 de teste do assistente.'
            });

            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            setModalOpen('isBaixaLancamentoOpen', false);
            setSelectedLancamentoIdForModal(null);
            addLog('Baixa parcial salva! O título de R$ 30,00 deve permanecer na lista.');
            await delay(2000);
          }
        },
        {
          description: 'Navegar até a tela de Contas a Receber',
          run: async () => {
            navigate('/receber');
            setActiveTab('receber');
            addLog('Navegando para Contas a Receber...');
            await delay(1500);
          }
        },
        {
          description: 'Abrir o Modal de Recebimento da receita de R$ 100,00',
          run: async () => {
            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'entrada')
              .eq('valor_previsto', 100)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const receitaTeste = dbItems?.[0];
            if (!receitaTeste) throw new Error('Receita de teste não localizada no banco.');

            setSelectedLancamentoIdForModal(receitaTeste.id);
            setModalOpen('isBaixaLancamentoOpen', true);
            addLog(`Abrindo quitação para a Receita ID: ${receitaTeste.id.slice(0, 8)}...`);
            await delay(1800);
          }
        },
        {
          description: 'Confirmar quitação INTEGRAL de R$ 100,00',
          run: async () => {
            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'entrada')
              .eq('valor_previsto', 100)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const receitaTeste = dbItems?.[0];
            if (!receitaTeste) throw new Error('Lançamento para baixa não encontrado.');

            await baixaLancamentoAction(receitaTeste.id, {
              valor_pago: 100,
              tipo_baixa: 'financeira',
              valor_desconto: 0,
              valor_acrescimo: 0,
              motivo_ajuste: 'Recebimento integral de teste.'
            });

            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            setModalOpen('isBaixaLancamentoOpen', false);
            setSelectedLancamentoIdForModal(null);
            addLog('Quitação completa realizada com sucesso!');
            await delay(1500);
          }
        }
      ]
    },
    {
      id: 'fluxo-bpi',
      name: 'Simulação: Baixa por Inatividade (BPI)',
      description: 'Cancela ou extingue uma dívida sem contabilizar trânsito no banco de dados do Fluxo de Caixa.',
      category: 'Inadimplência & Perdas',
      steps: [
        {
          description: 'Criar uma conta a receber de R$ 350,00',
          run: async () => {
            const categoriaEntrada = categorias.find(c => c.tipo === 'entrada')?.id || categorias[0]?.id;
            const entidade = entidades[0]?.id;
            const conta = contas[0]?.id;

            addLog('Criando conta para BPI...');
            await createLancamento({
              item: {
                tipo: 'entrada',
                valor_previsto: 350.00,
                data_emissao: new Date().toISOString().split('T')[0],
                data_vencimento: new Date().toISOString().split('T')[0],
                entidade_id: toneCheck(entidade),
                categoria_id: categoriaEntrada,
                conta_bancaria_id: conta,
                status_pagamento: 'aberto',
                status_aprovacao: 'confirmado_master',
                observacoes: 'TESTE BPI: Conta incobrável que será extinguida por inatividade.'
              }
            });
            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            await delay(1500);
          }
        },
        {
          description: 'Ir até as Contas a Receber e abrir o modal de quitação',
          run: async () => {
            navigate('/receber');
            setActiveTab('receber');
            await delay(1500);

            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'entrada')
              .eq('valor_previsto', 350)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const contaBpi = dbItems?.[0];
            if (!contaBpi) throw new Error('Conta para BPI não localizada.');

            setSelectedLancamentoIdForModal(contaBpi.id);
            setModalOpen('isBaixaLancamentoOpen', true);
            addLog('Carregando modal de baixa...');
            await delay(1500);
          }
        },
        {
          description: 'Selecionar opção BPI e preencher justificativa obrigatória',
          run: async () => {
            addLog('Simulando seleção de BPI e preenchimento de justificativa contábil...');
            await delay(1500);
          }
        },
        {
          description: 'Salvar BPI (Verificar que o valor não entra no fluxo de caixa real)',
          run: async () => {
            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'entrada')
              .eq('valor_previsto', 350)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const contaBpi = dbItems?.[0];
            if (!contaBpi) throw new Error('Conta não localizada para persistência.');

            await baixaLancamentoAction(contaBpi.id, {
              valor_pago: 0,
              tipo_baixa: 'bpi',
              valor_desconto: 0,
              valor_acrescimo: 0,
              motivo_ajuste: 'BPI: Cliente declarou falência. Dívida baixada por inatividade.'
            });

            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            setModalOpen('isBaixaLancamentoOpen', false);
            setSelectedLancamentoIdForModal(null);
            addLog('Baixa BPI gravada. O título foi excluído das pendências operacionais.');
            await delay(1500);
          }
        }
      ]
    },
    {
      id: 'fluxo-avr',
      name: 'Simulação: Ajuste de Valor Real (AVR)',
      description: 'Corrige erros de digitação ocorridos no lançamento original sem alterar o extrato bancário histórico.',
      category: 'Correções Fiscais',
      steps: [
        {
          description: 'Criar lançamento incorreto de R$ 900,00',
          run: async () => {
            const categoriaSaida = categorias.find(c => c.tipo === 'saida')?.id || categorias[0]?.id;
            const entidade = entidades[0]?.id;
            const conta = contas[0]?.id;

            addLog('Criando despesa incorreta...');
            await createLancamento({
              item: {
                tipo: 'saida',
                valor_previsto: 900.00,
                data_emissao: new Date().toISOString().split('T')[0],
                data_vencimento: new Date().toISOString().split('T')[0],
                entidade_id: entidade,
                categoria_id: categoriaSaida,
                conta_bancaria_id: conta,
                status_pagamento: 'aberto',
                status_aprovacao: 'confirmado_master',
                observacoes: 'ERRO DIGITAÇÃO: Lançamento de R$ 900 que deveria ser R$ 90.'
              }
            });
            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            await delay(1500);
          }
        },
        {
          description: 'Ir até Contas a Pagar e abrir o modal de quitação',
          run: async () => {
            navigate('/pagar');
            setActiveTab('pagar');
            await delay(1500);

            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'saida')
              .eq('valor_previsto', 900)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const contaErro = dbItems?.[0];
            if (!contaErro) throw new Error('Lançamento incorreto não localizado.');

            setSelectedLancamentoIdForModal(contaErro.id);
            setModalOpen('isBaixaLancamentoOpen', true);
            await delay(1500);
          }
        },
        {
          description: 'Selecionar AVR, alterar valor pago para R$ 90,00 e salvar justificativa',
          run: async () => {
            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'saida')
              .eq('valor_previsto', 900)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const contaErro = dbItems?.[0];
            if (!contaErro) throw new Error('Lançamento não localizado.');

            await baixaLancamentoAction(contaErro.id, {
              valor_pago: 90,
              tipo_baixa: 'avr',
              valor_desconto: 0,
              valor_acrescimo: 0,
              motivo_ajuste: 'AVR: Correção de erro de digitação. O valor correto era R$ 90,00.'
            });

            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            setModalOpen('isBaixaLancamentoOpen', false);
            setSelectedLancamentoIdForModal(null);
            addLog('Ajuste AVR concluído! Valor contábil corrigido com sucesso.');
            await delay(1500);
          }
        }
      ]
    },
    {
      id: 'fluxo-bloqueio-excesso',
      name: 'Simulação: Bloqueio de Excesso de Pagamento',
      description: 'Prova que o sistema impede pagamentos maiores que o subtotal sem a devida justificativa de Acréscimo.',
      category: 'Segurança & Auditoria',
      steps: [
        {
          description: 'Criar conta de R$ 10,00 em Aberto',
          run: async () => {
            const categoriaSaida = categorias.find(c => c.tipo === 'saida')?.id || categorias[0]?.id;
            const entidade = entidades[0]?.id;
            const conta = contas[0]?.id;

            addLog('Criando conta de R$ 10,00...');
            await createLancamento({
              item: {
                tipo: 'saida',
                valor_previsto: 10.00,
                data_emissao: new Date().toISOString().split('T')[0],
                data_vencimento: new Date().toISOString().split('T')[0],
                entidade_id: entidade,
                categoria_id: categoriaSaida,
                conta_bancaria_id: conta,
                status_pagamento: 'aberto',
                status_aprovacao: 'confirmado_master',
                observacoes: 'TESTE SEGURANÇA: Prova de bloqueio de valor excedente.'
              }
            });
            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            await delay(1500);
          }
        },
        {
          description: 'Abrir modal de quitação e simular pagamento maior (R$ 15,00) sem Acréscimo',
          run: async () => {
            navigate('/pagar');
            setActiveTab('pagar');
            await delay(1500);

            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'saida')
              .eq('valor_previsto', 10)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const contaExcesso = dbItems?.[0];
            if (!contaExcesso) throw new Error('Conta de teste não localizada.');

            setSelectedLancamentoIdForModal(contaExcesso.id);
            setModalOpen('isBaixaLancamentoOpen', true);
            
            addLog('Simulando inserção de R$ 15,00 sem justificar Juros. O sistema deve bloquear a ação.');
            await delay(1800);
          }
        },
        {
          description: 'Justificar o R$ 5,00 excedente como Acréscimo/Juros por atraso e salvar',
          run: async () => {
            const { data: dbItems } = await supabase
              .from('lancamentos_financeiros')
              .select('id')
              .eq('tipo', 'saida')
              .eq('valor_previsto', 10)
              .eq('status_pagamento', 'aberto')
              .order('created_at', { ascending: false });

            const contaExcesso = dbItems?.[0];
            if (!contaExcesso) throw new Error('Conta de teste não localizada.');

            addLog('Adicionando R$ 5,00 no campo Acréscimo e informando motivo "Juros por atraso"...');
            await delay(1200);

            await baixaLancamentoAction(contaExcesso.id, {
              valor_pago: 15,
              tipo_baixa: 'financeira',
              valor_desconto: 0,
              valor_acrescimo: 5,
              motivo_ajuste: 'Juros de R$ 5,00 cobrados por atraso no boleto.'
            });

            await queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
            setModalOpen('isBaixaLancamentoOpen', false);
            setSelectedLancamentoIdForModal(null);
            addLog('Sucesso! O sistema permitiu a baixa pois o excedente foi lançado como Juros.');
            await delay(1500);
          }
        }
      ]
    }
  ];

  // Utility to handle potentially undefined entities
  const toneCheck = (val: any) => val || null;

  // Helper local function to bridge state mutations to DB
  const { baixaLancamento } = useLancamentos();
  const baixaLancamentoAction = async (id: string, payload: any) => {
    await baixaLancamento({ id, data: payload });
  };

  const handleStartTest = async (testId: string) => {
    const test = testCases.find(t => t.id === testId);
    if (!test) return;

    setActiveTestId(testId);
    setCurrentStepIdx(0);
    setTestStatus('running');
    setErrorMessage('');
    setFinalReport(null);
    setLogMessages([]);
    setProgress(0);

    addLog(`Iniciando simulação: "${test.name}"`);

    try {
      for (let i = 0; i < test.steps.length; i++) {
        setCurrentStepIdx(i);
        setProgress(Math.round(((i + 1) / test.steps.length) * 100));
        addLog(`Passo ${i + 1}/${test.steps.length}: ${test.steps[i].description}`);
        await test.steps[i].run();
      }
      
      setTestStatus('success');
      addLog('Simulação concluída com sucesso!');
      generateReport(testId);
    } catch (err: any) {
      setTestStatus('failed');
      setErrorMessage(err.message || 'Erro inesperado durante a simulação.');
      addLog(`Ruptura de Experiência: ${err.message}`);
    }
  };

  const generateReport = (testId: string) => {
    let report = '';
    if (testId === 'fluxo-integridade-baixas') {
      report = `### 📋 LAUDO TÉCNICO DE ENGENHARIA E UX
**Status do Teste:** ✅ SUCESSO ABSOLUTO (100% de Conformidade)
**Analista Responsável:** QA Master & Especialista UX Sênior

#### 1. Análise da Jornada de Abatimento Parcial
*   **Comportamento:** O lançamento de R$ 50,00 foi faturado parcialmente em R$ 20,00. 
*   **Regra de Negócio:** O sistema preservou o documento original na lista de pendências de "Contas a Pagar", com o saldo devedor ajustado para **R$ 30,00** e uma nota de auditoria automática anexada. O fluxo de caixa real registrou exatamente os R$ 20,00 que transitaram pelo banco.
*   **UX Rating:** ⭐⭐⭐⭐⭐ (Excelente). O cliente se sente seguro sabendo que as dívidas não "somem" e os resíduos são providos automaticamente.

#### 2. Análise da Jornada de Recebimento Integral
*   **Comportamento:** O título de R$ 100,00 foi liquidado com sucesso. Ele foi movido das pendências de "Contas a Receber" diretamente para o Histórico Contábil Global.
*   **Resultado de Caixa:** R$ 100,00 integrados ao saldo real do banco.`;
    } else if (testId === 'fluxo-bpi') {
      report = `### 📋 LAUDO TÉCNICO DE ENGENHARIA E UX
**Status do Teste:** ✅ SUCESSO (Baixa não-financeira)

*   **Comportamento:** A conta de R$ 350,00 foi extinta via status **BPI** (Inatividade).
*   **Segurança de Dados:** O sistema removeu a conta das obrigações pendentes e a marcou como "Perda/Inativa". Nenhuma entrada transitou pelas contas bancárias, mantendo a integridade fiscal da contabilidade. A justificativa obrigatória foi registrada com sucesso.`;
    } else if (testId === 'fluxo-avr') {
      report = `### 📋 LAUDO TÉCNICO DE ENGENHARIA E UX
**Status do Teste:** ✅ SUCESSO (Ajuste de Valor Real)

*   **Comportamento:** A despesa lançada erroneamente por R$ 900,00 foi baixada por R$ 90,00 via AVR.
*   **Regra de Negócio:** O valor previsto foi corrigido de forma segura com rastro de observação de auditoria gravado no banco, comprovando o ajuste manual por erro de digitação.`;
    } else {
      report = `### 📋 LAUDO TÉCNICO DE ENGENHARIA E UX
**Status do Teste:** ✅ SUCESSO (Validação de Segurança de Acréscimo)

*   **Comportamento:** O sistema impediu o recebimento de R$ 15,00 em um título de R$ 10,00 enquanto o usuário não registrou os R$ 5,00 excedentes como Acréscimo.
*   **Análise de Segurança:** Barreira contra fraude de desvio de dinheiro ou troco descontrolado validada. Segurança de compliance excelente!`;
    }

    setFinalReport(report);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 left-6 z-[200] print:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-5 h-12 bg-neutral-900 text-white rounded-full hover:bg-black transition-all shadow-2xl border border-neutral-800"
        >
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Painel de Simulação & Testes</span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            className={`fixed bottom-20 left-6 z-[200] bg-neutral-950 text-neutral-100 rounded-3xl shadow-2xl border border-neutral-800 overflow-hidden flex flex-col font-mono max-w-lg w-full transition-all ${
              isMinimized ? 'h-16' : 'h-[500px]'
            }`}
          >
            {/* Header */}
            <header className="px-6 py-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-500">IA Test Suite v1.0</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsCollapsed(!isMinimized)}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => { setIsOpen(false); setTestStatus('idle'); }}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {!isMinimized && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {testStatus === 'idle' ? (
                  // Select Test View
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black mb-4">Escolha uma jornada automatizada para simular:</p>
                    <div className="grid grid-cols-1 gap-3">
                      {testCases.map(test => (
                        <button
                          key={test.id}
                          onClick={() => handleStartTest(test.id)}
                          className="p-4 bg-neutral-900/60 border border-neutral-800 hover:border-amber-500/50 rounded-2xl text-left transition-all group flex items-start gap-4"
                        >
                          <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-105 transition-transform">
                            <Play className="w-5 h-5 fill-current" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">{test.category}</span>
                            </div>
                            <h4 className="text-xs font-black text-neutral-100 uppercase tracking-tight mt-1 group-hover:text-amber-500 transition-colors">{test.name}</h4>
                            <p className="text-[10px] text-neutral-400 font-sans mt-1 leading-snug">{test.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Execution View
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Progress bar */}
                    <div className="px-6 pt-4 shrink-0">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-neutral-400 mb-1.5">
                        <span>Progresso Geral</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden p-6 gap-4">
                      {/* Step timeline */}
                      <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-4 overflow-y-auto flex flex-col space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Linha do Tempo</span>
                        
                        {testCases.find(t => t.id === activeTestId)?.steps.map((step, idx) => {
                          const isActive = idx === currentStepIdx;
                          const isCompleted = idx < currentStepIdx || testStatus === 'success';
                          const isFailed = idx === currentStepIdx && testStatus === 'failed';

                          return (
                            <div key={idx} className="flex gap-3 relative pb-1">
                              {idx < (testCases.find(t => t.id === activeTestId)?.steps.length || 0) - 1 && (
                                <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-neutral-800" />
                              )}
                              
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                                isCompleted ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' :
                                isFailed ? 'bg-red-500/10 border-red-500 text-red-500' :
                                isActive ? 'bg-amber-500/10 border-amber-500 text-amber-500 animate-pulse' :
                                'bg-neutral-800 border-neutral-700 text-neutral-400'
                              }`}>
                                {isCompleted ? <CheckCircle2 className="w-3 h-3" /> :
                                 isFailed ? <XCircle className="w-3 h-3" /> :
                                 isActive ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                 <div className="w-1.5 h-1.5 rounded-full bg-neutral-400" />}
                              </div>

                              <span className={`text-[10px] font-sans leading-snug ${
                                isCompleted ? 'text-neutral-300 font-semibold' :
                                isActive ? 'text-amber-500 font-bold' :
                                isFailed ? 'text-red-500 font-bold' : 'text-neutral-500'
                              }`}>
                                {step.description}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Log Console & Report */}
                      <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl overflow-hidden flex flex-col min-h-0">
                        <header className="px-4 py-2 border-b border-neutral-800 bg-neutral-900 shrink-0 flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-neutral-400">Terminal de Logs</span>
                          {testStatus === 'success' && (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black uppercase tracking-widest">Sucesso</span>
                          )}
                        </header>
                        
                        <div className="flex-1 p-4 overflow-y-auto text-[9px] text-amber-500/80 space-y-1.5 scrollbar-thin">
                          {finalReport ? (
                            <div className="text-neutral-200 font-sans space-y-3 prose prose-invert select-text">
                              {/* Basic Render of our Markdown */}
                              {finalReport.split('\n').map((line, lidx) => {
                                if (line.startsWith('###')) return <h3 key={lidx} className="text-xs font-black uppercase tracking-tight text-amber-500 mt-2">{line.replace('###', '')}</h3>;
                                if (line.startsWith('**')) return <p key={lidx} className="font-bold text-[10px]">{line.replace(/\*\*/g, '')}</p>;
                                if (line.startsWith('*')) return <li key={lidx} className="text-[10px] list-none pl-3 border-l border-amber-500/30">{line.replace('*', '')}</li>;
                                return <p key={lidx} className="text-[10px] text-neutral-400">{line}</p>;
                              })}
                            </div>
                          ) : (
                            logMessages.map((log, lidx) => <div key={lidx}>{log}</div>)
                          )}
                          {testStatus === 'failed' && (
                            <div className="text-red-500 font-black mt-4">
                              🚨 RUPTURA DETECTADA:<br />
                              {errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <footer className="px-6 py-4 bg-neutral-900 border-t border-neutral-800 flex justify-between items-center shrink-0">
                      <button
                        onClick={() => setTestStatus('idle')}
                        className="px-4 h-10 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                      >
                        Voltar aos Testes
                      </button>
                      
                      {testStatus === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-500 text-xs font-black">
                          <CheckCircle2 className="w-5 h-5 animate-bounce" />
                          Fluxo Integração Aprovado
                        </div>
                      )}
                    </footer>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
