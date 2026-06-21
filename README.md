# Codecast API

API REST para gerenciamento de estúdios de podcast, hosts e agendamentos.  
Desenvolvida como desafio DEV1 da CODE Jr.

---

## Visão Geral

A Codecast API permite cadastrar estúdios de gravação e hosts, e realizar agendamentos com validação automática de conflito de horário. Qualquer tentativa de reservar um estúdio em um intervalo já ocupado é bloqueada com resposta padronizada.

---

## Arquitetura

O projeto segue arquitetura em camadas, mantendo separação clara de responsabilidades:

```
Controller  →  Service  →  Repository  →  Model
   (HTTP)     (negócio)     (banco)      (tabela)
```

- **Controller** — recebe a requisição HTTP, delega ao service, retorna a resposta
- **Service** — contém as regras de negócio e orquestra os repositórios
- **Repository** — responsável exclusivamente pelo acesso ao banco de dados
- **Model** — define o schema da tabela via SQLAlchemy ORM
- **Schema** — define contratos de entrada e saída via Pydantic
- **Middleware** — tratamento centralizado de exceções com respostas padronizadas

---

## Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| Python | 3.12 | Linguagem principal |
| FastAPI | 0.115 | Framework web |
| SQLAlchemy | 2.0 | ORM |
| Alembic | 1.16 | Migrations |
| Pydantic | 2.11 | Validação de dados |
| pydantic-settings | 2.9 | Configuração por variáveis de ambiente |
| PostgreSQL | 16 | Banco de dados (produção) |
| SQLite | — | Banco de dados (testes) |
| Uvicorn | 0.34 | Servidor ASGI |
| Pytest | 9.1 | Testes automatizados |
| Ruff | — | Linter |
| Docker | — | Containerização |
| GitHub Actions | — | CI/CD |

---

## Estrutura do Projeto

```
codecast-api/
├── .github/
│   └── workflows/
│       └── ci.yml              # Pipeline CI
├── alembic/
│   └── versions/
│       └── 0001_initial.py     # Migration inicial
├── app/
│   ├── controllers/            # Rotas e endpoints HTTP
│   │   ├── booking.py
│   │   ├── host.py
│   │   └── studio.py
│   ├── core/
│   │   ├── config.py           # Settings via variáveis de ambiente
│   │   └── exceptions.py       # Exceções de domínio
│   ├── database/
│   │   └── connection.py       # Engine e sessão SQLAlchemy
│   ├── middlewares/
│   │   └── error_handler.py    # Handler global de exceções
│   ├── models/                 # Modelos ORM
│   │   ├── booking.py
│   │   ├── host.py
│   │   └── studio.py
│   ├── repositories/           # Acesso ao banco de dados
│   │   ├── booking.py
│   │   ├── host.py
│   │   └── studio.py
│   ├── schemas/                # Schemas Pydantic (entrada/saída)
│   │   ├── booking.py
│   │   ├── host.py
│   │   └── studio.py
│   ├── services/               # Regras de negócio
│   │   ├── booking.py
│   │   ├── host.py
│   │   └── studio.py
│   └── main.py                 # Instância FastAPI e registro de routers
├── tests/
│   ├── conftest.py             # Fixtures (banco SQLite em memória)
│   ├── test_booking_service.py
│   ├── test_host_service.py
│   └── test_studio_service.py
├── .env.example                # Modelo de variáveis de ambiente
├── alembic.ini                 # Configuração do Alembic
├── docker-compose.yml
├── Dockerfile
├── entrypoint.sh               # Aguarda Postgres, roda migrations e sobe API
├── pyproject.toml              # Configuração ruff e coverage
├── pytest.ini                  # Configuração pytest
└── requirements.txt
```

---

## Instalação Local

**Pré-requisitos:** Python 3.12 e Git.

**1. Clone o repositório**
```bash
git clone <url-do-repositorio>
cd codecast-api
```

**2. Crie e ative o ambiente virtual**
```bash
python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

**3. Instale as dependências**
```bash
pip install -r requirements.txt
```

**4. Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

O padrão do `.env.example` usa SQLite, pronto para rodar sem configuração adicional:
```env
APP_NAME="Codecast API"
DEBUG=true
DATABASE_URL=sqlite:///./dev1.db
```

**5. Aplique as migrations**
```bash
alembic upgrade head
```

**6. Inicie a API**
```bash
python main.py
```

A API estará disponível em `http://localhost:8000`.

---

## Docker

**Pré-requisitos:** Docker e Docker Compose.

**1. Configure o `.env`**
```bash
cp .env.example .env
```

O `.env.example` já inclui as variáveis para o ambiente Docker com PostgreSQL:
```env
APP_NAME="Codecast API"
DEBUG=false

POSTGRES_DB=codecast
POSTGRES_USER=codecast
POSTGRES_PASSWORD=codecast

DATABASE_URL=postgresql://codecast:codecast@postgres:5432/codecast
```

**2. Suba os serviços**
```bash
docker compose up
```

Isso irá:
1. Subir o container `postgres` (PostgreSQL 16)
2. Aguardar o Postgres ficar saudável (healthcheck)
3. Construir a imagem da `api`
4. Aplicar as migrations automaticamente via `entrypoint.sh`
5. Iniciar o servidor Uvicorn na porta `8000`

**Serviços disponíveis:**

| Serviço | Endereço |
|---|---|
| API | `http://localhost:8000` |
| PostgreSQL | `localhost:5432` |

**Outros comandos úteis:**
```bash
# Rodar em background
docker compose up -d

# Ver logs da API
docker compose logs -f api

# Derrubar os serviços
docker compose down

# Derrubar e remover volume do banco
docker compose down -v
```

---

## Banco de Dados

### Modelos

**Studio**
| Coluna | Tipo | Descrição |
|---|---|---|
| id | Integer | Chave primária |
| nome | String(100) | Nome do estúdio |
| capacidade | Integer | Capacidade máxima de pessoas |
| equipamentos | JSON | Lista de equipamentos disponíveis |

**Host**
| Coluna | Tipo | Descrição |
|---|---|---|
| id | Integer | Chave primária |
| nome | String(100) | Nome do host |

**Booking**
| Coluna | Tipo | Descrição |
|---|---|---|
| id | Integer | Chave primária |
| studio_id | FK → studios.id | Estúdio reservado |
| host_id | FK → hosts.id | Host responsável |
| start_time | DateTime (tz) | Início do agendamento |
| end_time | DateTime (tz) | Término do agendamento |

### Migrations (Alembic)

```bash
# Aplicar todas as migrations
alembic upgrade head

# Ver revision atual
alembic current

# Ver histórico
alembic history

# Gerar nova migration após alterar um model
alembic revision --autogenerate -m "descricao"

# Reverter última migration
alembic downgrade -1
```

> Ordem correta: `upgrade head` → alterar model → `autogenerate` → `upgrade head`

---

## Endpoints

### Studios

| Método | Rota | Descrição | Status |
|---|---|---|---|
| POST | `/studios` | Criar estúdio | 201 |
| GET | `/studios` | Listar estúdios | 200 |
| GET | `/studios/{id}` | Buscar estúdio | 200 / 404 |
| PUT | `/studios/{id}` | Atualizar estúdio | 200 / 404 |
| DELETE | `/studios/{id}` | Remover estúdio | 204 / 404 |

**Exemplo — POST /studios**
```json
// Request
{
  "nome": "Estúdio A",
  "capacidade": 5,
  "equipamentos": ["Microfone Condensador", "Mesa de Som"]
}

// Response 201
{
  "id": 1,
  "nome": "Estúdio A",
  "capacidade": 5,
  "equipamentos": ["Microfone Condensador", "Mesa de Som"]
}
```

### Hosts

| Método | Rota | Descrição | Status |
|---|---|---|---|
| POST | `/hosts` | Criar host | 201 |
| GET | `/hosts` | Listar hosts | 200 |
| GET | `/hosts/{id}` | Buscar host | 200 / 404 |
| PUT | `/hosts/{id}` | Atualizar host | 200 / 404 |
| DELETE | `/hosts/{id}` | Remover host | 204 / 404 |

**Exemplo — POST /hosts**
```json
// Request
{
  "nome": "João Silva"
}

// Response 201
{
  "id": 1,
  "nome": "João Silva"
}
```

### Bookings

| Método | Rota | Descrição | Status |
|---|---|---|---|
| POST | `/bookings` | Criar agendamento | 201 / 404 / 409 |

**Exemplo — POST /bookings**
```json
// Request
{
  "studio_id": 1,
  "host_id": 1,
  "start_time": "2025-01-15T10:00:00",
  "end_time": "2025-01-15T11:00:00"
}

// Response 201
{
  "id": 1,
  "studio_id": 1,
  "host_id": 1,
  "start_time": "2025-01-15T10:00:00",
  "end_time": "2025-01-15T11:00:00"
}

// Response 409 — conflito de horário
{
  "success": false,
  "message": "Conflito de horário para o studio 1"
}
```

### Respostas de erro

Todos os erros seguem o formato padronizado:

```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

| Status | Situação |
|---|---|
| 404 | Recurso não encontrado |
| 409 | Conflito de agendamento |
| 422 | Dados inválidos (validação Pydantic) |
| 500 | Erro interno do servidor |

---

## Swagger

Com a API rodando, a documentação interativa está disponível em:

| Interface | URL |
|---|---|
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |
| OpenAPI JSON | `http://localhost:8000/openapi.json` |

---

## Testes

Os testes cobrem as camadas de **service** e **repository** usando banco SQLite em memória — sem mocks, exercitando o fluxo real de cada operação.

**Executar os testes:**
```bash
pytest
```

**Resultado esperado:**
```
26 passed
Coverage: 99%
```

**Cobertura por módulo:**

| Módulo | Cobertura |
|---|---|
| services/ | 100% |
| repositories/ | 100% |
| models/ | 100% |
| schemas/ | 95%+ |
| exceptions | 100% |

**Cenários cobertos:**

- Studio: criação, listagem, busca, atualização parcial, remoção, erro 404
- Host: criação, listagem, busca, atualização, remoção, erro 404
- Booking: criação válida, studio inexistente, host inexistente, sobreposição parcial (início e fim), sobreposição envolvente, horário adjacente (válido), mesmo horário em estúdio diferente (válido)

---

## Frontend

Interface web para interagir com a API sem precisar do Swagger.
Apresneta uns erros ainda


### Como executar

**Opção 1 — Abrir direto no navegador**

Abra o arquivo `frontend-app/index.html` diretamente no navegador.

> ⚠️ Alguns navegadores bloqueiam requisições `fetch` em arquivos locais (`file://`). Se os dados não carregarem, use a Opção 2.

**Opção 2 — Servidor local**

```bash
cd frontend-app
python -m http.server 5500
```

Acesse `http://localhost:5500` no navegador. A API deve estar rodando em `http://localhost:8000`.

### Estrutura

```
frontend-app/
├── index.html       # Markup único — três seções: Estúdios, Hosts, Agendamentos
├── css/
│   └── style.css    # Estilos da interface
└── js/
    ├── api.js       # Camada HTTP — fetch, headers, tratamento de erros
    └── app.js       # Controlador da UI — estado, renderização, eventos
```

**api.js** — responsável exclusivamente pelas requisições HTTP. Expõe três objetos (`StudiosAPI`, `HostsAPI`, `BookingsAPI`), cada um com métodos semânticos (`getAll`, `create`, `update`, `remove`). Não toca no DOM.

**app.js** — controla toda a interface. Mantém um estado local (`state`) com o cache das listas e registra os event listeners. Delega todas as chamadas de rede ao `api.js`.

### Integração com a API

A URL base está definida em `api.js`:

```js
const API_BASE_URL = 'http://localhost:8000';
```

Todas as requisições passam pela função `request()`, que centraliza headers (`Content-Type: application/json`) e trata respostas de erro, lançando um objeto `{ status, message }` que a UI captura para exibir feedback.

### Fluxo de reserva

1. Usuário clica em **+ Novo agendamento**
2. Os `<select>` de estúdio e host são populados com os dados em cache (ou buscados na API se o cache estiver vazio)
3. Usuário preenche estúdio, host, data, hora de início e hora de fim
4. Validação client-side: todos os campos obrigatórios e `end_time > start_time`
5. `POST /bookings` é enviado com `start_time` e `end_time` em ISO 8601
6. Em caso de sucesso (201), o agendamento é adicionado ao estado local e a tabela é re-renderizada sem novo request
7. Em caso de erro, o toast exibe a mensagem apropriada (ver abaixo)

### Tratamento de erros

A interface diferencia os erros por status HTTP e exibe mensagens específicas:

| Situação | Mensagem exibida |
|---|---|
| 409 — conflito de horário | "Horário indisponível" |
| 404 — host não encontrado | "Host não encontrado" |
| 404 — estúdio não encontrado | "Estúdio não encontrado" |
| Erro de rede / API offline | Mensagem do erro original |
| Falha ao carregar estúdios | Estado de erro com botão "Tentar novamente" |

Erros transitórios (rede, timeout) são exibidos via **toast** no canto inferior direito, com fechamento automático após 4 segundos ou manual pelo botão ×.

---

## Extra do Desafio

Itens implementados além dos requisitos obrigatórios:

**Frontend completo (`frontend-app/`)**
- Interface web funcional que consome todos os endpoints da API
- Seção de Estúdios com cards, barra de capacidade e tags de equipamentos
- Seção de Hosts com tabela, formulário de criação/edição inline e exclusão com confirmação
- Seção de Agendamentos com tabela e formulário com seleção de estúdio, host, data e horário
- Feedback visual completo: estados de loading (skeleton), erro, lista vazia, toast de sucesso/erro e modal de confirmação

**Arquitetura em camadas**
- Separação clara entre `api.js` (HTTP) e `app.js` (UI), sem acoplamento entre as camadas

**Cobertura de testes: 99%**
- Todos os cenários de conflito de agendamento cobertos, incluindo sobreposição parcial, envolvente e adjacente

**CI/CD com GitHub Actions**
- Pipeline automático com lint (Ruff), testes e verificação de cobertura mínima em todo push/PR

**Docker com healthcheck**
- `entrypoint.sh` aguarda o Postgres ficar saudável antes de aplicar migrations e subir a API

---

## CI/CD

O pipeline de integração contínua roda automaticamente no GitHub Actions em todo **push** e **pull request**.

**Etapas:**

```
Checkout → Setup Python 3.12 → Install deps → Lint (ruff) → Tests (pytest)
```

O pipeline falha se:
- O linter encontrar erros de estilo ou imports não utilizados
- Qualquer teste falhar
- A cobertura de testes ficar abaixo de 70%

**Arquivo:** `.github/workflows/ci.yml`
