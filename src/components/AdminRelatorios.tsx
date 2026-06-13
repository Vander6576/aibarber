import React, { useState } from 'react';
import { Booking, Client, Transaction, Service } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Download, 
  Filter, 
  Scissors, 
  Users, 
  CheckCircle2, 
  XCircle,
  FileText
} from 'lucide-react';

interface RelatoriosProps {
  bookings: Booking[];
  clients: Client[];
  transactions: Transaction[];
  services: Service[];
}

export default function AdminRelatorios({ bookings, clients, transactions, services }: RelatoriosProps) {
  const [dateFilter, setDateFilter] = useState<'30days' | '90days' | 'thisMonth' | 'all'>('thisMonth');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthYear = new Date().toISOString().substring(0, 7); // YYYY-MM

  // Filtrar transações e agendamentos pelo período selecionado
  const getFilteredData = () => {
    let filteredTx = [...transactions];
    let filteredBk = [...bookings];

    const now = new Date();
    
    if (dateFilter === 'thisMonth') {
      filteredTx = transactions.filter(t => t.date.startsWith(currentMonthYear));
      filteredBk = bookings.filter(b => b.date.startsWith(currentMonthYear));
    } else if (dateFilter === '30days') {
      const limitDate = new Date();
      limitDate.setDate(now.getDate() - 30);
      const limitStr = limitDate.toISOString().split('T')[0];
      filteredTx = transactions.filter(t => t.date >= limitStr);
      filteredBk = bookings.filter(b => b.date >= limitStr);
    } else if (dateFilter === '90days') {
      const limitDate = new Date();
      limitDate.setDate(now.getDate() - 90);
      const limitStr = limitDate.toISOString().split('T')[0];
      filteredTx = transactions.filter(t => t.date >= limitStr);
      filteredBk = bookings.filter(b => b.date >= limitStr);
    }

    if (selectedPaymentMethod !== 'all') {
      filteredTx = filteredTx.filter(t => t.paymentMethod === selectedPaymentMethod);
    }

    return { filteredTx, filteredBk };
  };

  const { filteredTx, filteredBk } = getFilteredData();

  // --- CÁLCULO DE MÉTRICAS DO RELATÓRIO ---
  const totalReceitas = filteredTx
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDespesas = filteredTx
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  // Agendamentos por Status no período
  const totalBks = filteredBk.length;
  const completedBks = filteredBk.filter(b => b.status === 'concluido').length;
  const activeBks = filteredBk.filter(b => b.status === 'agendado').length;
  const canceledBks = filteredBk.filter(b => b.status === 'cancelado').length;

  // Taxas de conversão e cancelamento
  const completionRate = totalBks > 0 ? (completedBks / totalBks) * 100 : 0;
  const cancellationRate = totalBks > 0 ? (canceledBks / totalBks) * 100 : 0;

  // Métodos de Pagamento (Faturamento total por método)
  const faturamentoPix = filteredTx.filter(t => t.type === 'receita' && t.paymentMethod === 'pix').reduce((s, t) => s + t.amount, 0);
  const faturamentoCartao = filteredTx.filter(t => t.type === 'receita' && (t.paymentMethod === 'cartao' || t.paymentMethod === 'cartao_debito' || t.paymentMethod === 'cartao_credito')).reduce((s, t) => s + t.amount, 0);
  const faturamentoDinheiro = filteredTx.filter(t => t.type === 'receita' && t.paymentMethod === 'dinheiro').reduce((s, t) => s + t.amount, 0);

  // Serviços mais lucrativos
  const getServicePerformance = () => {
    const perf: { [name: string]: { count: number; revenue: number } } = {};
    
    // Inicializar todos os serviços conhecidos
    services.forEach(s => {
      perf[s.name] = { count: 0, revenue: 0 };
    });

    filteredBk.forEach(b => {
      if (b.status === 'concluido' || b.status === 'agendado') {
        if (!perf[b.serviceName]) {
          perf[b.serviceName] = { count: 0, revenue: 0 };
        }
        perf[b.serviceName].count += 1;
        perf[b.serviceName].revenue += b.servicePrice;
      }
    });

    return Object.entries(perf)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.revenue - a.revenue);
  };

  const servicePerformance = getServicePerformance();

  // Dias da semana mais movimentados
  const getWeekdayPerformance = () => {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const counts = Array(7).fill(0);

    filteredBk
      .filter(b => b.status !== 'cancelado')
      .forEach(b => {
        const d = new Date(b.date + 'T00:00:00');
        const dayIdx = d.getDay();
        counts[dayIdx] += 1;
      });

    return weekdays.map((label, idx) => ({
      label,
      count: counts[idx]
    })).filter((h, index) => h.count > 0 || index !== 0); // Omitir domingo se não houver nada
  };

  const weekdayPerformance = getWeekdayPerformance();
  const maxDayCount = Math.max(...weekdayPerformance.map(d => d.count), 1);

  // Simular exportação de dados
  const handleExportCSV = () => {
    alert("Exportação de relatório formatado iniciada! O arquivo PDF/CSV simulado do período foi compilado e baixado no navegador.");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6 font-sans text-zinc-200" id="reports-main-view">
      
      {/* HEADER DE RELATÓRIOS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121212] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-white flex items-center gap-2">
            Relatórios e Analytics <BarChart3 className="h-5 w-5 text-amber-500" />
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Visualize indicadores financeiros de agendamento, desempenho de serviços e métodos de pagamento.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all text-xs font-sans flex items-center gap-1.5 cursor-pointer border border-[#ffffff0a] shadow-lg"
        >
          <Download className="h-4 w-4 text-amber-500" /> Exportar Dados (.CSV)
        </button>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-zinc-400 text-xs">
          <Filter className="h-4 w-4 text-amber-500" />
          <span>Filtros Rápidos:</span>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Período */}
          <select 
            value={dateFilter}
            onChange={(e: any) => setDateFilter(e.target.value)}
            className="bg-black border border-white/5 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500/50"
          >
            <option value="thisMonth">Este Mês</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="90days">Últimos 90 dias</option>
            <option value="all">Todo Histórico</option>
          </select>

          {/* Método Pagamento */}
          <select 
            value={selectedPaymentMethod}
            onChange={(e: any) => setSelectedPaymentMethod(e.target.value)}
            className="bg-black border border-white/5 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">Todos Métodos de Pagamento</option>
            <option value="pix">Somente Pix</option>
            <option value="cartao">Somente Cartão</option>
            <option value="dinheiro">Somente Dinheiro</option>
          </select>
        </div>
      </div>

      {/* PRINCIPAL METRICS BAR CONTAINER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase block mb-1">Receitas Consolidadas</span>
          <span className="text-2xl font-mono font-bold text-emerald-400">{formatCurrency(totalReceitas)}</span>
          <p className="text-zinc-500 text-[10px] mt-2">Soma de receitas brutas no período filtrado.</p>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase block mb-1">Despesas Operacionais</span>
          <span className="text-2xl font-mono font-bold text-red-400">{formatCurrency(totalDespesas)}</span>
          <p className="text-zinc-500 text-[10px] mt-2">Custos, comissões de produtos e insumos.</p>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase block mb-1">Resultado Líquido</span>
          <span className={`text-2xl font-mono font-bold ${saldoLiquido >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
            {formatCurrency(saldoLiquido)}
          </span>
          <p className="text-zinc-500 text-[10px] mt-2">Lucro real gerado na operação.</p>
        </div>

      </div>

      {/* DETALHAMENTO DE PERFORMANCE EM GRADE CLÁSSICA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bloco 1: Conclusão de Agendamentos */}
        <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-sans font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" /> Rendimento dos Horários ({totalBks} Agendamentos)
          </h3>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">Concluídos</span>
              <span className="text-base font-bold text-emerald-400">{completedBks}</span>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">Ativos</span>
              <span className="text-base font-bold text-amber-500">{activeBks}</span>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">Cancelados</span>
              <span className="text-base font-bold text-red-500">{canceledBks}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs text-zinc-400 font-sans">
            <div className="flex justify-between items-center">
              <span>Taxa de Aproveitamento (Comparecimento):</span>
              <span className="font-mono font-bold text-emerald-400">{completionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${completionRate}%` }}></div>
            </div>
            
            <div className="flex justify-between items-center pt-1">
              <span>Taxa de Absenteísmo (Cancelamento):</span>
              <span className="font-mono font-bold text-red-400">{cancellationRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full" style={{ width: `${cancellationRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Métodos de Pagamento Preferred */}
        <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-sans font-bold text-white flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-500" /> Meios de Pagamento Utilizados
          </h3>

          <div className="space-y-3 pt-1">
            {/* PIX */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                <span>PIX</span>
              </div>
              <span className="font-mono font-bold text-white">{formatCurrency(faturamentoPix)}</span>
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-400 h-full" style={{ width: totalReceitas > 0 ? `${(faturamentoPix / totalReceitas) * 100}%` : '0%' }}></div>
            </div>

            {/* CARTÃO */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                <span>Cartão (Crédito/Débito)</span>
              </div>
              <span className="font-mono font-bold text-white">{formatCurrency(faturamentoCartao)}</span>
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-400 h-full" style={{ width: totalReceitas > 0 ? `${(faturamentoCartao / totalReceitas) * 100}%` : '0%' }}></div>
            </div>

            {/* DINHEIRO */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Dinheiro em Espécie</span>
              </div>
              <span className="font-mono font-bold text-white">{formatCurrency(faturamentoDinheiro)}</span>
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full" style={{ width: totalReceitas > 0 ? `${(faturamentoDinheiro / totalReceitas) * 100}%` : '0%' }}></div>
            </div>
          </div>
        </div>

        {/* Bloco 3: Desempenho e Lucro por Serviço */}
        <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 space-y-4 lg:col-span-1">
          <h3 className="text-sm font-sans font-bold text-white flex items-center gap-2">
            <Scissors className="h-4 w-4 text-amber-500" /> Lucratividade Faturada por Serviço
          </h3>

          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
            {servicePerformance.length > 0 ? (
              servicePerformance.map((item, idx) => {
                const totalLucroServicos = servicePerformance.reduce((s, i) => s + i.revenue, 0) || 1;
                const percentage = (item.revenue / totalLucroServicos) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-350">{item.name}</span>
                      <span className="font-mono font-bold text-white">{formatCurrency(item.revenue)} ({item.count} un)</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500/70 h-full animate-all" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-550 text-center py-8">Nenhum agendamento ativo com faturamento.</p>
            )}
          </div>
        </div>

        {/* Bloco 4: Fluxo de Clientes por Dia da Semana */}
        <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 space-y-4 lg:col-span-1">
          <h3 className="text-sm font-sans font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" /> Fluxo de Agendamentos por Dia da Semana
          </h3>

          <div className="space-y-3">
            {weekdayPerformance.map((day, idx) => {
              const widthPct = (day.count / maxDayCount) * 100;
              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-zinc-400 font-semibold">{day.label}</span>
                  <div className="flex-1 bg-zinc-950 h-4 rounded overflow-hidden relative">
                    <div className="bg-amber-500/30 h-full border-r border-amber-500/40 rounded-r transition-all duration-500" style={{ width: `${widthPct}%` }}></div>
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-mono text-zinc-300 font-bold">{day.count} agendamento{day.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
