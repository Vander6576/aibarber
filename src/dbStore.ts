import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, isFirebaseEnabled, handleFirestoreError, OperationType } from './firebase';
import { supabase, isSupabaseEnabled } from './supabase';
import { Service, Booking, Client, Transaction, BarberSettings } from './types';

// ==========================================
// MAPEAMENTOS DE DADOS PARA SUPABASE (camelCase <-> snake_case)
// ==========================================

function mapSettingsFromDb(data: any): BarberSettings {
  return {
    name: data.name,
    address: data.address,
    phone: data.phone,
    logoUrl: data.logo_url || '',
    startHour: data.start_hour,
    endHour: data.end_hour,
    workingDays: data.working_days || []
  };
}

function mapSettingsToDb(data: BarberSettings): any {
  return {
    id: 'barber',
    name: data.name,
    address: data.address,
    phone: data.phone,
    logo_url: data.logoUrl || '',
    start_hour: data.startHour,
    end_hour: data.endHour,
    working_days: data.workingDays || []
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
    createdAt: data.created_at
  };
}

function mapBookingToDb(data: any): any {
  return {
    id: data.id,
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
    totalBookings: Number(data.total_bookings),
    totalSpent: Number(data.total_spent)
  };
}

function mapClientToDb(data: any): any {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone || null,
    whatsapp: data.whatsapp,
    birth_date: data.birthDate || null,
    notes: data.notes || null,
    created_at: data.createdAt,
    total_bookings: data.totalBookings,
    total_spent: data.totalSpent
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

function mapTransactionToDb(data: any): any {
  return {
    id: data.id,
    type: data.type,
    amount: data.amount,
    date: data.date,
    description: data.description,
    payment_method: data.paymentMethod,
    booking_id: data.bookingId || null,
    created_at: data.createdAt
  };
}


// ==========================================
// DADOS INICIAIS PADRÃO / SEGURADOS (MOCK)
// ==========================================

const DEFAULT_SETTINGS: BarberSettings = {
  name: "Barbearia Imperial",
  address: "Av. Paulista, 1200 - Bela Vista, São Paulo - SP, 01310-100",
  phone: "(11) 99888-7777",
  logoUrl: "",
  startHour: "08:00",
  endHour: "20:00",
  workingDays: [1, 2, 3, 4, 5, 6] // Segunda a Sábado
};

const DEFAULT_SERVICES: Service[] = [
  { id: "s1", name: "Corte Masculino Degradê", price: 50.00, duration: 30, description: "Corte moderno com técnica degradê (fade) limpo e acabamento na navalha." },
  { id: "s2", name: "Barba Terapia Imperial", price: 35.00, duration: 30, description: "Alinhamento de barba com toalha quente, óleos de hidratação e balm protector." },
  { id: "s3", name: "Combo Imperador (Corte + Barba)", price: 75.00, duration: 60, description: "Corte degradê de alta classe mais Barba Terapia premiada com toalha quente." },
  { id: "s4", name: "Sobrancelha Navalhada", price: 20.00, duration: 15, description: "Design e limpeza das sobrancelhas feito de forma detalhada na navalha." },
  { id: "s5", name: "Pigmentação de Barba/Cabelo", price: 40.00, duration: 45, description: "Disparidade e falhas camufladas com pigmentos especiais de alta fixação." }
];

// Helper to get formatted date relative to today
function getOffsetDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

const getMockBookings = (): Booking[] => [
  {
    id: "b1",
    clientName: "Luiz Silva",
    clientWhatsApp: "(11) 98888-1111",
    serviceId: "s3",
    serviceName: "Combo Imperador (Corte + Barba)",
    servicePrice: 75.00,
    date: getOffsetDate(0),
    time: "09:00",
    status: "concluido",
    paymentMethod: "pix",
    createdAt: new Date().toISOString()
  },
  {
    id: "b2",
    clientName: "Marcos Oliveira",
    clientWhatsApp: "(11) 97777-2222",
    serviceId: "s1",
    serviceName: "Corte Masculino Degradê",
    servicePrice: 50.00,
    date: getOffsetDate(0),
    time: "10:30",
    status: "agendado",
    createdAt: new Date().toISOString()
  },
  {
    id: "b3",
    clientName: "Carlos Souza",
    clientWhatsApp: "(11) 96666-3333",
    serviceId: "s2",
    serviceName: "Barba Terapia Imperial",
    servicePrice: 35.00,
    date: getOffsetDate(0),
    time: "14:00",
    status: "agendado",
    createdAt: new Date().toISOString()
  },
  {
    id: "b4",
    clientName: "Pedro Albuquerque",
    clientWhatsApp: "(11) 95555-4444",
    serviceId: "s1",
    serviceName: "Corte Masculino Degradê",
    servicePrice: 50.00,
    date: getOffsetDate(0),
    time: "16:00",
    status: "cancelado",
    createdAt: new Date().toISOString()
  },
  {
    id: "b5",
    clientName: "Bruno Martins",
    clientWhatsApp: "(11) 94444-5555",
    serviceId: "s3",
    serviceName: "Combo Imperador (Corte + Barba)",
    servicePrice: 75.00,
    date: getOffsetDate(1),
    time: "10:00",
    status: "agendado",
    createdAt: new Date().toISOString()
  },
  {
    id: "b6",
    clientName: "Luiz Silva",
    clientWhatsApp: "(11) 98888-1111",
    serviceId: "s4",
    serviceName: "Sobrancelha Navalhada",
    servicePrice: 20.00,
    date: getOffsetDate(-1),
    time: "11:00",
    status: "concluido",
    paymentMethod: "dinheiro",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "b7",
    clientName: "Marcos Oliveira",
    clientWhatsApp: "(11) 97777-2222",
    serviceId: "s1",
    serviceName: "Corte Masculino Degradê",
    servicePrice: 50.00,
    date: getOffsetDate(-2),
    time: "15:00",
    status: "concluido",
    paymentMethod: "cartao",
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: "b8",
    clientName: "Sérgio Ramos",
    clientWhatsApp: "(11) 91111-2222",
    serviceId: "s3",
    serviceName: "Combo Imperador (Corte + Barba)",
    servicePrice: 75.00,
    date: getOffsetDate(-3),
    time: "17:30",
    status: "concluido",
    paymentMethod: "pix",
    createdAt: new Date(Date.now() - 259200000).toISOString()
  }
];

const getMockClients = (): Client[] => [
  { id: "c1", name: "Luiz Silva", whatsapp: "(11) 98888-1111", birthDate: "1994-08-12", notes: "Sempre corta degradê navalhado. Gosta de café expresso.", createdAt: new Date().toISOString(), totalBookings: 2, totalSpent: 95.00 },
  { id: "c2", name: "Marcos Oliveira", whatsapp: "(11) 97777-2222", birthDate: "1991-03-24", notes: "Prefere riscar o cabelo na lateral esquerda.", createdAt: new Date().toISOString(), totalBookings: 2, totalSpent: 100.00 },
  { id: "c3", name: "Carlos Souza", whatsapp: "(11) 96666-3333", birthDate: "1988-11-05", notes: "Cabelo crespo clássico, tesoura em cima.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 35.00 },
  { id: "c4", name: "Pedro Albuquerque", whatsapp: "(11) 95555-4444", birthDate: "2000-01-15", notes: "Alérgico a ceras fortes.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 0.00 },
  { id: "c5", name: "Bruno Martins", whatsapp: "(11) 94444-5555", birthDate: "1997-07-30", notes: "Usa barba cheia bem desenhada.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 75.00 },
  { id: "c6", name: "Sérgio Ramos", whatsapp: "(11) 91111-2222", birthDate: "1989-10-10", notes: "Gosta de corte militar baixo.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 75.00 }
];

const getMockTransactions = (): Transaction[] => [
  { id: "t1", type: "receita", amount: 75.00, date: getOffsetDate(0), description: "Atendimento - Luiz Silva (Combo Imperador)", paymentMethod: "pix", bookingId: "b1", createdAt: new Date().toISOString() },
  { id: "t2", type: "receita", amount: 20.00, date: getOffsetDate(-1), description: "Atendimento - Luiz Silva (Sobrancelha)", paymentMethod: "dinheiro", bookingId: "b6", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "t3", type: "receita", amount: 50.00, date: getOffsetDate(-2), description: "Atendimento - Marcos Oliveira (Corte)", paymentMethod: "cartao", bookingId: "b7", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "t4", type: "receita", amount: 75.00, date: getOffsetDate(-3), description: "Atendimento - Sérgio Ramos (Combo Imperador)", paymentMethod: "pix", bookingId: "b8", createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: "t5", type: "despesa", amount: 120.00, date: getOffsetDate(-2), description: "Compra de toalhas de algodão e lâminas", paymentMethod: "pix", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "t6", type: "despesa", amount: 80.00, date: getOffsetDate(-4), description: "Produtos descartáveis de assepsia", paymentMethod: "dinheiro", createdAt: new Date(Date.now() - 345600000).toISOString() }
];

// Instanciação em localStorage ao carregar
function initLocalStorage() {
  if (!localStorage.getItem('barber_settings')) {
    localStorage.setItem('barber_settings', JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem('barber_services')) {
    localStorage.setItem('barber_services', JSON.stringify(DEFAULT_SERVICES));
  }
  if (!localStorage.getItem('barber_bookings')) {
    localStorage.setItem('barber_bookings', JSON.stringify(getMockBookings()));
  }
  if (!localStorage.getItem('barber_clients')) {
    localStorage.setItem('barber_clients', JSON.stringify(getMockClients()));
  }
  if (!localStorage.getItem('barber_transactions')) {
    localStorage.setItem('barber_transactions', JSON.stringify(getMockTransactions()));
  }
}

initLocalStorage();

// ==========================================
// CENTRALIZAÇÃO DA API DE PERSISTÊNCIA DUAL
// ==========================================

export const dbStore = {
  
  // Restaura banco local de demonstração
  resetToDemo() {
    localStorage.setItem('barber_settings', JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem('barber_services', JSON.stringify(DEFAULT_SERVICES));
    localStorage.setItem('barber_bookings', JSON.stringify(getMockBookings()));
    localStorage.setItem('barber_clients', JSON.stringify(getMockClients()));
    localStorage.setItem('barber_transactions', JSON.stringify(getMockTransactions()));
    window.location.reload();
  },

  // --- CONFIGURAÇÕES DA BARBEARIA ---
  async getSettings(): Promise<BarberSettings> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('barber_settings')
          .select('*')
          .eq('id', 'barber')
          .maybeSingle();
        if (error) throw error;
        if (data) {
          return mapSettingsFromDb(data);
        } else {
          try {
            await supabase.from('barber_settings').upsert([mapSettingsToDb(DEFAULT_SETTINGS)]);
          } catch (upsertErr) {
            console.warn("Could not upsert default settings in Supabase:", upsertErr);
          }
          return DEFAULT_SETTINGS;
        }
      } catch (error) {
        console.warn("Supabase getSettings failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'settings/barber';
      try {
        const docRef = doc(db, 'settings', 'barber');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data() as BarberSettings;
        } else {
          // Se não existir, configura as iniciais padrão (se tiver permissão)
          try {
            await setDoc(docRef, DEFAULT_SETTINGS);
          } catch (writeErr) {
            console.warn("Não foi possível persistir as configurações iniciais do banco de dados (provavelmente o usuário não está autenticado):", writeErr);
          }
          return DEFAULT_SETTINGS;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    } else {
      const local = localStorage.getItem('barber_settings');
      return local ? JSON.parse(local) : DEFAULT_SETTINGS;
    }
  },

  async updateSettings(settings: BarberSettings): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase
          .from('barber_settings')
          .upsert([mapSettingsToDb(settings)]);
        if (!error) return;
        throw error;
      } catch (error) {
        console.warn("Supabase updateSettings failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'settings/barber';
      try {
        await setDoc(doc(db, 'settings', 'barber'), settings);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      localStorage.setItem('barber_settings', JSON.stringify(settings));
    }
  },

  // --- CATÁLOGO DE SERVIÇOS ---
  async getServices(): Promise<Service[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name');
        if (error) throw error;
        if (data && data.length > 0) {
          return data as Service[];
        } else {
          try {
            await supabase.from('services').upsert(DEFAULT_SERVICES);
          } catch (upsertErr) {
            console.warn("Could not auto-populate services table in Supabase:", upsertErr);
          }
          return DEFAULT_SERVICES;
        }
      } catch (error) {
        console.warn("Supabase getServices failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'services';
      try {
        const querySnapshot = await getDocs(collection(db, 'services'));
        const list: Service[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Service), id: docSnap.id });
        });
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    } else {
      const local = localStorage.getItem('barber_services');
      return local ? JSON.parse(local) : DEFAULT_SERVICES;
    }
  },

  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    const newId = "s-" + Math.random().toString(36).substr(2, 9);
    const newService: Service = { ...service, id: newId };
    
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase
          .from('services')
          .insert([newService]);
        if (!error) return newService;
        throw error;
      } catch (error) {
        console.warn("Supabase addService failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `services/${newId}`;
      try {
        await setDoc(doc(db, 'services', newId), newService);
        return newService;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
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
        const { error } = await supabase
          .from('services')
          .update(service)
          .eq('id', id);
        if (!error) return;
        throw error;
      } catch (error) {
        console.warn("Supabase updateService failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `services/${id}`;
      try {
        await updateDoc(doc(db, 'services', id), service as any);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
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
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', id);
        if (!error) return;
        throw error;
      } catch (error) {
        console.warn("Supabase deleteService failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `services/${id}`;
      try {
        await deleteDoc(doc(db, 'services', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const list = await this.getServices();
      const updated = list.filter(item => item.id !== id);
      localStorage.setItem('barber_services', JSON.stringify(updated));
    }
  },

  // --- AGENDAMENTOS (BOOKINGS) ---
  async getBookings(): Promise<Booking[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapBookingFromDb);
      } catch (error) {
        console.warn("Supabase getBookings failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'bookings';
      try {
        const querySnapshot = await getDocs(collection(db, 'bookings'));
        const list: Booking[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Booking), id: docSnap.id });
        });
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    } else {
      const local = localStorage.getItem('barber_bookings');
      return local ? JSON.parse(local) : [];
    }
  },

  async getBookingsByDate(date: string): Promise<Booking[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('date', date);
        if (error) throw error;
        return (data || []).map(mapBookingFromDb);
      } catch (error) {
        console.warn("Supabase getBookingsByDate failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'bookings';
      try {
        const q = query(collection(db, 'bookings'), where('date', '==', date));
        const querySnapshot = await getDocs(q);
        const list: Booking[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Booking), id: docSnap.id });
        });
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    } else {
      const bookings = await this.getBookings();
      return bookings.filter(b => b.date === date);
    }
  },

  async getBookingsByWhatsApp(whatsapp: string): Promise<Booking[]> {
    const cleanWhatsApp = whatsapp.trim().replace(/\D/g, '');
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .or(`client_whatsapp.eq."${whatsapp}",client_whatsapp.eq."${cleanWhatsApp}",client_whatsapp.ilike."%${cleanWhatsApp}%"`);
        if (error) throw error;
        return (data || []).map(mapBookingFromDb);
      } catch (error) {
        console.warn("Supabase getBookingsByWhatsApp failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'bookings';
      try {
        const q = query(collection(db, 'bookings'), where('clientWhatsApp', '==', whatsapp));
        const querySnapshot = await getDocs(q);
        const list: Booking[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Booking), id: docSnap.id });
        });
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    } else {
      const bookings = await this.getBookings();
      return bookings.filter(b => b.clientWhatsApp.trim().replace(/\D/g, '') === cleanWhatsApp || b.clientWhatsApp === whatsapp);
    }
  },

  async addBooking(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
    const newId = "b-" + Math.random().toString(36).substr(2, 9);
    const newBooking: Booking = {
      ...booking,
      id: newId,
      createdAt: new Date().toISOString()
    };

    // Salva ou atualiza automaticamente o cliente no cadastro
    await this.registerOrUpdateClient(booking.clientName, booking.clientWhatsApp, booking.servicePrice, booking.date);

    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase
          .from('bookings')
          .insert([mapBookingToDb(newBooking)]);
        if (error) throw error;

        // Se já vier concluído, gera faturamento imediato
        if (newBooking.status === 'concluido' && newBooking.paymentMethod) {
          await this.addTransaction({
            type: 'receita',
            amount: newBooking.servicePrice,
            date: newBooking.date,
            description: `Atendimento - ${newBooking.clientName} (${newBooking.serviceName})`,
            paymentMethod: newBooking.paymentMethod,
            bookingId: newId
          });
        }
        return newBooking;
      } catch (error) {
        console.warn("Supabase addBooking failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `bookings/${newId}`;
      try {
        await setDoc(doc(db, 'bookings', newId), newBooking);
        
        // Se já vier concluído, gera faturamento imediato
        if (newBooking.status === 'concluido' && newBooking.paymentMethod) {
          await this.addTransaction({
            type: 'receita',
            amount: newBooking.servicePrice,
            date: newBooking.date,
            description: `Atendimento - ${newBooking.clientName} (${newBooking.serviceName})`,
            paymentMethod: newBooking.paymentMethod,
            bookingId: newId
          });
        }
        return newBooking;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const list = await this.getBookings();
      list.push(newBooking);
      localStorage.setItem('barber_bookings', JSON.stringify(list));

      // Transação associada
      if (newBooking.status === 'concluido' && newBooking.paymentMethod) {
        await this.addTransaction({
          type: 'receita',
          amount: newBooking.servicePrice,
          date: newBooking.date,
          description: `Atendimento - ${newBooking.clientName} (${newBooking.serviceName})`,
          paymentMethod: newBooking.paymentMethod,
          bookingId: newId
        });
      }
      return newBooking;
    }
  },

  async updateBooking(id: string, update: Partial<Booking>): Promise<void> {
    // Se o status estiver mudando de agendado para concluído, gera transação financeira correspondente
    if (update.status === 'concluido') {
      const bookings = await this.getBookings();
      const current = bookings.find(b => b.id === id);
      if (current && current.status !== 'concluido') {
        const pMethod = update.paymentMethod || 'pix';
        await this.addTransaction({
          type: 'receita',
          amount: current.servicePrice,
          date: current.date,
          description: `Atendimento - ${current.clientName} (${current.serviceName})`,
          paymentMethod: pMethod,
          bookingId: id
        });
      }
    }

    if (isSupabaseEnabled && supabase) {
      try {
        const dbUpdate: any = {};
        if (update.status) dbUpdate.status = update.status;
        if (update.paymentMethod) dbUpdate.payment_method = update.paymentMethod;
        if (update.notes !== undefined) dbUpdate.notes = update.notes;

        const { error } = await supabase
          .from('bookings')
          .update(dbUpdate)
          .eq('id', id);
        if (!error) return;
        throw error;
      } catch (error) {
        console.warn("Supabase updateBooking failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `bookings/${id}`;
      try {
        await updateDoc(doc(db, 'bookings', id), update as any);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const list = await this.getBookings();
      const updated = list.map(item => item.id === id ? { ...item, ...update } : item);
      localStorage.setItem('barber_bookings', JSON.stringify(updated));
    }
  },

  async deleteBooking(id: string): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id);
        if (!error) return;
        throw error;
      } catch (error) {
        console.warn("Supabase deleteBooking failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `bookings/${id}`;
      try {
        await deleteDoc(doc(db, 'bookings', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const list = await this.getBookings();
      const updated = list.filter(item => item.id !== id);
      localStorage.setItem('barber_bookings', JSON.stringify(updated));
    }
  },

  // --- CADASTRO DE CLIENTES ---
  async getClients(): Promise<Client[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name');
        if (error) throw error;
        return (data || []).map(mapClientFromDb);
      } catch (error) {
        console.warn("Supabase getClients failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'clients';
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const list: Client[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Client), id: docSnap.id });
        });
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    } else {
      const local = localStorage.getItem('barber_clients');
      return local ? JSON.parse(local) : [];
    }
  },

  async addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const newId = "c-" + Math.random().toString(36).substr(2, 9);
    const newClient: Client = {
      ...client,
      id: newId,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase
          .from('clients')
          .insert([mapClientToDb(newClient)]);
        if (error) throw error;
        return newClient;
      } catch (error) {
        console.warn("Supabase addClient failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `clients/${newId}`;
      try {
        await setDoc(doc(db, 'clients', newId), newClient);
        return newClient;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
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
          .eq('id', id);
        if (!error) return;
        throw error;
      } catch (error) {
        console.warn("Supabase updateClient failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `clients/${id}`;
      try {
        await updateDoc(doc(db, 'clients', id), update as any);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const list = await this.getClients();
      const updated = list.map(item => item.id === id ? { ...item, ...update } : item);
      localStorage.setItem('barber_clients', JSON.stringify(updated));
    }
  },

  async getClientByWhatsApp(whatsapp: string): Promise<Client | null> {
    const cleanWhatsApp = whatsapp.trim().replace(/\D/g, '');
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .or(`whatsapp.eq."${whatsapp}",whatsapp.eq."${cleanWhatsApp}",whatsapp.ilike."%${cleanWhatsApp}%"`)
          .maybeSingle();
        if (error) throw error;
        if (data) return mapClientFromDb(data);
        return null;
      } catch (error) {
        console.warn("Supabase getClientByWhatsApp failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'clients';
      try {
        const q = query(collection(db, 'clients'), where('whatsapp', '==', whatsapp));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          return { ...(docSnap.data() as Client), id: docSnap.id };
        }
        return null;
      } catch (error) {
        console.warn("Could not query client details safely (unauthenticated context lookup):", error);
        return null;
      }
    } else {
      const clients = await this.getClients();
      return clients.find(c => c.whatsapp.trim().replace(/\D/g, '') === cleanWhatsApp || c.whatsapp === whatsapp) || null;
    }
  },

  // Auxiliar para registrar automaticamente ou atualizar estatísticas de um cliente
  async registerOrUpdateClient(name: string, whatsapp: string, orderPrice: number, orderDate: string): Promise<void> {
    const found = await this.getClientByWhatsApp(whatsapp);

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
        notes: "Cliente registrado automaticamente ao agendar atendimento público.",
        totalBookings: 1,
        totalSpent: orderPrice
      });
    }
  },

  // --- CONTROLE FINANCEIRO (TRANSACTIONS) ---
  async getTransactions(): Promise<Transaction[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapTransactionFromDb);
      } catch (error) {
        console.warn("Supabase getTransactions failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = 'transactions';
      try {
        const querySnapshot = await getDocs(collection(db, 'transactions'));
        const list: Transaction[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Transaction), id: docSnap.id });
        });
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    } else {
      const local = localStorage.getItem('barber_transactions');
      return local ? JSON.parse(local) : [];
    }
  },

  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const newId = "t-" + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = {
      ...transaction,
      id: newId,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase
          .from('transactions')
          .insert([mapTransactionToDb(newTx)]);
        if (error) throw error;
        return newTx;
      } catch (error) {
        console.warn("Supabase addTransaction failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `transactions/${newId}`;
      try {
        await setDoc(doc(db, 'transactions', newId), newTx);
        return newTx;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
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
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);
        if (!error) return;
        throw error;
      } catch (error) {
        console.warn("Supabase deleteTransaction failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `transactions/${id}`;
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const list = await this.getTransactions();
      const updated = list.filter(item => item.id !== id);
      localStorage.setItem('barber_transactions', JSON.stringify(updated));
    }
  }
};
