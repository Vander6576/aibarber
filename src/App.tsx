import React, { useState, useEffect } from 'react';
import { dbStore } from './dbStore';
import { isSupabaseEnabled, supabase, isSupabaseOffline } from './supabase';
import { Service, Booking, Client, Transaction, BarberSettings, ViewType, AdminTabType } from './types';

// Componentes da Área Administrativa
import AdminDashboard from './components/AdminDashboard';
import AdminAgenda from './components/AdminAgenda';
import AdminClientes from './components/AdminClientes';
import AdminFinanceiro from './components/AdminFinanceiro';
import AdminServicos from './components/AdminServicos';
import AdminConfig from './components/AdminConfig';
import AdminRelatorios from './components/AdminRelatorios';

// Componente da Área Pública do Cliente
import PublicClientArea from './components/PublicClientArea';

// Icons
import {
  Scissors,
  Calendar,
  User,
  DollarSign,
  Sparkles,
  Settings,
  LogOut,
  ChevronRight,
  Eye,
  Cloud,
  CloudOff,
  LogIn,
  KeyRound,
  Mail,
  UserCheck,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  MapPin,
  Phone,
  Menu,
  X
} from 'lucide-react';

export default function App() {
  // --- ROTAS / VISUALIZAÇÕES ---
  // Detecta pathname ou hash para roteamento SPA padrão
  const getInitialView = (): ViewType => {
    const path = window.location.pathname;
    if (path.includes('/admin')) return 'admin';
    if (path.includes('/consultar')) return 'client-lookup';
    return 'client-schedule'; // padrão
  };

  const [currentView, setCurrentView] = useState<ViewType>(getInitialView());
  const [adminTab, setAdminTab] = useState<AdminTabType>('dashboard');
  const [showAdminMobileMenu, setShowAdminMobileMenu] = useState(false);

  // --- CONTROLE DE SESSÃO / AUTH ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [adminUser, setAdminUser] = useState<any>(null);

  // --- ESTADO GLOBAL DA BANCO DE DADOS ---
  const [settings, setSettings] = useState<BarberSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbOffline, setIsDbOffline] = useState(isSupabaseOffline);
  const [currentBarberUserId, setCurrentBarberUserId] = useState<string | null>(null);

  // --- CONNECTIVITY STATUS SYNCHRONIZATION ---
  useEffect(() => {
    setIsDbOffline(isSupabaseOffline);
    const handleSupabaseOfflineChange = (e: any) => {
      setIsDbOffline(e.detail);
    };
    window.addEventListener('supabase-offline-change', handleSupabaseOfflineChange);
    return () => {
      window.removeEventListener('supabase-offline-change', handleSupabaseOfflineChange);
    };
  }, []);

  // --- REAL-TIME ROUTING TRACKING ---
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path.includes('/admin')) {
        setCurrentView('admin');
      } else if (path.includes('/consultar')) {
        setCurrentView('client-lookup');
      } else {
        if (path === '/' || path === '') {
          window.history.replaceState({}, "", "/agendar");
        }
        setCurrentView('client-schedule');
      }
      loadDatabase();
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [isAdminLoggedIn]);

  const navigateToView = (view: ViewType) => {
    let urlPath = "/";
    if (view === 'admin') urlPath = "/admin";
    if (view === 'client-lookup') urlPath = "/consultar";
    if (view === 'client-schedule') urlPath = "/agendar";

    window.history.pushState({}, "", urlPath);
    setCurrentView(view);
    loadDatabase();
  };

  // --- CARREGAMENTO DE DADOS BANCO DE DADOS ---
  const loadDatabase = async () => {
    setIsLoading(true);
    try {
      const path = window.location.pathname;
      let slugOrId: string | null = null;
      if (path.startsWith('/agendar/')) {
        slugOrId = path.substring(9).trim();
      } else if (path.startsWith('/consultar/')) {
        slugOrId = path.substring(11).trim();
      }

      let activeSettings: BarberSettings | null = null;
      let activeServices: Service[] = [];
      let targetBarberUserId: string | null = null;

      if (slugOrId && slugOrId !== "" && !path.includes('/admin')) {
        // Busca a barbearia específica dona do link público por seu slug
        const barberData = await dbStore.getSettingsBySlugOrId(slugOrId);
        if (barberData) {
          activeSettings = barberData;
          targetBarberUserId = barberData.user_id;
          activeServices = await dbStore.getServices(targetBarberUserId);
        } else {
          // Barbearia não cadastrada/encontrada
          setSettings(null);
          setServices([]);
          setCurrentBarberUserId(null);
          setIsLoading(false);
          return;
        }
      } else if (path.includes('/admin')) {
        // Modo Administrativo: Carrega as configurações do admin logado
        console.log("[DEBUG LOG] Iniciando carregamento das configurações para o Modo Administrativo...");
        const settsData = await dbStore.getSettings();
        if (settsData) {
          console.log("[DEBUG LOG] Configurações administrativas encontradas:", settsData);
          activeSettings = settsData;
          targetBarberUserId = settsData.userId || null;
          activeServices = await dbStore.getServices();
        } else {
          console.warn("[DEBUG LOG] getSettings() retornou nulo para Modo Administrativo. Iniciando fallback padrão.");
          activeSettings = {
            name: "Minha Barbearia",
            slug: "barbearia",
            address: "Adicione seu endereço",
            phone: "(99) 99999-9999",
            logoUrl: "",
            startHour: "08:00",
            endHour: "20:00",
            workingDays: [1, 2, 3, 4, 5, 6],
            barbers: ["Carlos", "Thiago", "Marcos"],
            adminName: "Administrador"
          };
          targetBarberUserId = "local-demo-user-id";
          activeServices = [];
        }
      } else {
        // Acesso público sem slug (ex: `/` ou `/agendar` sem identificador)
        setSettings(null);
        setServices([]);
        setCurrentBarberUserId(null);
        setIsLoading(false);
        return;
      }

      setSettings(activeSettings);
      setServices(activeServices);
      setCurrentBarberUserId(targetBarberUserId);

      // 2. Só carrega as coleções administrativas restritas se o admin estiver logado ou em modo Sandbox sem Supabase
      if (!isSupabaseEnabled || isAdminLoggedIn) {
        try {
          const bksData = await dbStore.getBookings();
          setBookings(bksData || []);
        } catch (err) {
          console.warn("Could not load bookings administratively:", err);
        }

        try {
          const clisData = await dbStore.getClients();
          setClients(clisData || []);
        } catch (err) {
          console.warn("Could not load clients administratively:", err);
        }

        try {
          const txsData = await dbStore.getTransactions();
          setTransactions(txsData || []);
        } catch (err) {
          console.warn("Could not load transactions administratively:", err);
        }
      } else {
        // Limpa as tabelas de dados restritos para uso público da área de cliente
        setBookings([]);
        setClients([]);
        setTransactions([]);
      }
    } catch (err) {
      console.error("Falha ao carregar tabelas do banco:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, [isAdminLoggedIn]);

  // --- SINCRONIZAÇÃO DE AUTENTICAÇÃO COM SUPABASE OU LOCAL ---
  useEffect(() => {
    const isLocalAuth = localStorage.getItem('barber_admin_auth') === 'true';
    if (isLocalAuth) {
      console.log("[DEBUG LOG] 2. Usuário autenticado encontrado: Modo Bypass Local/Demo");
      console.log("[DEBUG LOG] 3. Sessão carregada: Local Storage LocalAuth Session");
      setIsAdminLoggedIn(true);
      return;
    }

    if (isSupabaseEnabled && supabase) {
      // Obter sessão inicial
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (localStorage.getItem('barber_admin_auth') === 'true') {
          console.log("[DEBUG LOG] 2. Usuário autenticado encontrado: Modo Bypass Local/Demo");
          console.log("[DEBUG LOG] 3. Sessão carregada: Local Storage LocalAuth Session");
          setIsAdminLoggedIn(true);
          return;
        }
        if (session && session.user) {
          console.log("[DEBUG LOG] 2. Usuário autenticado encontrado (Supabase getSession):", session.user.email);
          console.log("[DEBUG LOG] 3. Sessão carregada (Supabase getSession):", session);
          setAdminUser(session.user);
          setIsAdminLoggedIn(true);
        } else {
          setAdminUser(null);
          setIsAdminLoggedIn(false);
        }
      });

      // Escutar mudanças de estado
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        if (localStorage.getItem('barber_admin_auth') === 'true') {
          console.log("[DEBUG LOG] 2. Usuário autenticado encontrado: Modo Bypass Local/Demo");
          console.log("[DEBUG LOG] 3. Sessão carregada: Local Storage LocalAuth Session");
          setIsAdminLoggedIn(true);
          return;
        }
        if (session && session.user) {
          console.log("[DEBUG LOG] 2. Usuário autenticado encontrado (Supabase Auth Change):", session.user.email);
          console.log("[DEBUG LOG] 3. Sessão carregada (Supabase Auth Change):", session);
          setAdminUser(session.user);
          setIsAdminLoggedIn(true);
        } else {
          setAdminUser(null);
          setIsAdminLoggedIn(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Login persistido localmente em modo sandbox
      setIsAdminLoggedIn(isLocalAuth);
    }
  }, []);

  // --- CRUDS TRIGGERS COM ATUALIZAÇÃO REATIVA DE ESTADO ---
  const handleUpdateSettings = async (newSettings: BarberSettings) => {
    await dbStore.updateSettings(newSettings);
    setSettings(newSettings);
  };

  const handleAddService = async (service: Omit<Service, 'id'>) => {
    const srv = await dbStore.addService(service);
    setServices(prev => [...prev, srv]);
    return srv;
  };

  const handleUpdateService = async (id: string, service: Partial<Service>) => {
    await dbStore.updateService(id, service);
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...service } : s));
  };

  const handleDeleteService = async (id: string) => {
    await dbStore.deleteService(id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const handleAddBooking = async (booking: Omit<Booking, 'id' | 'createdAt'>) => {
    const bk = await dbStore.addBooking(booking, currentBarberUserId);
    // Recarrega todos de forma limpa para recalcular os faturamentos associados e CRM de clientes
    await loadDatabase();
    return bk;
  };

  const handleUpdateBooking = async (id: string, update: Partial<Booking>) => {
    await dbStore.updateBooking(id, update, currentBarberUserId);
    await loadDatabase();
  };

  const handleDeleteBooking = async (id: string) => {
    await dbStore.deleteBooking(id);
    await loadDatabase();
  };

  const handleAddClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    const cli = await dbStore.addClient(client);
    setClients(prev => [...prev, cli]);
    return cli;
  };

  const handleUpdateClient = async (id: string, update: Partial<Client>) => {
    await dbStore.updateClient(id, update);
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
  };

  const handleAddTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx = await dbStore.addTransaction(tx);
    setTransactions(prev => [...prev, newTx]);
    return newTx;
  };

  const handleDeleteTransaction = async (id: string) => {
    await dbStore.deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // --- PROCESSAMENTO DE AUTENTICAÇÃO ENTRADA/SAIDA ---
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const emailStr = authEmail.trim();
    if (!emailStr || !authPassword) {
      setAuthError("Forneça e-mail e senha de acesso!");
      return;
    }

    console.log("[DEBUG LOG] 1. Login executado: Tentando login manual com e-mail:", emailStr);

    if (isSupabaseEnabled && supabase) {
      try {
        console.log("[SUPABASE AUTH] Iniciando login com email/senha...");
        const { error } = await supabase.auth.signInWithPassword({
          email: emailStr,
          password: authPassword
        });
        if (error) {
          setAuthError("Erro de acesso Supabase: " + error.message);
        }
      } catch (err: any) {
        setAuthError("Erro de acesso Supabase: E-mail ou senha inválidos.");
      }
    } else {
      // Modo Local sandbox: aceita demo@barbearia.com / demo123 (ou qualquer e-mail para robustez)
      if (emailStr === "demo@barbearia.com" && authPassword === "demo123") {
        localStorage.setItem('barber_admin_auth', 'true');
        setIsAdminLoggedIn(true);
        setAuthEmail("");
        setAuthPassword("");
      } else if (emailStr && authPassword.length >= 6) {
        // Permite cadastrar localmente novos dados para teste rápido
        localStorage.setItem('barber_admin_auth', 'true');
        setIsAdminLoggedIn(true);
        setAuthEmail("");
        setAuthPassword("");
      } else {
        setAuthError("Credenciais inválidas! Preencha 'demo@barbearia.com' e senha 'demo123' para o modo de Demonstração.");
      }
    }
  };

  // Criação de novos usuários administradores
  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!authEmail || authPassword.length < 6) {
      setAuthError("O e-mail deve ser válido e a senha necessita de no mínimo 6 caracteres!");
      return;
    }

    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword
        });
        if (error) {
          setAuthError("Erro Supabase: " + error.message);
        } else {
          alert("Cadastro realizado! Verifique seu e-mail caso o envio esteja ativo no painel Supabase.");
          setIsRegisterMode(false);
        }
      } catch (err: any) {
        setAuthError("Erro Supabase: " + err.message);
      }
    } else {
      // Criação rápida em modo local
      localStorage.setItem('barber_admin_auth', 'true');
      setIsAdminLoggedIn(true);
      setIsRegisterMode(false);
      setAuthEmail("");
      setAuthPassword("");
    }
  };

  // Envio de link para recuperação de senha administrativa
  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setRecoverySuccessMessage("");

    const emailStr = authEmail.trim();
    if (!emailStr) {
      setAuthError("Preencha o campo de e-mail de trabalho para receber as diretrizes de recuperação!");
      return;
    }

    if (isSupabaseEnabled && supabase) {
      try {
        console.log("[SUPABASE RECOVERY] Solicitando link de reset de senha para o e-mail:", emailStr);
        const { error } = await supabase.auth.resetPasswordForEmail(emailStr, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        console.log("[SUPABASE RECOVERY SUCCESS] E-mail enviado com sucesso!");
        setRecoverySuccessMessage(`Link de redefinição de senha enviado para "${emailStr}". Verifique sua caixa de entrada.`);
      } catch (err: any) {
        console.error("[SUPABASE RECOVERY ERROR] Erro ao enviar reset de e-mail no Supabase:", err);
        setAuthError("Erro de recuperação Supabase: " + (err.message || err));
      }
    } else {
      console.warn("[RECOVERY METHOD] Redefinição de senha indisponível no modo local/bypass.");
      setAuthError("A redefinição de senha está indisponível porque nenhum provedor em nuvem está habilitado ou configurado.");
    }
  };

  const handleAdminLogout = async () => {
    setAuthError("");
    localStorage.removeItem('barber_admin_auth');
    setAdminUser(null);
    setIsAdminLoggedIn(false);

    try {
      if (isSupabaseEnabled && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Erro ao efetuar logout:", err);
    }
  };

  // Login usando o provedor do Google no Supabase
  const handleGoogleLogin = async () => {
    setAuthError("");
    if (isSupabaseEnabled && supabase) {
      console.log("[SUPABASE GOOGLE SIGNIN] Iniciando fluxo de autenticação do Google...");
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (err: any) {
        console.error("[SUPABASE GOOGLE SIGNIN ERROR] Falha no login via Google:", err);
        setAuthError("Erro Google Supabase: " + (err.message || err));
      }
    } else {
      console.warn("[GOOGLE SIGNIN] Operação abortada. Nenhum provedor de nuvem ativo.");
      setAuthError("Nenhum provedor de nuvem ativo para autenticação Google.");
    }
  };

  // Selecionador de Login Automático do modo de demonstração local para agilidade de review
  const handleQuickDemoLogin = () => {
    console.log("[DEBUG LOG] 1. Login executado via Clique Único de Demonstração");
    setAuthEmail("demo@barbearia.com");
    setAuthPassword("demo123");
    localStorage.setItem('barber_admin_auth', 'true');
    setIsAdminLoggedIn(true);
  };

  // --- CARREGADOR LOADING SPINNER SKELETON ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500"></div>
          <Scissors className="h-6 w-6 text-amber-500 transform -rotate-45 animate-pulse" />
        </div>
        <h4 className="text-sm font-bold font-sans tracking-tight uppercase text-zinc-350">Carregando Agenda...</h4>
        <p className="text-xs text-zinc-550 mt-1">Conectando ao banco de dados e sincronizando tabelas.</p>
      </div>
    );
  }

  // Se não estiver carregando, mas as configurações não existirem e o usuário NÃO estiver acessando o painel administrativo
  if (!settings && currentView !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="max-w-md w-full text-center space-y-6 bg-zinc-900/30 border border-white/[0.03] p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/5 via-transparent to-transparent pointer-events-none"></div>
          
          <div className="mx-auto bg-red-500/10 text-red-500 p-4 rounded-2xl border border-red-500/15 w-fit">
            <AlertCircle className="h-8 w-8 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-display text-white tracking-tight">Barbearia não encontrada</h2>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
              O link que você tentou acessar não pertence a nenhuma barbearia cadastrada ou o perfil foi temporariamente desativado.
            </p>
          </div>

          <div className="pt-2">
            <a 
              href="/admin" 
              onClick={(e) => {
                e.preventDefault();
                navigateToView('admin');
              }}
              className="inline-flex w-full items-center justify-center bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Acessar Painel Administrativo
            </a>
          </div>
          
          <div className="text-[10px] text-zinc-600 font-mono">
            Código de Erro: BARBERSHOP_NOT_FOUND
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-amber-500 selection:text-black">
      
      {/* =========================================================================
          1. ÁREA PÚBLICA DO CLIENTE (Rota: / ou qualquer outra exceto admin)
          ========================================================================= */}
      {currentView !== 'admin' && (
        <div className="min-h-screen flex flex-col justify-between" id="public-client-application-frame">
          
          {/* HEADER DA ÁREA PÚBLICA (NÃO EXIBE BOTÃO DE ADMIN / ALTERNAR) */}
          <header className="border-b border-zinc-900/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-4 shadow-xl">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-500 text-zinc-950 p-2 rounded-xl shadow-lg shadow-amber-500/10">
                  <Scissors className="h-5 w-5 transform -rotate-45" />
                </div>
                <div>
                  <span className="text-base sm:text-lg font-serif font-extrabold text-white tracking-tight uppercase">{settings.name}</span>
                  <span className="text-[9px] text-amber-500 block font-mono font-bold tracking-widest leading-none">VIP EXPERIENCE</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
                <a href="#services-catalog-view" className="hover:text-amber-500 transition-colors">Serviços</a>
                <span className="text-zinc-800">•</span>
                <a href="#contato-info" className="hover:text-amber-500 transition-colors">Contato & Endereço</a>
              </div>
            </div>
          </header>

          {/* CONTEÚDO PRINCIPAL DA ÁREA PÚBLICA */}
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
            
            {/* HERO DA ÁREA PÚBLICA ENFOCADA EM CONVERSÃO DE CLIENTES */}
            <section className="bg-zinc-900/30 border border-white/[0.03] rounded-3xl p-6 sm:p-10 relative overflow-hidden text-center md:text-left shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-7 space-y-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[10px] font-bold tracking-wider uppercase">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Agendamento descomplicado
                  </span>
                  
                  <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    Garanta seu <span className="text-amber-500">Estilo</span> na Agenda Oficial
                  </h2>
                  
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
                    Selecione o serviço ideal abaixo para você ou sua família. Nosso sistema calcula a duração e reserva sua vaga imediatamente no banco de dados com fuso horário ajustado!
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 bg-zinc-950/90 border border-zinc-900 p-3.5 rounded-2xl flex-1 shadow-md shadow-black/10">
                      <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <div className="truncate text-left">
                        <strong className="text-zinc-300 block">Endereço</strong>
                        <span className="text-[10px] text-zinc-500 block truncate">{settings.address}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 bg-zinc-950/90 border border-zinc-900 p-3.5 rounded-2xl flex-1 shadow-md shadow-black/10">
                      <Phone className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <div className="text-left">
                        <strong className="text-zinc-300 block">Fale Conosco</strong>
                        <span className="text-[10px] text-zinc-500 block">{settings.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA DE ATALHO EXPLICATIVO */}
                <div className="md:col-span-5 grid grid-cols-2 gap-3.5">
                  <div className="bg-zinc-950/85 border border-zinc-900 hover:border-amber-500/30 transition-all duration-300 p-4 rounded-2xl space-y-2 shadow-lg shadow-black/20">
                    <span className="text-amber-500 font-mono text-[9px] font-extrabold uppercase tracking-widest block">Passo 01</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-tight">Selecione o Serviço</h4>
                    <p className="text-[10px] text-zinc-400 leading-normal">Escolha as melhores opções do nosso catálogo premium.</p>
                  </div>
                  <div className="bg-zinc-950/85 border border-zinc-900 hover:border-amber-500/30 transition-all duration-300 p-4 rounded-2xl space-y-2 shadow-lg shadow-black/20">
                    <span className="text-amber-500 font-mono text-[9px] font-extrabold uppercase tracking-widest block">Passo 02</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-tight">Hora e Dia</h4>
                    <p className="text-[10px] text-zinc-400 leading-normal">Slots limpos baseados sob os fusos disponíveis.</p>
                  </div>
                  <div className="bg-zinc-950/85 border border-zinc-900 hover:border-amber-500/30 transition-all duration-300 p-4 rounded-2xl space-y-2 shadow-lg shadow-black/20">
                    <span className="text-amber-500 font-mono text-[9px] font-extrabold uppercase tracking-widest block">Passo 03</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-tight">Identifique-se</h4>
                    <p className="text-[10px] text-zinc-400 leading-normal">Preencha seu WhatsApp para sincronizar o contato.</p>
                  </div>
                  <div className="bg-zinc-950/85 border border-zinc-900 hover:border-amber-500/30 transition-all duration-300 p-4 rounded-2xl space-y-2 shadow-lg shadow-black/20">
                    <span className="text-amber-500 font-mono text-[9px] font-extrabold uppercase tracking-widest block">Passo 04</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-tight">Confirmado!</h4>
                    <p className="text-[10px] text-zinc-400 leading-normal">Seu horário fica bloqueado em tempo real na nuvem.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* WIDGET DO AGENDAMENTO PÚBLICO */}
            <PublicClientArea
              services={services}
              bookings={bookings}
              settings={settings}
              onAddBooking={handleAddBooking}
              onUpdateBooking={handleUpdateBooking}
            />

          </main>

          {/* FOOTER TOTALMENTE EXCLUSIVO DO CLIENTE (SEM LINK ADMIN) */}
          <footer className="bg-zinc-950 border-t border-zinc-900 py-8 text-center text-xs text-zinc-550" id="contato-info">
            <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#121212] border border-zinc-900 p-1.5 rounded-lg text-amber-500">
                  <Scissors className="h-3.5 w-3.5 transform -rotate-45" />
                </div>
                <span className="text-xs font-serif font-extrabold text-white tracking-widest uppercase">{settings.name}</span>
              </div>
              <p className="font-mono text-[10px]">
                © 2026 {settings.name} • VIP Gentlemen Barbershop. Todos os direitos reservados.
              </p>
            </div>
          </footer>

        </div>
      )}

      {/* =========================================================================
          2. PAINEL ADMINISTRATIVO (Rota: /admin)
          ========================================================================= */}
      {currentView === 'admin' && (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between" id="admin-application-frame">
          
          {!isAdminLoggedIn ? (
            
            // --- TELA DE LOGIN SAAS MINIMALISTA ---
            <div className="flex-1 flex items-center justify-center p-4 py-16" id="admin-auth-exclusive-layout">
              <div className="bg-[#121212] border border-[#ffffff07] p-8 rounded-3xl shadow-2xl relative overflow-hidden w-full max-w-md space-y-6">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                {isRecoveryMode ? (
                  <>
                    <div className="text-center space-y-2">
                      <div className="inline-block bg-amber-500 text-black p-3 rounded-2xl border border-amber-600 mb-2 shadow-lg shadow-amber-500/10">
                        <KeyRound className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest font-mono">BarberConnect SaaS</span>
                        <h2 className="text-xl font-bold tracking-tight text-white mt-1">Recuperação de Senha</h2>
                        <p className="text-xs text-zinc-400 mt-1">Insira seu e-mail administrativo para enviarmos os passos de redefinição de acesso.</p>
                      </div>
                    </div>

                    {authError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-xl flex items-start gap-1.5 leading-tight font-sans">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    {recoverySuccessMessage && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl flex items-start gap-1.5 leading-tight font-sans">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span>{recoverySuccessMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handlePasswordRecovery} className="space-y-4 font-sans text-sm">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 block font-medium">E-mail Cadastrado</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <input
                            type="email"
                            required
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder="seuemail@exemplo.com"
                            className="bg-black border border-zinc-900 text-white text-xs rounded-xl pl-9 pr-4 py-2.5 w-full focus:outline-none focus:border-amber-500/50 font-sans"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md mt-6 text-xs cursor-pointer"
                      >
                        <Mail className="h-4 w-4" /> Enviar Link de Recuperação
                      </button>
                    </form>

                    <div className="text-center pt-2 text-xs text-zinc-400">
                      <button
                        type="button"
                        onClick={() => { setIsRecoveryMode(false); setAuthError(""); setRecoverySuccessMessage(""); }}
                        className="text-amber-500 font-bold hover:underline cursor-pointer"
                      >
                        Voltar para o Login
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <div className="inline-block bg-amber-500 text-black p-3 rounded-2xl border border-amber-600 mb-2 shadow-lg shadow-amber-500/10">
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest font-mono">BarberConnect SaaS</span>
                        <h2 className="text-xl font-bold tracking-tight text-white mt-1">Painel Corporativo</h2>
                        <p className="text-xs text-zinc-400 mt-1">Efetue login administrativo para monitorar movimentações financeiras, catálogo e CRM de clientes.</p>
                      </div>
                    </div>

                    {authError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-xl flex items-start gap-1.5 leading-tight font-sans">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    {/* BOTÃO DO GOOGLE (PROVEDOR ATIVO NO SEU SUPABASE CONSOLE) */}
                    {isSupabaseEnabled && !isRegisterMode && (
                      <div className="space-y-4 pt-1">
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full bg-white hover:bg-zinc-100 text-zinc-950 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg text-xs cursor-pointer active:scale-[0.98]"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                          Entrar com o Google (Recomendado)
                        </button>
                        
                        <div className="relative flex py-1 items-center">
                          <div className="flex-grow border-t border-zinc-900"></div>
                          <span className="flex-shrink mx-4 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">ou entrada manual / livre</span>
                          <div className="flex-grow border-t border-zinc-900"></div>
                        </div>
                      </div>
                    )}

                    <form onSubmit={isRegisterMode ? handleAdminRegister : handleAdminLogin} className="space-y-4 font-sans text-sm">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 block font-medium">E-mail de Trabalho</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <input
                            type="email"
                            required
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder="barbeiro@seusite.com"
                            className="bg-black border border-zinc-900 text-white text-xs rounded-xl pl-9 pr-4 py-2.5 w-full focus:outline-none focus:border-amber-500/50 font-sans"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 block font-medium">Senha Operacional</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <input
                            type="password"
                            required
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="Mínimo 6 dígitos"
                            className="bg-black border border-zinc-900 text-white text-xs rounded-xl pl-9 pr-4 py-2.5 w-full focus:outline-none focus:border-amber-500/50 font-mono"
                          />
                        </div>
                        
                        {/* LINK RECUPERAÇÃO DE SENHA */}
                        {!isRegisterMode && (
                          <div className="text-right pt-1">
                            <button
                              type="button"
                              onClick={() => { setIsRecoveryMode(true); setAuthError(""); setRecoverySuccessMessage(""); }}
                              className="text-amber-500 hover:text-amber-400 text-[10px] font-bold transition hover:underline cursor-pointer"
                            >
                              Esqueceu sua senha?
                            </button>
                          </div>
                        )}
                      </div>

                      {!isRegisterMode && (
                        <button
                          type="submit"
                          className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md mt-6 text-xs cursor-pointer"
                        >
                          <LogIn className="h-4 w-4" /> Entrar no Sistema
                        </button>
                      )}

                      {isRegisterMode && (
                        <button
                          type="submit"
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md mt-6 text-xs cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Confirmar Cadastro
                        </button>
                      )}
                    </form>

                    {/* BYPASS DEMO MODE MOCK DESIGNER */}
                    <div className="bg-black border border-zinc-900 p-4 rounded-2xl text-center space-y-2">
                      <div className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        <strong className="text-amber-500">Bypass / Entrada de Demonstração:</strong> Se deseja realizar uma avaliação rápida e testes imediatos no painel operacional:
                      </div>
                      <div className="text-[9.5px] font-mono text-zinc-500 bg-zinc-955 py-1.5 rounded-lg border border-zinc-900">
                        E-mail: <span className="text-zinc-300">demo@barbearia.com</span> • Senha: <span className="text-zinc-300">demo123</span>
                      </div>
                      <button
                        onClick={handleQuickDemoLogin}
                        className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1.5 mx-auto pt-1 hover:underline cursor-pointer"
                      >
                        Entrar com 1-Clique demo-bypass <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* REGISTER ALTERNATOR FOR SUPABASE */}
                    {isSupabaseEnabled && (
                      <div className="text-center pt-2 text-xs text-zinc-400">
                        {isRegisterMode ? (
                          <span>Já possui cadastro? <button onClick={() => { setIsRegisterMode(false); setAuthError(""); }} className="text-amber-500 font-bold hover:underline cursor-pointer">Fazer Login</button></span>
                        ) : (
                          <span>Primeiro acesso? <button onClick={() => { setIsRegisterMode(true); setAuthError(""); }} className="text-amber-500 font-bold hover:underline cursor-pointer">Cadastrar Administrador</button></span>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>

          ) : (
            
            // --- WORKSPACE ADMINISTRATIVO EXCLUSIVO (Layout SaaS Pro) ---
            <div className="flex-1 w-full flex flex-col lg:flex-row gap-6 p-4 sm:p-6 pb-24 lg:pb-6" id="logged-admin-workspace">
              
              {/* ASIDE SIDEBAR ADMIN LAYOUT COMPONENT */}
              <aside className="hidden lg:block bg-[#121212] border border-[#ffffff07] rounded-3xl p-5 shadow-2xl space-y-6 h-fit w-full lg:w-72 flex-shrink-0" id="admin-sidebar-menu">
                
                {/* Active user header block */}
                <div className="border-b border-zinc-905 pb-5 space-y-1">
                  <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest font-semibold">Conta Operacional</span>
                  <h4 className="text-xs font-bold text-white truncate max-w-[240px] font-sans">{adminUser?.email || "Administrador Geral"}</h4>
                  <div className="inline-flex items-center gap-1.5 pt-1.5">
                    <span className="text-[9px] bg-zinc-955 border border-zinc-900 text-amber-500 px-2 py-0.5 rounded font-mono font-bold">Barbeiro Master</span>
                    
                     {/* Status Indicador para Nuvem */}
                     {isSupabaseEnabled && supabase ? (
                       isDbOffline ? (
                         <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Supabase Desconectado/Offline" />
                       ) : (
                         <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Supabase Conectado" />
                       )
                     ) : (
                       <span className="h-2 w-2 rounded-full bg-amber-500" title="Modo Local Sandbox" />
                     )}
                  </div>
                </div>

                {/* Sider Navigation Links */}
                <nav className="flex flex-col gap-1 text-xs font-sans font-semibold" id="sidebar-navigator-list">
                  
                  <button
                    onClick={() => setAdminTab('dashboard')}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      adminTab === 'dashboard' ? 'bg-amber-500 text-zinc-950 font-bold shadow shadow-amber-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" /> Dashboard Geral
                  </button>

                  <button
                    onClick={() => setAdminTab('agenda')}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      adminTab === 'agenda' ? 'bg-amber-500 text-zinc-950 font-bold shadow shadow-amber-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <Calendar className="h-4 w-4" /> Agenda de Horários
                  </button>

                  <button
                    onClick={() => setAdminTab('clientes')}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      adminTab === 'clientes' ? 'bg-amber-500 text-zinc-950 font-bold shadow shadow-amber-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <User className="h-4 w-4" /> Gestão de Clientes (CRM)
                  </button>

                  <button
                    onClick={() => setAdminTab('financeiro')}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      adminTab === 'financeiro' ? 'bg-amber-500 text-zinc-950 font-bold shadow shadow-amber-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <DollarSign className="h-4 w-4" /> Fluxo Financeiro
                  </button>

                  <button
                    onClick={() => setAdminTab('relatorios')}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      adminTab === 'relatorios' ? 'bg-amber-500 text-zinc-950 font-bold shadow shadow-amber-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" /> Relatórios & Analytics
                  </button>

                  <button
                    onClick={() => setAdminTab('servicos')}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      adminTab === 'servicos' ? 'bg-amber-500 text-zinc-950 font-bold shadow shadow-amber-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <Scissors className="h-4 w-4" /> Catálogo de Serviços
                  </button>

                  <button
                    onClick={() => setAdminTab('config')}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      adminTab === 'config' ? 'bg-amber-500 text-zinc-950 font-bold shadow shadow-amber-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <Settings className="h-4 w-4" /> Configurações Gerais
                  </button>

                </nav>

                {/* Logout Action link */}
                <div className="border-t border-zinc-905 pt-4 text-xs font-semibold">
                  <button
                    onClick={handleAdminLogout}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-red-500 hover:bg-red-500/5 transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" /> Sair do Painel
                  </button>
                </div>

              </aside>

              {/* MOBILE BOTTOM NAVIGATION BAR */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-white/5 pb-5 pt-2 flex items-center justify-around px-2 shadow-2xl">
                <button
                  onClick={() => { setAdminTab('dashboard'); setShowAdminMobileMenu(false); }}
                  className={`flex flex-col items-center gap-1.5 py-1 text-[10px] font-sans font-bold flex-1 transition-all ${
                    adminTab === 'dashboard' ? 'text-amber-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Início</span>
                </button>
                
                <button
                  onClick={() => { setAdminTab('agenda'); setShowAdminMobileMenu(false); }}
                  className={`flex flex-col items-center gap-1.5 py-1 text-[10px] font-sans font-bold flex-1 transition-all ${
                    adminTab === 'agenda' ? 'text-amber-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                  <span>Agenda</span>
                </button>

                <button
                  onClick={() => { setAdminTab('clientes'); setShowAdminMobileMenu(false); }}
                  className={`flex flex-col items-center gap-1.5 py-1 text-[10px] font-sans font-bold flex-1 transition-all ${
                    adminTab === 'clientes' ? 'text-amber-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span>Clientes</span>
                </button>

                <button
                  onClick={() => { setAdminTab('financeiro'); setShowAdminMobileMenu(false); }}
                  className={`flex flex-col items-center gap-1.5 py-1 text-[10px] font-sans font-bold flex-1 transition-all ${
                    adminTab === 'financeiro' ? 'text-amber-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <DollarSign className="h-5 w-5" />
                  <span>Finanças</span>
                </button>

                <button
                  onClick={() => setShowAdminMobileMenu(!showAdminMobileMenu)}
                  className={`flex flex-col items-center gap-1.5 py-1 text-[10px] font-sans font-bold flex-1 transition-all ${
                    showAdminMobileMenu || ['relatorios', 'servicos', 'config'].includes(adminTab) ? 'text-amber-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Menu className="h-5 w-5" />
                  <span>Mais</span>
                </button>
              </div>

              {/* MOBILE BOTTOM SHEET MENU (DRAWER OVERLAY) */}
              {showAdminMobileMenu && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
                  <div className="w-full bg-[#121212] border-t border-white/5 rounded-t-3xl p-6 pb-12 space-y-5 animate-in slide-in-from-bottom duration-200 shadow-2xl">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                      <div>
                        <h4 className="text-sm font-sans font-extrabold text-white uppercase tracking-tight">Mais Opções</h4>
                        <p className="text-[10px] text-zinc-500 font-mono tracking-wider">BarberConnect Operações</p>
                      </div>
                      <button 
                        onClick={() => setShowAdminMobileMenu(false)}
                        className="p-2 bg-zinc-950 border border-white/5 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer hover:border-white/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pb-3">
                      <button
                        onClick={() => { setAdminTab('relatorios'); setShowAdminMobileMenu(false); }}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                          adminTab === 'relatorios' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-zinc-950 border-white/5 text-zinc-400'
                        }`}
                      >
                        <BarChart3 className="h-5 w-5" />
                        <span className="text-xs font-sans font-bold leading-none">Relatórios</span>
                      </button>
                      <button
                        onClick={() => { setAdminTab('servicos'); setShowAdminMobileMenu(false); }}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                          adminTab === 'servicos' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-zinc-950 border-white/5 text-zinc-400'
                        }`}
                      >
                        <Scissors className="h-5 w-5" />
                        <span className="text-xs font-sans font-bold leading-none">Serviços</span>
                      </button>
                      <button
                        onClick={() => { setAdminTab('config'); setShowAdminMobileMenu(false); }}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                          adminTab === 'config' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-zinc-950 border-white/5 text-zinc-400'
                        }`}
                      >
                        <Settings className="h-5 w-5" />
                        <span className="text-xs font-sans font-bold leading-none">Configurações</span>
                      </button>
                      <button
                        onClick={() => { handleAdminLogout(); setShowAdminMobileMenu(false); }}
                        className="p-4 rounded-2xl border border-red-500/10 bg-[#1e0e0e]/40 text-red-400 text-left flex flex-col justify-between h-24 hover:bg-[#1e0e0e] cursor-pointer"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="text-xs font-sans font-bold leading-none">Desconectar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO PRINCIPAL DO WORKSPACE INTEGRADO */}
              <div className="flex-1 min-w-0" id="admin-viewports-box">
                {isDbOffline && (
                  <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-500 text-xs leading-relaxed" id="db-offline-alert-banner">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">{isSupabaseEnabled ? 'Supabase' : 'Firestore'} em Modo Offline Local:</strong> O banco de dados em nuvem está temporariamente inacessível ou pendente de chave/tabelas. Suas alterações estão sendo tratadas e salvas em contingência local no navegador. O sistema continua funcionando 100% no Modo Local.
                    </div>
                  </div>
                )}
                {adminTab === 'dashboard' && (
                  <AdminDashboard
                    bookings={bookings}
                    clients={clients}
                    transactions={transactions}
                    services={services}
                    settings={settings}
                    onNavigateTab={setAdminTab}
                  />
                )}

                {adminTab === 'agenda' && (
                  <AdminAgenda
                    bookings={bookings}
                    services={services}
                    startHour={settings?.startHour || '08:00'}
                    endHour={settings?.endHour || '20:00'}
                    settings={settings || {
                      name: "Minha Barbearia",
                      address: "Cadastre seu endereço",
                      phone: "(99) 99999-9999",
                      logoUrl: "",
                      startHour: "08:00",
                      endHour: "20:00",
                      workingDays: [1, 2, 3, 4, 5, 6],
                      barbers: [],
                      adminName: "Administrador"
                    }}
                    onAddBooking={handleAddBooking}
                    onUpdateBooking={handleUpdateBooking}
                    onDeleteBooking={handleDeleteBooking}
                  />
                )}

                {adminTab === 'clientes' && (
                  <AdminClientes
                    clients={clients}
                    onAddClient={handleAddClient}
                    onUpdateClient={handleUpdateClient}
                  />
                )}

                {adminTab === 'financeiro' && (
                  <AdminFinanceiro
                    transactions={transactions}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                  />
                )}

                {adminTab === 'relatorios' && (
                  <AdminRelatorios
                    bookings={bookings}
                    clients={clients}
                    transactions={transactions}
                    services={services}
                  />
                )}

                {adminTab === 'servicos' && (
                  <AdminServicos
                    services={services}
                    onAddService={handleAddService}
                    onUpdateService={handleUpdateService}
                    onDeleteService={handleDeleteService}
                  />
                )}

                {adminTab === 'config' && (
                  <AdminConfig
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                  />
                )}
              </div>

            </div>
          )}

          {/* TINY CORNER SAAS FOOTER IN ADMIN SIDEBAR COMPLEMENTS */}
          <footer className="py-4 text-center text-[10px] text-zinc-600 bg-[#0c0c0c] border-t border-zinc-900 font-mono">
            <span>SaaS BarberConnect Admin Management Engine v2.0.4 • Sincronizado.</span>
          </footer>

        </div>
      )}

    </div>
  );
}
