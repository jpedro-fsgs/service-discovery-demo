# 🎉 Emoji Social — Service Discovery com HashiCorp Consul

Rede Social de Emojis em tempo real desenvolvida para a disciplina de **Sistemas Distribuídos** (Atividade Prática 01 — Grupo 5).

A aplicação demonstra **Service Discovery dinâmico** usando **HashiCorp Consul**, desacoplamento de microsserviços via **JWT stateless**, armazenamento em cache com **Redis**, e resiliência (**graceful degradation**) ao vivo.

---

## 🛠️ Stack Tecnológica

| Componente | Tecnologia | Versão | Função |
|---|---|---|---|
| **Linguagem** | TypeScript | 5.7 | Tipagem estática e segurança em todos os serviços |
| **Módulos** | ES Modules (ESM) | ES2024 | Sintaxe moderna `import`/`export` sem CommonJS |
| **Framework HTTP** | Fastify | 5.3 | Framework web de alta performance para Node.js |
| **Middleware** | HashiCorp Consul | Latest | Service Discovery, Registry e Health Check HTTP |
| **Cache/Database** | Redis | 7 (Alpine) | Armazenamento do feed (lista ordenada `LPUSH` + `LTRIM`) |
| **Validação Env** | Zod | 3.25 | Parse e validação de variáveis de ambiente na inicialização |
| **Bundler** | tsup | 8.4 | Compilação rápida de TypeScript para JS ESM minificado |
| **Containerização**| Docker Compose | v5 | Orquestração com builds multi-stage |
| **Testes** | Vitest | 3.0 | Testes funcionais com `fetch` nativo do Node 22 |

---

## 📐 Arquitetura

```
                          +-----------------------+
                          |   📱 Navegador/Mobile |
                          +-----------+-----------+
                                      |
                                      v
                          +-----------------------+
                          | 🖥️ Frontend Server   |  (Fastify :8080)
                          |  Proxy com Discovery  |
                          +-----------+-----------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+------------------+                                     +------------------+
| 🔍 Consul Server | <--- Health Checks (GET /health) ----| 🔐 Auth Service  | (:3001)
|  Registry :8500  |                                     +------------------+
+--------+---------+                                               |
         ^                                                         | (JWT)
         |                                                         v
         +-------------------------------------------------+ 📝 Posts Service | (:3002)
                                                           +--------+---------+
                                                                    |
                                                                    v
                                                           +------------------+
                                                           | 🗄️ Redis :6379   |
                                                           +------------------+
```

---

## 🚀 Como Executar

### Pré-requisitos
- Docker & Docker Compose
- Node.js v22+ (para rodar os testes localmente)

### Passos

1. **Subir os containers:**
   ```bash
   docker compose up --build -d
   ```

2. **Acessar as interfaces:**
   - 📱 **Emoji Social App:** `http://localhost:8080` (ou `http://<IP-DA-SUA-MAQUINA>:8080` no celular no mesmo Wi-Fi)
   - 🔍 **Consul Dashboard:** `http://localhost:8500`

---

## 🧪 Rodar os Testes Funcionais

```bash
# Na raiz do repositório
npm install
npm test --workspace=tests
```

---

## 🎭 Roteiro da Demonstração ao Vivo (Graceful Degradation)

1. **Cenário Normal:**
   - Abra a Consul UI (`http://localhost:8500`) e veja `auth-service` e `posts-service` verdes (Passing).
   - Abra o app em 2 celulares/abas diferentes e envie emojis. Veja o feed atualizar em tempo real.

2. **Derrubando a Autenticação:**
   ```bash
   docker stop auth-service
   ```
   - Aguarde ~15 segundos. Na Consul UI, o `auth-service` ficará vermelho (Critical).
   - **Usuário Antigo (já logado):** Continua conseguindo enviar emojis para o `posts-service`. O JWT é **stateless**, a validação ocorre localmente sem consultar o Auth!
   - **Usuário Novo (aba anônima):** Tenta entrar e recebe um erro amigável (503) "Serviço de Autenticação Indisponível".

3. **Recuperação (Self-Healing):**
   ```bash
   docker start auth-service
   ```
   - Em 10 segundos o Consul detecta o retorno e os novos usuários voltam a conseguir se autenticar.

---

## 📄 Licença e Créditos

Trabalho desenvolvido para a disciplina de Sistemas Distribuídos — Grupo 5.
