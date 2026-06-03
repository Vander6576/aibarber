import React, { useState } from 'react';
import { Copy, Check, Share2, MessageSquare, Send, Mail, QrCode } from 'lucide-react';

export default function AdminShare() {
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Link definitivo do agendamento do cliente
  const shareUrl = `${window.location.origin}/agendar`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Falha ao copiar link:", err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Acesse o nosso link de agendamento online e reserve o seu horário em menos de 1 minuto! Agende agora: ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = `Acesse o nosso link de agendamento online e reserve o seu horário!`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = `Agendamento Online de Horários`;
    const body = `Olá! Facilitamos o agendamento de horários para nossos clientes. Acesse o link abaixo para escolher o seu barbeiro, serviço e horário de preferência:\n\n${shareUrl}\n\nTe aguardamos!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  // QR Code gerado em tempo útil com API livre e segura
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=d97706&bgcolor=121212&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden" id="admin-share-card">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1.5 flex-1">
          <span className="text-amber-500 font-mono text-[10px] font-bold uppercase tracking-widest block">Divulgação da Barbearia</span>
          <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
            <Share2 className="h-4.5 w-4.5 text-amber-500" /> Compartilhar Área do Cliente
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Compartilhe seu link público de agendamento online nas redes sociais, Instagram bio, WhatsApp Business ou gere um QR Code impresso para a recepção da barbearia.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Botão de abrir QR CODE */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            <QrCode className="h-4 w-4 text-amber-500" /> Visualizar QR Code
          </button>

          {/* Botão Copiar Link */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
              copied 
                ? 'bg-emerald-500 text-zinc-950 font-bold' 
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/5'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Link Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar Link Público
              </>
            )}
          </button>
        </div>
      </div>

      {/* Caixa mostrando o link público visualmente */}
      <div className="mt-4 p-3 bg-black border border-white/5 rounded-2xl flex items-center justify-between gap-4">
        <div className="truncate font-mono text-zinc-400 text-xs select-all p-1">
          {shareUrl}
        </div>
        <button 
          onClick={handleCopy} 
          className="text-amber-500 hover:text-amber-400 hover:underline text-xs font-mono font-bold whitespace-nowrap cursor-pointer px-2"
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>

      {/* Compartilhamento rápido em canais sociais */}
      <div className="mt-4 pt-4 border-t border-zinc-800/60 flex flex-wrap gap-3 items-center text-xs text-zinc-500">
        <span className="font-sans">Compartilhar em:</span>
        <div className="flex flex-wrap gap-2">
          {/* Whatsapp */}
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-xs font-sans font-medium cursor-pointer transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </button>

          {/* Telegram */}
          <button
            onClick={handleTelegramShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/20 text-blue-400 hover:bg-blue-950/40 border border-blue-900/40 rounded-lg text-xs font-sans font-medium cursor-pointer transition-all"
          >
            <Send className="h-3.5 w-3.5" /> Telegram
          </button>

          {/* Email */}
          <button
            onClick={handleEmailShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/20 text-purple-400 hover:bg-purple-950/40 border border-purple-900/40 rounded-lg text-xs font-sans font-medium cursor-pointer transition-all"
          >
            <Mail className="h-3.5 w-3.5" /> E-mail
          </button>
        </div>
      </div>

      {/* MODAL QR CODE GRÁFICO INTELECTUAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl shadow-black animate-in fade-in zoom-in duration-200 p-6 space-y-5 text-center">
            
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="text-xs font-bold text-white font-display">Código QR de Divulgação</span>
              <button 
                onClick={() => setShowQrModal(false)}
                className="p-1 px-2.5 bg-zinc-950 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Posicione na recepção de atendimento da sua barbearia para que os clientes agendem com facilidade.
            </p>

            <div className="bg-zinc-950 p-4 rounded-2xl inline-block border border-white/5 shadow-inner">
              <img 
                src={qrCodeUrl} 
                alt="QR Code de agendamento público da barbearia" 
                className="w-48 h-48 rounded-lg mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono text-zinc-500 break-all bg-black p-2 rounded-xl border border-white/5 leading-snug">
                {shareUrl}
              </div>
              <button
                onClick={() => {
                  handleCopy();
                  setShowQrModal(false);
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow shadow-amber-500/10"
              >
                Copiar link e Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
