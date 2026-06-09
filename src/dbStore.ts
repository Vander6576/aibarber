import { supabase, isSupabaseEnabled, isSupabaseOffline, setSupabaseOffline } from './supabase';
import { Service, Booking, Client, Transaction, BarberSettings } from './types';

// Bypass/Desativado Firebase
const isFirebaseEnabled = false;
const db: any = null;
const auth: any = null;
const isFirestoreOffline = false;
const setFirestoreOffline = (state?: boolean) => {};
const handleFirestoreError = (error: any, operationType: any, path: any): never => {
  throw error;
};
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
const collection: any = null;
const doc: any = null;
const getDoc: any = null;
const getDocs: any = null;
const setDoc: any = null;
const addDoc: any = null;
const updateDoc: any = null;
const deleteDoc: any = null;
const query: any = null;
const where: any = null;
const orderBy: any = null;
const onSnapshot: any = null;

// Helper to intercept Firebase offline/network errors and gracefully return fallback local data
function handleFirebaseOfflineOrError<T>(error: any, operation: string, fallbackAction: () => T): T | null {
  const msg = (error?.message || String(error)).toLowerCase();
  const isOffline = msg.includes('offline') || 
                    msg.includes('failed-precondition') || 
                    msg.includes('network') || 
                    msg.includes('unreachable') || 
                    msg.includes('unavailable') ||
                    msg.includes('connection');
  
  if (isOffline) {
    console.warn(`[FIREBASE GRACEFUL FALLBACK] O Firestore está offline/falcamente configurado durante "${operation}". Carregando fallback em localStorage.`);
    setFirestoreOffline(true);
    return fallbackAction();
  }
  return null;
}

// Helper to intercept Supabase offline/network errors and gracefully return fallback local data
function handleSupabaseOfflineOrError<T>(error: any, operation: string, fallbackAction: () => T): T | null {
  const msg = (error?.message || String(error)).toLowerCase();
  const isOffline = msg.includes('offline') || 
                    msg.includes('fetch failed') || 
                    msg.includes('failed to fetch') || 
                    msg.includes('network') || 
                    msg.includes('unreachable') || 
                    msg.includes('unavailable') ||
                    msg.includes('connection') ||
                    msg.includes('typeerror') ||
                    msg.includes('failed-precondition');
  
  if (isOffline) {
    console.warn(`[SUPABASE GRACEFUL FALLBACK] O Supabase está offline/falcamente configurado durante "${operation}". Carregando fallback em localStorage.`);
    setSupabaseOffline(true);
    return fallbackAction();
  }
  return null;
}

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
    workingDays: data.working_days || [],
    barbers: data.barbers || [],
    adminName: data.admin_name || 'Ricardo'
  };
}

function mapSettingsToDb(data: BarberSettings, userId?: string | null): any {
  const payload: any = {
    id: 'barber',
    name: data.name,
    address: data.address,
    phone: data.phone,
    logo_url: data.logoUrl || '',
    start_hour: data.startHour,
    end_hour: data.endHour,
    working_days: data.workingDays || [],
    barbers: data.barbers || [],
    admin_name: data.adminName || 'Ricardo'
  };
  if (userId) {
    payload.user_id = userId;
  }
  return payload;
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
  workingDays: [1, 2, 3, 4, 5, 6], // Segunda a Sábado
  barbers: ["Carlos", "Thiago", "Marcos"],
  adminName: "Ricardo"
};

const DEFAULT_SERVICES: Service[] = [
  { id: "s1", name: "Corte Masculino Degradê", price: 50.00, duration: 30, description: "Corte moderno com técnica degradê (fade) limpo e acabamento na navalha." },
  { id: "s2", name: "Barba Terapia Imperial", price: 35.00, duration: 30, description: "Alinhamento de barba com toalha quente, óleos de hidratação e balm protector." },
  { id: "s3", name: "Combo Imperador (Corte + Barba)", price: 75.00, duration: 60, description: "Corte degradê de alta classe mais Barba Terapia premiada com toalha quente." },
  { id: "s4", name: "Sobrancelha Navalhada", price: 20.00, duration: 15, description: "Design e limpeza das sobrancelhas feito de forma detalhada na navalha." },
  { id: "s5", name: "Pigmentação de Barba/Cabelo", price: 40.00, duration: 45, description: "Disparidade e falhas camufladas com pigmentos especiais de alta fixação." },
  { id: "s6", name: "Corte Infantil (Kids)", price: 40.00, duration: 30, description: "Atendimento paciencioso para os pequenos com corte moderno e finalização divertida." },
  { id: "s7", name: "Selagem Térmica Capilar", price: 120.00, duration: 90, description: "Redução de volume, alinhamento dos fios e hidratação profunda com ativos nobres." },
  { id: "s8", name: "Platinado / Nevou Completo", price: 150.00, duration: 120, description: "Descoloração global segura de alto rendimento e matização para o tom platinado impecável." },
  { id: "s9", name: "Lavagem Premium com Massagem", price: 25.00, duration: 15, description: "Lavagem com shampoo refrescante de hortelã acompanhado de massagem capilar relaxante." },
  { id: "s10", name: "Acabamento / Pezinho Navalhado", price: 15.00, duration: 15, description: "Limpeza das laterais e nuca na navalha para manter o visual em dia entre os cortes." }
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
    barberName: "Carlos",
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
    barberName: "Thiago",
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
    barberName: "Marcos",
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
  },
  {
    id: "b9",
    clientName: "Gustavo Santos",
    clientWhatsApp: "(11) 93333-4444",
    serviceId: "s7",
    serviceName: "Selagem Térmica Capilar",
    servicePrice: 120.00,
    date: getOffsetDate(1),
    time: "14:30",
    status: "agendado",
    createdAt: new Date().toISOString()
  },
  {
    id: "b10",
    clientName: "Arthur Medeiros",
    clientWhatsApp: "(11) 92222-3333",
    serviceId: "s1",
    serviceName: "Corte Masculino Degradê",
    servicePrice: 50.00,
    date: getOffsetDate(-1),
    time: "16:00",
    status: "concluido",
    paymentMethod: "pix",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "b11",
    clientName: "Rodrigo Lima",
    clientWhatsApp: "(11) 95555-9999",
    serviceId: "s1",
    serviceName: "Corte Masculino Degradê",
    servicePrice: 50.00,
    date: getOffsetDate(0),
    time: "11:30",
    status: "agendado",
    createdAt: new Date().toISOString()
  },
  {
    id: "b12",
    clientName: "Rafael Teixeira",
    clientWhatsApp: "(11) 97777-8888",
    serviceId: "s5",
    serviceName: "Pigmentação de Barba/Cabelo",
    servicePrice: 40.00,
    date: getOffsetDate(-2),
    time: "13:00",
    status: "concluido",
    paymentMethod: "cartao",
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: "b13",
    clientName: "Leonardo Pereira",
    clientWhatsApp: "(11) 91111-9999",
    serviceId: "s3",
    serviceName: "Combo Imperador (Corte + Barba)",
    servicePrice: 75.00,
    date: getOffsetDate(-4),
    time: "09:30",
    status: "concluido",
    paymentMethod: "dinheiro",
    createdAt: new Date(Date.now() - 345600000).toISOString()
  }
];

const getMockClients = (): Client[] => [
  { id: "c1", name: "Luiz Silva", whatsapp: "(11) 98888-1111", birthDate: "1994-08-12", notes: "Sempre corta degradê navalhado. Gosta de café expresso. Amigo do dono.", createdAt: new Date().toISOString(), totalBookings: 2, totalSpent: 95.00 },
  { id: "c2", name: "Marcos Oliveira", whatsapp: "(11) 97777-2222", birthDate: "1991-03-24", notes: "Prefere riscar o cabelo na lateral esquerda.", createdAt: new Date().toISOString(), totalBookings: 2, totalSpent: 100.00 },
  { id: "c3", name: "Carlos Souza", whatsapp: "(11) 96666-3333", birthDate: "1988-11-05", notes: "Cabelo crespo clássico, tesoura em cima.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 35.00 },
  { id: "c4", name: "Pedro Albuquerque", whatsapp: "(11) 95555-4444", birthDate: "2000-01-15", notes: "Alérgico a ceras fortes. Prefere lavagem simples.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 0.00 },
  { id: "c5", name: "Bruno Martins", whatsapp: "(11) 94444-5555", birthDate: "1997-07-30", notes: "Usa barba cheia bem desenhada.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 75.00 },
  { id: "c6", name: "Sérgio Ramos", whatsapp: "(11) 91111-2222", birthDate: "1989-10-10", notes: "Gosta de corte militar baixo. Prefere horário de almoço.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 75.00 },
  { id: "c7", name: "Gustavo Santos", whatsapp: "(11) 93333-4444", birthDate: "1992-12-01", notes: "Faz selagem de 3 em 3 meses. Gosta de bater papo nos finais de semana.", createdAt: new Date().toISOString(), totalBookings: 4, totalSpent: 260.00 },
  { id: "c8", name: "Arthur Medeiros", whatsapp: "(11) 92222-3333", birthDate: "1995-05-18", notes: "Cortador de cabelo conservador, prefere tesoura clássica e conversa sobre esporte.", createdAt: new Date().toISOString(), totalBookings: 3, totalSpent: 150.00 },
  { id: "c9", name: "Felipe Costa", whatsapp: "(11) 94444-8888", birthDate: "1987-04-14", notes: "Extremamente pontual. Prefere utilizar pomada de efeito matte seco.", createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 50.00 },
  { id: "c10", name: "Rodrigo Lima", whatsapp: "(11) 95555-9999", birthDate: "1990-09-09", notes: "Alinha a sobrancelha na navalha e gosta do degradê intermediário (mid fade).", createdAt: new Date().toISOString(), totalBookings: 5, totalSpent: 215.00 },
  { id: "c11", name: "Rafael Teixeira", whatsapp: "(11) 97777-8888", birthDate: "1993-02-10", notes: "Faz pigmentação na barba e no pezinho toda vez que vem.", createdAt: new Date().toISOString(), totalBookings: 3, totalSpent: 120.00 },
  { id: "c12", name: "Leonardo Pereira", whatsapp: "(11) 91111-9999", birthDate: "1985-05-05", notes: "Usa barba longa tradicional bem cuidada. Gosta de toalha quente e massagem capilar.", createdAt: new Date().toISOString(), totalBookings: 6, totalSpent: 300.00 }
];

const getMockTransactions = (): Transaction[] => [
  { id: "t1", type: "receita", amount: 75.00, date: getOffsetDate(0), description: "Atendimento - Luiz Silva (Combo Imperador)", paymentMethod: "pix", bookingId: "b1", createdAt: new Date().toISOString() },
  { id: "t2", type: "receita", amount: 20.00, date: getOffsetDate(-1), description: "Atendimento - Luiz Silva (Sobrancelha)", paymentMethod: "dinheiro", bookingId: "b6", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "t3", type: "receita", amount: 50.00, date: getOffsetDate(-2), description: "Atendimento - Marcos Oliveira (Corte)", paymentMethod: "cartao", bookingId: "b7", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "t4", type: "receita", amount: 75.00, date: getOffsetDate(-3), description: "Atendimento - Sérgio Ramos (Combo Imperador)", paymentMethod: "pix", bookingId: "b8", createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: "t5", type: "despesa", amount: 120.00, date: getOffsetDate(-2), description: "Compra de toalhas de algodão e lâminas", paymentMethod: "pix", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "t6", type: "despesa", amount: 80.00, date: getOffsetDate(-4), description: "Produtos descartáveis de assepsia", paymentMethod: "dinheiro", createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: "t7", type: "receita", amount: 50.00, date: getOffsetDate(-1), description: "Atendimento - Arthur Medeiros (Corte)", paymentMethod: "pix", bookingId: "b10", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "t8", type: "receita", amount: 40.00, date: getOffsetDate(-2), description: "Atendimento - Rafael Teixeira (Pigmentação)", paymentMethod: "cartao", bookingId: "b12", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "t9", type: "receita", amount: 75.00, date: getOffsetDate(-4), description: "Atendimento - Leonardo Pereira (Combo Imperador)", paymentMethod: "dinheiro", bookingId: "b13", createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: "t10", type: "despesa", amount: 55.00, date: getOffsetDate(-1), description: "Taxa de publicidade redes sociais", paymentMethod: "cartao", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "t11", type: "despesa", amount: 450.00, date: getOffsetDate(-3), description: "Aluguel parcial da cadeira de barbeiro", paymentMethod: "pix", createdAt: new Date(Date.now() - 259200000).toISOString() }
];

// Instanciação em localStorage ao carregar
function initLocalStorage() {
  if (!localStorage.getItem('barber_settings')) {
    localStorage.setItem('barber_settings', JSON.stringify(DEFAULT_SETTINGS));
  } else {
    // Migração de esquema se barbeiros estiver ausente
    try {
      const existing = JSON.parse(localStorage.getItem('barber_settings') || '{}');
      let changed = false;
      if (!existing.barbers || !Array.isArray(existing.barbers) || existing.barbers.length === 0) {
        existing.barbers = ["Carlos", "Thiago", "Marcos"];
        changed = true;
      }
      if (!existing.adminName) {
        existing.adminName = "Ricardo";
        changed = true;
      }
      if (changed) {
        localStorage.setItem('barber_settings', JSON.stringify(existing));
      }
    } catch (e) {
      console.warn("Failed to migrate settings:", e);
    }
  }
  if (!localStorage.getItem('barber_services') || JSON.parse(localStorage.getItem('barber_services') || '[]').length <= 5) {
    localStorage.setItem('barber_services', JSON.stringify(DEFAULT_SERVICES));
  }
  if (!localStorage.getItem('barber_bookings') || JSON.parse(localStorage.getItem('barber_bookings') || '[]').length <= 8) {
    localStorage.setItem('barber_bookings', JSON.stringify(getMockBookings()));
  }
  if (!localStorage.getItem('barber_clients') || JSON.parse(localStorage.getItem('barber_clients') || '[]').length <= 6) {
    localStorage.setItem('barber_clients', JSON.stringify(getMockClients()));
  }
  if (!localStorage.getItem('barber_transactions') || JSON.parse(localStorage.getItem('barber_transactions') || '[]').length <= 6) {
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
          const settings = mapSettingsFromDb(data);
          // Sempre mantém o localStorage atualizado com o valor real obtido do banco de dados na nuvem
          localStorage.setItem('barber_settings', JSON.stringify(settings));
          return settings;
        } else {
          // Se o banco retornar vazio (por exemplo, por falta de registro ou omissão de leitura RLS),
          // priorizamos as configurações que já existem no localStorage do usuário em vez de resetar bruto.
          const localStr = localStorage.getItem('barber_settings');
          const currentSettings = localStr ? JSON.parse(localStr) : DEFAULT_SETTINGS;
          
          try {
            let userId: string | null = null;
            try {
              const { data: { user } } = await supabase.auth.getUser();
              userId = user?.id || null;
            } catch (err) {}
            
            const payload = mapSettingsToDb(currentSettings, userId);
            const { error: upsertErr } = await supabase.from('barber_settings').upsert([payload]);
            if (upsertErr) {
              const errMsg = (upsertErr.message || '').toLowerCase();
              if (errMsg.includes('user_id') && (errMsg.includes('column') || errMsg.includes('exist'))) {
                const cleanPayload = { ...payload };
                delete cleanPayload.user_id;
                await supabase.from('barber_settings').upsert([cleanPayload]);
              } else {
                throw upsertErr;
              }
            }
          } catch (upsertErr) {
            console.warn("Could not upsert settings in Supabase during registration:", upsertErr);
          }
          return currentSettings;
        }
      } catch (error) {
        console.warn("Supabase getSettings failed, checking Firebase/Local fallback:", error);
        const local = localStorage.getItem('barber_settings');
        return local ? JSON.parse(local) : DEFAULT_SETTINGS;
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
        const fallback = handleFirebaseOfflineOrError(error, 'getSettings', () => {
          const local = localStorage.getItem('barber_settings');
          return local ? JSON.parse(local) : DEFAULT_SETTINGS;
        });
        if (fallback !== null) return fallback;
        handleFirestoreError(error, OperationType.GET, path);
      }
    } else {
      const local = localStorage.getItem('barber_settings');
      return local ? JSON.parse(local) : DEFAULT_SETTINGS;
    }
  },

  async updateSettings(settings: BarberSettings): Promise<void> {
    // Sempre sincroniza com localStorage para cache local imediato no carregamento
    localStorage.setItem('barber_settings', JSON.stringify(settings));

    if (isSupabaseEnabled && supabase) {
      try {
        let userId: string | null = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id || null;
        } catch (err) {
          console.warn("Could not fetch current user during updateSettings:", err);
        }

        const dbPayload = mapSettingsToDb(settings, userId);
        const { error } = await supabase
          .from('barber_settings')
          .upsert([dbPayload]);

        if (error) {
          const errMsg = (error?.message || '').toLowerCase();
          // Se o banco não tem a coluna user_id, limpa e retenta sem essa coluna para máxima compatibilidade
          if (errMsg.includes('user_id') && (errMsg.includes('column') || errMsg.includes('exist'))) {
            console.warn("A coluna 'user_id' não existe na tabela 'barber_settings'. Retentando salvar sem 'user_id'...");
            const cleanPayload = { ...dbPayload };
            delete cleanPayload.user_id;
            const { error: retryError } = await supabase
              .from('barber_settings')
              .upsert([cleanPayload]);
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }
        return;
      } catch (error) {
        console.error("Supabase updateSettings failed:", error);
        throw error; // Não engula o erro! Deixa a UI saber!
      }
    }
    if (isFirebaseEnabled && db && auth?.currentUser) {
      const path = 'settings/barber';
      try {
        await setDoc(doc(db, 'settings', 'barber'), settings);
      } catch (error) {
        const fallback = handleFirebaseOfflineOrError(error, 'updateSettings', () => {});
        if (fallback !== null) return;
        handleFirestoreError(error, OperationType.WRITE, path);
      }
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
        const fallback = handleFirebaseOfflineOrError(error, 'getServices', () => {
          const local = localStorage.getItem('barber_services');
          return local ? JSON.parse(local) : DEFAULT_SERVICES;
        });
        if (fallback !== null) return fallback;
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
    if (isFirebaseEnabled && db && auth?.currentUser) {
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
    if (isFirebaseEnabled && db && auth?.currentUser) {
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
    if (isFirebaseEnabled && db && auth?.currentUser) {
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
        if (data && data.length > 0) {
          return (data || []).map(mapBookingFromDb);
        } else {
          try {
            const mocks = getMockBookings();
            await supabase.from('bookings').insert(mocks.map(mapBookingToDb));
          } catch (insertErr) {
            console.warn("Could not auto-populate bookings in Supabase:", insertErr);
          }
          return getMockBookings();
        }
      } catch (error) {
        console.warn("Supabase getBookings failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db && auth?.currentUser) {
      const path = 'bookings';
      try {
        const querySnapshot = await getDocs(collection(db, 'bookings'));
        const list: Booking[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Booking), id: docSnap.id });
        });
        return list;
      } catch (error) {
        const fallback = handleFirebaseOfflineOrError(error, 'getBookings', () => {
          const local = localStorage.getItem('barber_bookings');
          return local ? JSON.parse(local) : [];
        });
        if (fallback !== null) return fallback;
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
        const fallback = handleFirebaseOfflineOrError(error, 'getBookingsByDate', () => {
          const local = localStorage.getItem('barber_bookings');
          const bookings = local ? JSON.parse(local) as Booking[] : [];
          return bookings.filter(b => b.date === date);
        });
        if (fallback !== null) return fallback;
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
        const fallback = handleFirebaseOfflineOrError(error, 'getBookingsByWhatsApp', () => {
          const local = localStorage.getItem('barber_bookings');
          const bookings = local ? JSON.parse(local) as Booking[] : [];
          return bookings.filter(b => b.clientWhatsApp.trim().replace(/\D/g, '') === cleanWhatsApp || b.clientWhatsApp === whatsapp);
        });
        if (fallback !== null) return fallback;
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
        const fallback = handleFirebaseOfflineOrError(error, 'addBooking', async () => {
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
        });
        if (fallback !== null) return await fallback;
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
    // Carrega do localStorage primeiro para manter persistência local e cache
    const list = await this.getBookings();
    const updated = list.map(item => item.id === id ? { ...item, ...update } : item);
    localStorage.setItem('barber_bookings', JSON.stringify(updated));

    // Se o status estiver mudando de agendado para concluído, gera transação financeira e atualiza histórico do cliente
    if (update.status === 'concluido') {
      const current = list.find(b => b.id === id);
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
        // Também atualiza o cadastro de CRM do cliente (Spent e bookings count)
        await this.registerOrUpdateClient(current.clientName, current.clientWhatsApp, current.servicePrice, current.date);
      }
    }

    if (isSupabaseEnabled && supabase) {
      try {
        const dbUpdate: any = {};
        if (update.status) dbUpdate.status = update.status;
        if (update.paymentMethod) dbUpdate.payment_method = update.paymentMethod;
        if (update.notes !== undefined) dbUpdate.notes = update.notes;
        if (update.barberName !== undefined) dbUpdate.barber_name = update.barberName;

        const { error } = await supabase
          .from('bookings')
          .update(dbUpdate)
          .eq('id', id);
        if (!error) return;
        throw error;
      } catch (error) {
        console.warn("Supabase updateBooking failed:", error);
      }
    }
    if (isFirebaseEnabled && db) {
      const path = `bookings/${id}`;
      try {
        await updateDoc(doc(db, 'bookings', id), update as any);
      } catch (error) {
        const fallback = handleFirebaseOfflineOrError(error, 'updateBooking', async () => {});
        if (fallback !== null) return;
        handleFirestoreError(error, OperationType.WRITE, path);
      }
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
    if (isFirebaseEnabled && db && auth?.currentUser) {
      const path = `bookings/${id}`;
      try {
        await deleteDoc(doc(db, 'bookings', id));
      } catch (error) {
        const fallback = handleFirebaseOfflineOrError(error, 'deleteBooking', async () => {
          const list = await this.getBookings();
          const updated = list.filter(item => item.id !== id);
          localStorage.setItem('barber_bookings', JSON.stringify(updated));
        });
        if (fallback !== null) return await fallback;
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
        if (data && data.length > 0) {
          return (data || []).map(mapClientFromDb);
        } else {
          try {
            const mocks = getMockClients();
            await supabase.from('clients').insert(mocks.map(mapClientToDb));
          } catch (insertErr) {
            console.warn("Could not auto-populate clients in Supabase:", insertErr);
          }
          return getMockClients();
        }
      } catch (error) {
        console.warn("Supabase getClients failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db && auth?.currentUser) {
      const path = 'clients';
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const list: Client[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Client), id: docSnap.id });
        });
        return list;
      } catch (error) {
        const fallback = handleFirebaseOfflineOrError(error, 'getClients', () => {
          const local = localStorage.getItem('barber_clients');
          return local ? JSON.parse(local) : [];
        });
        if (fallback !== null) return fallback;
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
        const fallback = handleFirebaseOfflineOrError(error, 'addClient', async () => {
          const list = await this.getClients();
          list.push(newClient);
          localStorage.setItem('barber_clients', JSON.stringify(list));
          return newClient;
        });
        if (fallback !== null) return await fallback;
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
        const fallback = handleFirebaseOfflineOrError(error, 'updateClient', async () => {
          const list = await this.getClients();
          const updated = list.map(item => item.id === id ? { ...item, ...update } : item);
          localStorage.setItem('barber_clients', JSON.stringify(updated));
        });
        if (fallback !== null) return await fallback;
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
        if (data && data.length > 0) {
          return (data || []).map(mapTransactionFromDb);
        } else {
          try {
            const mocks = getMockTransactions();
            await supabase.from('transactions').insert(mocks.map(mapTransactionToDb));
          } catch (insertErr) {
            console.warn("Could not auto-populate transactions in Supabase:", insertErr);
          }
          return getMockTransactions();
        }
      } catch (error) {
        console.warn("Supabase getTransactions failed, checking Firebase/Local fallback:", error);
      }
    }
    if (isFirebaseEnabled && db && auth?.currentUser) {
      const path = 'transactions';
      try {
        const querySnapshot = await getDocs(collection(db, 'transactions'));
        const list: Transaction[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Transaction), id: docSnap.id });
        });
        return list;
      } catch (error) {
        const fallback = handleFirebaseOfflineOrError(error, 'getTransactions', () => {
          const local = localStorage.getItem('barber_transactions');
          return local ? JSON.parse(local) : [];
        });
        if (fallback !== null) return fallback;
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
    if (isFirebaseEnabled && db && auth?.currentUser) {
      const path = `transactions/${newId}`;
      try {
        await setDoc(doc(db, 'transactions', newId), newTx);
        return newTx;
      } catch (error) {
        const fallback = handleFirebaseOfflineOrError(error, 'addTransaction', async () => {
          const list = await this.getTransactions();
          list.push(newTx);
          localStorage.setItem('barber_transactions', JSON.stringify(list));
          return newTx;
        });
        if (fallback !== null) return await fallback;
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
    if (isFirebaseEnabled && db && auth?.currentUser) {
      const path = `transactions/${id}`;
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (error) {
        const fallback = handleFirebaseOfflineOrError(error, 'deleteTransaction', async () => {
          const list = await this.getTransactions();
          const updated = list.filter(item => item.id !== id);
          localStorage.setItem('barber_transactions', JSON.stringify(updated));
        });
        if (fallback !== null) return await fallback;
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const list = await this.getTransactions();
      const updated = list.filter(item => item.id !== id);
      localStorage.setItem('barber_transactions', JSON.stringify(updated));
    }
  }
};
