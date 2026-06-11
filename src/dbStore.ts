import { supabase, isSupabaseEnabled, setSupabaseOffline } from './supabase';
import { Service, Booking, Client, Transaction, BarberSettings } from './types';

// Helper function to check if Supabase queries should actively run (returns false if local demo/bypass is active)
function isSupabaseActive(): boolean {
  try {
    return !!(isSupabaseEnabled && supabase && localStorage.getItem('barber_admin_auth') !== 'true');
  } catch {
    return !!(isSupabaseEnabled && supabase);
  }
}

// Helper to handle Supabase errors gracefully without crashing the app
function handleSupabaseError(error: any, operation: string) {
  console.warn(`[SUPABASE ERROR] during "${operation}":`, error);
  const msg = (error?.message || String(error)).toLowerCase();
  const isOffline = msg.includes('offline') || 
                    msg.includes('fetch failed') || 
                    msg.includes('failed to fetch') || 
                    msg.includes('network');
  if (isOffline) {
    setSupabaseOffline(true);
  }
}

// Helper to fetch the currently authenticated admin's user_id from Supabase auth session
async function getAdminUserId(): Promise<string | null> {
  if (isSupabaseActive()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (e) {
      console.warn("Could not retrieve logged-in admin user ID:", e);
    }
  }
  return null;
}

// ==========================================
// CENTRALIZAÇÃO DOS MAPEAMENTOS (CamelCase <-> Snake_case)
// ==========================================

function mapSettingsFromDb(data: any): BarberSettings {
  return {
    userId: data.user_id,
    slug: data.slug || '',
    name: data.name || '',
    address: data.address || '',
    phone: data.phone || '',
    logoUrl: data.logo_url || '',
    startHour: data.start_hour || '08:00',
    endHour: data.end_hour || '20:00',
    workingDays: data.working_days || [1, 2, 3, 4, 5, 6],
    barbers: data.barbers || [],
    adminName: data.admin_name || 'Ricardo'
  };
}

function mapSettingsToDb(data: BarberSettings, userId: string): any {
  const rawIdentifier = data.slug || data.adminName || data.name || "barbearia";
  const formattedSlug = rawIdentifier.trim().toLowerCase()
    .normalize('NFD') // remove accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  return {
    id: userId, // Utiliza o próprio user_id do administrador como ID único de sua barbearia
    user_id: userId,
    slug: data.slug || formattedSlug,
    name: data.name,
    address: data.address,
    phone: data.phone,
    logo_url: data.logoUrl || '',
    start_hour: data.startHour,
    end_hour: data.endHour,
    working_days: data.workingDays || [],
    barbers: data.barbers || [],
    admin_name: data.adminName || ''
  };
}

function mapBookingFromDb(data: any): Booking {
  return {
    id: data.id,
    clientName: data.client_name,
    clientWhatsApp: data.client_whatsapp,
    serviceId: data.service_id,
    serviceName: data.service_name,
    servicePrice: Number(data.service_price),
    date: data.date,
    time: data.time,
    status: data.status,
    notes: data.notes || '',
    paymentMethod: data.payment_method || undefined,
    barberName: data.barber_name || '',
    createdAt: data.created_at
  };
}

function mapBookingToDb(data: any, userId: string): any {
  return {
    id: data.id,
    user_id: userId,
    client_name: data.clientName,
    client_whatsapp: data.clientWhatsApp,
    service_id: data.serviceId,
    service_name: data.serviceName,
    service_price: data.servicePrice,
    date: data.date,
    time: data.time,
    status: data.status,
    notes: data.notes || null,
    payment_method: data.paymentMethod || null,
    barber_name: data.barberName || null,
    created_at: data.createdAt
  };
}

function mapClientFromDb(data: any): Client {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone || '',
    whatsapp: data.whatsapp,
    birthDate: data.birth_date || '',
    notes: data.notes || '',
    createdAt: data.created_at,
    totalBookings: Number(data.total_bookings || 0),
    totalSpent: Number(data.total_spent || 0)
  };
}

function mapClientToDb(data: any, userId: string): any {
  return {
    id: data.id,
    user_id: userId,
    name: data.name,
    phone: data.phone || null,
    whatsapp: data.whatsapp,
    birth_date: data.birthDate || null,
    notes: data.notes || null,
    created_at: data.createdAt,
    total_bookings: data.totalBookings || 0,
    total_spent: data.totalSpent || 0
  };
}

function mapTransactionFromDb(data: any): Transaction {
  return {
    id: data.id,
    type: data.type,
    amount: Number(data.amount),
    date: data.date,
    description: data.description,
    paymentMethod: data.payment_method,
    bookingId: data.booking_id || undefined,
    createdAt: data.created_at
  };
}

function mapTransactionToDb(data: any, userId: string): any {
  return {
    id: data.id,
    user_id: userId,
    type: data.type,
    amount: data.amount,
    date: data.date,
    description: data.description,
    payment_method: data.paymentMethod,
    booking_id: data.bookingId || null,
    created_at: data.createdAt
  };
}

// Inicializador de LocalStorage para contingência offline - Totalmente sem dados fakes de exemplo
function initLocalStorage() {
  if (!localStorage.getItem('barber_settings')) {
    const defaultBlankSettings: BarberSettings = {
      name: "Minha Barbearia",
      address: "Cadastre seu endereço",
      phone: "(99) 99999-9999",
      logoUrl: "",
      startHour: "08:00",
      endHour: "20:00",
      workingDays: [1, 2, 3, 4, 5, 6],
      barbers: [],
      adminName: "Administrador"
    };
    localStorage.setItem('barber_settings', JSON.stringify(defaultBlankSettings));
  }
  if (!localStorage.getItem('barber_services')) {
    localStorage.setItem('barber_services', JSON.stringify([]));
  }
  if (!localStorage.getItem('barber_bookings')) {
    localStorage.setItem('barber_bookings', JSON.stringify([]));
  }
  if (!localStorage.getItem('barber_clients')) {
    localStorage.setItem('barber_clients', JSON.stringify([]));
  }
  if (!localStorage.getItem('barber_transactions')) {
    localStorage.setItem('barber_transactions', JSON.stringify([]));
  }
}

initLocalStorage();

// ==========================================
// PRINCIPAL DB STORE - EXCLUSIVO SUPABASE (COM ISOLAMENTO MULTIUSUÁRIO)
// ==========================================

export const dbStore = {
  
  // Limpa estado local do painel
  resetToDemo() {
    localStorage.removeItem('barber_settings');
    localStorage.setItem('barber_services', '[]');
    localStorage.setItem('barber_bookings', '[]');
    localStorage.setItem('barber_clients', '[]');
    localStorage.setItem('barber_transactions', '[]');
    window.location.reload();
  },

  // --- CONFIGURAÇÕES DA BARBEARIA (SaaS Multiempresa) ---
  
  // Obtém configurações. Se targetUserId for omitido, obtém o do Admin autenticado.
  async getSettings(targetUserId?: string | null): Promise<BarberSettings | null> {
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        
        if (!userId) {
          return null;
        }

        const { data, error } = await supabase
          .from('barber_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const settings = mapSettingsFromDb(data);
          localStorage.setItem('barber_settings', JSON.stringify(settings));
          return settings;
        } else {
          // Se for o Admin logado e não possuir configurações, cria uma linha nova e real no banco de dados para ele!
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === userId) {
            const cleanEmailName = (user.email?.split('@')[0] || "Administrador")
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '-');
            
            const defaultNewSettings: BarberSettings = {
              name: "Minha Barbearia",
              slug: cleanEmailName || "barbearia",
              address: "Adicione seu endereço",
              phone: "(99) 99999-9999",
              logoUrl: "",
              startHour: "08:00",
              endHour: "20:00",
              workingDays: [1, 2, 3, 4, 5, 6],
              barbers: ["Carlos", "Thiago", "Marcos"],
              adminName: user.email?.split('@')[0] || "Administrador"
            };
            const payload = mapSettingsToDb(defaultNewSettings, user.id);
            const { error: upsertErr } = await supabase.from('barber_settings').upsert([payload]);
            if (upsertErr) {
              console.warn("Could not initialize default settings:", upsertErr);
            }
            return defaultNewSettings;
          }
          return null;
        }
      } catch (error) {
        handleSupabaseError(error, 'getSettings');
      }
    }
    const local = localStorage.getItem('barber_settings');
    return local ? JSON.parse(local) : null;
  },

  // Busca configurações de um barbeiro específico por slug (nome administrativo) ou user_id
  async getSettingsBySlugOrId(slugOrId: string): Promise<(BarberSettings & { user_id: string }) | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);
    
    if (isSupabaseActive()) {
      try {
        let query = supabase.from('barber_settings').select('*');
        if (isUuid) {
          query = query.eq('user_id', slugOrId);
        } else {
          const cleanSlugStr = slugOrId.trim().toLowerCase();
          query = query.eq('slug', cleanSlugStr);
        }
        
        const { data, error } = await query.limit(1).maybeSingle();
        if (error) throw error;
        if (data) {
          const settings = mapSettingsFromDb(data);
          return {
            ...settings,
            user_id: data.user_id
          };
        }
        return null;
      } catch (error) {
        console.error("Erro ao buscar barbearia pública:", error);
        return null;
      }
    }
    const local = localStorage.getItem('barber_settings');
    if (local) {
      const parsed = JSON.parse(local);
      const cleanSlug = (parsed.slug || '').trim().toLowerCase();
      const cleanInput = slugOrId.trim().toLowerCase();
      if (cleanSlug === cleanInput || cleanInput === 'barbearia' || cleanInput === 'demo') {
        return {
          ...parsed,
          user_id: '11111111-1111-4111-8111-111111111111'
        };
      }
    }
    return null;
  },

  async updateSettings(settings: BarberSettings): Promise<void> {
    localStorage.setItem('barber_settings', JSON.stringify(settings));

    if (isSupabaseActive()) {
      try {
        const userId = await getAdminUserId();
        if (!userId) {
          throw new Error("Usuário administrador não está autenticado no Supabase!");
        }

        const dbPayload = mapSettingsToDb(settings, userId);
        const { error } = await supabase
          .from('barber_settings')
          .upsert([dbPayload]);

        if (error) throw error;
      } catch (error) {
        handleSupabaseError(error, 'updateSettings');
        throw error;
      }
    }
  },

  // --- CATÁLOGO DE SERVIÇOS (Isolado por Usuário) ---
  
  async getServices(targetUserId?: string | null): Promise<Service[]> {
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        if (!userId) return [];

        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', userId)
          .order('name');
        
        if (error) throw error;
        return data as Service[];
      } catch (error) {
        handleSupabaseError(error, 'getServices');
      }
    }
    const local = localStorage.getItem('barber_services');
    return local ? JSON.parse(local) : [];
  },

  async addService(service: Omit<Service, 'id'>, targetUserId?: string | null): Promise<Service> {
    const newId = "s-" + Math.random().toString(36).substr(2, 9);
    const newService: Service = { ...service, id: newId };
    
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        if (!userId) throw new Error("Ação não permitida: ID de barbearia não definido.");

        const payload = {
          id: newId,
          user_id: userId,
          name: service.name,
          price: service.price,
          duration: service.duration,
          description: service.description || '',
          category: service.category || ''
        };

        const { error } = await supabase
          .from('services')
          .insert([payload]);
        if (error) throw error;
        return newService;
      } catch (error) {
        handleSupabaseError(error, 'addService');
        throw error;
      }
    } else {
      const list = await this.getServices();
      list.push(newService);
      localStorage.setItem('barber_services', JSON.stringify(list));
      return newService;
    }
  },

  async updateService(id: string, service: Partial<Service>): Promise<void> {
    if (isSupabaseActive()) {
      try {
        const userId = await getAdminUserId();
        if (!userId) throw new Error("Não autenticado");

        const { error } = await supabase
          .from('services')
          .update(service)
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;
        return;
      } catch (error) {
        handleSupabaseError(error, 'updateService');
        throw error;
      }
    } else {
      const list = await this.getServices();
      const updated = list.map(item => item.id === id ? { ...item, ...service } : item);
      localStorage.setItem('barber_services', JSON.stringify(updated));
    }
  },

  async deleteService(id: string): Promise<void> {
    if (isSupabaseActive()) {
      try {
        const userId = await getAdminUserId();
        if (!userId) throw new Error("Não autenticado");

        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;
        return;
      } catch (error) {
        handleSupabaseError(error, 'deleteService');
        throw error;
      }
    } else {
      const list = await this.getServices();
      const updated = list.filter(item => item.id !== id);
      localStorage.setItem('barber_services', JSON.stringify(updated));
    }
  },

  // --- AGENDAMENTOS (Isolados por Usuário no SaaS) ---
  
  async getBookings(targetUserId?: string | null): Promise<Booking[]> {
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        if (!userId) return [];

        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapBookingFromDb);
      } catch (error) {
        handleSupabaseError(error, 'getBookings');
      }
    }
    const local = localStorage.getItem('barber_bookings');
    return local ? JSON.parse(local) : [];
  },

  async getBookingsByDate(date: string, targetUserId?: string | null): Promise<Booking[]> {
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        if (!userId) return [];

        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date);
        if (error) throw error;
        return (data || []).map(mapBookingFromDb);
      } catch (error) {
        handleSupabaseError(error, 'getBookingsByDate');
      }
    }
    const bookings = await this.getBookings(targetUserId);
    return bookings.filter(b => b.date === date);
  },

  async getBookingsByWhatsApp(whatsapp: string, targetUserId?: string | null): Promise<Booking[]> {
    const cleanWhatsApp = whatsapp.trim().replace(/\D/g, '');
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        if (!userId) return [];

        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', userId)
          .or(`client_whatsapp.eq."${whatsapp}",client_whatsapp.eq."${cleanWhatsApp}",client_whatsapp.ilike."%${cleanWhatsApp}%"`);
        if (error) throw error;
        return (data || []).map(mapBookingFromDb);
      } catch (error) {
        handleSupabaseError(error, 'getBookingsByWhatsApp');
      }
    }
    const bookings = await this.getBookings(targetUserId);
    return bookings.filter(b => b.clientWhatsApp.trim().replace(/\D/g, '') === cleanWhatsApp || b.clientWhatsApp === whatsapp);
  },

  async addBooking(booking: Omit<Booking, 'id' | 'createdAt'>, targetUserId?: string | null): Promise<Booking> {
    let userId = targetUserId;
    if (!userId) {
      userId = await getAdminUserId();
    }
    
    // LOGS REQUISITADOS (TÓPICO 7)
    console.log(`[DEBUG LOG / AGENDAMENTO] slug recebido na criação: ${booking.notes || "N/A"}`);
    console.log(`[DEBUG LOG / AGENDAMENTO] user_id recebido/encontrado: ${userId}`);

    if (isSupabaseActive()) {
      // 1. Validar se o user_id é um UUID válido no padrão RFC4122 para evitar erro "22P02 invalid input syntax for uuid"
      const isUuidValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId || '');
      if (!isUuidValid) {
        console.error(`[DEBUG LOG / AGENDAMENTO] erro RLS ou FK: user_id inválido (${userId})`);
        throw new Error("Agendamento inválido: O identificador da barbearia expirou ou é inválido.");
      }

      // 2. Verificar se o user_id existe na tabela barber_settings (que garante existência em auth.users por chave estrangeira)
      const { data: hasSettings, error: chkError } = await supabase
        .from('barber_settings')
        .select('user_id, slug, name')
        .eq('user_id', userId)
        .maybeSingle();

      if (chkError) {
        console.error("[DEBUG LOG / AGENDAMENTO] Erro ao autenticar integridade do Administrador no Supabase:", chkError);
        throw new Error("Erro de conexão ao validar o administrador da barbearia.");
      }

      if (!hasSettings || !hasSettings.user_id) {
        console.error(`[DEBUG LOG / AGENDAMENTO] erro FK: user_id ${userId} inexistente em auth.users/barber_settings`);
        throw new Error("A barbearia correspondente não possui um cadastro ativo ou válido.");
      }

      console.log(`[DEBUG LOG / AGENDAMENTO] barber_settings encontrado no Supabase:`, hasSettings);
      console.log(`[DEBUG LOG / AGENDAMENTO] user_id validado com sucesso na tabela auth.users!`);
    } else {
      if (!userId) throw new Error("Ação não permitida: Identificação da barbearia ausente.");
    }

    // --- REGRAS DE NEGÓCIO E VALIDAÇÕES MULTIUSUÁRIO ---
    const settings = await this.getSettings(userId);
    if (settings) {
      // 1. Validar dias de funcionamento
      const parts = booking.date.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      const dayOfWeek = d.getDay();
      if (!settings.workingDays.includes(dayOfWeek)) {
        throw new Error("Agendamento não permitido: A barbearia está fechada neste dia da semana.");
      }

      // 2. Validar horário de funcionamento
      if (booking.time < settings.startHour || booking.time > settings.endHour) {
        throw new Error(`Agendamento não permitido: Horário fora do expediente da barbearia (${settings.startHour} às ${settings.endHour}).`);
      }

      // 3. Impedir conflito: dois clientes no mesmo horário para o mesmo barbeiro
      const list = await this.getBookings(userId);
      const activeBookings = list.filter(b => b.status !== 'cancelado');
      
      const targetBarber = booking.barberName || "";
      if (targetBarber && targetBarber !== "Qualquer Barbeiro" && targetBarber !== "") {
        const isDoubleBooked = activeBookings.some(
          b => b.date === booking.date && b.time === booking.time && b.barberName === targetBarber
        );
        if (isDoubleBooked) {
          throw new Error(`Conflito: O barbeiro ${targetBarber} já está reservado no dia ${booking.date.split('-').reverse().join('/')} às ${booking.time}. Escolha outro profissional ou horário!`);
        }
      } else {
        // "Qualquer Barbeiro" -> Auto-atribui o primeiro barbeiro livre na data/horário
        const busyBarbers = activeBookings
          .filter(b => b.date === booking.date && b.time === booking.time)
          .map(b => b.barberName)
          .filter(Boolean);
          
        const shopBarbers = settings.barbers && settings.barbers.length > 0 ? settings.barbers : ["Carlos", "Thiago", "Marcos"];
        const availableBarbers = shopBarbers.filter(b => !busyBarbers.includes(b));
        
        if (availableBarbers.length === 0) {
          throw new Error(`Conflito: Não há profissionais livres para o dia ${booking.date.split('-').reverse().join('/')} às ${booking.time}. Escolha outro horário!`);
        }
        
        // Auto-atribui o primeiro barbeiro livre
        booking.barberName = availableBarbers[0];
      }
    }

    const newId = "b-" + Math.random().toString(36).substr(2, 9);
    const newBooking: Booking = {
      ...booking,
      id: newId,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseActive()) {
      try {
        const payload = mapBookingToDb(newBooking, userId);
        console.log(`[DEBUG LOG / AGENDAMENTO] payload enviado ao Supabase:`, payload);
        
        const { error } = await supabase
          .from('bookings')
          .insert([payload]);
          
        console.log(`[DEBUG LOG / AGENDAMENTO] Resposta completa do Supabase de agendamento (erro se houver):`, error);
        
        if (error) {
          console.error(`[DEBUG LOG / AGENDAMENTO] Erro real retornado pelo Supabase:`, error);
          throw error;
        }

        // Se estiver concluído, insere transação de receita única
        if (newBooking.status === 'concluido' && newBooking.paymentMethod) {
          await this.addTransaction({
            type: 'receita',
            amount: newBooking.servicePrice,
            date: newBooking.date,
            description: `Atendimento - ${newBooking.clientName} (${newBooking.serviceName})`,
            paymentMethod: newBooking.paymentMethod,
            bookingId: newId
          }, userId);
        }

        // Sincroniza estatísticas reais no CRM
        await this.syncClientStats(booking.clientWhatsApp, userId);

        return newBooking;
      } catch (error) {
        handleSupabaseError(error, 'addBooking');
        throw error;
      }
    } else {
      const list = await this.getBookings(userId);
      list.push(newBooking);
      localStorage.setItem('barber_bookings', JSON.stringify(list));

      if (newBooking.status === 'concluido' && newBooking.paymentMethod) {
        await this.addTransaction({
          type: 'receita',
          amount: newBooking.servicePrice,
          date: newBooking.date,
          description: `Atendimento - ${newBooking.clientName} (${newBooking.serviceName})`,
          paymentMethod: newBooking.paymentMethod,
          bookingId: newId
        }, userId);
      }

      await this.syncClientStats(booking.clientWhatsApp, userId);
      return newBooking;
    }
  },

  async updateBooking(id: string, update: Partial<Booking>, targetUserId?: string | null): Promise<void> {
    const authUserId = await getAdminUserId();
    let userId = authUserId;
    if (!userId) {
      userId = targetUserId || null;
    }
    if (!userId) throw new Error("Ação não permitida: Identificação da barbearia ausente.");

    const bookings = await this.getBookings(userId);
    const current = bookings.find(b => b.id === id);
    if (!current) throw new Error("Agendamento não encontrado.");

    const merged = { ...current, ...update };

    // Validamos se a edição altera campos críticos de horário, profissional ou se é ativo
    if (merged.status !== 'cancelado' && (update.date || update.time || update.barberName)) {
      const settings = await this.getSettings(userId);
      if (settings) {
        // 1. Validar dias de funcionamento
        const parts = merged.date.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
        const dayOfWeek = d.getDay();
        if (!settings.workingDays.includes(dayOfWeek)) {
          throw new Error("Edição negada: A barbearia está fechada neste dia da semana.");
        }

        // 2. Validar expediente
        if (merged.time < settings.startHour || merged.time > settings.endHour) {
          throw new Error(`Edição negada: Horário fora do expediente (${settings.startHour} às ${settings.endHour}).`);
        }

        // 3. Garantir que o barbeiro destino não seja duplicado (excluindo este id atual)
        const activeBookings = bookings.filter(b => b.status !== 'cancelado' && b.id !== id);
        const targetBarber = merged.barberName || "";
        
        if (targetBarber && targetBarber !== "Qualquer Barbeiro" && targetBarber !== "") {
          const isDoubleBooked = activeBookings.some(
            b => b.date === merged.date && b.time === merged.time && b.barberName === targetBarber
          );
          if (isDoubleBooked) {
            throw new Error(`Conflito: O barbeiro ${targetBarber} já está agendado neste horário.`);
          }
        } else {
          const busyBarbers = activeBookings
            .filter(b => b.date === merged.date && b.time === merged.time)
            .map(b => b.barberName)
            .filter(Boolean);
            
          const shopBarbers = settings.barbers && settings.barbers.length > 0 ? settings.barbers : ["Carlos", "Thiago", "Marcos"];
          const availableBarbers = shopBarbers.filter(b => !busyBarbers.includes(b));
          
          if (availableBarbers.length === 0) {
            throw new Error("Conflito: Nenhum profissional está livre no dia/horário escolhidos.");
          }
          update.barberName = availableBarbers[0];
        }
      }
    }

    if (isSupabaseActive()) {
      try {
        const dbUpdate: any = {};
        if (update.status) dbUpdate.status = update.status;
        if (update.paymentMethod) dbUpdate.payment_method = update.paymentMethod;
        if (update.notes !== undefined) dbUpdate.notes = update.notes;
        if (update.barberName !== undefined) dbUpdate.barber_name = update.barberName;
        if (update.date !== undefined) dbUpdate.date = update.date;
        if (update.time !== undefined) dbUpdate.time = update.time;

        const { error } = await supabase
          .from('bookings')
          .update(dbUpdate)
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;

        // Gestão financeira única e estornos
        if (current.status !== 'concluido' && merged.status === 'concluido') {
          const pm = update.paymentMethod || current.paymentMethod || 'pix';
          await this.addTransaction({
            type: 'receita',
            amount: merged.servicePrice,
            date: merged.date,
            description: `Atendimento - ${merged.clientName} (${merged.serviceName})`,
            paymentMethod: pm,
            bookingId: id
          }, userId);
        } else if (current.status === 'concluido' && merged.status !== 'concluido') {
          // Deleta transação ao reverter ou cancelar
          const { error: delTxErr } = await supabase
            .from('transactions')
            .delete()
            .eq('booking_id', id)
            .eq('user_id', userId);
          if (delTxErr) console.warn("Erro ao reverter transação financeira:", delTxErr);
        }

        // Sincroniza estatísticas CRM do Cliente
        await this.syncClientStats(current.clientWhatsApp, userId);
        if (update.clientWhatsApp && update.clientWhatsApp !== current.clientWhatsApp) {
          await this.syncClientStats(update.clientWhatsApp, userId);
        }
      } catch (error) {
        handleSupabaseError(error, 'updateBooking');
        throw error;
      }
    } else {
      const updated = bookings.map(item => item.id === id ? { ...item, ...update } : item);
      localStorage.setItem('barber_bookings', JSON.stringify(updated));

      if (current.status !== 'concluido' && merged.status === 'concluido') {
        const pm = update.paymentMethod || current.paymentMethod || 'pix';
        await this.addTransaction({
          type: 'receita',
          amount: merged.servicePrice,
          date: merged.date,
          description: `Atendimento - ${merged.clientName} (${merged.serviceName})`,
          paymentMethod: pm,
          bookingId: id
        }, userId);
      } else if (current.status === 'concluido' && merged.status !== 'concluido') {
        const txs = await this.getTransactions(userId);
        const filteredTxs = txs.filter(t => t.bookingId !== id);
        localStorage.setItem('barber_transactions', JSON.stringify(filteredTxs));
      }

      await this.syncClientStats(current.clientWhatsApp, userId);
      if (update.clientWhatsApp && update.clientWhatsApp !== current.clientWhatsApp) {
        await this.syncClientStats(update.clientWhatsApp, userId);
      }
    }
  },

  async deleteBooking(id: string): Promise<void> {
    const userId = await getAdminUserId();
    if (!userId) throw new Error("Ação não permitida: Não autenticado.");

    const bookings = await this.getBookings(userId);
    const current = bookings.find(b => b.id === id);

    if (isSupabaseActive()) {
      try {
        // Estorna transações anexadas
        const { error: txDelErr } = await supabase
          .from('transactions')
          .delete()
          .eq('booking_id', id)
          .eq('user_id', userId);
        if (txDelErr) console.warn("Aviso ao remover transações de booking excluído:", txDelErr);

        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;

        if (current) {
          await this.syncClientStats(current.clientWhatsApp, userId);
        }
      } catch (error) {
        handleSupabaseError(error, 'deleteBooking');
        throw error;
      }
    } else {
      const txs = await this.getTransactions(userId);
      const filteredTxs = txs.filter(t => t.bookingId !== id);
      localStorage.setItem('barber_transactions', JSON.stringify(filteredTxs));

      const updated = bookings.filter(item => item.id !== id);
      localStorage.setItem('barber_bookings', JSON.stringify(updated));

      if (current) {
        await this.syncClientStats(current.clientWhatsApp, userId);
      }
    }
  },

  // --- CADASTRO DE CLIENTES CRM (Isolados por Usuário no SaaS) ---
  
  async getClients(targetUserId?: string | null): Promise<Client[]> {
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        if (!userId) return [];

        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', userId)
          .order('name');
        if (error) throw error;
        return (data || []).map(mapClientFromDb);
      } catch (error) {
        handleSupabaseError(error, 'getClients');
      }
    }
    const local = localStorage.getItem('barber_clients');
    return local ? JSON.parse(local) : [];
  },

  async addClient(client: Omit<Client, 'id' | 'createdAt'>, targetUserId?: string | null): Promise<Client> {
    const newId = "c-" + Math.random().toString(36).substr(2, 9);
    const newClient: Client = {
      ...client,
      id: newId,
      createdAt: new Date().toISOString()
    };

    let userId = targetUserId;
    if (!userId) {
      userId = await getAdminUserId();
    }
    if (!userId) throw new Error("Ação não permitida: Identificação de barbearia ausente.");

    if (isSupabaseActive()) {
      try {
        const payload = mapClientToDb(newClient, userId);
        const { error } = await supabase
          .from('clients')
          .insert([payload]);
        if (error) throw error;
        return newClient;
      } catch (error) {
        handleSupabaseError(error, 'addClient');
        throw error;
      }
    } else {
      const list = await this.getClients();
      list.push(newClient);
      localStorage.setItem('barber_clients', JSON.stringify(list));
      return newClient;
    }
  },

  async updateClient(id: string, update: Partial<Client>): Promise<void> {
    if (isSupabaseActive()) {
      try {
        const userId = await getAdminUserId();
        if (!userId) throw new Error("Não autenticado");

        const dbUpdate: any = {};
        if (update.name) dbUpdate.name = update.name;
        if (update.phone !== undefined) dbUpdate.phone = update.phone;
        if (update.whatsapp) dbUpdate.whatsapp = update.whatsapp;
        if (update.birthDate !== undefined) dbUpdate.birth_date = update.birthDate;
        if (update.notes !== undefined) dbUpdate.notes = update.notes;
        if (update.totalBookings !== undefined) dbUpdate.total_bookings = update.totalBookings;
        if (update.totalSpent !== undefined) dbUpdate.total_spent = update.totalSpent;

        const { error } = await supabase
          .from('clients')
          .update(dbUpdate)
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;
        return;
      } catch (error) {
        handleSupabaseError(error, 'updateClient');
        throw error;
      }
    } else {
      const list = await this.getClients();
      const updated = list.map(item => item.id === id ? { ...item, ...update } : item);
      localStorage.setItem('barber_clients', JSON.stringify(updated));
    }
  },

  async getClientByWhatsApp(whatsapp: string, targetUserId?: string | null): Promise<Client | null> {
    const cleanWhatsApp = whatsapp.trim().replace(/\D/g, '');
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        if (!userId) return null;

        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', userId)
          .or(`whatsapp.eq."${whatsapp}",whatsapp.eq."${cleanWhatsApp}",whatsapp.ilike."%${cleanWhatsApp}%"`)
          .maybeSingle();
        if (error) throw error;
        if (data) return mapClientFromDb(data);
        return null;
      } catch (error) {
        handleSupabaseError(error, 'getClientByWhatsApp');
      }
    }
    const clients = await this.getClients(targetUserId);
    return clients.find(c => c.whatsapp.trim().replace(/\D/g, '') === cleanWhatsApp || c.whatsapp === whatsapp) || null;
  },

  async syncClientStats(whatsapp: string, targetUserId: string): Promise<void> {
    try {
      const bookings = await this.getBookingsByWhatsApp(whatsapp, targetUserId);
      const completed = bookings.filter(b => b.status === 'concluido');
      const totalBookings = completed.length;
      const totalSpent = completed.reduce((sum, b) => sum + b.servicePrice, 0);

      const found = await this.getClientByWhatsApp(whatsapp, targetUserId);
      if (found) {
        await this.updateClient(found.id, {
          totalBookings,
          totalSpent
        });
      } else if (bookings.length > 0) {
        // Encontra o nome usado neste agendamento para cadastrar
        const lastBooking = bookings[0];
        await this.addClient({
          name: lastBooking.clientName,
          whatsapp,
          birthDate: "",
          notes: "Cliente registrado automaticamente pelo sistema de agendamento.",
          totalBookings,
          totalSpent
        }, targetUserId);
      }
    } catch (err) {
      console.warn("Erro ao sincronizar estatísticas CRM do cliente:", err);
    }
  },

  async registerOrUpdateClient(name: string, whatsapp: string, orderPrice: number, orderDate: string, targetUserId: string): Promise<void> {
    await this.syncClientStats(whatsapp, targetUserId);
  },

  // --- CONTROLE FINANCEIRO (Isolado por Usuário no SaaS) ---
  
  async getTransactions(targetUserId?: string | null): Promise<Transaction[]> {
    if (isSupabaseActive()) {
      try {
        let userId = targetUserId;
        if (!userId) {
          userId = await getAdminUserId();
        }
        if (!userId) return [];

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapTransactionFromDb);
      } catch (error) {
        handleSupabaseError(error, 'getTransactions');
      }
    }
    const local = localStorage.getItem('barber_transactions');
    return local ? JSON.parse(local) : [];
  },

  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>, targetUserId?: string | null): Promise<Transaction> {
    const newId = "t-" + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = {
      ...transaction,
      id: newId,
      createdAt: new Date().toISOString()
    };

    let userId = targetUserId;
    if (!userId) {
      userId = await getAdminUserId();
    }
    if (!userId) throw new Error("Ação não permitida: Identificação de barbearia ausente.");

    if (isSupabaseActive()) {
      try {
        const payload = mapTransactionToDb(newTx, userId);
        const { error } = await supabase
          .from('transactions')
          .insert([payload]);
        if (error) throw error;
        return newTx;
      } catch (error) {
        handleSupabaseError(error, 'addTransaction');
        throw error;
      }
    } else {
      const list = await this.getTransactions();
      list.push(newTx);
      localStorage.setItem('barber_transactions', JSON.stringify(list));
      return newTx;
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    if (isSupabaseActive()) {
      try {
        const userId = await getAdminUserId();
        if (!userId) throw new Error("Não autenticado");

        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;
        return;
      } catch (error) {
        handleSupabaseError(error, 'deleteTransaction');
        throw error;
      }
    } else {
      const list = await this.getTransactions();
      const updated = list.filter(item => item.id !== id);
      localStorage.setItem('barber_transactions', JSON.stringify(updated));
    }
  }
};
