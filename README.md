# Barbearia SaaS - Agenda Inteligente para Barbearias 💈✂️

Este é o código de produção completo e funcional do **"Agenda Inteligente"**, um aplicativo SaaS multipropósito de gerenciamento e agendamento voltado exclusivamente para barberias modernas e salões com estéticas profissionais.

O sistema possui uma **Arquitetura Híbrida e Resiliente de Alta Performance (Dual-Persistence Layer)**: se o banco na nuvem Firebase estiver configurado no arquivo `firebase-applet-config.json`, o SaaS opera de forma nativa e sincronizada no **Google Cloud Firestore** com segurança garantida por regras robustas. Caso contrário (ou em momentos offline), o aplicativo opera em alto rendimento em **Modo Sandbox Local (localStorage)** pré-carregado com dados ricos de simulação de alta fidelidade para facilitar reviews instantâneas.

---

## 🚀 Principais Funcionalidades

### 📱 Portal Público do Cliente (Área do Cliente)
* **Agendamento Prático e Inteligente**: Interface estilo carrossel de datas de 14 dias com seleção de serviços e escolha de horários com **Bloqueador Automático de Double-Booking** (impede que clientes escolham horários simultaneamente agendados).
* **Meus Agendamentos**: Central de busca e monitoramento indexada por WhatsApp (sem necessidade de login para clientes).
* **Cancelamento Online**: O próprio cliente pode efetuar o cancelamento em tempo real, liberando a vaga imediatamente na agenda do barbeiro.

### 🏢 Painel de Controle Master (Área Administrativa do Barbeiro)
* **Dashboard Analítico Dinâmico**: Faturamento do dia, projeções de caixa mensal, total de clientes ativos, gráficos SVG interativos de faturamento diário consolidado da semana e lista dos serviços mais vendidos.
* **Cronograma Diário de Atendimento**: Linha cronológica rápida dos cortes marcados para o dia com marcador de status reativo.
* **Agenda Completa Integrada**: Visual de agenda onde o barbeiro pode visualizar slots disponíveis, agendar novos clientes manualmente, editar anotações ou concluir atendimentos recebendo via Pix, Dinheiro ou Cartão.
* **CRM de Gestão de Clientes**: Cadastro completo de clientes, registro detalhado de preferências de corte, histórico acumulado de visitas e volume financeiro investido na barbearia.
* **Controle Financeiro de Caixa (Ledger)**: Histórico completo de receitas e despesas registradas, relatório do faturamento do período agrupado por meio de pagamento (Pix, Dinheiro, Cartão) e balanço de lucros líquidos.
* **Catálogo de Serviços**: Gestão de tratamentos, precificação individualizada e tempo previsto de cadeira.
* **Perfil da Barbearia**: Customização do nome comercial, contatos WhatsApp, endereço e grade de horários de funcionamento oficial da casa.

### ⚙️ Engenharia WhatsApp & Pix API Ready
O sistema foi concebido arquitetonicamente seguindo os melhores padrões de engenharia de software para suportar integrações diretas:
1. **WhatsApp Web redirects**: Disparos de mensagens estruturadas ("Enviar Confirmação" e "Enviar Lembrete") utilizando o protocolo universal `api.whatsapp.com/send` com limpeza dinâmica de caracteres não numéricos garantindo 100% de precisão de disparo móvel e desktop. Pode ser facilmente redirecionado para Webhooks integrados (como Z-API) simplesmente editando a função `handleSendWhatsAppMsg` em `AdminAgenda.tsx`.
2. **Camadas Financeiras Pix/Cartões**: Toda operação concluída gera transações com metadados estruturados de fechamento de caixa, preparadas para acoplar serviços como o gateway do Mercado Pago ou API Pix do Banco Central para liquidação em tempo real.

---

## 🛠️ Detalhes de Instalação e Execução

### Pré-requisitos
Certifique-se de possuir o **Node.js** instalado em seu sistema (versão 18+).

### Passo a Passo

1. **Instalar Dependências**:
   ```bash
   npm install
   ```

2. **Executar em Modo de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   *O servidor de desenvolvimento inicializará no endereço default port `3000` conforme restrições de infraestrutura.*

3. **Gerar Versão de Produção (Build Compilado)**:
   ```bash
   npm run build
   ```

4. **Boot stand-alone do Servidor de Produção**:
   ```bash
   npm run start
   ```

---

## 🗄️ Estrutura de Pastas do Projeto

O código-fonte está estruturado de forma limpa e modularizada para fácil manutenção:

```text
/
├── firebase-blueprint.json    # IR - Representação Interna e Modelos de Dados do Firestore
├── firestore.rules           # Regras de Segurança do Firestore (Attribute-Based Access)
├── metadata.json              # Configurações do Applet AI Studio e permissões
├── index.html                 # Ponto de Entrada HTML do Navegador
├── package.json               # Dependências do Projeto e Scripts de Execução
├── tsconfig.json              # Diretivas e Compilação do TypeScript
├── src/
│   ├── main.tsx               # BootStrap Principal do React 19
│   ├── index.css              # Diretivas Tailwind CSS v4 para Estilização Premium
│   ├── types.ts               # Tipos globais e Contratos do SaaS
│   ├── firebase.ts            # Inicialização Segura de Instâncias Firebase / Auth e Handlers
│   ├── dbStore.ts             # Motor de Persistência Dual (Mapeador Firestore ↔ localStorage)
│   └── components/            # Blocos Reutilizáveis e Módulos Separados
│       ├── AdminDashboard.tsx # Dashboards e Métricas Analíticas customizadas
│       ├── AdminAgenda.tsx    # Agenda Reativa, Horários e Notificações de WhatsApp
│       ├── AdminClientes.tsx  # CRM de Frequência de Visitas e Preferências
│       ├── AdminFinanceiro.tsx# Caixa, Livro-razão e Fluxo de Recebimento
│       ├── AdminServicos.tsx  # Catálogo e Alinhamento de Preço de Cortes
│       ├── AdminConfig.tsx    # Configuração de Perfil Comercial e Banco de Dados
│       └── PublicClientArea.tsx# Agendador Público Passo a Passo com Validador de Slots Livres
```

---

## 🔑 Acesso para Avaliação (Modo de Demonstração)

Caso queira avaliar o sistema sem precisar configurar o banco de dados Firebase na nuvem, execute o programa localmente. O aplicativo detectará a ausência do arquivo e funcionará em **Modo Sandbox de Alto Rendimento** com dados fictícios de demonstração pré-carregados.

* **Acesso do Cliente**: Utilize o toggle flutuante superior no topo do SaaS ou mude para a url `/` ou `/agendar`.
* **Acesso do Barbeiro**: Mude para o modo "/admin" e preencha as seguinte credenciais de demonstração rápida (bypass de 1-clique disponível na tela):
  * **E-mail**: `demo@barbearia.com`
  * **Senha**: `demo123`

---

## 🔒 Segurança de Regras Firestore (Zero-Trust)
As regras especificadas em `firestore.rules` seguem altíssimo rigor de segurança corporativa:
- Bloqueia leitura e gravação geral por padrão (`match /{document=**} { allow read, write: if false; }`).
- Garante que apenas usuários administradores autenticados possam modificar o catálogo de serviços, alterar configurações ou lançar finanças.
- Habilita que clientes públicos possam agendar livremente apenas se a carga `incoming()` corresponder rigorosamente ao validador estrutural de campos e tipos (`isValidBooking()`).
- Protege dados de PII (WhatsApp e Nome do cliente) de leituras em listas cruas por agentes maliciosos externos.
