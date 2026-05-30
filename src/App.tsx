import React, { useState, useEffect } from 'react';
import { dbStore } from './dbStore';
import { isFirebaseEnabled, auth } from './firebase';
import { isSupabaseEnabled, supabase } from './supabase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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
  Phone
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
        if (path === '/' || path === '') {
          window.history.replaceState({}, "", "/agendar");
        }
        setCurrentView('client-schedule');
      }
    };

    handleLocationChange();

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
    const isLocalAuth = localStorage.getItem('barber_admin_auth') === 'true';
    if (isLocalAuth) {
      setIsAdminLoggedIn(true);
      return;
    }

    if (isSupabaseEnabled && supabase) {
      // Obter sessão inicial
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (localStorage.getItem('barber_admin_auth') === 'true') {
          setIsAdminLoggedIn(true);
          return;
        }
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
        if (localStorage.getItem('barber_admin_auth') === 'true') {
          setIsAdminLoggedIn(true);
          return;
        }
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
        if (localStorage.getItem('barber_admin_auth') === 'true') {
          setIsAdminLoggedIn(true);
          return;
        }
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
        if (err.message && err.message.includes("operation-not-allowed")) {
          setAuthError("Erro na nuvem: O provedor de e-mail e senha não está habilitado no Firebase Console. Para testar sem bloqueios, utilize o botão 'Entrar com 1-Clique demo-bypass' abaixo!");
        } else {
          setAuthError("Erro de acesso Cloud: E-mail ou senha inválidos. Se possuir um novo projeto Firebase, certifique-se de ativar o e-mail/senha no console, ou entre usando o botão demo-bypass abaixo!");
        }
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
        if (err.message && err.message.includes("operation-not-allowed")) {
          setAuthError("Erro na nuvem: O provedor de e-mail e senha não está habilitado no Firebase Console. Para testar sem bloqueios, utilize o botão 'Entrar por Modo de Teste Local (Demo/Bypass)' abaixo!");
        } else {
          setAuthError("Erro na nuvem: " + err.message);
        }
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
    localStorage.removeItem('barber_admin_auth');
    setFirebaseUser(null);
    setIsAdminLoggedIn(false);

    try {
      if (isSupabaseEnabled && supabase) {
        await supabase.auth.signOut();
      } else if (isFirebaseEnabled && auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.error("Erro ao efetuar logout:", err);
    }
  };

  // Login usando o provedor do Google no Firebase (Popup)
  const handleGoogleLogin = async () => {
    setAuthError("");
    if (isFirebaseEnabled && auth) {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // O onAuthStateChanged tratará o estado do login
      } catch (err: any) {
        console.error("Erro no login com Google:", err);
        setAuthError("Erro ao fazer login com Google: " + (err.message || "Tente novamente."));
      }
    } else {
      setAuthError("O Firebase não está habilitado ou configurado para realizar o login com Google.");
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[10px] font-bold tracking-wider uppercase">
                    <Sparkles className="h-3.5 w-3.5" /> Agendamento descomplicado
                  </span>
                  
                  <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    Garanta seu <span className="text-amber-500">Estilo</span> na Agenda Oficial
                  </h2>
                  
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
                    Selecione o serviço ideal abaixo para você ou sua família. Nosso sistema calcula a duração e reserva sua vaga imediatamente no banco de dados com fuso horário ajustado!
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 bg-zinc-950 border border-zinc-900 p-3 rounded-2xl flex-1">
                      <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <div className="truncate text-left">
                        <strong className="text-zinc-300 block">Endereço</strong>
                        <span className="text-[10px] text-zinc-500 block truncate">{settings.address}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 bg-zinc-950 border border-zinc-900 p-3 rounded-2xl flex-1">
                      <Phone className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <div className="text-left">
                        <strong className="text-zinc-300 block">Fale Conosco</strong>
                        <span className="text-[10px] text-zinc-500 block">{settings.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA DE ATALHO EXPLICATIVO */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-955 border border-zinc-900 p-4 rounded-2xl space-y-1.5">
                    <span className="text-amber-500 font-mono text-xs font-bold uppercase tracking-wider block">Passo 01</span>
                    <h4 className="text-xs font-bold text-white uppercase">Selecione o Serviço</h4>
                    <p className="text-[10px] text-zinc-400">Escolha as melhores opções do nosso catálogo premium.</p>
                  </div>
                  <div className="bg-zinc-955 border border-zinc-900 p-4 rounded-2xl space-y-1.5">
                    <span className="text-amber-500 font-mono text-xs font-bold uppercase tracking-wider block">Passo 02</span>
                    <h4 className="text-xs font-bold text-white uppercase">Hora e Dia</h4>
                    <p className="text-[10px] text-zinc-400">Slots limpos baseados sob o fuso de Brasília.</p>
                  </div>
                  <div className="bg-zinc-955 border border-zinc-900 p-4 rounded-2xl space-y-1.5">
                    <span className="text-amber-500 font-mono text-xs font-bold uppercase tracking-wider block">Passo 03</span>
                    <h4 className="text-xs font-bold text-white uppercase">Identifique-se</h4>
                    <p className="text-[10px] text-zinc-400">Preencha seu WhatsApp para sincronizar o contato.</p>
                  </div>
                  <div className="bg-zinc-955 border border-zinc-900 p-4 rounded-2xl space-y-1.5">
                    <span className="text-amber-500 font-mono text-xs font-bold uppercase tracking-wider block">Passo 04</span>
                    <h4 className="text-xs font-bold text-white uppercase">Confirmado!</h4>
                    <p className="text-[10px] text-zinc-400">Seu horário fica bloqueado em tempo real na nuvem.</p>
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

                {/* BOTÃO DO GOOGLE (PROVEDOR ATIVO NO SEU FIREBASE CONSOLE) */}
                {isFirebaseEnabled && !isRegisterMode && (
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

                {/* REGISTER ALTERNATOR FOR FIREBASE/SUPABASE */}
                {(isFirebaseEnabled || isSupabaseEnabled) && (
                  <div className="text-center pt-2 text-xs text-zinc-400">
                    {isRegisterMode ? (
                      <span>Já possui cadastro? <button onClick={() => { setIsRegisterMode(false); setAuthError(""); }} className="text-amber-500 font-bold hover:underline cursor-pointer">Fazer Login</button></span>
                    ) : (
                      <span>Primeiro acesso? <button onClick={() => { setIsRegisterMode(true); setAuthError(""); }} className="text-amber-500 font-bold hover:underline cursor-pointer">Cadastrar Administrador</button></span>
                    )}
                  </div>
                )}

              </div>
            </div>

          ) : (
            
            // --- WORKSPACE ADMINISTRATIVO EXCLUSIVO (Layout SaaS Pro) ---
            <div className="flex-1 w-full flex flex-col lg:flex-row gap-6 p-4 sm:p-6" id="logged-admin-workspace">
              
              {/* ASIDE SIDEBAR ADMIN LAYOUT COMPONENT */}
              <aside className="bg-[#121212] border border-[#ffffff07] rounded-3xl p-5 shadow-2xl space-y-6 h-fit w-full lg:w-72 flex-shrink-0" id="admin-sidebar-menu">
                
                {/* Active user header block */}
                <div className="border-b border-zinc-905 pb-5 space-y-1">
                  <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest font-semibold">Conta Operacional</span>
                  <h4 className="text-xs font-bold text-white truncate max-w-[240px] font-sans">{firebaseUser?.email || "Administrador Geral"}</h4>
                  <div className="inline-flex items-center gap-1.5 pt-1.5">
                    <span className="text-[9px] bg-zinc-955 border border-zinc-900 text-amber-500 px-2 py-0.5 rounded font-mono font-bold">Barbeiro Master</span>
                    
                    {/* Status Indicador para Nuvem */}
                    {isFirebaseEnabled ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Firestore Integrado" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-amber-500" title="Modo Sandbox Local" />
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

              {/* CONTEÚDO PRINCIPAL DO WORKSPACE INTEGRADO */}
              <div className="flex-1 min-w-0" id="admin-viewports-box">
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
