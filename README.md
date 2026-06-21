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
