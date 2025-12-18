# 📊 FaturaAutom - Sistema de Gestão de Faturas

Sistema SaaS completo para processamento e aprovação de faturas com multi-tenancy, autenticação JWT e integração com Supabase.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8)

## ✨ Funcionalidades

### 🔐 Autenticação & Autorização
- Login com JWT tokens
- 3 níveis de acesso: `super_admin`, `master`, `user`
- Multi-tenancy com isolamento por empresa
- Row Level Security (RLS) no Supabase

### 📄 Gestão de Faturas
- Upload de documentos (PDF, XML, PNG, JPEG)
- Extração automática via webhook n8n (opcional)
- Aprovação manual ou automática baseada em regras
- Histórico completo de ações (audit log)
- Filtros avançados e paginação

### 🔄 Workflow de Aprovação
- Regras configuráveis por faixa de valor
- Auto-aprovação para valores baixos
- Notificações para aprovadores
- Timeline de aprovação
- Lançamentos contábeis automáticos

### 👥 Gestão de Usuários
- CRUD completo de usuários
- Controle de departamentos
- Ativação/desativação de contas

### 📊 Dashboard & Relatórios
- Métricas em tempo real
- KPIs: processadas, pendentes, rejeitadas
- Taxa de aprovação
- Valor total processado

### 🔔 Notificações
- Notificações em tempo real
- Alertas de aprovação pendente
- Histórico de notificações

---

## 🚀 Quick Start

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/FaturaAutom.git
cd FaturaAutom
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o ambiente
```bash
cp config.template .env.local
```

Edite `.env.local` com suas credenciais do Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

### 4. Configure o banco de dados
Execute o SQL em `supabase-schema.sql` no Supabase SQL Editor.

### 5. Inicie o servidor
```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/                    # REST API endpoints
│   │   ├── auth/              # Autenticação
│   │   ├── invoices/          # Faturas
│   │   ├── users/             # Usuários
│   │   ├── approval-rules/    # Regras
│   │   ├── company/           # Empresa
│   │   ├── dashboard/         # Métricas
│   │   └── notifications/     # Notificações
│   ├── dashboard/             # Páginas do dashboard
│   └── login/                 # Página de login
├── components/
│   ├── ui/                    # Componentes base
│   ├── layout/                # Layout components
│   └── dashboard/             # Componentes específicos
├── contexts/                  # React contexts
├── hooks/                     # Custom hooks
├── lib/                       # Utilitários
└── types/                     # TypeScript types
```

---

## 🔌 API REST

A aplicação possui uma API REST completa. Veja a [documentação da API](./API.md).

### Exemplo de uso:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maicon@empresa.com","password":"123"}'

# Listar faturas (com token)
curl http://localhost:3000/api/invoices \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 🗄️ Banco de Dados

### Tabelas Principais

- `companies` - Empresas (tenants)
- `users` - Usuários do sistema
- `invoices` - Faturas
- `approval_rules` - Regras de aprovação
- `accounting_entries` - Lançamentos contábeis
- `notifications` - Notificações
- `audit_log` - Log de auditoria
- `extraction_logs` - Logs de extração OCR

### Políticas de Segurança (RLS)

Todas as tabelas possuem Row Level Security habilitado, garantindo que:
- Usuários só acessam dados da própria empresa
- Apenas admins podem modificar configurações
- Logs de auditoria são imutáveis

---

## 🎨 Tecnologias

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** JWT (custom implementation)
- **Storage:** Supabase Storage
- **Real-time:** Supabase Realtime
- **Icons:** Lucide React
- **Date:** date-fns

---

## 🚢 Deploy

Veja o [guia completo de deployment](./DEPLOYMENT.md) para instruções detalhadas.

### Deploy rápido na Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/FaturaAutom)

**Não esqueça de configurar as variáveis de ambiente!**

---

## 👥 Usuários de Teste

Após executar o SQL schema, você terá estes usuários:

| Email | Senha | Role | Descrição |
|-------|-------|------|-----------|
| maicon@empresa.com | qualquer | super_admin | Administrador completo |
| joao@empresa.com | qualquer | master | Aprovador |
| maria@empresa.com | qualquer | user | Usuário padrão |

---

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build para produção
npm start            # Inicia servidor de produção
npm run lint         # Executa ESLint
```

---

## 📝 Configurações

### Limite de Auto-aprovação

Configure em **Dashboard → Admin → Empresa**:
- Faturas até este valor são aprovadas automaticamente
- Padrão: R$ 1.000,00

### Regras de Aprovação

Configure em **Dashboard → Admin → Regras de Aprovação**:
- 3 níveis configuráveis
- Faixas de valor
- Aprovador responsável por nível

### Contas Contábeis Padrão

Configure em **Dashboard → Admin → Empresa**:
- Conta débito padrão
- Conta crédito padrão

---

## 🔗 Integrações

### n8n (Extração OCR)

Para habilitar extração automática de dados:

1. Configure um workflow no n8n
2. Crie um webhook que recebe:
   ```json
   {
     "file_url": "https://...",
     "file_type": "pdf",
     "company_id": "uuid",
     "user_id": "uuid"
   }
   ```
3. Retorne os dados extraídos:
   ```json
   {
     "invoice_number": "12345",
     "supplier_name": "Fornecedor",
     "total_amount": 1500.00,
     "due_date": "2024-01-15"
   }
   ```
4. Adicione ao `.env.local`:
   ```env
   N8N_EXTRACTION_WEBHOOK_URL=https://seu-n8n.com/webhook/extract
   ```

---

## 🐛 Troubleshooting

### Erro: "Supabase URL not configured"
- Verifique se `.env.local` existe e está configurado
- Reinicie o servidor de desenvolvimento

### Erro: "Failed to fetch"
- Verifique se o Supabase está acessível
- Confirme as credenciais no `.env.local`

### Build falha
- Execute `npm run build` localmente
- Corrija erros de TypeScript
- Verifique se todas as dependências estão instaladas

---

## 📄 Licença

Este projeto é privado e proprietário.

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato: suporte@faturaautom.com

---

## 🎯 Roadmap

- [ ] Integração com ERPs (TOTVS, SAP)
- [ ] Exportação para Excel/PDF
- [ ] Dashboard com gráficos
- [ ] App mobile (React Native)
- [ ] Assinatura digital de faturas
- [ ] OCR com IA (GPT-4 Vision)
- [ ] Relatórios personalizáveis
- [ ] Multi-idioma (i18n)

---

**Desenvolvido com ❤️ usando Next.js e Supabase**
