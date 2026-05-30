import React, { useState, useEffect } from 'react';
import { Service, Booking, BarberSettings } from '../types';
import { dbStore } from '../dbStore';
import { Calendar, Clock, User, Phone, Check, ChevronRight, Search, Sparkles, MapPin, MessageSquare, AlertCircle, Trash2, Scissors } from 'lucide-react';
import { motion } from 'motion/react';

interface PublicAreaProps {
  services: Service[];
  bookings: Booking[];
  settings: BarberSettings;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateBooking: (id: string, update: Partial<Booking>) => Promise<void>;
}

export default function PublicClientArea({ services, bookings, settings, onAddBooking, onUpdateBooking }: PublicAreaProps) {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'lookup'>('schedule');

  // --- ESTADO DO FLUXO DE COMPRA (AGENDAMENTO) ---
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsApp, setCustomerWhatsApp] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [successBooking, setSuccessBooking] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ESTADO DA CONSULTA DE HORÁRIOS ---
  const [searchPhone, setSearchPhone] = useState("");
  const [searchedBookings, setSearchedBookings] = useState<Booking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Define data mínima como hoje
  const todayStr = new Date().toISOString().split('T')[0];

  // Limpa formulário após sucesso ou troca
  const resetScheduleWizard = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate("");
    setSelectedTime("");
    setCustomerName("");
    setCustomerWhatsApp("");
    setBookingNotes("");
    setSuccessBooking(null);
  };

  // Seleciona um serviço
  const handleSelectService = (srv: Service) => {
    setSelectedService(srv);
    setStep(2);
  };

  // Gera dias para os próximos 14 dias para o calendário público
  const getUpcomingDays = () => {
    const list = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      
      // Filtra dias de trabalho habilitados nas configurações (ex: ignora domingo)
      if (settings.workingDays.includes(dayOfWeek)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.getDate();
        const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' });
        const weekdayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        list.push({ dateStr, dayLabel, monthLabel, weekdayLabel });
      }
    }
    return list;
  };

  const upcomingDays = getUpcomingDays();

  // --- ESTADO LOCAL DE AGENDAMENTOS DO DIA SELECIONADO ---
  const [activeDateBookings, setActiveDateBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!selectedDate) {
      setActiveDateBookings([]);
      return;
    }

    let isMounted = true;
    const fetchBookingsForDate = async () => {
      try {
        const data = await dbStore.getBookingsByDate(selectedDate);
        if (isMounted) {
          setActiveDateBookings(data);
        }
      } catch (err) {
        console.error("Erro ao buscar agendamentos do dia:", err);
      }
    };

    fetchBookingsForDate();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Gera horários disponíveis para o dia selecionado com validação contra colisão de dados
  const getAvailableSlotsForDate = (date: string) => {
    if (!date) return [];
    
    // Converte horas de funcionamento comerciais em slots de 30 minutos
    const slots: string[] = [];
    const [startH, startM] = settings.startHour.split(':').map(Number);
    const [endH, endM] = settings.endHour.split(':').map(Number);
    
    let currH = startH;
    let currM = startM;

    while (currH < endH || (currH === endH && currM < endM)) {
      const slotTime = `${String(currH).padStart(2, '0')}:${String(currM).padStart(2, '0')}`;
      slots.push(slotTime);
      
      currM += 30;
      if (currM >= 60) {
        currH += 1;
        currM = 0;
      }
    }

    // Busca quais horários já estão ocupados nesta data (e não cancelados!)
    const occupiedTimes = activeDateBookings
      .filter(b => b.date === date && b.status !== 'cancelado')
      .map(b => b.time);

    return slots.map(time => ({
      time,
      isAvailable: !occupiedTimes.includes(time)
    }));
  };

  const slotsAvailable = getAvailableSlotsForDate(selectedDate);

  // Finalização do agendamento cliente público
  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerWhatsApp) {
      alert("Por favor preencha todos os campos para confirmar!");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onAddBooking({
        clientName: customerName,
        clientWhatsApp: customerWhatsApp,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        date: selectedDate,
        time: selectedTime,
        status: 'agendado',
        notes: bookingNotes
      });
      
      setSuccessBooking(result);
      setStep(4);
    } catch (err) {
      alert("Houve um problema ao confirmar seu horário. Tente novamente ou entre em contato!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buscar agendamentos de clientes por Whatsapp
  const handleLookupByPhone = async () => {
    const cleanSearch = searchPhone.trim().replace(/\D/g, '');
    if (!cleanSearch) {
      alert("Insira seu número de WhatsApp!");
      return;
    }

    try {
      const data = await dbStore.getBookingsByWhatsApp(searchPhone);
      const matched = data.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
      setSearchedBookings(matched);
      setHasSearched(true);
    } catch (err) {
      alert("Houve um problema ao buscar seus agendamentos. Tente novamente mais tarde.");
    }
  };

  // Cancelar horário pelo cliente público
  const handleClientCancelBooking = async (id: string, bookingDetails: Booking) => {
    const confirmCancellation = confirm(`Deseja mesmo cancelar seu horário de ${bookingDetails.serviceName} no dia ${bookingDetails.date.split('-').reverse().join('/')} às ${bookingDetails.time}? Sua vaga será reaberta na agenda imediatamente.`);
    if (!confirmCancellation) return;

    try {
      await onUpdateBooking(id, { status: 'cancelado' });
      alert("Seu horário foi cancelado com sucesso!");
      // Atualiza lista consultada localmente
      setSearchedBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelado' } : b));
    } catch (err) {
      alert("Erro ao efetuar cancelamento de agendamento. Favor entrar em contato.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-1 py-4 font-sans text-zinc-200" id="public-area-wrapper">
      
      {/* BRANDING LOGO COMPONENT */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="mx-auto bg-amber-500 text-black p-3.5 rounded-full w-fit mb-3 border-4 border-[#121212] shadow-md">
          <Scissors className="h-6 w-6 transform -rotate-45" />
        </div>

        <h1 className="text-2xl font-display font-bold tracking-tight text-white">{settings.name}</h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">{settings.address}</p>
        <span className="inline-block text-[11px] bg-black border border-white/5 text-amber-500 px-3 py-1 rounded-full font-mono font-semibold mt-3">
          Contato: {settings.phone}
        </span>
      </div>

      {/* TOP TOGGLER AREA PUBLIC */}
      <div className="flex bg-black border border-white/5 p-1 rounded-2xl text-sm" id="public-tabs-navigator">
        <button
          onClick={() => { setActiveSubTab('schedule'); }}
          className={`flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all font-sans cursor-pointer ${
            activeSubTab === 'schedule' ? 'bg-amber-500 text-black shadow font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" /> Agendar um Horário
        </button>
        <button
          onClick={() => { setActiveSubTab('lookup'); }}
          className={`flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all font-sans cursor-pointer ${
            activeSubTab === 'lookup' ? 'bg-amber-500 text-black shadow font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Search className="h-4 w-4" /> Meus Agendamentos
        </button>
      </div>

      {/* ==========================================
          VISTA 1: AGENDAMENTO (STEP BY STEP)
          ========================================== */}
      {activeSubTab === 'schedule' && (
        <div className="bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl flex flex-col justify-between" id="schedule-flow-card">
          
          {/* STEP PROGRESS INDICATOR */}
          {step < 4 && (
            <div className="flex justify-between items-center bg-black px-4 py-2.5 rounded-xl border border-white/5 mb-6 text-xs text-zinc-400 font-mono">
              <span className={step === 1 ? 'text-amber-500 font-bold' : 'text-emerald-500'}>1. Serviço</span>
              <ChevronRight className="h-4 w-4 text-zinc-700" />
              <span className={step === 2 ? 'text-amber-500 font-bold' : step > 2 ? 'text-emerald-500' : ''}>2. Dia e Hora</span>
              <ChevronRight className="h-4 w-4 text-zinc-700" />
              <span className={step === 3 ? 'text-amber-500 font-bold' : ''}>3. Identificação</span>
            </div>
          )}

          {/* STEP 1: CATALOG DE SERVIÇOS */}
          {step === 1 && (
            <div className="space-y-4" id="step-1-services">
              <div>
                <h3 className="text-base font-sans font-bold text-white flex items-center gap-1.5">
                  <Scissors className="h-4 w-4 text-amber-500" /> Escolha o Serviço Desejado
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Selecione uma das opções abaixo para prosseguir com a escolha do horário.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => handleSelectService(srv)}
                    className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 cursor-pointer hover:border-amber-500 sm:flex sm:justify-between sm:items-center text-left transition-all duration-200 group"
                  >
                    <div className="space-y-1 truncate sm:max-w-[70%]">
                      <h4 className="text-sm font-sans font-bold text-white group-hover:text-amber-500 transition-colors">{srv.name}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed truncate">{srv.description || "Finalização premium inclusa"}</p>
                      <span className="inline-block text-[10px] font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 rounded mt-1">Duração: {srv.duration} min</span>
                    </div>

                    <div className="flex justify-between sm:justify-end items-center gap-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-zinc-900">
                      <span className="text-sm font-mono font-bold text-amber-500">R$ {srv.price.toFixed(2)}</span>
                      <span className="bg-zinc-900 group-hover:bg-amber-500 group-hover:text-black border border-zinc-800 text-amber-400 p-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-0.5">
                        Agendar <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: ESCOLHER DIA E HORA */}
          {step === 2 && (
            <div className="space-y-6" id="step-2-date-time">
              <div>
                <button onClick={() => setStep(1)} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-semibold">
                  Voltar para Serviços
                </button>
                <h3 className="text-base font-sans font-bold text-white mt-3">Escolha a Data e o Horário</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Selecione o dia desejado para ver os horários que o barbeiro possui cadastrado livre.</p>
              </div>

              {/* CAROUSEL HORIZONTAL DE DIAS */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 block font-medium">Selecione o Dia:</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
                  {upcomingDays.map((day) => {
                    const isSelected = selectedDate === day.dateStr;
                    return (
                      <div
                        key={day.dateStr}
                        onClick={() => { setSelectedDate(day.dateStr); setSelectedTime(""); }}
                        className={`flex-shrink-0 w-16 p-3 rounded-xl border cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                          isSelected ? 'bg-amber-500 border-amber-500 text-black font-bold scale-[1.03]' : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                        }`}
                      >
                        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">{day.weekdayLabel}</span>
                        <span className="text-base font-bold my-0.5">{day.dayLabel}</span>
                        <span className="text-[9px] uppercase">{day.monthLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GRID DE HORARIOS SE DATA ESTIVER ATIVA */}
              {selectedDate ? (
                <div className="space-y-3 animation-fade-in">
                  <label className="text-xs text-zinc-400 block font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Horários Disponíveis para {selectedDate.split('-').reverse().join('/')}:
                  </label>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slotsAvailable.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-2 px-3 rounded-lg border font-mono text-xs font-bold transition-all ${
                            !slot.isAvailable ? 'bg-zinc-950/60 border-zinc-900/60 text-zinc-700 cursor-not-allowed line-through' :
                            isSelected ? 'bg-amber-500 border-amber-500 text-black scale-102 font-extrabold shadow' :
                            'bg-zinc-950 border-zinc-850 text-white hover:border-zinc-700'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>

                  {/* LEGEND SLOTS */}
                  <div className="flex gap-4 items-center text-[10px] text-zinc-500 pt-2 font-sans border-t border-zinc-900">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-950 border border-zinc-850"></span> Disponível</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-950/60 line-through"></span> Ocupado / Indisponível</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Seu Horário Selecionado</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-zinc-950 rounded-xl border border-dashed border-zinc-900 text-zinc-500 flex flex-col items-center">
                  <Calendar className="h-8 w-8 text-zinc-850 mb-2" />
                  <p className="text-xs">Por favor, selecione um dia acima para verificar os horários.</p>
                </div>
              )}

              {/* NAVEGAÇÃO PROXIMO STEP */}
              {selectedTime && (
                <div className="flex justify-end pt-4 border-t border-zinc-850">
                  <button
                    onClick={() => setStep(3)}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1 transition-all shadow"
                  >
                    Prosseguir Identificação <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CONTATO E CONFIRMAÇÃO DO CLIENTE */}
          {step === 3 && (
            <div className="space-y-6" id="step-3-customer-form">
              <div>
                <button onClick={() => setStep(2)} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-semibold">
                  Voltar para Calendário
                </button>
                <h3 className="text-base font-sans font-bold text-white mt-3">Preencha seus Dados para Agendamento</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Precisamos do seu WhatsApp para enviar avisos de confirmação e alerta de lembrete.</p>
              </div>

              {/* CARD RESUMO EXPLICATIVO */}
              {selectedService && (
                <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-2 text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Serviço Escolhido:</span>
                    <span className="text-white font-bold">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-sans">Data & Horário:</span>
                    <span className="text-amber-400 font-mono font-bold">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-900 pt-2 text-zinc-400">
                    <span>Preço a ser pago na barbearia:</span>
                    <span className="font-mono font-bold text-white">R$ {selectedService.price.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleConfirmReservation} className="space-y-4 font-sans">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Seu Nome Completo *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="Identifique-se para o barbeiro"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-sm text-white pl-9 pr-4 py-2 w-full rounded-xl focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">WhatsApp ou Celular *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="(11) 99999-8888"
                      value={customerWhatsApp}
                      onChange={(e) => setCustomerWhatsApp(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-sm text-white pl-9 pr-4 py-2 w-full rounded-xl focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Alguma recomendação/obs para o barbeiro?</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Gosto da barba desenhada, riscar o cabelo na máquina, etc."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-sm text-white px-3 py-2 w-full rounded-xl focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-zinc-850">
                  <span className="text-[11px] text-zinc-500 flex gap-1">
                    <AlertCircle className="h-4 w-4 feed-shrink" /> Ao agendar você concorda com o comparecimento.
                  </span>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1 transition-all shadow"
                  >
                    {isSubmitting ? "Confirmando..." : "Confirmar Agendamento 💈"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 4: SUCESSO DO AGENDAMENTO */}
          {step === 4 && successBooking && (
            <div className="space-y-5 text-center py-6 animate-in fade-in zoom-in duration-300 font-sans" id="step-4-success animate-all">
              <div className="mx-auto bg-emerald-500/10 text-emerald-500 p-4 rounded-full w-fit border-4 border-zinc-950 shadow">
                <Check className="h-10 w-10 animate-bounce" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Agendamento Realizado com Sucesso!</h3>
                <p className="text-xs text-zinc-400 mt-2">O barbeiro foi avisado e colocou seu nome no horário escolhido.</p>
              </div>

              {/* CARD DETALHADO DA RESERVA */}
              <div className="bg-zinc-950 border border-zinc-850 text-left p-5 rounded-2xl space-y-3 font-sans max-w-sm mx-auto">
                <div className="border-b border-zinc-900 pb-2.5">
                  <h4 className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Serviço Reservado:</h4>
                  <span className="text-sm font-bold text-white block mt-1">{successBooking.serviceName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-zinc-900 pb-2.5">
                  <div>
                    <h5 className="text-[10px] text-zinc-500 font-semibold uppercase">Dia Escolhido:</h5>
                    <span className="text-xs font-bold text-amber-500 block mt-0.5">{successBooking.date.split('-').reverse().join('/')}</span>
                  </div>
                  <div>
                    <h5 className="text-[10px] text-zinc-500 font-semibold uppercase">Horário:</h5>
                    <span className="text-xs font-bold text-amber-500 block mt-0.5">{successBooking.time}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-zinc-400 pt-1">
                  <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-zinc-300">Localização:</strong>
                    <p className="text-[11px] mt-0.5 leading-relaxed">{settings.address}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={resetScheduleWizard}
                  className="bg-zinc-950 hover:bg-zinc-900 text-amber-500 px-5 py-2.5 rounded-xl text-sm font-bold border border-zinc-800 hover:border-amber-500/40 transition-all shadow"
                >
                  Fazer outro agendamento
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          VISTA 2: CONSULTA / CANCELAMENTO CLIENTE
          ========================================== */}
      {activeSubTab === 'lookup' && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-6" id="lookup-panel-card">
          
          <div className="space-y-1.5">
            <h3 className="text-base font-sans font-bold text-white flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-amber-500" /> Consultar Seus Horários Agendados
            </h3>
            <p className="text-xs text-zinc-400">Entre com o número de WhatsApp cadastrado ao efetuar seu agendamento para verificar todos os seus horários.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 font-sans">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="(11) 99999-8888"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-550 pl-9 pr-4 py-2 w-full rounded-xl focus:outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
            
            <button
              onClick={handleLookupByPhone}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
            >
              <Search className="h-4 w-4" /> Buscar Agendamentos
            </button>
          </div>

          {/* LISTA CONSULTADA */}
          {hasSearched && (
            <div className="space-y-4 pt-2 border-t border-zinc-850 animation-fade-in animate-all">
              <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">Resultado da Busca ({searchedBookings.length})</h4>
              
              {searchedBookings.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950 rounded-xl border border-dashed border-zinc-900 text-zinc-500 flex flex-col items-center">
                  <AlertCircle className="h-8 w-8 text-zinc-850 mb-2" />
                  <p className="text-xs">Não encontramos nenhum agendamento associado a este WhatsApp.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchedBookings.map((bk) => {
                    const isCanceled = bk.status === 'cancelado';
                    const isCompleted = bk.status === 'concluido';
                    const isUpcoming = bk.status === 'agendado' && bk.date >= todayStr;

                    return (
                      <div
                        key={bk.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                          isCanceled ? 'bg-zinc-955 border-zinc-850/20 text-zinc-650' :
                          isCompleted ? 'bg-zinc-900/40 border-zinc-800 border-l-2 border-l-emerald-500/70' :
                          'bg-zinc-950 border-zinc-850 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className={`text-sm font-bold ${isCanceled ? 'text-zinc-600 line-through' : 'text-white'}`}>{bk.serviceName}</h5>
                            <span className={`text-[10px] font-sans px-2.0 py-0.5 rounded-full font-semibold ${
                              isCanceled ? 'bg-red-500/5 text-red-500' :
                              isCompleted ? 'bg-emerald-500/5 text-emerald-400' : 'bg-amber-500/15 text-amber-500 animate-pulse'
                            }`}>
                              {bk.status.toUpperCase()}
                            </span>
                          </div>

                          <span className="text-xs font-mono text-zinc-400 block mt-1.5">
                            Data: <strong className="text-zinc-300">{bk.date.split('-').reverse().join('/')}</strong> às <strong className="text-zinc-300">{bk.time}</strong>
                          </span>
                          <span className="text-[11px] font-mono font-medium text-zinc-500 block mt-0.5">Preço: R$ {bk.servicePrice.toFixed(2)}</span>
                          {bk.notes && (
                            <p className="text-[11px] text-amber-500/50 italic mt-1 font-sans">Obs: {bk.notes}</p>
                          )}
                        </div>

                        {/* AÇÃO CANCELAR LIVRE PARA CLIENTE SE AGENDADO NO FUTURO */}
                        {isUpcoming && (
                          <button
                            onClick={() => handleClientCancelBooking(bk.id, bk)}
                            className="bg-red-500/5 hover:bg-red-500 border border-red-500/10 hover:border-red-650 text-red-500 hover:text-white text-xs font-bold font-sans px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 leading-none shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Cancelar Horário
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
