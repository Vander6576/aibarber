import React, { useState, useEffect } from 'react';
import { Booking, Service, BookingStatus } from '../types';
import { Plus, Clock, User, Phone, Check, X, ShieldAlert, FileText, Send, Calendar, Trash2, ArrowLeftRight } from 'lucide-react';

interface AgendaProps {
  bookings: Booking[];
  services: Service[];
  startHour: string; // e.g. "08:00"
  endHour: string; // e.g. "20:00"
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateBooking: (id: string, update: Partial<Booking>) => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
}

export default function AdminAgenda({
  bookings,
  services,
  startHour,
  endHour,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking
}: AgendaProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Campos do formulário de novos agendamentos
  const [formData, setFormData] = useState({
    clientName: "",
    clientWhatsApp: "",
    serviceId: "",
    notes: "",
    status: "agendado" as BookingStatus,
    paymentMethod: "pix" as any
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
      paymentMethod: "pix"
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
        paymentMethod: formData.status === 'concluido' ? formData.paymentMethod : undefined
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

  // Mapeia agendamentos de hoje para cada slot correspondente
  const activeBookingsForSelectedDate = bookings.filter(b => b.date === selectedDate);

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
          <label className="text-xs text-zinc-400 font-mono whitespace-nowrap">Data Selecionada:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-black text-white rounded-xl border border-white/5 px-4 py-2 font-mono text-sm focus:outline-none focus:border-amber-500/50 w-full md:w-auto"
          />
        </div>
      </div>

      {/* GRADE DE HORÁRIOS */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-4 bg-black border-b border-white/5 text-xs font-mono text-zinc-400 uppercase tracking-wider flex justify-between">
          <span>Horário do Slot</span>
          <span>Status / Nome do Cliente / Ações</span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {timeSlots.map((slot) => {
            // Verifica se o slot está associado a algum agendamento (ativo ou cancelado)
            // Se houver múltiplos para o mesmo horário (ex: cancelado e re-agendado), prefere o activo
            const matches = activeBookingsForSelectedDate.filter(b => b.time === slot);
            const activeBooking = matches.find(b => b.status !== 'cancelado') || matches[0];

            return (
              <div key={slot} className="flex flex-col sm:flex-row p-4 min-h-[70px] hover:bg-zinc-900/30 transition-colors items-start sm:items-center justify-between gap-4">
                {/* ID TIME */}
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-zinc-650" />
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
                          <span className={`text-sm font-sans font-bold ${activeBooking.status === 'cancelado' ? 'text-zinc-650 line-through' : 'text-white'}`}>
                            {activeBooking.clientName}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
                            {activeBooking.clientWhatsApp}
                          </span>
                        </div>
                        <p className={`text-xs text-zinc-400 mt-1 ${activeBooking.status === 'cancelado' ? 'line-through text-zinc-650' : ''}`}>
                          {activeBooking.serviceName} • <span className="font-mono text-amber-500 font-medium">R$ {activeBooking.servicePrice.toFixed(2)}</span>
                        </p>
                        {activeBooking.notes && (
                          <p className="text-[11px] text-amber-500/60 italic overflow-hidden text-ellipsis max-w-md mt-0.5">
                            Obs: {activeBooking.notes}
                          </p>
                        )}
                      </div>

                      {/* Ações Específicas do Agendamento */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Status badge */}
                        <span onClick={() => handleOpenDetails(activeBooking)} className={`inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-1 rounded-full cursor-pointer font-medium ${
                          activeBooking.status === 'cancelado' ? 'bg-red-500/5 text-red-500 border border-red-500/10' :
                          activeBooking.status === 'concluido' ? 'bg-emerald-500/5 text-emerald-500 border border-emerald-500/10' :
                          'bg-amber-500/5 text-amber-500 border border-amber-500/15'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            activeBooking.status === 'cancelado' ? 'bg-red-500' :
                            activeBooking.status === 'concluido' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                          }`}></span>
                          {activeBooking.status.toUpperCase()}
                        </span>

                        {/* Botões Lembrete directos de WhatsApp se ativo */}
                        {activeBooking.status === 'agendado' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSendWhatsAppMsg('confirmacao', activeBooking)}
                              title="Enviar Confirmação"
                              className="bg-zinc-950 text-amber-500 hover:bg-amber-500 hover:text-black border border-zinc-800 p-1.5 rounded-lg transition-all"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSendWhatsAppMsg('lembrete', activeBooking)}
                              title="Enviar Lembrete"
                              className="bg-zinc-950 text-emerald-500 hover:bg-emerald-500 hover:text-black border border-zinc-800 p-1.5 rounded-lg transition-all"
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
                        className="bg-zinc-950 hover:bg-amber-500 text-amber-500 hover:text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-850 hover:border-amber-500 transition-all duration-200"
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

      {/* MODAL INCLUSÃO MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl shadow-black/80 animate-in fade-in zoom-in duration-200">
            <div className="bg-black p-5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-base font-display font-semibold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" /> Agendar: {selectedDate} às {selectedTimeSlot}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
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
                    placeholder="Nome completo ou apelido do cliente"
                    className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
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
                <label className="text-xs text-zinc-400 block font-medium">Observações adicionais</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Prefere corte baixo na tesoura, risco do lado esquerdo, etc."
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
                      <option value="cartao">Cartão Cred/Deb</option>
                    </select>
                  </div>
                )}
              </div>

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
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2 rounded-xl text-sm font-bold transition-all"
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
              <button onClick={() => setShowDetailsModal(false)} className="text-zinc-400 hover:text-white">
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
                  className="bg-zinc-950 hover:bg-zinc-900 text-amber-500 hover:text-amber-400 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Send className="h-3.5 w-3.5" /> Enviar Confirmação
                </button>
                <button
                  onClick={() => handleSendWhatsAppMsg('lembrete', selectedBooking)}
                  className="bg-zinc-950 hover:bg-emerald-500 text-emerald-500 hover:text-black px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Send className="h-3.5 w-3.5" /> Enviar Lembrete
                </button>
              </div>

              {/* Seções de alteração de estado */}
              {selectedBooking.status === 'agendado' && (
                <div className="space-y-2 border-t border-zinc-850 pt-4" id="actions-panel">
                  <h4 className="text-xs text-zinc-400 font-medium">Finalizar Atendimento:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateStatus('concluido', 'pix')}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black px-2 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center text-center leading-tight shadow"
                    >
                      <Check className="h-4 w-4 mb-1" /> Concluir (Pix)
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('concluido', 'dinheiro')}
                      className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-emerald-500 px-2 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center text-center leading-tight shadow"
                    >
                      <Check className="h-4 w-4 mb-1" /> Concluir (Din)
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('concluido', 'cartao')}
                      className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-amber-400 px-2 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center text-center leading-tight shadow"
                    >
                      <Check className="h-4 w-4 mb-1" /> Concluir (Cart)
                    </button>
                  </div>

                  <button
                    onClick={() => handleUpdateStatus('cancelado')}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 border border-red-500/15 rounded-xl text-xs font-bold transition-all mt-2"
                  >
                    Desejar Marcar como Cancelado
                  </button>
                </div>
              )}

              {/* Deletar Registro */}
              <div className="flex justify-between items-center border-t border-zinc-850 pt-4 text-xs">
                <span className="text-zinc-500">Exclusão Permanente:</span>
                <button
                  onClick={handleDelete}
                  className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 p-2 rounded-xl transition-all"
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
