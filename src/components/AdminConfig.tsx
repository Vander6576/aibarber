import React, { useState } from 'react';
import { BarberSettings } from '../types';
import { dbStore } from '../dbStore';
import { Settings, HelpCircle, Shield, RotateCcw, AlertTriangle, Cloud, CloudOff, Save, Check, Database, Copy } from 'lucide-react';
import { isFirebaseEnabled } from '../firebase';
import { isSupabaseEnabled } from '../supabase';

const SUPABASE_MIGRATION_SQL = `-- Criar tabela de configurações da barbearia
create table if not exists barber_settings (
  id text primary key,
  name text not null,
  address text not null,
  phone text not null,
  logo_url text,
  start_hour text not null,
  end_hour text not null,
  working_days integer[] not null
);

-- Criar tabela de serviços
create table if not exists services (
  id text primary key,
  name text not null,
  price numeric not null,
  duration integer not null,
  description text,
  category text
);

-- Criar tabela de agendamentos
create table if not exists bookings (
  id text primary key,
  client_name text not null,
  client_whatsapp text not null,
  service_id text not null,
  service_name text not null,
  service_price numeric not null,
  date text not null,
  time text not null,
  status text not null,
  notes text,
  payment_method text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de clientes (CRM)
create table if not exists clients (
  id text primary key,
  name text not null,
  phone text,
  whatsapp text not null,
  birth_date text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  total_bookings integer default 0 not null,
  total_spent numeric default 0 not null
);

-- Criar tabela de transações (Financeiro)
create table if not exists transactions (
  id text primary key,
  type text not null,
  amount numeric not null,
  date text not null,
  description text not null,
  payment_method text not null,
  booking_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);`;

interface ConfigProps {
  settings: BarberSettings;
  onUpdateSettings: (settings: BarberSettings) => Promise<void>;
}

export default function AdminConfig({ settings, onUpdateSettings }: ConfigProps) {
  const [formData, setFormData] = useState<BarberSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [showMigrationSql, setShowMigrationSql] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <Shield className="h-4 w-4 text-amber-500" /> Conexão e Banco de Dados (Supabase / Cloud)
            </h4>

            {isSupabaseEnabled ? (
              <div className="flex items-start gap-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10" id="supabase-active-box">
                <Cloud className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <h5 className="text-xs text-emerald-400 font-bold">Supabase Conectado e Ativo</h5>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Seu sistema está conectado com sucesso à URL <strong>vvlhvkxjanpjxjeefzar.supabase.co</strong>. Os agendamentos, clientes, serviços, faturamentos e autenticações estão sendo sincronizados do PostgreSQL em tempo real de forma 100% segura.
                  </p>
                </div>
              </div>
            ) : isFirebaseEnabled ? (
              <div className="flex items-start gap-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10" id="db-active-box">
                <Cloud className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <h5 className="text-xs text-emerald-450 font-bold">Firestore Conectado e Ativo</h5>
                  <p className="text-[11px] text-zinc-400 mt-1">Seu sistema está sincronizando todas as informações na nuvem em tempo real via Firebase.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10" id="db-inactive-box">
                <CloudOff className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-xs text-amber-400 font-bold">Modo de Avaliação / Sandbox Local</h5>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Rodando localmente em localStorage. Todas as edições persistem localmente e o projeto conta com massa de testes completa.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="text-[11px] text-zinc-400 leading-relaxed font-sans flex gap-2">
                <HelpCircle className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                <span>
                  Para que a sincronização funcione perfeitamente, certifique-se de configurar a variável de ambiente <strong>VITE_SUPABASE_ANON_KEY</strong> na aba Secrets/Settings do AI Studio.
                </span>
              </div>

              {/* RETORNA O CODIGO SQL PARA O EDITOR SUPABASE */}
              <div className="border border-white/5 rounded-2xl p-4 bg-zinc-950/40 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-300 font-bold flex items-center gap-1.5 font-sans">
                    <Database className="h-3.5 w-3.5 text-amber-500" /> Scripts SQL de Execução/Migração
                  </span>
                  <button
                    onClick={() => setShowMigrationSql(!showMigrationSql)}
                    className="text-[10px] text-amber-500 hover:text-amber-400 underline font-medium cursor-pointer"
                  >
                    {showMigrationSql ? 'Ocultar Código' : 'Visualizar SQL'}
                  </button>
                </div>

                {showMigrationSql && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Siga o passo a passo: no Console do Supabase, vá em <strong>SQL Editor</strong> {"->"} <strong>New Query</strong>, cole as linhas abaixo e clique em <strong>Run</strong>.
                    </p>
                    <div className="relative">
                      <pre className="bg-zinc-950 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-zinc-400 overflow-x-auto max-h-48">
                        {SUPABASE_MIGRATION_SQL}
                      </pre>
                      <button
                        onClick={handleCopySQL}
                        type="button"
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-amber-500 hover:bg-zinc-800 transition-all flex items-center gap-1 cursor-pointer"
                        title="Copiar SQL"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span className="text-[8px] font-sans">{copied ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
