# Guia de Deploy - FaturaAutom

## 📋 Pré-requisitos

- ✅ Código no GitHub
- ✅ Conta no Supabase (já configurado)
- ✅ Conta na Vercel (ou outra plataforma)

---

## 🚀 Deploy na Vercel (Recomendado)

A Vercel é a melhor opção para Next.js - criada pela mesma empresa.

### Passo 1: Conectar ao GitHub

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Conecte sua conta do GitHub
4. Selecione o repositório `FaturaAutom`
5. Clique em **"Import"**

### Passo 2: Configurar Variáveis de Ambiente

Na tela de configuração do projeto, adicione as **Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

**Opcional** (para integração n8n):
```env
N8N_EXTRACTION_WEBHOOK_URL=https://seu-n8n.com/webhook/extract-invoice
```

### Passo 3: Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-3 minutos
3. Pronto! Sua URL será algo como: `https://fatura-autom.vercel.app`

### Passo 4: Configurar Domínio Customizado (Opcional)

1. No dashboard da Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio (ex: `faturas.suaempresa.com.br`)
3. Configure os DNS conforme instruções

---

## 🔧 Deploy Alternativo - Railway

### Passo 1: Criar Projeto

1. Acesse [railway.app](https://railway.app)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório `FaturaAutom`

### Passo 2: Configurar Variáveis

Adicione as mesmas variáveis de ambiente:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Passo 3: Deploy

Railway fará o deploy automaticamente. URL gerada: `https://fatura-autom.up.railway.app`

---

## 🔧 Deploy Alternativo - Render

### Passo 1: Criar Web Service

1. Acesse [render.com](https://render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte ao GitHub e selecione o repositório

### Passo 2: Configurar

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 📦 Configurações Importantes

### 1. Atualizar CORS no Supabase

No Supabase Dashboard:
1. Vá em **Settings** → **API**
2. Em **CORS Allowed Origins**, adicione:
   ```
   https://seu-dominio.vercel.app
   ```

### 2. Configurar Storage Bucket

No Supabase:
1. Vá em **Storage** → **Policies**
2. Certifique-se que as policies de `invoices` bucket estão ativas

### 3. Verificar RLS Policies

Execute no SQL Editor do Supabase:
```sql
-- Verificar se RLS está ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Todas as tabelas devem ter `rowsecurity = true`.

---

## 🔒 Segurança em Produção

### 1. Variáveis de Ambiente

**NUNCA** commite o arquivo `.env.local` no Git!

Verifique se está no `.gitignore`:
```
.env*.local
.env
```

### 2. HTTPS Obrigatório

Todas as plataformas (Vercel, Railway, Render) fornecem HTTPS automaticamente.

### 3. Rate Limiting

Para produção, considere adicionar rate limiting nas rotas da API.

Instale:
```bash
npm install @upstash/ratelimit @upstash/redis
```

### 4. Logs e Monitoramento

Configure logs na Vercel:
1. Dashboard → **Logs**
2. Configure alertas para erros

---

## 🧪 Testar Deploy

### 1. Testar Login
```bash
curl -X POST https://seu-dominio.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maicon@empresa.com","password":"123"}'
```

### 2. Testar API com Token
```bash
curl https://seu-dominio.vercel.app/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 3. Testar Interface

Acesse:
- `https://seu-dominio.vercel.app/login`
- Faça login com: `maicon@empresa.com`
- Navegue pelo dashboard

---

## 🔄 CI/CD Automático

Com Vercel/Railway, cada push no GitHub faz deploy automático:

1. **Push para `main`** → Deploy em produção
2. **Push para outras branches** → Preview deploy
3. **Pull Request** → Preview automático

### Configurar Branches

No Vercel:
1. **Settings** → **Git**
2. **Production Branch:** `main`
3. **Preview Deployments:** Todas as branches

---

## 📊 Monitoramento

### Vercel Analytics

1. No dashboard, ative **Analytics**
2. Veja métricas de:
   - Tempo de resposta
   - Erros
   - Tráfego

### Supabase Logs

1. Supabase Dashboard → **Logs**
2. Monitore:
   - Queries lentas
   - Erros de autenticação
   - Uso de storage

---

## 🐛 Troubleshooting

### Erro: "Supabase URL not configured"

**Solução:** Verifique se as variáveis de ambiente estão configuradas na plataforma de deploy.

### Erro: "Failed to fetch"

**Solução:** 
1. Verifique CORS no Supabase
2. Confirme que a URL da API está correta

### Build falha

**Solução:**
1. Verifique os logs de build
2. Teste localmente: `npm run build`
3. Corrija erros de TypeScript

### Imagens não carregam

**Solução:** Configure `next.config.js`:
```js
module.exports = {
  images: {
    domains: ['seu-projeto.supabase.co'],
  },
}
```

---

## 📝 Checklist de Deploy

- [ ] Código no GitHub
- [ ] Variáveis de ambiente configuradas
- [ ] SQL schema executado no Supabase
- [ ] Dados de teste criados
- [ ] Build local funcionando
- [ ] Deploy realizado
- [ ] CORS configurado
- [ ] Login testado
- [ ] API testada
- [ ] Storage bucket configurado
- [ ] Domínio customizado (opcional)

---

## 🎯 Próximos Passos

1. **Configurar domínio próprio**
2. **Adicionar SSL/HTTPS** (automático na Vercel)
3. **Configurar backup do Supabase**
4. **Implementar rate limiting**
5. **Adicionar monitoramento de erros** (Sentry)
6. **Configurar CI/CD para testes**

---

## 🆘 Suporte

Se encontrar problemas:

1. **Logs da Vercel:** Dashboard → Logs
2. **Logs do Supabase:** Dashboard → Logs
3. **Console do navegador:** F12 → Console
4. **Network tab:** F12 → Network

---

## 📚 Recursos

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deploy](https://nextjs.org/docs/deployment)
- [Supabase Docs](https://supabase.com/docs)
