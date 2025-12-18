# FaturaAutom API - Documentação

## Base URL
```
http://localhost:3001/api
```

## Autenticação

Todas as rotas (exceto `/auth/login`) requerem autenticação via JWT token no header:
```
Authorization: Bearer {token}
```

---

## Endpoints

### 🔐 AUTH

#### POST /api/auth/login
Autenticar usuário e obter token.

**Request:**
```json
{
  "email": "maicon@empresa.com",
  "password": "qualquer-senha"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "name": "Maicon Admin",
      "email": "maicon@empresa.com",
      "role": "super_admin",
      "department": "Financeiro",
      "company_id": "uuid",
      "company": {
        "id": "uuid",
        "name": "Empresa Teste LTDA",
        "cnpj": "11.222.333/0001-81"
      }
    }
  },
  "message": "Login realizado com sucesso"
}
```

#### GET /api/auth/me
Obter dados do usuário autenticado.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Maicon Admin",
    "email": "maicon@empresa.com",
    "role": "super_admin",
    "department": "Financeiro",
    "company_id": "uuid",
    "company": {...}
  }
}
```

---

### 📄 INVOICES

#### GET /api/invoices
Listar faturas com filtros e paginação.

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| status | string | pending_extraction, pending, processing, completed, error |
| approval_status | string | pending, approved, rejected, auto_approved |
| date_from | string | Data início (YYYY-MM-DD) |
| date_to | string | Data fim (YYYY-MM-DD) |
| supplier_name | string | Buscar por fornecedor |
| page | number | Página (default: 1) |
| limit | number | Itens por página (default: 10, max: 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "invoices": [...]
  },
  "total": 50,
  "page": 1,
  "pages": 5,
  "limit": 10
}
```

#### POST /api/invoices
Criar fatura manualmente.

**Request:**
```json
{
  "invoice_number": "12345",
  "invoice_series": "001",
  "supplier_name": "Fornecedor ABC",
  "supplier_cnpj": "12.345.678/0001-99",
  "total_amount": 1500.00,
  "due_date": "2024-01-15",
  "invoice_date": "2024-01-01",
  "description": "Serviços prestados"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "invoice": {...},
    "auto_approved": false
  },
  "message": "Fatura criada e aguardando aprovação"
}
```

#### GET /api/invoices/:id
Obter fatura específica com histórico.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "invoice": {...},
    "history": [...]
  }
}
```

#### PUT /api/invoices/:id
Atualizar fatura pendente.

**Request:**
```json
{
  "supplier_name": "Novo Nome",
  "total_amount": 2000.00
}
```

#### DELETE /api/invoices/:id
Excluir fatura (soft delete, apenas super_admin).

---

#### POST /api/invoices/upload-manual
Upload de arquivo com extração via n8n.

**Request (multipart/form-data):**
- `file`: Arquivo PDF, XML, PNG ou JPEG
- `document_type`: "pdf" ou "xml"

**Response (201):**
```json
{
  "success": true,
  "data": {
    "invoice_id": "uuid",
    "extraction_data": {...},
    "extraction_status": "completed",
    "next_action": "pending_approval"
  }
}
```

#### POST /api/invoices/:id/validate
Validar fatura e aplicar regras de aprovação.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "pending_approval",
    "next_step": "awaiting_approver",
    "approver_id": "uuid",
    "rule_applied": 2
  }
}
```

#### POST /api/invoices/:id/approve
Aprovar fatura (master ou super_admin).

**Request:**
```json
{
  "debit_account_code": "4.1.01.01",
  "credit_account_code": "2.1.01",
  "notes": "Aprovado conforme contrato"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "invoice": {...},
    "accounting_entry": {...}
  },
  "message": "Fatura aprovada com sucesso"
}
```

#### POST /api/invoices/:id/reject
Rejeitar fatura (master ou super_admin).

**Request:**
```json
{
  "reason": "Valor divergente do contrato"
}
```

---

### 🏢 COMPANY

#### GET /api/company/config
Obter configuração da empresa.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "name": "Empresa Teste LTDA",
    "cnpj": "11.222.333/0001-81",
    "auto_approve_limit": 1000.00,
    "default_debit_account": "4.1.01.01",
    "default_credit_account": "2.1.01",
    "is_active": true
  }
}
```

#### PUT /api/company/config
Atualizar configuração (super_admin).

**Request:**
```json
{
  "auto_approve_limit": 2000.00,
  "default_debit_account": "4.1.01.02",
  "default_credit_account": "2.1.02"
}
```

---

### 👥 USERS

#### GET /api/users
Listar usuários (super_admin ou master).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "Maicon Admin",
        "email": "maicon@empresa.com",
        "role": "super_admin",
        "department": "Financeiro",
        "is_active": true
      }
    ]
  }
}
```

#### POST /api/users
Criar usuário (super_admin).

**Request:**
```json
{
  "name": "Novo Usuário",
  "email": "novo@empresa.com",
  "role": "user",
  "department": "Compras"
}
```

#### GET /api/users/:id
Obter usuário específico.

#### PUT /api/users/:id
Atualizar usuário (super_admin).

**Request:**
```json
{
  "name": "Nome Atualizado",
  "role": "master",
  "department": "Financeiro",
  "is_active": true
}
```

#### DELETE /api/users/:id
Desativar usuário (super_admin).

---

### 📋 APPROVAL RULES

#### GET /api/approval-rules
Listar regras de aprovação (super_admin ou master).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": "uuid",
        "approval_level": 1,
        "min_amount": 0,
        "max_amount": 1000.00,
        "auto_approve": true,
        "approver": null
      },
      {
        "id": "uuid",
        "approval_level": 2,
        "min_amount": 1000.01,
        "max_amount": 10000.00,
        "auto_approve": false,
        "approver": {"id": "uuid", "name": "João Master"}
      }
    ]
  }
}
```

#### POST /api/approval-rules
Criar regra (super_admin).

**Request:**
```json
{
  "approval_level": 3,
  "min_amount": 10000.01,
  "max_amount": null,
  "auto_approve": false,
  "approver_id": "uuid"
}
```

#### PUT /api/approval-rules/:id
Atualizar regra (super_admin).

#### DELETE /api/approval-rules/:id
Desativar regra (super_admin).

---

### 📊 DASHBOARD

#### GET /api/dashboard/metrics
Obter métricas do dashboard.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_invoices": 150,
      "total_processed": 120,
      "pending_approval": 20,
      "rejected": 10,
      "auto_approved": 45,
      "total_value": 500000.00,
      "approved_value": 450000.00,
      "approval_rate": 80.0,
      "recent_7_days": 25,
      "my_pending_approvals": 5
    }
  }
}
```

---

### 🔔 NOTIFICATIONS

#### GET /api/notifications
Listar notificações do usuário.

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| limit | number | Limite de resultados (default: 20) |
| unread_only | boolean | Apenas não lidas |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "approval_required",
        "title": "Nova fatura aguardando aprovação",
        "message": "Fatura 12345 de Fornecedor ABC no valor de R$ 1.500,00",
        "is_read": false,
        "created_at": "2024-01-01T10:00:00Z",
        "invoice": {...}
      }
    ],
    "unread_count": 3
  }
}
```

#### POST /api/notifications
Marcar notificações como lidas.

**Request:**
```json
{
  "notification_ids": ["uuid1", "uuid2"]
}
```

Ou marcar todas:
```json
{
  "mark_all_read": true
}
```

---

## Códigos de Erro

| Status | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autorizado (token inválido ou expirado) |
| 403 | Acesso negado (sem permissão) |
| 404 | Recurso não encontrado |
| 409 | Conflito (recurso já existe) |
| 500 | Erro interno do servidor |

---

## Testando com Postman

1. **Login:**
   ```
   POST http://localhost:3001/api/auth/login
   Body: { "email": "maicon@empresa.com", "password": "123" }
   ```

2. **Copie o `access_token` da resposta**

3. **Use em outras requisições:**
   ```
   Authorization: Bearer {access_token}
   ```

4. **Exemplo - Listar faturas:**
   ```
   GET http://localhost:3001/api/invoices
   Headers:
     Authorization: Bearer eyJ...
   ```

---

## Variáveis de Ambiente

Para integração com n8n (extração automática), adicione ao `.env.local`:

```
N8N_EXTRACTION_WEBHOOK_URL=https://seu-n8n.com/webhook/extract-invoice
```

A API enviará para este webhook:
```json
{
  "file_url": "https://...",
  "file_type": "pdf",
  "company_id": "uuid",
  "user_id": "uuid"
}
```

E espera receber:
```json
{
  "invoice_number": "12345",
  "supplier_name": "Fornecedor",
  "supplier_cnpj": "12.345.678/0001-99",
  "total_amount": 1500.00,
  "due_date": "2024-01-15",
  "invoice_date": "2024-01-01"
}
```
