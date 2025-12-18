# Exemplos de Uso da API

## URL Base
Substitua `http://localhost:3000` pela URL da Vercel (ex: `https://fatura-automa.vercel.app`) quando estiver em produção.

---

## 1. JavaScript (Fetch)

Use este código no console do navegador ou em aplicações Frontend/Node.js.

```javascript
const API_URL = 'https://fatura-automa.vercel.app/api';

async function exampleFlow() {
  try {
    // 1. LOGIN
    console.log('Autenticando...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maicon@empresa.com',
        password: 'any-password'
      })
    });

    const loginData = await loginRes.json();
    
    if (!loginData.success) {
      throw new Error('Login falhou: ' + loginData.message);
    }

    const token = loginData.data.access_token;
    console.log('✅ Token obtido:', token.substring(0, 20) + '...');

    // 2. LISTAR FATURAS
    console.log('Buscando faturas...');
    const invoicesRes = await fetch(`${API_URL}/invoices?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const invoicesData = await invoicesRes.json();
    console.log(`✅ ${invoicesData.total} faturas encontradas.`);
    console.log('Primeira fatura:', invoicesData.data.invoices[0]);

    // 3. CRIAR UMA FATURA MANUALMENTE
    console.log('Criando nova fatura...');
    const createRes = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice_number: `TEST-${Date.now()}`,
        supplier_name: "Fornecedor Teste API",
        total_amount: 150.50,
        description: "Teste via Script"
      })
    });

    const createData = await createRes.json();
    console.log('✅ Fatura criada:', createData.message);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
exampleFlow();
```

---

## 2. cURL (Terminal)

### Login
```bash
curl -X POST https://fatura-automa.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maicon@empresa.com", "password":"123"}'
```

### Get Invoices (Substitua TOKEN)
```bash
curl https://fatura-automa.vercel.app/api/invoices \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Get Dashboard Metrics
```bash
curl https://fatura-automa.vercel.app/api/dashboard/metrics \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 3. Python

Simples script para automação ou teste.

```python
import requests

API_URL = "https://fatura-automa.vercel.app/api"

# 1. Login
session = requests.Session()
login_payload = {
    "email": "maicon@empresa.com",
    "password": "123"
}

response = session.post(f"{API_URL}/auth/login", json=login_payload)
data = response.json()

if data.get("success"):
    token = data["data"]["access_token"]
    print(f"Login sucesso! Token: {token[:20]}...")
    
    # Header de Autenticação
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Pegar Faturas
    invoices = requests.get(f"{API_URL}/invoices", headers=headers).json()
    print(f"Total de faturas: {invoices.get('total', 0)}")
    
else:
    print("Erro no login:", data.get("message"))
```
