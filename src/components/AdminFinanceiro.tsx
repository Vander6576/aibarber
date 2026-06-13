import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { DollarSign, Plus, Trash2, Calendar, TrendingUp, TrendingDown, Clock, Filter, FileText, AlertCircle, X } from 'lucide-react';

interface FinanceiroProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<any>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export default function AdminFinanceiro({ transactions, onAddTransaction, onDeleteTransaction }: FinanceiroProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filtros Avançados por Período
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  // Form de adição de transação manual avulsa
  const [formData, setFormData] = useState({
    type: "receita" as 'receita' | 'despesa',
    amount: "",
    description: "",
    paymentMethod: "pix" as 'pix' | 'dinheiro' | 'cartao',
    date: todayStr
  });

  // Métricas do período filtrado
  const [periodStats, setPeriodStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    pixTotal: 0,
    moneyTotal: 0,
    cardTotal: 0
  });

  useEffect(() => {
    // Filtra as transações inclusas no período [startDate, endDate]
    const filtered = transactions.filter(t => t.date >= startDate && t.date <= endDate);

    let inc = 0;
    let exp = 0;
    let pix = 0;
    let mon = 0;
    let crd = 0;

    filtered.forEach(t => {
      if (t.type === 'receita') {
        inc += t.amount;
        if (t.paymentMethod === 'pix') pix += t.amount;
        else if (t.paymentMethod === 'dinheiro') mon += t.amount;
        else if (t.paymentMethod === 'cartao' || t.paymentMethod === 'cartao_debito' || t.paymentMethod === 'cartao_credito') crd += t.amount;
      } else {
        exp += t.amount;
      }
    });

    setPeriodStats({
      totalIncome: inc,
      totalExpense: exp,
      balance: inc - exp,
      pixTotal: pix,
      moneyTotal: mon,
      cardTotal: crd
    });
  }, [transactions, startDate, endDate]);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) {
      alert("Preencha o valor e a descrição!");
      return;
    }

    try {
      await onAddTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        date: formData.date
      });
      setShowAddModal(false);
      setFormData({
        type: "receita",
        amount: "",
        description: "",
        paymentMethod: "pix",
        date: todayStr
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Quer realmente apagar este lançamento financeiro permanentemente?")) {
      try {
        await onDeleteTransaction(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Transações ordenadas por data descrescente (e criação)
  const currentFilteredList = transactions
    .filter(t => t.date >= startDate && t.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6 font-sans text-zinc-200" id="admin-financeiro-container">
      {/* HEADER FINANCEIRO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" /> Fluxo de Caixa & Finanças
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Monitore receitas por cortes e barbas, despesas operacionais da barbearia e gere demonstrativos por período.</p>
        </div>

        <div className="flex gap-2 self-stretch md:self-auto font-sans">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* SELECIONADOR DE PERÍODO DA RELATÓRIO */}
      <div className="bg-[#121212] border border-white/5 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-center gap-4 justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-zinc-450 hidden sm:inline" />
          <div>
            <h3 className="text-sm font-display font-semibold text-white">Consolidação por Período</h3>
            <p className="text-xs text-zinc-500">Métricas financeiras calculadas dinamicamente entre as datas abaixo</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-sm justify-end">
          <div className="flex items-center gap-2 bg-black px-3 py-2 rounded-xl border border-white/5">
            <span className="text-[10px] uppercase font-mono text-zinc-500">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-black px-3 py-2 rounded-xl border border-white/5">
            <span className="text-[10px] uppercase font-mono text-zinc-500">Ate:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* QUADRO DE SINTESE DAS FINANÇAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="accounting-cards-grid">
        {/* Receita do período */}
        <div className="bg-[#121212] border border-green-500/10 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-sans text-zinc-400">Total Receitas</p>
            <h3 className="text-2xl font-mono font-bold text-emerald-400">R$ {periodStats.totalIncome.toFixed(2)}</h3>
            <p className="text-[10px] text-zinc-500 italic">Entradas brutas no período</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/15 text-emerald-500">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Despesas do período */}
        <div className="bg-[#121212] border border-red-500/10 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-sans text-zinc-400">Total Despesas</p>
            <h3 className="text-2xl font-mono font-bold text-red-500">R$ {periodStats.totalExpense.toFixed(2)}</h3>
            <p className="text-[10px] text-zinc-500 italic">Saídas operacionais do caixa</p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/15 text-red-500">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>

        {/* Saldo líquido */}
        <div className={`bg-[#121212] border p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden ${
          periodStats.balance >= 0 ? 'border-amber-500/10' : 'border-red-500/20'
        }`}>
          <div className="space-y-1">
            <p className="text-xs font-sans text-zinc-400 font-medium">Saldo Líquido</p>
            <h3 className={`text-2xl font-mono font-bold ${periodStats.balance >= 0 ? 'text-white' : 'text-red-500'}`}>
              R$ {periodStats.balance.toFixed(2)}
            </h3>
            <p className="text-[10px] text-zinc-500 italic">Lucratividade líquida</p>
          </div>
          <div className={`p-3 rounded-xl border ${
            periodStats.balance >= 0 ? 'bg-amber-500/15 border-amber-500/25 text-amber-500' : 'bg-red-500/10 border-red-500/15 text-red-500'
          }`}>
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* METODOS DE PAGAMENTO E LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="ledger-layout">
        
        {/* Painel do Lançamento por Métodos */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4" id="stats-payment-box">
          <h4 className="text-sm font-sans font-semibold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-500" /> Detalhamento de Faturamento
          </h4>
          
          <div className="space-y-3 pt-1">
            {/* Pix */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-850">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-cyan-400"></span>
                <span className="text-xs font-sans text-zinc-300">Pix Instantâneo</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">R$ {periodStats.pixTotal.toFixed(2)}</span>
            </div>

            {/* Dinheiro */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-850">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-sans text-zinc-300">Dinheiro Físico</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">R$ {periodStats.moneyTotal.toFixed(2)}</span>
            </div>

            {/* Cartão */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-850">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                <span className="text-xs font-sans text-zinc-300">Cartões de Crédito/Débito</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">R$ {periodStats.cardTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 italic p-3 rounded-xl bg-zinc-950 border border-dashed border-zinc-900 flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <span>As transações ligadas a cortes e barbas na Agenda alimentam automaticamente essa listagem ao serem marcadas como Concluídas.</span>
          </div>
        </div>

        {/* Extrato Detalhado Ledger */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between" id="ledger-box">
          <div className="p-4 bg-zinc-950 border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider flex justify-between">
            <span>Extrato de Lançamentos ({currentFilteredList.length})</span>
            <span>Período Ativo</span>
          </div>

          {currentFilteredList.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center text-zinc-500 my-auto">
              <FileText className="h-10 w-10 text-zinc-750 mb-2 animate-bounce" />
              <p className="text-sm">Nenhum dado cadastrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-850 overflow-y-auto max-h-[380px]">
              {currentFilteredList.map((tx) => {
                const isIncome = tx.type === 'receita';
                return (
                  <div key={tx.id} className="flex justify-between items-center p-3.5 hover:bg-zinc-950/20 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Indicador visual tipo */}
                      <div className={`p-2 rounded-xl text-xs font-mono ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>

                      {/* Descritivo */}
                      <div>
                        <span className="text-xs font-sans text-white font-medium block max-w-sm truncate" title={tx.description}>
                          {tx.description}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">{tx.date.split('-').reverse().join('/')}</span>
                          {isIncome && (
                            <span className="text-[9px] bg-zinc-955 border border-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-mono font-bold">
                              {tx.paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Valor e deleção */}
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                      </span>
                      
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="text-zinc-600 hover:text-red-500 p-1.5 hover:bg-red-500/5 rounded border border-transparent hover:border-red-500/10 transition-colors"
                        title="Remover lançamento no livro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL ADICIONAR MANUAL OU AVULSO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-zinc-950 p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-base font-sans font-bold text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" /> Cadastrar Lançamento de Caixa
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Tipo de Fluxo *</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'receita' })}
                    className={`px-3 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1 border border-zinc-800 transition-all ${
                      formData.type === 'receita' ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-zinc-950 text-zinc-450'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" /> Entrada (Receita)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'despesa' })}
                    className={`px-3 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1 border border-zinc-800 transition-all ${
                      formData.type === 'despesa' ? 'bg-red-500 border-red-500 text-black' : 'bg-zinc-950 text-zinc-450'
                    }`}
                  >
                    <TrendingDown className="h-4 w-4" /> Saída (Despesa)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Valor Recebido (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Data do Registro *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Descrição Detalhada *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de giletes e gel, faturamento avulso, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {formData.type === 'receita' && (
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Meio de Recebimento</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none"
                  >
                    <option value="pix">Pix Instantâneo</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão de Cred/Deb</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
