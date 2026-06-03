import React, { useState, useEffect } from 'react';
import { Booking, Service, BookingStatus, BarberSettings } from '../types';
import { Plus, Clock, User, Phone, Check, X, ShieldAlert, FileText, Send, Calendar, Trash2, ArrowLeftRight, Search, SlidersHorizontal } from 'lucide-react';

interface AgendaProps {
  bookings: Booking[];
  services: Service[];
  startHour: string; // e.g. "08:00"
  endHour: string; // e.g. "20:00"
  settings: BarberSettings;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateBooking: (id: string, update: Partial<Booking>) => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
}

export default function AdminAgenda({
  bookings,
  services,
  startHour,
  endHour,
  settings,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking
}: AgendaProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filtros avançados
  const [filterPeriod, setFilterPeriod] = useState<'dia' | 'hoje' | 'amanha' | 'semana' | 'mes' | 'todos'>('dia');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterServiceId, setFilterServiceId] = useState<string>('todos');
  const [filterBarber, setFilterBarber] = useState<string>('todos');
  const [filterClientName, setFilterClientName] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentViewMode, setCurrentViewMode] = useState<'grade' | 'lista'>('grade');

  // Campos do formulário de novos agendamentos
  const [formData, setFormData] = useState({
    clientName: "",
    clientWhatsApp: "",
    serviceId: "",
    notes: "",
    status: "agendado" as BookingStatus,
    paymentMethod: "pix" as any,
    barberName: ""
  });

  // Abre inclusão manual pré-selecionando horário
  const handleOpenAdd = (time: string) => {
    setSelectedTimeSlot(time);
    setFormData({
      clientName: "",
      clientWhatsApp: "",
      serviceId: services[0]?.id || "",
      notes: "",
      status: "agendado",
      paymentMethod: "pix",
      barberName: settings.barbers?.[0] || ""
    });
    setShowAddModal(true);
  };

  // Abre modal de detalhes/edição rápida
  const handleOpenDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  // Salvar novo agendamento manual
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.clientWhatsApp || !formData.serviceId) {
      alert("Por favor preencha nome, whatsapp e selecione o serviço!");
      return;
    }

    const selectedService = services.find(s => s.id === formData.serviceId);
    if (!selectedService) return;

    try {
      await onAddBooking({
        clientName: formData.clientName,
        clientWhatsApp: formData.clientWhatsApp,
        serviceId: formData.serviceId,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        date: selectedDate,
        time: selectedTimeSlot,
        status: formData.status,
        notes: formData.notes,
        paymentMethod: formData.status === 'concluido' ? formData.paymentMethod : undefined,
        barberName: formData.barberName
      });
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Atualizar status / concluir do agendamento selecionado
  const handleUpdateStatus = async (status: BookingStatus, payMethod?: any) => {
    if (!selectedBooking) return;
    try {
      await onUpdateBooking(selectedBooking.id, {
        status,
        ...(payMethod ? { paymentMethod: payMethod } : {})
      });
      setShowDetailsModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir agendamento
  const handleDelete = async () => {
    if (!selectedBooking) return;
    if (confirm("Deseja realmente deletar permanentemente este agendamento do banco?")) {
      try {
        await onDeleteBooking(selectedBooking.id);
        setShowDetailsModal(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Enviar Confirmação / Lembrete via WhatsApp (Gera texto bonitinho e abre API)
  const handleSendWhatsAppMsg = (type: 'confirmacao' | 'lembrete', booking: Booking) => {
    const formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const cleanPhone = booking.clientWhatsApp.trim().replace(/\D/g, ''); // Deixa somente números
    
    let msg = "";
    if (type === 'confirmacao') {
      msg = `Olá ${booking.clientName}! Confirmamos o seu horário agendado para o dia *${formattedDate}* às *${booking.time}* para realizar o serviço *${booking.serviceName}*. Aguardamos você! 💈✂️`;
    } else {
      msg = `E aí ${booking.clientName}, beleza? Passando para lembrar do seu horário hoje (*${formattedDate}*) às *${booking.time}* para fazer *${booking.serviceName}*. Se houver algum imprevisto, nos avise antes. Forte abraço! 💈🤘`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Gerar slots de tempo dinâmicos de 30 em 30 minutos baseado no funcionamento
  const getTimeSlots = () => {
    const slots: string[] = [];
    const [startH, startM] = startHour.split(':').map(Number);
    const [endH, endM] = endHour.split(':').map(Number);

    let currH = startH;
    let currM = startM;

    while (currH < endH || (currH === endH && currM <= endM)) {
      const timeStr = `${String(currH).padStart(2, '0')}:${String(currM).padStart(2, '0')}`;
      slots.push(timeStr);
      
      // Adiciona 30 minutos
      currM += 30;
      if (currM >= 60) {
        currH += 1;
        currM = 0;
      }
    }
    return slots;
  };

  const timeSlots = getTimeSlots();

  // ALINHAMENTO DO PERÍODO DO FILTRO PARA DETERMINAR QUAL DATA O GRID EXIBE
  const activeGridDate = filterPeriod === 'hoje' 
    ? new Date().toISOString().split('T')[0]
    : filterPeriod === 'amanha'
      ? (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString().split('T')[0];
        })()
      : selectedDate;

  // FILTRA OS AGENDAMENTOS DINAMICAMENTE
  const filteredBookings = bookings.filter(b => {
    // 1. Filtro de Período
    if (filterPeriod === 'dia') {
      if (b.date !== selectedDate) return false;
    } else if (filterPeriod === 'hoje') {
      const today = new Date().toISOString().split('T')[0];
      if (b.date !== today) return false;
    } else if (filterPeriod === 'amanha') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      if (b.date !== tomorrowStr) return false;
    } else if (filterPeriod === 'semana') {
      const bDate = new Date(b.date + 'T00:00:00');
      const now = new Date();
      const currentDay = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - currentDay);
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      if (bDate < startOfWeek || bDate > endOfWeek) return false;
    } else if (filterPeriod === 'mes') {
      const [year, month] = b.date.split('-');
      const now = new Date();
      if (Number(year) !== now.getFullYear() || Number(month) !== (now.getMonth() + 1)) return false;
    }

    // 2. Filtro de Status
    if (filterStatus !== 'todos') {
      if (b.status !== filterStatus) return false;
    }

    // 3. Filtro de Serviço
    if (filterServiceId !== 'todos') {
      if (b.serviceId !== filterServiceId) return false;
    }

    // 4. Filtro de Barbeiro
    if (filterBarber !== 'todos') {
      if (b.barberName !== filterBarber) return false;
    }

    // 5. Filtro de Cliente específico
    if (filterClientName !== 'todos') {
      if (b.clientName !== filterClientName) return false;
    }

    // 6. Filtro de Busca rápida (nome ou telefone do cliente)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = b.clientName.toLowerCase().includes(q);
      const phoneMatch = b.clientWhatsApp.replace(/\D/g, '').includes(q.replace(/\D/g, '')) || b.clientWhatsApp.includes(q);
      if (!nameMatch && !phoneMatch) return false;
    }

    return true;
  });

  // Obter lista única de clientes de todos os agendamentos registrados para o filtro
  const uniqueClients = Array.from(new Set(bookings.map(b => b.clientName))).filter(Boolean).sort();

  // Agendamentos ativos para a data selecionada do grid (filtrados pelo status/serviço e busca rápida)
  const activeBookingsForSelectedDate = filteredBookings.filter(b => b.date === activeGridDate);

  const getFriendlyPaymentMethod = (method?: string) => {
    switch (method) {
      case 'pix': return 'Pix';
      case 'dinheiro': return 'Dinheiro';
      case 'cartao': return 'Cartão';
      case 'cartao_debito': return 'Cartão Débito';
      case 'cartao_credito': return 'Cartão Crédito';
      case 'transferencia': return 'Inst. TED/DOC';
      case 'outro': return 'Outro';
      default: return 'Não definido';
    }
  };

  return (
    <div className="space-y-6 font-sans text-zinc-200" id="admin-agenda-container">
      {/* HEADER DA AGENDA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" /> Agenda Inteligente de Horários
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Gerencie slots de trabalho, adicione agendamentos manuais e envie notificações no WhatsApp.</p>
        </div>
        
        {/* FILTRO DE DATA */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs text-zinc-400 font-mono whitespace-nowrap">Data Principal:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setFilterPeriod('dia');
            }}
            className="bg-black text-white rounded-xl border border-white/5 px-4 py-2 font-mono text-sm focus:outline-none focus:border-amber-500/50 w-full md:w-auto cursor-pointer"
          />
        </div>
      </div>

      {/* FILTROS AVANÇADOS DE AGENDA */}
      <div className="bg-[#121212] border border-white/5 p-5 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wide">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Painel de Filtros e Busca Rápida
          </span>
          
          <div className="flex items-center gap-2 bg-black border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => setCurrentViewMode('grade')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                currentViewMode === 'grade'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Grade Diária
            </button>
            <button
              onClick={() => setCurrentViewMode('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                currentViewMode === 'lista'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Lista / Busca ({filteredBookings.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Busca Rápida */}
          <div className="space-y-1 relative">
            <label className="text-[11px] text-zinc-400 block font-medium">Busca rápida (Cliente / Tel)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Busque cliente ou WhatsApp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black border border-white/5 pl-8 pr-3 py-2 w-full text-xs text-white placeholder-zinc-550 rounded-xl focus:outline-none focus:border-amber-500/50"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            </div>
          </div>

          {/* Período */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 block font-medium">Período de Atendimento</label>
            <select
              value={filterPeriod}
              onChange={(e) => {
                const val = e.target.value as any;
                setFilterPeriod(val);
                if (val === 'semana' || val === 'mes' || val === 'todos') {
                  setCurrentViewMode('lista'); // Switche to list mode automatically for multi-day views!
                } else if (val === 'dia') {
                  setCurrentViewMode('grade');
                }
              }}
              className="bg-black border border-white/5 rounded-xl px-3 py-2 w-full text-xs text-white focus:outline-none focus:border-amber-500/50 font-sans"
            >
              <option value="dia">Dia da Data Principal ({selectedDate})</option>
              <option value="hoje">Hoje</option>
              <option value="amanha">Amanhã</option>
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mês</option>
              <option value="todos">Todos os Períodos</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 block font-medium">Filtrar por Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-black border border-white/5 rounded-xl px-3 py-2 w-full text-xs text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="todos">Todos os Status</option>
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 block font-medium">Filtrar por Cliente</label>
            <select
              value={filterClientName}
              onChange={(e) => setFilterClientName(e.target.value)}
              className="bg-black border border-white/5 rounded-xl px-3 py-2 w-full text-xs text-white focus:outline-none focus:border-amber-500/50 font-sans"
            >
              <option value="todos">Todos os Clientes</option>
              {uniqueClients.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Serviço */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 block font-medium">Filtrar por Serviço</label>
            <select
              value={filterServiceId}
              onChange={(e) => setFilterServiceId(e.target.value)}
              className="bg-black border border-white/5 rounded-xl px-3 py-2 w-full text-xs text-white focus:outline-none focus:border-amber-500/50 font-sans"
            >
              <option value="todos">Todos os Serviços</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Informations and Clean Filters button */}
        {(searchQuery || filterPeriod !== 'dia' || filterStatus !== 'todos' || filterServiceId !== 'todos' || filterClientName !== 'todos') && (
          <div className="flex justify-between items-center bg-zinc-950 px-4 py-2.5 rounded-2xl border border-white/5 text-xs text-zinc-400 font-sans">
            <span>Resultados: <strong>{filteredBookings.length}</strong> encontrados.</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterPeriod('dia');
                setFilterStatus('todos');
                setFilterServiceId('todos');
                setFilterClientName('todos');
                setFilterBarber('todos');
                setCurrentViewMode('grade');
              }}
              className="text-amber-500 hover:text-amber-400 font-bold underline cursor-pointer hover:no-underline"
            >
              Limpar Filtros e Busca
            </button>
          </div>
        )}
      </div>

      {/* GRADE DE HORÁRIOS DIÁRIA */}
      {currentViewMode === 'grade' && (
        <div className="bg-[#121212] border border-white/5 rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-200">
          <div className="p-4 bg-black border-b border-white/5 text-xs font-mono text-zinc-400 uppercase tracking-wider flex justify-between items-center">
            <span>Visualização Diária: {activeGridDate}</span>
            <span>Status / Informações do Cliente</span>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {timeSlots.map((slot) => {
              // Verifica se o slot está associado a algum agendamento (ativo ou cancelado) que passe pelos filtros
              const matches = activeBookingsForSelectedDate.filter(b => b.time === slot);
              const activeBooking = matches.find(b => b.status !== 'cancelado') || matches[0];

              return (
                <div key={slot} className="flex flex-col sm:flex-row p-4 min-h-[70px] hover:bg-zinc-900/30 transition-colors items-start sm:items-center justify-between gap-4">
                  {/* ID TIME */}
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-zinc-600" />
                    <span className="text-sm font-mono font-bold text-white bg-zinc-950 px-3 py-1 rounded-md border border-zinc-850">
                      {slot}
                    </span>
                  </div>

                  {/* DETALHES DO SLOT */}
                  <div className="flex-1 w-full sm:w-auto">
                    {activeBooking ? (
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                        {/* Cliente e Serviço associado */}
                        <div className="cursor-pointer" onClick={() => handleOpenDetails(activeBooking)}>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-sans font-bold ${activeBooking.status === 'cancelado' ? 'text-zinc-600 line-through' : 'text-white'}`}>
                              {activeBooking.clientName}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
                              {activeBooking.clientWhatsApp}
                            </span>
                          </div>
                          <p className={`text-xs text-zinc-400 mt-1 ${activeBooking.status === 'cancelado' ? 'line-through text-zinc-600' : ''}`}>
                            {activeBooking.serviceName} • <span className="font-mono text-amber-500 font-medium">R$ {activeBooking.servicePrice.toFixed(2)}</span>
                            {activeBooking.barberName && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] bg-zinc-805/80 text-amber-400/95 px-1.5 py-0.5 rounded font-sans scale-95 border border-zinc-700/50">
                                ✂️ {activeBooking.barberName}
                              </span>
                            )}
                          </p>
                          {activeBooking.notes && (
                            <p className="text-[11px] text-amber-500/60 italic overflow-hidden text-ellipsis max-w-md mt-0.5">
                              Obs: {activeBooking.notes}
                            </p>
                          )}
                        </div>

                        {/* Ações Específicas do Agendamento */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                          {/* Payment Method Badge (if concluded) */}
                          {activeBooking.status === 'concluido' && activeBooking.paymentMethod && (
                            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/30 px-2.5 py-0.5 rounded font-mono uppercase tracking-wide">
                              {getFriendlyPaymentMethod(activeBooking.paymentMethod)}
                            </span>
                          )}

                          {/* Status badge */}
                          <span onClick={() => handleOpenDetails(activeBooking)} className={`inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-1 rounded-full cursor-pointer font-medium ${
                            activeBooking.status === 'cancelado' ? 'bg-red-500/5 text-red-500 border border-red-500/10' :
                            activeBooking.status === 'concluido' ? 'bg-emerald-500/5 text-emerald-500 border border-emerald-500/10' :
                            activeBooking.status === 'confirmado' ? 'bg-blue-500/5 text-blue-400 border border-blue-505/10' :
                            'bg-amber-500/5 text-amber-500 border border-amber-500/15'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              activeBooking.status === 'cancelado' ? 'bg-red-500' :
                              activeBooking.status === 'concluido' ? 'bg-emerald-500' : 
                              activeBooking.status === 'confirmado' ? 'bg-blue-400 animate-pulse' : 'bg-amber-400 animate-pulse'
                            }`}></span>
                            {activeBooking.status === 'confirmado' ? 'CONFIRMADO' : activeBooking.status.toUpperCase()}
                          </span>

                          {/* Botões Lembrete directos de WhatsApp se ativo */}
                          {activeBooking.status !== 'cancelado' && activeBooking.status !== 'concluido' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSendWhatsAppMsg('confirmacao', activeBooking)}
                                title="Enviar Mensagem de Confirmação"
                                className="bg-zinc-950 text-amber-500 hover:bg-amber-500 hover:text-black border border-zinc-800 p-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleSendWhatsAppMsg('lembrete', activeBooking)}
                                title="Enviar Lembrete de Horário"
                                className="bg-zinc-950 text-emerald-405 hover:bg-emerald-500 hover:text-black border border-zinc-800 p-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Slot Disponível
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs text-zinc-500 font-mono italic">
                          Horário vago • Sem agendamento registrado
                        </span>
                        <button
                          onClick={() => handleOpenAdd(slot)}
                          className="bg-zinc-950 hover:bg-amber-500 text-amber-500 hover:text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-850 hover:border-amber-500 transition-all duration-200 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Agendar Horário
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODO LISTA DE AGENDAMENTOS COMPLETA COM MULTIPLOS DIAS */}
      {currentViewMode === 'lista' && (
        <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-semibold text-white font-display">Agendamentos Filtrados</h3>
            <span className="text-xs text-zinc-400 font-mono">Resultados encontrados: {filteredBookings.length}</span>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Calendar className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-zinc-400 text-sm">Nenhum agendamento encontrado para as pesquisas e filtros selecionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleOpenDetails(b)}
                  className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-white block">{b.clientName}</span>
                      
                      <span className={`inline-flex items-center gap-1 text-[9px] font-sans px-2 py-0.5 rounded-full font-medium ${
                        b.status === 'cancelado' ? 'bg-red-500/5 text-red-500 border border-red-500/10' :
                        b.status === 'concluido' ? 'bg-emerald-500/5 text-emerald-500 border border-emerald-500/10' :
                        b.status === 'confirmado' ? 'bg-blue-500/5 text-blue-400 border border-blue-500/10' :
                        'bg-amber-500/5 text-amber-500 border border-amber-500/15'
                      }`}>
                        {b.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      <span>{b.date} às {b.time}</span>
                    </div>

                    <p className="text-xs text-zinc-300">
                      💈 {b.serviceName} • <strong className="text-amber-500">R$ {b.servicePrice.toFixed(2)}</strong>
                    </p>

                    {b.barberName && (
                      <span className="text-[10px] bg-zinc-900 text-amber-400/90 px-2 py-0.5 border border-white/5 rounded self-start inline-block">
                        ✂️ {b.barberName}
                      </span>
                    )}

                    {b.notes && (
                      <p className="text-[11px] text-zinc-500 italic truncate mt-1">
                        "{b.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 items-center justify-between border-t border-zinc-900/60 pt-2 text-[10px]">
                    <span className="text-zinc-500 font-mono">{b.clientWhatsApp}</span>
                    
                    {b.status !== 'cancelado' && b.status !== 'concluido' && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleSendWhatsAppMsg('confirmacao', b)}
                          title="Enviar Confirmação"
                          className="bg-black text-amber-500 hover:bg-amber-500 hover:text-black border border-white/5 p-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleSendWhatsAppMsg('lembrete', b)}
                          title="Enviar Lembrete"
                          className="bg-black text-emerald-500 hover:bg-emerald-500 hover:text-black border border-white/5 p-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL INCLUSÃO MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl shadow-black/80 animate-in fade-in zoom-in duration-200">
            <div className="bg-black p-5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-base font-display font-semibold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" /> Agendar: {activeGridDate} às {selectedTimeSlot}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="p-5 space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Nome do Cliente *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Nome do cliente"
                    className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50 fill-zinc-950"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">WhatsApp do Cliente *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.clientWhatsApp}
                    onChange={(e) => setFormData({ ...formData, clientWhatsApp: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Selecione o Serviço *</label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (R$ {s.price.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Selecione o Barbeiro *</label>
                <select
                  value={formData.barberName}
                  onChange={(e) => setFormData({ ...formData, barberName: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                >
                  {(settings.barbers || ["Carlos", "Thiago", "Marcos"]).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Observações adicionais</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instruções ou preferências do cliente..."
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-850 pt-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block">Status Inicial</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-xs text-white"
                  >
                    <option value="agendado">Agendado</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>

                {formData.status === 'concluido' && (
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 block">Pagamento</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-xs text-white"
                    >
                      <option value="pix">Pix (Transf.)</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="transferencia">Transferência Bancária</option>
                      <option value="outro">Outro (Ajuste)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES / ALTERAÇÃO DE STATUS */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl shadow-black/80 animate-in fade-in zoom-in duration-200">
            <div className="bg-black p-5 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-display font-semibold text-white">Editar Agendamento</h3>
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">Identificador: {selectedBooking.id}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-sans">
              {/* Informações estáticas do agendamento */}
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Cliente</span>
                  <span className="text-white font-bold">{selectedBooking.clientName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Contato (WhatsApp)</span>
                  <span className="text-amber-400 font-mono">{selectedBooking.clientWhatsApp}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-zinc-900 pt-2">
                  <span className="text-zinc-500">Data e Horário</span>
                  <span className="text-white font-mono">{selectedBooking.date} às {selectedBooking.time}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Serviço Solicitado</span>
                  <span className="text-white font-semibold">{selectedBooking.serviceName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Barbeiro Designado</span>
                  <span className="text-white font-semibold">✂... {selectedBooking.barberName || "Qualquer Barbeiro"}</span>
                </div>
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-zinc-500">Valor do Serviço</span>
                  <span className="text-amber-500 font-mono font-bold">R$ {selectedBooking.servicePrice.toFixed(2)}</span>
                </div>
                {selectedBooking.notes && (
                  <div className="border-t border-zinc-900 pt-2 text-xs">
                    <span className="text-zinc-500 block">Observações do Cliente:</span>
                    <p className="text-zinc-300 italic mt-0.5">"{selectedBooking.notes}"</p>
                  </div>
                )}
              </div>

              {/* Botões para WhatsApp imediato */}
              <div className="flex gap-2 justify-center py-1">
                <button
                  onClick={() => handleSendWhatsAppMsg('confirmacao', selectedBooking)}
                  className="bg-zinc-950 hover:bg-zinc-900 text-amber-500 hover:text-amber-400 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Enviar Confirmação
                </button>
                <button
                  onClick={() => handleSendWhatsAppMsg('lembrete', selectedBooking)}
                  className="bg-zinc-950 hover:bg-emerald-500 text-emerald-500 hover:text-black px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Enviar Lembrete
                </button>
              </div>

              {/* Seções de alteração de estado */}
              {(selectedBooking.status === 'agendado' || selectedBooking.status === 'confirmado') && (
                <div className="space-y-3 border-t border-zinc-850 pt-4" id="actions-panel">
                  <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wide">Finalizar Atendimento:</h4>
                  
                  <div className="space-y-2 bg-zinc-950 p-3 rounded-2xl border border-zinc-850">
                    <label className="text-[11px] text-zinc-400 block font-medium">Selecione a Forma de Pagamento:</label>
                    <select
                      id="update-booking-paymethod-select"
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 w-full text-xs text-white focus:outline-none focus:border-amber-500/50"
                      defaultValue="pix"
                    >
                      <option value="pix">Pix (Transf. Imediata)</option>
                      <option value="dinheiro">Dinheiro (Espécie)</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="transferencia">Transferência Bancária</option>
                      <option value="outro">Outro (Ajuste)</option>
                    </select>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const paySelect = document.getElementById('update-booking-paymethod-select') as HTMLSelectElement;
                          const method = paySelect ? paySelect.value : 'pix';
                          handleUpdateStatus('concluido', method);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="h-4 w-4" /> Concluir Atendimento
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('confirmado')}
                        className="bg-zinc-900 hover:bg-zinc-855 border border-zinc-800 text-amber-550 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="h-4 w-4" /> Confirmar Horário
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpdateStatus('cancelado')}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-550 py-2 border border-red-500/15 rounded-xl text-xs font-bold transition-all mt-2 cursor-pointer"
                  >
                    Marcar como Cancelado
                  </button>
                </div>
              )}

              {/* Se Concluído, mostra formas de pagamento */}
              {selectedBooking.status === 'concluido' && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl text-xs text-emerald-400 font-sans flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Este atendimento foi concluído utilizando como forma de pagamento: <strong>{getFriendlyPaymentMethod(selectedBooking.paymentMethod)}</strong>.</span>
                </div>
              )}

              {/* Se Cancelado */}
              {selectedBooking.status === 'cancelado' && (
                <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-2xl text-xs text-red-400 font-sans flex items-center gap-2">
                  <X className="h-4 w-4 text-red-400" />
                  <span>Este agendamento foi cancelado / arquivado.</span>
                </div>
              )}

              {/* Deletar Registro */}
              <div className="flex justify-between items-center border-t border-zinc-850 pt-4 text-xs">
                <span className="text-zinc-500">Exclusão Permanente:</span>
                <button
                  onClick={handleDelete}
                  className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 p-2 rounded-xl transition-all cursor-pointer"
                  title="Apagar agendamento completamente"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
