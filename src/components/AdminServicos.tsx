import React, { useState } from 'react';
import { Service } from '../types';
import { Sparkles, Plus, Edit, Trash2, Clock, DollarSign, FileText, X } from 'lucide-react';

interface ServicosProps {
  services: Service[];
  onAddService: (service: Omit<Service, 'id'>) => Promise<any>;
  onUpdateService: (id: string, service: Partial<Service>) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
}

export default function AdminServicos({ services, onAddService, onUpdateService, onDeleteService }: ServicosProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Campos do Form
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "30",
    description: "",
    category: "Cabelo"
  });

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      price: "",
      duration: "30",
      description: "",
      category: "Cabelo"
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString(),
      description: service.description || "",
      category: service.category || "Cabelo"
    });
    setShowEditModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.duration) {
      alert("Por favor certifique-se de preencher Nome, Preço e Duração!");
      return;
    }

    try {
      await onAddService({
        name: formData.name,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        description: formData.description,
        category: formData.category
      });
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      await onUpdateService(selectedService.id, {
        name: formData.name,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        description: formData.description,
        category: formData.category
      });
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Quer realmente deletar permanentemente este serviço do catálogo? Agendamentos passados mantêm os preços registrados, mas novas reservas não o listarão.")) {
      try {
        await onDeleteService(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans text-zinc-200" id="admin-servicos-container">
      {/* HEADER SERVIÇOS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121212] border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" /> Catálogo de Serviços Customizados
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Configure todos os tratamentos oferecidos pela sua barbearia, definindo preço, descrição explicativa e tempo estimado na cadeira.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 self-stretch md:self-auto justify-center transition-all shadow font-sans cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Novo Serviço
        </button>
      </div>

      {/* CATALOG GRADE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="services-grid-list">
        {services.length === 0 ? (
          <div className="col-span-full bg-[#121212] border border-white/5 p-10 rounded-3xl text-center text-zinc-500 flex flex-col items-center">
            <Sparkles className="h-10 w-10 text-zinc-750 mb-3" />
            <p className="text-sm">Nenhum serviço disponível no catálogo atualmente.</p>
          </div>
        ) : (
          services.map((srv) => (
            <div key={srv.id} className="bg-[#121212] border border-white/5 p-5 rounded-3xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">{srv.category || "Corte"}</span>
                  <span className="text-sm font-mono font-extrabold text-amber-500">R$ {srv.price.toFixed(2)}</span>
                </div>

                <div>
                  <h4 className="text-base font-sans font-bold text-white tracking-tight">{srv.name}</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-3 leading-relaxed font-sans">{srv.description || "Sem descrição anexada"}</p>
                </div>
              </div>

              {/* DURAÇÃO E CONTROLES */}
              <div className="flex justify-between items-center border-t border-zinc-850/60 pt-3.5 mt-4 font-sans">
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Duração: <strong className="text-zinc-300 font-mono">{srv.duration} min</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(srv)}
                    className="text-xs text-zinc-400 hover:text-amber-500 p-1.5 hover:bg-zinc-950/40 rounded-lg border border-zinc-850 transition-colors"
                    title="Editar informações"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(srv.id)}
                    className="text-xs text-zinc-550 hover:text-red-500 p-1.5 hover:bg-zinc-950/40 rounded-lg border border-zinc-850 transition-colors"
                    title="Excluir serviço"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* MODAL ADICIONAR SERVICO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-zinc-950 p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-base font-sans font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" /> Novo Serviço do Catálogo
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alinhamento de Cavanhaque"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Preço Cobrado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Duração (Minutos) *</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none"
                  >
                    <option value="15">15 Minutos</option>
                    <option value="30">30 Minutos</option>
                    <option value="40">40 Minutos</option>
                    <option value="45">45 Minutos</option>
                    <option value="60">60 Minutos (1h)</option>
                    <option value="90">90 Minutos (1h30)</option>
                    <option value="120">120 Minutos (2h)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none"
                >
                  <option value="Cabelo">Corte/Cabelo</option>
                  <option value="Barba">Barba/Barboterapia</option>
                  <option value="Combo">Combo</option>
                  <option value="Estética">Estética/Sobrancelha</option>
                  <option value="Química">Pintura/Química</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Descrição Informativa</label>
                <textarea
                  rows={3}
                  placeholder="Descreva o que o cliente sentirá ou receberá neste serviço (toalha quente, cremes, etc.)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow"
                >
                  Incluir Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR SERVICO */}
      {showEditModal && selectedService && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-zinc-950 p-5 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-sans font-bold text-white">Modificar Serviço</h3>
                <p className="text-[11px] font-mono text-zinc-550 mt-0.5">{selectedService.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Preço Cobrado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block font-medium">Duração (Minutos) *</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white"
                  >
                    <option value="15">15 Minutos</option>
                    <option value="30">30 Minutos</option>
                    <option value="40">40 Minutos</option>
                    <option value="45">45 Minutos</option>
                    <option value="60">60 Minutos (1h)</option>
                    <option value="90">90 Minutos (1h30)</option>
                    <option value="120">120 Minutos (2h)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none"
                >
                  <option value="Cabelo">Corte/Cabelo</option>
                  <option value="Barba">Barba/Barboterapia</option>
                  <option value="Combo">Combo</option>
                  <option value="Estética">Estética/Sobrancelha</option>
                  <option value="Química">Pintura/Química</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block font-medium">Descrição Informativa</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-amber-500/50"
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
    </div>
  );
}
