import React, { useState, useEffect } from 'react';
import { Service, Booking, BarberSettings } from '../types';
import { dbStore } from '../dbStore';
import { Calendar, Clock, User, Phone, Check, ChevronRight, Search, Sparkles, MapPin, MessageSquare, AlertCircle, Trash2, Scissors, X } from 'lucide-react';
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

  // Brasília timezone helpers
  const getTodayBrasiliaStr = () => {
    try {
      const formatter = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
      return formatter.format(new Date()); // YYYY-MM-DD in São Paulo / Brasília
    } catch (e) {
      const d = new Date();
      d.setMinutes(d.getMinutes() - 180); // UTC-3 approximation
      return d.toISOString().split('T')[0];
    }
  };

  const getNowBrasiliaTime = () => {
    try {
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return formatter.format(new Date()); // HH:mm in São Paulo / Brasília
    } catch (e) {
      const d = new Date();
      const brDate = new Date(d.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      const hours = String(brDate.getHours()).padStart(2, '0');
      const minutes = String(brDate.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  };

  const todayStr = getTodayBrasiliaStr();

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

  // Gera dias para os próximos 14 dias para o calendário público com base no fuso de Brasília
  const getUpcomingDays = () => {
    const list = [];
    const todayBrStr = getTodayBrasiliaStr();
    const [yr, mo, dy] = todayBrStr.split('-').map(Number);
    
    for (let i = 0; i < 14; i++) {
      const d = new Date(yr, mo - 1, dy);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      
      // Filtra dias de trabalho habilitados nas configurações (ex: ignora domingo)
      if (settings.workingDays.includes(dayOfWeek)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  // Gera horários disponíveis para o dia selecionado com fuso de Brasília e hora limite do dia
  const getAvailableSlotsForDate = (date: string) => {
    if (!date) return [];
    
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

    const todayBrStr = getTodayBrasiliaStr();
    const nowBrTime = getNowBrasiliaTime();

    return slots.map(time => {
      let isAvailable = !occupiedTimes.includes(time);
      
      // Se for hoje no fuso do Brasil, o horário do slot deve ser maior do que a hora atual de Brasília
      if (isAvailable && date === todayBrStr) {
        isAvailable = time > nowBrTime;
      }

      return {
        time,
        isAvailable
      };
    });
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
      setSearchedBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelado' } : b));
    } catch (err) {
      alert("Erro ao efetuar cancelamento de agendamento. Favor entrar em contato.");
    }
  };

  // Serviços Fictícios Premium para caso não haja serviços cadastrados no Firestore/Supabase
  const fallbackServices: Service[] = [
    { id: "s1", name: "Corte Masculino Degradê", price: 50.00, duration: 30, description: "Corte moderno com técnica degradê (fade) limpo e acabamento na navalha profissional." },
    { id: "s2", name: "Barba Terapia Imperial", price: 35.00, duration: 30, description: "Alinhamento de barba com toalha quente vaporizada, óleos hidratantes e balm corretivo." },
    { id: "s3", name: "Combo Cabelo + Barba Premium", price: 80.00, duration: 60, description: "Corte degradê estiloso, mais sua barba completa com toalha quente confortável." },
    { id: "s4", name: "Sobrancelha Design Navalha", price: 20.00, duration: 15, description: "Design e limpeza das sobrancelhas feito de forma detalhada na navalha." },
    { id: "s5", name: "Pigmentação Capilar Corretiva", price: 40.00, duration: 45, description: "Disfarce de falhas com pigmentos premium de alta durabilidade para cabelo ou barba." },
    { id: "s6", name: "Luzes / Reflexo Alinhado", price: 90.00, duration: 60, description: "Descoloração moderna com touca ou mechas marcadas com finalização nutritiva." },
    { id: "s7", name: "Selagem Redutora de Fios", price: 120.00, duration: 90, description: "Redução de frizz e volume com hidratação profunda e realinhamento térmico." },
    { id: "s8", name: "Combo Pai e Filho", price: 110.00, duration: 90, description: "Cortar o cabelo junto com o amigão num momento especial de parceria masculina." }
  ];

  const activeServices = services && services.length > 0 ? services : fallbackServices;

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
          VISTA 1: AGENDAMENTO (CATÁLOGO SEMPRE VISÍVEL)
          ========================================== */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-6" id="schedule-flow-card">
          
          {/* CATÁLOGO DE SERVIÇOS VISÍVEL EM GRADE */}
          <div className="bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl space-y-4" id="services-catalog-view">
            <div>
              <span className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider block mb-1">Catálogo de Serviços</span>
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Scissors className="h-5 w-5 text-amber-500" /> Nossos Serviços Profissionais
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Selecione o serviço abaixo que deseja agendar. A lista abaixo estará sempre disponível para você agendar novos serviços seguidos para outros clientes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {activeServices.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => handleSelectService(srv)}
                  className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-5 cursor-pointer hover:border-amber-500/70 sm:flex sm:flex-col sm:justify-between text-left transition-all duration-300 group hover:shadow-lg hover:shadow-amber-500/5 relative overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-sans font-bold text-white group-hover:text-amber-500 transition-colors line-clamp-1">{srv.name}</h4>
                      <span className="text-sm font-mono font-bold text-amber-500 whitespace-nowrap">R$ {srv.price.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 h-8">{srv.description || "Finalização premium inclusa com cuidados especiais."}</p>
                  </div>

                  <div className="flex justify-between items-center gap-4 mt-4 pt-3 border-t border-zinc-900/60 text-xs text-zinc-550 border-zinc-900">
                    <span className="inline-block text-[10px] font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-850 px-2.5 py-0.5 rounded-full">Duração: {srv.duration} min</span>
                    <span className="bg-zinc-900 group-hover:bg-amber-500 group-hover:text-black border border-zinc-800 text-amber-400 px-3.5 py-1.5 rounded-xl font-bold font-sans transition-all flex items-center gap-1">
                      Reservar <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FLOATING DETAILED SCHEDULING MODAL OVERLAY */}
          {selectedService && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" id="scheduling-wizard-overlay">
              <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl relative w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4" id="modal-container-wizard">
                
                {/* BOTÃO PARA FECHAR / CANCELAR */}
                <button
                  type="button"
                  onClick={resetScheduleWizard}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* MODAL HEADER */}
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-xl border border-amber-500/20">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Agendamento Online</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Complemente os dados para reservar sua vaga.</p>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="flex justify-between items-center bg-black px-4 py-2.5 rounded-xl border border-white/5 text-[10px] text-zinc-400 font-mono">
                  <span className="text-emerald-500 flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> {selectedService.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                  <span className={step === 2 ? 'text-amber-500 font-bold' : step > 2 ? 'text-emerald-500' : ''}>2. Escolher Dia/Hora</span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                  <span className={step === 3 ? 'text-amber-500 font-bold' : ''}>3. Seus Dados</span>
                </div>

                {/* STEP 2 IN OVERLAY: DATA & HORA */}
                {step === 2 && (
                  <div className="space-y-4 pt-1" id="step-2-date-time">
                    <div>
                      <h4 className="text-sm font-sans font-bold text-white">Selecione o Dia e Horário Desejado</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">Nossos horários acompanham o fuso oficial de Brasília.</p>
                    </div>

                    {/* HORIZONTAL DAYS CAROUSEL */}
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-400 block font-medium">Dias Disponíveis:</label>
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
                              <span className="text-[9px] font-mono uppercase tracking-wider font-semibold">{day.weekdayLabel}</span>
                              <span className="text-base font-bold my-0.5">{day.dayLabel}</span>
                              <span className="text-[9px] uppercase">{day.monthLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SLOTS DISPONÍVEIS */}
                    {selectedDate ? (
                      <div className="space-y-3 pt-1 animation-fade-in">
                        <label className="text-xs text-zinc-400 block font-medium flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-amber-500" /> Horários Disponíveis para {selectedDate.split('-').reverse().join('/')}:
                        </label>

                        <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {slotsAvailable.length > 0 ? (
                            slotsAvailable.map((slot) => {
                              const isSelected = selectedTime === slot.time;
                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  disabled={!slot.isAvailable}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={`py-2 px-1 rounded-lg border font-mono text-xs font-bold transition-all ${
                                    !slot.isAvailable ? 'bg-zinc-950/60 border-zinc-900/40 text-zinc-700 cursor-not-allowed line-through' :
                                    isSelected ? 'bg-amber-500 border-amber-500 text-black scale-102 font-extrabold shadow' :
                                    'bg-zinc-950 border-zinc-850 text-white hover:border-zinc-700'
                                  }`}
                                >
                                  {slot.time}
                                </button>
                              );
                            })
                          ) : (
                            <div className="col-span-4 p-4 text-center text-xs text-zinc-500 bg-zinc-950 rounded-xl border border-dashed border-zinc-900">
                              Nenhum horário comercial livre para hoje.
                            </div>
                          )}
                        </div>

                        {/* LEGEND SLOTS */}
                        <div className="flex gap-4 items-center text-[9px] text-zinc-500 pt-2 font-sans border-t border-zinc-900">
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-950 border border-zinc-850"></span> Disponível</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-950/60 line-through"></span> Ocupado/Passou</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Selecionado</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-zinc-950 rounded-xl border border-dashed border-zinc-900 text-zinc-500 flex flex-col items-center">
                        <Calendar className="h-6 w-6 text-zinc-800 mb-1" />
                        <p className="text-xs">Por favor, selecione um dia acima para verificar horários.</p>
                      </div>
                    )}

                    {/* CONTINUAR */}
                    <div className="flex justify-between items-center pt-4 border-t border-zinc-850">
                      <button
                        type="button"
                        onClick={resetScheduleWizard}
                        className="text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      
                      <button
                        type="button"
                        disabled={!selectedTime}
                        onClick={() => setStep(3)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow ${
                          selectedTime ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        Avançar Identificação <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3 IN OVERLAY: IDENTIFICATION */}
                {step === 3 && (
                  <div className="space-y-4 pt-1" id="step-3-customer-form">
                    <div>
                      <button onClick={() => setStep(2)} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-semibold">
                        Voltar para Calendário
                      </button>
                      <h3 className="text-sm font-sans font-bold text-white mt-2">Dados de Confirmação</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Preencha os campos para o barbeiro te identificar.</p>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-sans">Serviço:</span>
                        <span className="text-white font-bold">{selectedService.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Agenda:</span>
                        <span className="text-amber-500 font-mono font-bold">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-900 pt-1.5 text-zinc-400">
                        <span>Total:</span>
                        <span className="font-mono font-bold text-white">R$ {selectedService.price.toFixed(2)}</span>
                      </div>
                    </div>

                    <form onSubmit={handleConfirmReservation} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-500 block">Seu Nome Completo *</label>
                        <div className="relative font-sans">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <input
                            type="text"
                            required
                            placeholder="Como quer ser chamado?"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 text-xs text-white pl-9 pr-4 py-2 w-full rounded-xl focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-zinc-500 block">WhatsApp ou Celular *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <input
                            type="text"
                            required
                            placeholder="(11) 99999-8888"
                            value={customerWhatsApp}
                            onChange={(e) => setCustomerWhatsApp(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 text-xs text-white pl-9 pr-4 py-2 w-full rounded-xl focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-zinc-500 block font-sans">Algum recado para o barbeiro? (Opcional)</label>
                        <textarea
                          rows={2}
                          placeholder="Alguma observação, detalhe do corte, etc..."
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 text-xs text-white px-3 py-2 w-full rounded-xl focus:outline-none focus:border-amber-500/50"
                        />
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-zinc-850">
                        <span className="text-[10px] text-zinc-500 flex gap-1 items-center">
                          <AlertCircle className="h-3.5 w-3.5" /> Faremos sua reserva imediata.
                        </span>
                        
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
                        >
                          {isSubmitting ? "Cadastrando..." : "Confirmar Agendamento 💈"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STEP 4 IN OVERLAY: SUCCESS CONFIRMATION */}
                {step === 4 && successBooking && (
                  <div className="space-y-4 text-center py-4 animate-in fade-in zoom-in duration-300" id="step-4-success-block">
                    <div className="mx-auto bg-emerald-500/10 text-emerald-500 p-3.5 rounded-full w-fit border-2 border-emerald-500/20 shadow">
                      <Check className="h-8 w-8 animate-bounce" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">Agendamento Realizado com Sucesso!</h3>
                      <p className="text-xs text-zinc-400 mt-1">Sua vaga está reservada em nosso sistema com sucesso.</p>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-850 text-left p-4 rounded-xl space-y-2 text-xs max-w-sm mx-auto">
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase">Serviço:</span>
                        <strong className="text-white text-sm block mt-0.5">{successBooking.serviceName}</strong>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-2 font-sans">
                        <div>
                          <span className="text-zinc-500 block text-[10px] uppercase">Data:</span>
                          <strong className="text-amber-500 font-mono text-xs block mt-0.5">{successBooking.date.split('-').reverse().join('/')}</strong>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px] uppercase font-sans">Horário:</span>
                          <strong className="text-amber-500 font-mono text-xs block mt-0.5">{successBooking.time}</strong>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-[10px] text-zinc-400 border-t border-zinc-900 pt-2">
                        <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>{settings.name}</strong>
                          <p className="mt-0.5 text-zinc-500">{settings.address}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-850 flex flex-col gap-2 font-sans">
                      <button
                        type="button"
                        onClick={resetScheduleWizard}
                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow w-full"
                      >
                        Pronto! Voltar para os Serviços
                      </button>
                      <button
                        type="button"
                        onClick={() => { resetScheduleWizard(); setActiveSubTab('lookup'); }}
                        className="bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all border border-zinc-800 w-full"
                      >
                        Ir para Meus Agendamentos
                      </button>
                    </div>
                  </div>
                )}

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
