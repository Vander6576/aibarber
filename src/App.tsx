import React, { useState, useEffect } from 'react';
import { dbStore } from './dbStore';
import { isFirebaseEnabled, auth } from './firebase';
import { isSupabaseEnabled, supabase } from './supabase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Service, Booking, Client, Transaction, BarberSettings, ViewType, AdminTabType } from './types';

// Componentes da Área Administrativa
import AdminDashboard from './components/AdminDashboard';
import AdminAgenda from './components/AdminAgenda';
import AdminClientes from './components/AdminClientes';
import AdminFinanceiro from './components/AdminFinanceiro';
import AdminServicos from './components/AdminServicos';
import AdminConfig from './components/AdminConfig';

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
  AlertCircle
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

  // --- CONTROLE DE SESSÃO / AUTH ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  // --- ESTADO GLOBAL DA BANCO DE DADOS ---
  const [settings, setSettings] = useState<BarberSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- REAL-TIME ROUTING TRACKING ---
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path.includes('/admin')) {
        setCurrentView('admin');
      } else if (path.includes('/consultar')) {
        setCurrentView('client-lookup');
      } else {
        setCurrentView('client-schedule');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateToView = (view: ViewType) => {
    let urlPath = "/";
    if (view === 'admin') urlPath = "/admin";
    if (view === 'client-lookup') urlPath = "/consultar";
    if (view === 'client-schedule') urlPath = "/agendar";

    window.history.pushState({}, "", urlPath);
    setCurrentView(view);
  };

  // --- CARREGAMENTO DE DADOS BANCO DE DADOS ---
  const loadDatabase = async () => {
    setIsLoading(true);
    try {
      // 1. Sempre carrega as tabelas públicas (configurações e serviços)
      const settsData = await dbStore.getSettings();
      setSettings(settsData);
      
      const srvsData = await dbStore.getServices();
      setServices(srvsData);

      // 2. Só carrega as coleções administrativas restritas se o admin estiver logado ou em modo Sandbox sem Firebase/Supabase
      if ((!isFirebaseEnabled && !isSupabaseEnabled) || isAdminLoggedIn) {
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

  // --- SINCRONIZAÇÃO DE AUTENTICAÇÃO COM SUPABASE, FIREBASE OU LOCAL ---
  useEffect(() => {
    if (isSupabaseEnabled && supabase) {
      // Obter sessão inicial
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session && session.user) {
          setFirebaseUser(session.user);
          setIsAdminLoggedIn(true);
        } else {
          setFirebaseUser(null);
          setIsAdminLoggedIn(false);
        }
      });

      // Escutar mudanças de estado
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        if (session && session.user) {
          setFirebaseUser(session.user);
          setIsAdminLoggedIn(true);
        } else {
          setFirebaseUser(null);
          setIsAdminLoggedIn(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else if (isFirebaseEnabled && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setFirebaseUser(user);
          setIsAdminLoggedIn(true);
        } else {
          setFirebaseUser(null);
          setIsAdminLoggedIn(false);
        }
      });
      return unsubscribe;
    } else {
      // Login persistido localmente em modo sandbox
      const isLocalAuth = localStorage.getItem('barber_admin_auth') === 'true';
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
    const bk = await dbStore.addBooking(booking);
    // Recarrega todos de forma limpa para recalcular os faturamentos associados e CRM de clientes
    await loadDatabase();
    return bk;
  };

  const handleUpdateBooking = async (id: string, update: Partial<Booking>) => {
    await dbStore.updateBooking(id, update);
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

    if (isSupabaseEnabled && supabase) {
      try {
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
    } else if (isFirebaseEnabled && auth) {
      try {
        await signInWithEmailAndPassword(auth, emailStr, authPassword);
      } catch (err: any) {
        setAuthError("Erro de acesso Cloud: E-mail ou senha inválidos.");
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

  // Criação de novos usuários administradores no Firebase
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
    } else if (isFirebaseEnabled && auth) {
      try {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        setIsRegisterMode(false);
      } catch (err: any) {
        setAuthError("Erro na nuvem: " + err.message);
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

  const handleAdminLogout = async () => {
    setAuthError("");
    if (isSupabaseEnabled && supabase) {
      await supabase.auth.signOut();
    } else if (isFirebaseEnabled && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem('barber_admin_auth');
      setIsAdminLoggedIn(false);
    }
  };

  // Selecionador de Login Automático do modo de demonstração local para agilidade de review
  const handleQuickDemoLogin = () => {
    setAuthEmail("demo@barbearia.com");
    setAuthPassword("demo123");
    localStorage.setItem('barber_admin_auth', 'true');
    setIsAdminLoggedIn(true);
  };

  // --- CARREGADOR LOADING SPINNER SKELETON ---
  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500"></div>
          <Scissors className="h-6 w-6 text-amber-500 transform -rotate-45 animate-pulse" />
        </div>
        <h4 className="text-sm font-bold font-sans tracking-tight uppercase text-zinc-350">Carregando Agenda Inteligente...</h4>
        <p className="text-xs text-zinc-550 mt-1">Conectando ao banco de dados e sincronizando tabelas de faturamento.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-black">
      
      {/* 
          BARRA UTILITÁRIA SUPERIOR GLOBAL 
          Oferece transparência e navegação fácil entre as duas áreas (pública e admin) no sandbox.
      */}
      <header className="bg-zinc-900 border-b border-zinc-850 px-4 py-3 top-0 sticky z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 text-black p-1.5 rounded-lg border border-amber-600">
              <Scissors className="h-4 w-4 transform -rotate-45" />
            </div>
            <div>
              <span className="text-sm font-sans font-extrabold text-white">{settings.name}</span>
              <p className="text-[10px] text-zinc-400 font-mono tracking-tight lowercase">SaaS Agenda Inteligente</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Indicador de Status Banco */}
            {isFirebaseEnabled ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-full">
                <Cloud className="h-3 w-3 animate-pulse" /> Cloud FIRESTORE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider font-mono text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-full">
                <CloudOff className="h-3 w-3" /> Sandbox Local
              </span>
            )}

            {/* Alternador de Visões em Menu Flutuante */}
            <div className="flex bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 text-xs font-semibold">
              <button
                onClick={() => navigateToView('client-schedule')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  currentView !== 'admin' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" /> Portal do Cliente
              </button>
              <button
                onClick={() => navigateToView('admin')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  currentView === 'admin' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" /> Painel do Barbeiro
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 
          CONTEÚDO PRINCIPAL DO LAYOUT 
      */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6" id="main-application-frame">
        
        {/* ==========================================
            ÁREA DO CLIENTE PÚBLICA (SEM LOGIN NECESSÁRIO)
            ========================================== */}
        {currentView !== 'admin' && (
          <PublicClientArea
            services={services}
            bookings={bookings}
            settings={settings}
            onAddBooking={handleAddBooking}
            onUpdateBooking={handleUpdateBooking}
          />
        )}

        {/* ==========================================
            ÁREA ADMINISTRATIVA (BARBEIRO)
            ========================================== */}
        {currentView === 'admin' && (
          <div className="w-full">
            {!isAdminLoggedIn ? (
              
              // TELA DE AUTENTICAÇÃO ADMIN
              <div className="max-w-md mx-auto py-10" id="admin-auth-panel">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="text-center space-y-2">
                    <div className="inline-block bg-amber-500 text-black p-3 rounded-full border border-amber-600 mb-2">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Login Administrativo</h2>
                    <p className="text-xs text-zinc-400">Entre com seu e-mail e senha cadastrados para gerenciar faturamento, agenda e clientes.</p>
                  </div>

                  {authError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-xl flex items-start gap-1.5 leading-tight font-sans">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <form onSubmit={isRegisterMode ? handleAdminRegister : handleAdminLogin} className="space-y-4 font-sans text-sm">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 block font-medium">E-mail Corporativo</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <input
                          type="email"
                          required
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="barbeiro@seusite.com"
                          className="bg-zinc-950 border border-zinc-850 text-white rounded-xl pl-9 pr-4 py-2 w-full focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 block font-medium">Senha de Acesso</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <input
                          type="password"
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="Mínimo 6 dígitos"
                          className="bg-zinc-950 border border-zinc-850 text-white rounded-xl pl-9 pr-4 py-2 w-full focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    {!isRegisterMode && (
                      <button
                        type="submit"
                        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md mt-6"
                      >
                        <LogIn className="h-4 w-4" /> Entrar no Painel
                      </button>
                    )}

                    {isRegisterMode && (
                      <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md mt-6"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Cadastrar Novo Barbeiro
                      </button>
                    )}
                  </form>

                  {/* SUPORTE DEMO MODE (SE BANCO LOCAL) */}
                  {!isFirebaseEnabled && !isRegisterMode && (
                    <div className="bg-zinc-950 border border-zinc-850/60 p-4 rounded-2xl text-center space-y-2" id="demo-credentials-helper">
                      <div className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        <strong className="text-amber-500">Avaliação rápida (Demo):</strong> Utilize as credenciais abaixo pré-configuradas ou acesse instantaneamente:
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 py-1.5 rounded-lg border border-zinc-850">
                        E-mail: <span className="text-zinc-300">demo@barbearia.com</span> • Senha: <span className="text-zinc-300">demo123</span>
                      </div>
                      <button
                        onClick={handleQuickDemoLogin}
                        className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1.5 mx-auto pt-1 hover:underline cursor-pointer"
                      >
                        Entrar com 1-Clique demo-bypass <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Alternar entre login e registro em Firebase */}
                  {isFirebaseEnabled && (
                    <div className="text-center pt-2 text-xs text-zinc-400">
                      {isRegisterMode ? (
                        <span>Já possui cadastro? <button onClick={() => { setIsRegisterMode(false); setAuthError(""); }} className="text-amber-500 font-bold hover:underline">Fazer Login</button></span>
                      ) : (
                        <span>Primeiro acesso? <button onClick={() => { setIsRegisterMode(true); setAuthError(""); }} className="text-amber-500 font-bold hover:underline">Cadastrar Novo Administrador</button></span>
                      )}
                    </div>
                  )}

                </div>
              </div>

            ) : (
              
              // PAINEL DE CONTROLE LOGADO DO BARBEIRO
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="logged-admin-grid">
                
                {/* 1. SIDEBAR DE NAV ADMIN */}
                <aside className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-6 h-fit" id="admin-sidebar-menu">
                  
                  {/* Informações Resumo Logged User */}
                  <div className="border-b border-zinc-800 pb-4 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Perfil ativo</span>
                    <h4 className="text-sm font-bold text-white truncate max-w-xs">{firebaseUser?.email || "Administrador Geral"}</h4>
                    <span className="inline-block text-[9px] bg-zinc-950 border border-zinc-850 text-amber-400 px-2 py-0.5 rounded uppercase font-mono font-bold">Barbeiro Master</span>
                  </div>

                  {/* Abas links */}
                  <nav className="flex flex-col gap-1.5 text-sm font-sans font-medium" id="sidebar-navigator-list">
                    <button
                      onClick={() => setAdminTab('dashboard')}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                        adminTab === 'dashboard' ? 'bg-amber-500/10 border-l-4 border-l-amber-500 text-amber-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-850/30'
                      }`}
                    >
                      <Sparkles className="h-4 w-4" /> Dashboard Geral
                    </button>

                    <button
                      onClick={() => setAdminTab('agenda')}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                        adminTab === 'agenda' ? 'bg-amber-500/10 border-l-4 border-l-amber-500 text-amber-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-850/30'
                      }`}
                    >
                      <Calendar className="h-4 w-4" /> Agenda de Horários
                    </button>

                    <button
                      onClick={() => setAdminTab('clientes')}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                        adminTab === 'clientes' ? 'bg-amber-500/10 border-l-4 border-l-amber-500 text-amber-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-850/30'
                      }`}
                    >
                      <User className="h-4 w-4" /> Gestão de Clientes (CRM)
                    </button>

                    <button
                      onClick={() => setAdminTab('financeiro')}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                        adminTab === 'financeiro' ? 'bg-amber-500/10 border-l-4 border-l-amber-500 text-amber-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-850/30'
                      }`}
                    >
                      <DollarSign className="h-4 w-4" /> Controle Financeiro
                    </button>

                    <button
                      onClick={() => setAdminTab('servicos')}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                        adminTab === 'servicos' ? 'bg-amber-500/10 border-l-4 border-l-amber-500 text-amber-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-850/30'
                      }`}
                    >
                      <Scissors className="h-4 w-4" /> Catálogo de Serviços
                    </button>

                    <button
                      onClick={() => setAdminTab('config')}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                        adminTab === 'config' ? 'bg-amber-500/10 border-l-4 border-l-amber-500 text-amber-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-850/30'
                      }`}
                    >
                      <Settings className="h-4 w-4" /> Configurar Barbearia
                    </button>
                  </nav>

                  {/* Logout link */}
                  <div className="border-t border-zinc-800 pt-4">
                    <button
                      onClick={handleAdminLogout}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-500 hover:bg-red-500/5 transition-colors font-medium"
                    >
                      <LogOut className="h-4 w-4" /> Sair do Painel
                    </button>
                  </div>

                </aside>

                {/* 2. CONTEÚDO DA TELA DA ABA SELECIONADA */}
                <div className="lg:col-span-3 min-h-[500px]" id="admin-viewports">
                  {adminTab === 'dashboard' && (
                    <AdminDashboard
                      bookings={bookings}
                      clients={clients}
                      transactions={transactions}
                      services={services}
                      onNavigateTab={setAdminTab}
                    />
                  )}

                  {adminTab === 'agenda' && (
                    <AdminAgenda
                      bookings={bookings}
                      services={services}
                      startHour={settings.startHour}
                      endHour={settings.endHour}
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
          </div>
        )}

      </main>

      {/* FOOTER GLOBAL */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-6 text-center text-xs text-zinc-650" id="application-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="font-mono">© 2026 Agenda Inteligente para Barbearias • Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <button onClick={() => navigateToView('client-schedule')} className="hover:text-white hover:underline transition-all font-semibold cursor-pointer">Agendamento Público</button>
            <span className="text-zinc-800">•</span>
            <button onClick={() => navigateToView('admin')} className="hover:text-white hover:underline transition-all font-semibold cursor-pointer">Painel de Administração</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
