import { supabase, isSupabaseEnabled, setSupabaseOffline } from './supabase';
import { Service, Booking, Client, Transaction, BarberSettings } from './types';

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
  if (isSupabaseEnabled && supabase) {
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
  return {
    id: userId, // Utiliza o próprio user_id do administrador como ID único de sua barbearia
    user_id: userId,
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
    if (isSupabaseEnabled && supabase) {
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
            const defaultNewSettings: BarberSettings = {
              name: "Minha Barbearia",
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
    if (isSupabaseEnabled && supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);
        
        let query = supabase.from('barber_settings').select('*');
        if (isUuid) {
          query = query.eq('user_id', slugOrId);
        } else {
          // Busca case-insensitive por admin_name ou name
          query = query.or(`admin_name.ilike.%${slugOrId}%,name.ilike.%${slugOrId}%`);
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
      } catch (error) {
        console.error("Erro ao buscar barbearia pública:", error);
      }
    }
    return null;
  },

  async updateSettings(settings: BarberSettings): Promise<void> {
    localStorage.setItem('barber_settings', JSON.stringify(settings));

    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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
    
    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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
    const newId = "b-" + Math.random().toString(36).substr(2, 9);
    const newBooking: Booking = {
      ...booking,
      id: newId,
      createdAt: new Date().toISOString()
    };

    let userId = targetUserId;
    if (!userId) {
      userId = await getAdminUserId();
    }
    if (!userId) throw new Error("Ação não permitida: Identificação da barbearia ausente.");

    // Registra ou atualiza automaticamente as estatísticas do cliente no SaaS sob o mesmo user_id
    await this.registerOrUpdateClient(booking.clientName, booking.clientWhatsApp, booking.servicePrice, booking.date, userId);

    if (isSupabaseEnabled && supabase) {
      try {
        const payload = mapBookingToDb(newBooking, userId);
        const { error } = await supabase
          .from('bookings')
          .insert([payload]);
        if (error) throw error;

        // Se o agendamento já for inserido como concluído e tiver método de pagamento, lança no financeiro automático
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
        return newBooking;
      } catch (error) {
        handleSupabaseError(error, 'addBooking');
        throw error;
      }
    } else {
      const list = await this.getBookings();
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
      return newBooking;
    }
  },

  async updateBooking(id: string, update: Partial<Booking>, targetUserId?: string | null): Promise<void> {
    const authUserId = await getAdminUserId();

    if (isSupabaseEnabled && supabase) {
      try {
        const dbUpdate: any = {};
        if (update.status) dbUpdate.status = update.status;
        if (update.paymentMethod) dbUpdate.payment_method = update.paymentMethod;
        if (update.notes !== undefined) dbUpdate.notes = update.notes;
        if (update.barberName !== undefined) dbUpdate.barber_name = update.barberName;

        let query = supabase.from('bookings').update(dbUpdate).eq('id', id);
        
        // Se houver admin autenticado, garante o isolamento na alteração. Se for público, usa targetUserId para refinar.
        if (authUserId) {
          query = query.eq('user_id', authUserId);
        } else if (targetUserId) {
          query = query.eq('user_id', targetUserId);
        }

        const { error } = await query;
        if (error) throw error;

        // Se o status estiver mudando de agendado para concluído administrativamente:
        if (update.status === 'concluido' && authUserId) {
          const list = await this.getBookings(authUserId);
          const current = list.find(b => b.id === id);
          if (current) {
            const paymentMethod = update.paymentMethod || 'pix';
            await this.addTransaction({
              type: 'receita',
              amount: current.servicePrice,
              date: current.date,
              description: `Atendimento - ${current.clientName} (${current.serviceName})`,
              paymentMethod,
              bookingId: id
            }, authUserId);

            await this.registerOrUpdateClient(current.clientName, current.clientWhatsApp, current.servicePrice, current.date, authUserId);
          }
        }
      } catch (error) {
        handleSupabaseError(error, 'updateBooking');
        throw error;
      }
    } else {
      const list = await this.getBookings(targetUserId);
      const updated = list.map(item => item.id === id ? { ...item, ...update } : item);
      localStorage.setItem('barber_bookings', JSON.stringify(updated));
    }
  },

  async deleteBooking(id: string): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        const userId = await getAdminUserId();
        if (!userId) throw new Error("Não autenticado");

        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;
        return;
      } catch (error) {
        handleSupabaseError(error, 'deleteBooking');
        throw error;
      }
    } else {
      const list = await this.getBookings();
      const updated = list.filter(item => item.id !== id);
      localStorage.setItem('barber_bookings', JSON.stringify(updated));
    }
  },

  // --- CADASTRO DE CLIENTES CRM (Isolados por Usuário no SaaS) ---
  
  async getClients(targetUserId?: string | null): Promise<Client[]> {
    if (isSupabaseEnabled && supabase) {
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

    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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

  async registerOrUpdateClient(name: string, whatsapp: string, orderPrice: number, orderDate: string, targetUserId: string): Promise<void> {
    const found = await this.getClientByWhatsApp(whatsapp, targetUserId);

    if (found) {
      await this.updateClient(found.id, {
        totalBookings: found.totalBookings + 1,
        totalSpent: found.totalSpent + orderPrice
      });
    } else {
      await this.addClient({
        name,
        whatsapp,
        birthDate: "",
        notes: "Cliente registrado automaticamente ao agendar.",
        totalBookings: 1,
        totalSpent: orderPrice
      }, targetUserId);
    }
  },

  // --- CONTROLE FINANCEIRO (Isolado por Usuário no SaaS) ---
  
  async getTransactions(targetUserId?: string | null): Promise<Transaction[]> {
    if (isSupabaseEnabled && supabase) {
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

    if (isSupabaseEnabled && supabase) {
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
    if (isSupabaseEnabled && supabase) {
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
