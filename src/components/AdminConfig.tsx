import React, { useState } from 'react';
import { BarberSettings } from '../types';
import { dbStore } from '../dbStore';
import { Settings, HelpCircle, Shield, RotateCcw, AlertTriangle, Cloud, CloudOff, Save, Check } from 'lucide-react';
import { isFirebaseEnabled } from '../firebase';

interface ConfigProps {
  settings: BarberSettings;
  onUpdateSettings: (settings: BarberSettings) => Promise<void>;
}

export default function AdminConfig({ settings, onUpdateSettings }: ConfigProps) {
  const [formData, setFormData] = useState<BarberSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDemo = () => {
    if (confirm("Isto irá restaurar os dados iniciais do banco local para demonstração (Zera agendamentos, lançamentos financeiros e estatísticas para os presets originais). Continuar?")) {
      dbStore.resetToDemo();
    }
  };

  return (
    <div className="space-y-6 font-sans text-zinc-200" id="admin-config-container">
      {/* HEADER CONFIGURAÇÕES */}
      <div className="bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl flex items-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <Settings className="h-6 w-6 text-amber-500" />
        <div>
          <h2 className="text-xl font-display font-semibold text-white">Configurações e Perfil da Barbearia</h2>
          <p className="text-xs text-zinc-400 mt-1">Configure o perfil público da sua barbearia, defina expediente oficial de atendimento e gerencie a base de dados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="config-layout">
        <form onSubmit={handleSubmit} className="bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl space-y-4 font-sans">
          <h4 className="text-sm font-semibold text-white border-b border-white/5 pb-3 font-display">Informações de Perfil</h4>
          
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 block font-medium">Nome da Barbearia *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 block font-medium">Telefone/WhatsApp de Contato *</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 block font-medium">Endereço Físico Completo *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <h4 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3 pt-3">Horário de Funcionamento Comercial</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 font-sans">
              <label className="text-xs text-zinc-400 block font-medium">Hora de Abertura (Expediente) *</label>
              <input
                type="text"
                required
                placeholder="08:00"
                value={formData.startHour}
                onChange={(e) => setFormData({ ...formData, startHour: e.target.value })}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono"
              />
            </div>

            <div className="space-y-1 font-sans">
              <label className="text-xs text-zinc-400 block font-medium">Hora de Fechamento (Fim) *</label>
              <input
                type="text"
                required
                placeholder="20:00"
                value={formData.endHour}
                onChange={(e) => setFormData({ ...formData, endHour: e.target.value })}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-zinc-850 justify-between items-center">
            {isSaved ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="h-4 w-4" /> Alterações salvas com sucesso!
              </span>
            ) : <span className="text-xs text-zinc-500">Última alteração: Recente</span>}

            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Save className="h-4 w-4" /> Salvar Configurações
            </button>
          </div>
        </form>

        <div className="space-y-6">
          {/* PAINEL DE CONEXÃO DO BANCO DE DADOS */}
          <div className="bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl space-y-4" id="db-status-panel">
            <h4 className="text-sm font-display font-semibold text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" /> Rede e Banco de Dados (Cloud-Native)
            </h4>

            {isFirebaseEnabled ? (
              <div className="flex items-start gap-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10" id="db-active-box">
                <Cloud className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <h5 className="text-xs text-emerald-400 font-bold">Firestore Conectado e Ativo</h5>
                  <p className="text-[11px] text-zinc-400 mt-1">Seu sistema está sincronizando todas as informações na nuvem em tempo real (autenticações, clientes, faturamentos, agendamentos).</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10" id="db-inactive-box">
                <CloudOff className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-xs text-amber-400 font-bold">Modo Local Inteligente</h5>
                  <p className="text-[11px] text-zinc-400 mt-1">Banco de dados Cloud inativo. O SaaS está executando em Sandbox Local via localStorage (todos os dados persistem em seu navegador e são criados sob demanda com presets completos para teste).</p>
                </div>
              </div>
            )}

            <div className="text-[11px] text-zinc-500 leading-relaxed font-sans flex gap-2">
              <HelpCircle className="h-4 w-4 text-zinc-650 flex-shrink-0" />
              <span>Para ativar o banco na nuvem Firebase permanentemente, finalize a criação do banco de dados clicando no menu Firebase Config na barra do AI Studio. Nosso código se encarregará de sincronizar de forma nativa assim que as credenciais estiverem detectadas no arquivo correspondente.</span>
            </div>
          </div>

          {/* PAINEL REGENERAR DEMO */}
          <div className="bg-[#121212] border border-red-500/10 p-6 rounded-3xl shadow-xl space-y-4" id="demo-clean-panel">
            <h4 className="text-sm font-display font-semibold text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 animate-bounce" /> Ambiente de Teste / Reset
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">Se você preencher muitos horários falsos ou bagunçar os caixas financeiros durante a avaliação, utilize o botão abaixo para limpar as tabelas e reinserir instâncias pré-montadas de agendamentos fictícios, clientes com histórico e tabelas de faturamento limpas.</p>
            
            <button
              onClick={handleResetDemo}
              className="w-full bg-red-500/10 hover:bg-red-500 border border-red-500/15 hover:border-red-600 text-red-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 animate-spin-slow" /> Restaurar Banco com Dados de Demonstração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
