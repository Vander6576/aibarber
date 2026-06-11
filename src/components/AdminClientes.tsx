import React, { useState } from 'react';
import { Client } from '../types';
import { User, Phone, Search, Plus, MessageSquare, Edit, X, Calendar, ClipboardList } from 'lucide-react';

interface ClientesProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateClient: (id: string, update: Partial<Client>) => Promise<void>;
}

export default function AdminClientes({ clients, onAddClient, onUpdateClient }: ClientesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Campos de edição e novos
  const [editNotes, setEditNotes] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editName, setEditName] = useState("");
  const [editWhatsApp, setEditWhatsApp] = useState("");

  const handleOpenEdit = (client: Client) => {
    setSelectedClient(client);
    setEditNotes(client.notes || "");
    setEditBirthDate(client.birthDate || "");
    setEditName(client.name);
    setEditWhatsApp(client.whatsapp);
    setShowEditModal(true);
  };

  const handleOpenAdd = () => {
    setEditName("");
    setEditWhatsApp("");
    setEditBirthDate("");
    setEditNotes("");
    setShowAddModal(true);
  };

  // Salvar alterações do cliente
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      await onUpdateClient(selectedClient.id, {
        name: editName,
        whatsapp: editWhatsApp,
        birthDate: editBirthDate,
        notes: editNotes
      });
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Salvar novo cliente手动
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editWhatsApp) {
      alert("Por favor insira Nome e WhatsApp!");
      return;
    }

    try {
      await onAddClient({
        name: editName,
        whatsapp: editWhatsApp,
        birthDate: editBirthDate,
        notes: editNotes,
        totalBookings: 0,
        totalSpent: 0
      });
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtrar lista de clientes com termo de busca
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.whatsapp.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
  );

  // Abrir WhatsApp do cliente direto
  const openClientWhatsApp = (whatsapp: string, clientName: string) => {
    const cleanPhone = whatsapp.trim().replace(/\D/g, '');
    const msg = `Olá *${clientName}*! Tudo bem? Passando para te deixar um alô da Barbearia Imperial. Como estão os cuidados com o cabelo e a barba? Sempre que precisar, estamos à disposição para agendar seu horário direto no nosso link! 💈🤘`;
    window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 font-sans text-zinc-200" id="admin-clientes-container">
      {/* HEADER CLIENTES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-amber-500" /> Cadastro de Clientes CRM
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Gerencie a carteira de clientes, acompanhe histórico de visitas, faturamento por cliente e guarde observações/preferências de corte.</p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 self-stretch md:self-auto justify-center transition-all shadow-md font-sans cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Novo Cliente
        </button>
      </div>

      {/* FILTRO E LISTAGEM */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl shadow-xl overflow-hidden">
        {/* Barra de Filtro */}
        <div className="p-5 border-b border-white/5 flex items-center bg-black gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou número do WhatsApp..."
              className="bg-[#121212] border border-white/5 text-sm text-white placeholder-zinc-500 pl-9 pr-4 py-2.5 w-full rounded-xl focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">Total: {filteredClients.length}</span>
        </div>

        {/* CRM CLIENTS TABLE & MOBILE CARD ADAPTER */}
        {filteredClients.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center text-zinc-500">
            <User className="h-10 w-10 text-zinc-700 mb-2" />
            <p className="text-sm">Nenhum dado cadastrado.</p>
          </div>
        ) : (
          <div>
            {/* MOBILE ONLY CARDS VIEW */}
            <div className="sm:hidden space-y-4 p-4" id="crm-clients-mobile-cards">
              {filteredClients.map((client) => (
                <div 
                  key={client.id} 
                  className="bg-[#181818] border border-white/5 rounded-2xl p-4 space-y-3 shadow-lg relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-white font-sans">{client.name}</h4>
                      <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{client.whatsapp}</p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2.5 py-1 rounded-lg font-mono font-bold">
                      {client.totalBookings || 0} visitas
                    </span>
                  </div>

                  {client.birthDate && (
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" /> Nascimento: {client.birthDate.split('-').reverse().join('/')}
                    </div>
                  )}

                  <div className="text-[11px] text-zinc-300 bg-black/45 p-3 rounded-xl border border-white/5 font-sans leading-relaxed">
                    <strong className="text-amber-500/90 text-[10px] uppercase font-mono block mb-1">Preferencia / Histórico</strong>
                    <p className="italic">{client.notes || "Sem preferências registradas."}</p>
                  </div>

                  <div className="flex gap-2 justify-between items-center border-t border-white/5 pt-3">
                    <div className="text-xs">
                      <span className="text-zinc-500 text-[10px] uppercase font-mono">Total Consumido:</span>
                      <p className="font-mono font-extrabold text-emerald-400 text-sm">R$ {(client.totalSpent || 0).toFixed(2)}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openClientWhatsApp(client.whatsapp, client.name)}
                        className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        title="Falar no WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/15 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        title="Modificar observações"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider bg-zinc-950/60 font-medium">
                    <th className="py-3 px-5">Cliente</th>
                    <th className="py-3 px-5">WhatsApp</th>
                    <th className="py-3 px-5">Nascimento</th>
                    <th className="py-3 px-5">Preferências/Obs</th>
                    <th className="py-3 px-5 text-center">Visitas</th>
                    <th className="py-3 px-5 text-center">Total Gasto</th>
                    <th className="py-3 px-5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-zinc-950/40 text-sm transition-colors">
                      {/* Nome */}
                      <td className="py-3.5 px-5 font-semibold text-white truncate max-w-[150px]">
                        {client.name}
                      </td>
                      
                      {/* Telefone / WhatsApp */}
                      <td className="py-3.5 px-5 font-mono text-xs text-zinc-300">
                        {client.whatsapp}
                      </td>
                      
                      {/* Data de Nascimento */}
                      <td className="py-3.5 px-5 font-mono text-xs text-zinc-400">
                        {client.birthDate ? client.birthDate.split('-').reverse().join('/') : <span className="text-zinc-600">-</span>}
                      </td>
                      
                      {/* Notas */}
                      <td className="py-3.5 px-5 text-xs text-zinc-400 font-sans max-w-[200px] truncate" title={client.notes}>
                        {client.notes || <span className="text-zinc-600 italic">Sem preferências anexadas</span>}
                      </td>
                      
                      {/* Frequência */}
                      <td className="py-3.5 px-5 text-center font-mono text-xs text-zinc-300">
                        <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-md">
                          {client.totalBookings || 0}
                        </span>
                      </td>
                      
                      {/* Gasto acumulado */}
                      <td className="py-3.5 px-5 text-center font-mono text-xs text-emerald-400 font-semibold">
                        R$ {(client.totalSpent || 0).toFixed(2)}
                      </td>

                      {/* Ações rápidas */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openClientWhatsApp(client.whatsapp, client.name)}
                            title="Enviar Mensagem WhatsApp"
                            className="text-emerald-500 hover:bg-emerald-500/10 border border-zinc-800 p-1.5 rounded-lg transition-colors bg-zinc-950 cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            title="Modificar observações"
                            className="text-amber-500 hover:bg-amber-500/10 border border-zinc-800 p-1.5 rounded-lg transition-colors bg-zinc-950 cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE FLOATING ACTION BUTTON */}
      <button
        onClick={handleOpenAdd}
        className="sm:hidden fixed bottom-24 right-4 z-40 bg-amber-500 text-black p-4 rounded-full shadow-2xl shadow-amber-500/35 flex items-center justify-center transition-all cursor-pointer hover:bg-amber-450 active:scale-95"
        title="Novo Cliente"
      >
        <Plus className="h-6 w-6 stroke-[3px]" />
      </button>

      {/* MODAL EDITAR DETALHES CLIENTE */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-zinc-950 p-5 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-sans font-bold text-white">Editar Ficha do Cliente</h3>
                <p className="text-[11px] font-mono text-zinc-550 mt-0.5">{selectedClient.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={editWhatsApp}
                    onChange={(e) => setEditWhatsApp(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Data de Nascimento</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium flex items-center gap-1">
                  <ClipboardList className="h-3.5 w-3.5 text-amber-500" /> Preferências e Observações
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Guarde detalhes importantes. Ex: Gosta de degradê navalhado número 1, usa pomada matte, gosta de café ou cerveja, etc."
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR CLIENTE MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-zinc-950 p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-base font-sans font-bold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" /> Adicionar Novo Cliente
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Luiz Silva Martins"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-8888"
                    value={editWhatsApp}
                    onChange={(e) => setEditWhatsApp(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Nascimento</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Preferências e Notas Iniciais</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Adicione preferências de cabelo/barba, ou avisos relevantes deste cliente."
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2 rounded-xl text-sm font-bold transition-all"
                >
                  Cadastrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
