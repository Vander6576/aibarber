import React, { useState, useEffect } from 'react';
import { Booking, Client, Transaction, Service, BarberSettings } from '../types';
import AdminShare from './AdminShare';
import { getTodayBrasiliaStr, getTomorrowBrasiliaStr, getNowBrasiliaTime } from '../utils/timezone';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Phone,
  Scissors,
  MessageSquare
} from 'lucide-react';

interface DashboardProps {
  bookings: Booking[];
  clients: Client[];
  transactions: Transaction[];
  services: Service[];
  settings: BarberSettings;
  onNavigateTab: (tab: any) => void;
}

export default function AdminDashboard({ bookings, clients, transactions, services, settings, onNavigateTab }: DashboardProps) {
  console.log("[DEBUG LOG] 4. Dashboard iniciado!");
  console.log("[DEBUG LOG] Dados recebidos no Dashboard:", { 
    bookings: bookings?.length, 
    clients: clients?.length, 
    transactions: transactions?.length, 
    services: services?.length, 
    settingsExist: !!settings,
    settingsName: settings?.name 
  });

  if (!settings) {
    console.error("[DEBUG LOG] 5. Componente que trava: AdminDashboard detectou 'settings' nulo!");
    console.error("[DEBUG LOG] Primeiro erro que interrompe a renderização: Tentativa de leitura de 'settings.adminName' ou 'settings.name' a partir de nulo.");
    return (
      <div className="p-8 bg-red-950/20 border border-red-950 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12 font-sans">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto animate-bounce" />
        <h3 className="font-bold text-xl text-white">Oops! Configurações ausentes</h3>
        <p className="text-sm text-zinc-400">
          Não foi possível sincronizar suas configurações da barbearia. Por favor, tente acessar a guia de "Configurações" no menu lateral para inicializá-las ou tente recarregar a página.
        </p>
      </div>
    );
  }

  const [showDemoGuide, setShowDemoGuide] = useState(() => {
    try {
      return localStorage.getItem('barber_connect_demo_guide_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const dismissDemoGuide = () => {
    try {
      localStorage.setItem('barber_connect_demo_guide_dismissed', 'true');
    } catch {}
    setShowDemoGuide(false);
  };

  const [metrics, setMetrics] = useState({
    dailyRevenue: 0,
    monthlyRevenue: 0,
    dailyBookingsCount: 0,
    totalClients: 0
  });

  const [timelineDate, setTimelineDate] = useState<'hoje' | 'amanha'>('hoje');

  const todayStr = getTodayBrasiliaStr();
  const tomorrowStr = getTomorrowBrasiliaStr();

  const currentMonthYear = todayStr.substring(0, 7); // YYYY-MM

  useEffect(() => {
    // 1. Faturamento do dia
    const todayRevenue = transactions
      .filter(t => t.date === todayStr && t.type === 'receita')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 2. Faturamento do mês
    const monthlyRevenue = transactions
      .filter(t => t.date.startsWith(currentMonthYear) && t.type === 'receita')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 3. Agendamentos do dia
    const todayBookings = bookings.filter(b => b.date === todayStr && b.status !== 'cancelado');

    setMetrics({
      dailyRevenue: todayRevenue,
      monthlyRevenue,
      dailyBookingsCount: todayBookings.length,
      totalClients: clients.length
    });
  }, [bookings, clients, transactions, todayStr, currentMonthYear]);

  // Agendamentos filtrados por hoje ou amanhã
  const activeDateStr = timelineDate === 'hoje' ? todayStr : tomorrowStr;
  const filteredAppointments = bookings
    .filter(b => b.date === activeDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Próximo agendamento ativo (a partir do horário atual se hoje)
  const getNextAppointment = () => {
    const todayAppointments = bookings.filter(b => b.date === todayStr && b.status === 'agendado');
    if (todayAppointments.length === 0) return null;
    
    const nowHourStr = getNowBrasiliaTime(); // "HH:MM" in Brasilia
    const upcoming = todayAppointments
      .filter(b => b.time >= nowHourStr)
      .sort((a, b) => a.time.localeCompare(b.time));

    return upcoming.length > 0 ? upcoming[0] : todayAppointments.sort((a, b) => a.time.localeCompare(b.time))[0];
  };

  const nextApt = getNextAppointment();

  // Dados de transações recentes de hoje para micro-gráfico
  const todayTx = transactions.filter(t => t.date === todayStr && t.type === 'receita');
  const countOfPix = todayTx.filter(t => t.paymentMethod === 'pix').length;
  const countOfCard = todayTx.filter(t => t.paymentMethod === 'cartao').length;
  const countOfCash = todayTx.filter(t => t.paymentMethod === 'dinheiro').length;

  const totalPix = todayTx.filter(t => t.paymentMethod === 'pix').reduce((s, c) => s + c.amount, 0);
  const totalCard = todayTx.filter(t => t.paymentMethod === 'cartao').reduce((s, c) => s + c.amount, 0);
  const totalCash = todayTx.filter(t => t.paymentMethod === 'dinheiro').reduce((s, c) => s + c.amount, 0);

  // Clientes adicionados este mês
  const clientsAddedThisMonth = clients.filter(c => c.createdAt && c.createdAt.startsWith(currentMonthYear)).length;

  // Preparar dados para o gráfico de serviços mais vendidos
  const getTopServicesData = () => {
    const serviceCounts: { [name: string]: number } = {};
    bookings.forEach(b => {
      if (b.status === 'concluido' || b.status === 'agendado') {
        serviceCounts[b.serviceName] = (serviceCounts[b.serviceName] || 0) + 1;
      }
    });

    const data = Object.entries(serviceCounts).map(([name, count]) => ({
      name,
      count
    }));

    return data.sort((a, b) => b.count - a.count).slice(0, 4);
  };

  const topServices = getTopServicesData();
  const totalServiceCountsTotal = topServices.reduce((sum, current) => sum + current.count, 0) || 1;

  // Formatadores monetários
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6 font-sans text-zinc-200" id="admin-dashboard-container">
      
      {/* HEADER DE BOAS VINDAS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121212] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-white flex items-center gap-2">
            Olá, {settings.adminName || 'Ricardo'} 👋 <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Você tem {metrics.dailyBookingsCount} agendamentos para o dia de hoje.</p>
        </div>
        <div className="flex gap-3 items-center w-full md:w-auto">
          <button 
            onClick={() => onNavigateTab('agenda')}
            className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-all text-xs font-sans flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
          >
            Novo Agendamento
          </button>
          <div className="text-xs font-mono text-zinc-400 bg-black border border-white/5 px-3 py-2 rounded-xl">
            {new Date(getTodayBrasiliaStr() + 'T12:00:00').toLocaleDateString('pt-BR', { dateStyle: 'medium' })}
          </div>
        </div>
      </header>

      {/* COMPARTILHAMENTO DE LINK PÚBLICO */}
      <AdminShare settings={settings} />

      {/* MODO DEMO: GUIA DE EXPEDIENTE / ONBOARDING */}
      {showDemoGuide && (
        <div className="bg-gradient-to-r from-amber-500/[0.08] to-amber-500/[0.01] border border-amber-500/20 rounded-3xl p-5 relative overflow-hidden" id="demo-mode-onboarding-panel">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[9px] bg-amber-500 text-zinc-950 px-2 py-0.5 rounded-full font-mono font-extrabold tracking-wider uppercase">Modo de Demonstração Ativo</span>
              <h3 className="text-sm font-bold text-white font-sans mt-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> Guia de Primeiros Passos BarberConnect
              </h3>
              <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">Confira nossas dicas rápidas criadas especialmente para você testar todas as funcionalidades operacionais de forma integrada:</p>
            </div>
            <button 
              onClick={dismissDemoGuide}
              className="text-zinc-400 hover:text-white text-[11px] font-sans font-bold hover:bg-zinc-900 border border-white/5 bg-zinc-950 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm flex-shrink-0"
              title="Ocultar Guia"
            >
              Recusar dicas boas-vindas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 mt-4 border-t border-white/5">
            <div className="p-3.5 bg-zinc-950/40 border border-white/5 rounded-2xl flex gap-3.5 items-start">
              <span className="h-6 w-6 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-lg text-xs font-mono font-extrabold flex items-center justify-center select-none flex-shrink-0">1</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-sans uppercase tracking-tight">Criar Horários Rápidos</h4>
                <p className="text-[11px] text-zinc-400 leading-normal">Na aba <strong>Agenda</strong>, basta clicar em qualquer horário livre para simular e salvar um novo atendimento em 3 cliques.</p>
              </div>
            </div>
            <div className="p-3.5 bg-zinc-950/40 border border-white/5 rounded-2xl flex gap-3.5 items-start">
              <span className="h-6 w-6 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-lg text-xs font-mono font-extrabold flex items-center justify-center select-none flex-shrink-0">2</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-sans uppercase tracking-tight">Controle Financeiro</h4>
                <p className="text-[11px] text-zinc-400 leading-normal">Marcar horários como <strong>Concluído</strong> gera lançamentos automáticos no <strong>Fluxo Financeiro</strong> geral de forma integrada.</p>
              </div>
            </div>
            <div className="p-3.5 bg-zinc-950/40 border border-white/5 rounded-2xl flex gap-3.5 items-start">
              <span className="h-6 w-6 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-lg text-xs font-mono font-extrabold flex items-center justify-center select-none flex-shrink-0">3</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-sans uppercase tracking-tight">Fale com Clientes CRM</h4>
                <p className="text-[11px] text-zinc-400 leading-normal">Na aba <strong>Clientes</strong>, use o ícone verde de WhatsApp para abrir o chat pré-configurado enviando lembretes personalizados com 1-toque.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-HEADER METRIC BAR FOR RESPONSIVE SCATTER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Faturamento Mensal</span>
          <span className="text-lg font-mono font-bold text-white mt-1">{formatValue(metrics.monthlyRevenue)}</span>
        </div>
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Agendamentos Hoje</span>
          <span className="text-lg font-mono font-bold text-white mt-1">{metrics.dailyBookingsCount}</span>
        </div>
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Clientes Cadastrados</span>
          <span className="text-lg font-mono font-bold text-white mt-1">{metrics.totalClients}</span>
        </div>
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Novos Clientes (Mês)</span>
          <span className="text-lg font-mono font-bold text-amber-500 mt-1">+{clientsAddedThisMonth}</span>
        </div>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="bento-grid-dashboard">
        
        {/* Row 1, Col 1-2: Today's Revenue */}
        <div className="col-span-1 md:col-span-2 bg-[#121212] rounded-3xl p-6 border border-white/5 flex flex-col justify-between min-h-[220px] shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-zinc-400 font-medium uppercase text-[10px] tracking-wider block">Faturamento Hoje</span>
              <p className="text-xs text-zinc-500">Fluxo líquido acumulado hoje</p>
            </div>
            <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-lg border border-green-500/10">
              +{todayTx.length} transações
            </span>
          </div>

          <div className="my-3">
            <div className="text-4xl font-mono font-black text-white tracking-tight">{formatValue(metrics.dailyRevenue)}</div>
            <p className="text-zinc-500 text-xs mt-1">
              {countOfPix} Pix ({formatValue(totalPix)}) • {countOfCard} Cartão ({formatValue(totalCard)}) • {countOfCash} Dinheiro ({formatValue(totalCash)})
            </p>
          </div>

          <div className="h-10 flex items-end gap-1 overflow-hidden opacity-40 mt-1">
            {/* Dynamic visual graph simulating today's transaction magnitudes */}
            {todayTx.length === 0 ? (
              <>
                <div className="flex-1 bg-amber-500/40 h-[10%] rounded-sm"></div>
                <div className="flex-1 bg-amber-500/40 h-[15%] rounded-sm"></div>
                <div className="flex-1 bg-amber-500/40 h-[12%] rounded-sm"></div>
                <div className="flex-1 bg-amber-500/40 h-[22%] rounded-sm"></div>
                <div className="flex-1 bg-amber-500/40 h-[8%] rounded-sm"></div>
                <div className="flex-1 bg-amber-500/40 h-[30%] rounded-sm"></div>
                <div className="flex-1 bg-amber-500/40 h-[15%] rounded-sm"></div>
                <div className="flex-1 bg-amber-500/40 h-[25%] rounded-sm"></div>
              </>
            ) : (
              todayTx.map((tx, index) => {
                const maxAmount = Math.max(...todayTx.map(t => t.amount), 50);
                const pct = (tx.amount / maxAmount) * 90 + 10;
                return (
                  <div 
                    key={tx.id || index} 
                    style={{ height: `${pct}%` }} 
                    className="flex-1 bg-amber-500 rounded-sm hover:opacity-100 transition-opacity"
                    title={`${tx.description}: R$ ${tx.amount}`}
                  ></div>
                );
              })
            )}
          </div>
        </div>

        {/* Row 1, Col 3: Next Appointment Card */}
        <div className="col-span-1 bg-amber-500 rounded-3xl p-6 text-black flex flex-col justify-between min-h-[220px] shadow-xl hover:scale-[1.01] transition-transform duration-300">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">Próximo Cliente</span>
            <span className="text-xs font-mono font-black bg-black text-amber-500 px-2 py-0.5 rounded">
              {nextApt ? nextApt.time : "Sem Agenda"}
            </span>
          </div>

          <div className="mt-4 flex-1 flex flex-col justify-center">
            {nextApt ? (
              <>
                <h3 className="text-2xl font-black leading-tight text-zinc-950 font-display truncate">{nextApt.clientName}</h3>
                <p className="font-semibold text-black/80 text-sm mt-0.5 truncate">{nextApt.serviceName}</p>
                <p className="text-xs font-mono text-black/60 mt-1">Valor: {formatValue(nextApt.servicePrice)}</p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold leading-tight text-zinc-950 font-display">Tudo em dia!</h3>
                <p className="text-xs font-medium text-black/70 mt-1">Nenhum atendimento na fila de espera no momento.</p>
              </>
            )}
          </div>

          <div className="flex justify-between items-center mt-3 pt-2 border-t border-black/10">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full border-2 border-amber-500 bg-black/15 flex items-center justify-center font-bold text-[10px] text-zinc-950">
                {nextApt ? nextApt.clientName[0] : "B"}
              </div>
            </div>
            {nextApt && (
              <a 
                href={`https://wa.me/${nextApt.clientWhatsApp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-black rounded-lg text-amber-500 hover:scale-105 transition-all text-xs"
                title="Conversar"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Row 1, Col 4: Total Clients Counter */}
        <div className="col-span-1 bg-[#121212] rounded-3xl p-6 border border-white/5 flex flex-col justify-center items-center text-center min-h-[220px]">
          <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1.5 font-mono">Base Total CRM</div>
          <div className="text-5xl font-black text-white font-display">{metrics.totalClients}</div>
          <div className="text-xs text-amber-500 mt-2 font-semibold">
            +{clientsAddedThisMonth} este mês
          </div>
          <button 
            onClick={() => onNavigateTab('clientes')}
            className="text-[10px] font-bold text-zinc-400 hover:text-white mt-4 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-full transition-all cursor-pointer"
          >
            Gerenciar Clientes
          </button>
        </div>

        {/* Row 2-3, Col 1-3: Main Agenda (Timeline) */}
        <div className="col-span-1 md:col-span-3 bg-[#121212] rounded-3xl p-6 border border-white/5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-display font-semibold text-white">Cronograma do Dia</h2>
                <p className="text-xs text-zinc-500">Expediente de agendamentos solicitados</p>
              </div>
              <div className="flex p-0.5 bg-black border border-white/5 rounded-xl text-xs font-semibold">
                <button 
                  onClick={() => setTimelineDate('hoje')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timelineDate === 'hoje' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Hoje
                </button>
                <button 
                  onClick={() => setTimelineDate('amanha')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timelineDate === 'amanha' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Amanhã
                </button>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-black/20 my-2">
                <Calendar className="h-8 w-8 text-zinc-700 mb-2" />
                <h5 className="text-sm font-sans font-medium text-zinc-450">Sem agendamentos para este dia.</h5>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">Você pode registrar horários na aba de Agenda ou enviar o link público para seus clientes.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {filteredAppointments.map((apt) => {
                  const isCanceled = apt.status === 'cancelado';
                  const isCompleted = apt.status === 'concluido';
                  
                  return (
                    <div 
                      key={apt.id} 
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 rounded-2xl border transition-all duration-200 ${
                        isCanceled ? 'bg-[#0a0a0a] border-zinc-900 opacity-60' : 
                        isCompleted ? 'bg-[#121212] border-green-500/10' : 'bg-[#181818] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        {/* Horário */}
                        <div className={`px-3 py-1 rounded-xl border flex flex-col items-center justify-center text-center font-mono ${
                          isCanceled ? 'bg-zinc-900 border-zinc-900 text-zinc-500' :
                          isCompleted ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        }`}>
                          <Clock className="h-3 w-3 mb-0.5" />
                          <span className="text-xs font-bold">{apt.time}</span>
                        </div>

                        {/* Cliente e Serviço */}
                        <div className="truncate">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold truncate ${isCanceled ? 'text-zinc-500 line-through' : 'text-white'}`}>
                              {apt.clientName}
                            </span>
                            {!isCanceled && (
                              <span className="text-[10px] font-mono text-zinc-400 bg-black/40 border border-white/5 px-2 py-0.5 rounded-full">
                                {apt.clientWhatsApp}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 text-zinc-400 truncate ${isCanceled ? 'line-through' : ''}`}>
                            {apt.serviceName} • <span className="font-mono text-zinc-550 font-medium">{formatValue(apt.servicePrice)}</span>
                          </p>
                          {apt.notes && (
                            <p className="text-[10px] text-amber-500/70 italic mt-0.5">Obs: {apt.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Status, Ações Próximas */}
                      <div className="flex items-center justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        {isCanceled && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-500/5 px-2.5 py-1 rounded-full border border-red-500/10">
                            <XCircle className="h-3.5 w-3.5" /> CANCELADO
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10">
                            <CheckCircle2 className="h-3.5 w-3.5" /> CONCLUÍDO
                          </span>
                        )}
                        {!isCanceled && !isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/5 px-2.5 py-1 rounded-full border border-amber-500/15 animate-pulse">
                            <Clock className="h-3.5 w-3.5" /> AGENDADO
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-zinc-500 font-mono">
            <span>Legenda: Ordens chronológicas</span>
            <button 
              onClick={() => onNavigateTab('agenda')}
              className="text-amber-500 hover:text-amber-400 font-bold transition-all flex items-center gap-0.5 cursor-pointer"
            >
              Agenda Geral <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Row 2-3, Col 4: Services Popularity */}
        <div className="col-span-1 bg-[#121212] rounded-3xl p-6 border border-white/5 flex flex-col justify-between shadow-lg">
          <div>
            <h2 className="text-zinc-400 font-medium uppercase text-[10px] tracking-wider mb-5">Serviços + Vendidos</h2>
            
            <div className="space-y-4">
              {topServices.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-black/20">
                  <Scissors className="h-6 w-6 text-zinc-600 mb-1.5" />
                  <p className="text-[11px] text-zinc-450">Nenhum dado de serviço comercializado ainda.</p>
                </div>
              ) : (
                topServices.map((srv, idx) => {
                  const pct = Math.round((srv.count / totalServiceCountsTotal) * 100);
                  const barColorClass = idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-amber-300' : idx === 2 ? 'bg-zinc-400' : 'bg-zinc-600';
                  return (
                    <div key={srv.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-white">
                        <span className="truncate max-w-[70%] font-medium">{srv.name}</span>
                        <span className="font-mono text-amber-500 font-semibold">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${pct}%` }} 
                          className={`h-full rounded-full transition-all duration-350 ${barColorClass}`}
                        ></div>
                      </div>
                      <p className="text-[9px] text-zinc-500 font-mono">{srv.count} atendimentos</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Atualizado na nuvem</p>
            <button 
              onClick={() => onNavigateTab('servicos')}
              className="text-[11px] text-amber-500 hover:text-amber-400 font-bold mt-2 hover:underline inline-block cursor-pointer"
            >
              Ver Catálogo Completo
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
