export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category?: string;
  description?: string;
}

export type BookingStatus = 'agendado' | 'confirmado' | 'concluido' | 'cancelado';

export interface Booking {
  id: string;
  clientName: string;
  clientWhatsApp: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: BookingStatus;
  notes?: string;
  paymentMethod?: 'pix' | 'dinheiro' | 'cartao' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'outro';
  barberName?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  whatsapp: string;
  birthDate?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  totalBookings: number;
  totalSpent: number;
}

export interface Transaction {
  id: string;
  type: 'receita' | 'despesa';
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: 'pix' | 'dinheiro' | 'cartao' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'outro';
  bookingId?: string;
  createdAt: string;
}

export interface BarberSettings {
  userId?: string;
  slug?: string;
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
  startHour: string; // HH:MM
  endHour: string; // HH:MM
  workingDays: number[]; // 0 for Sunday, 1 for Monday, etc.
  barbers?: string[];
  adminName?: string;
}

export type ViewType = 'client-schedule' | 'client-lookup' | 'admin';

export type AdminTabType = 'dashboard' | 'agenda' | 'clientes' | 'financeiro' | 'relatorios' | 'servicos' | 'config';
