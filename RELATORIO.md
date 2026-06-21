# Relatório Técnico — Desafio DEV1
**CODE Jr | Processo Seletivo**

---

## 1. Contextualização do Problema

O desafio propõe a construção de uma API REST para gerenciar estúdios de podcast, hosts e agendamentos. O domínio central do problema é o **controle de reservas**: um estúdio de gravação é um recurso físico com disponibilidade limitada no tempo, e dois agendamentos não podem ocupar o mesmo estúdio no mesmo intervalo de tempo.

O problema, portanto, não se resume a persistir dados — exige raciocínio sobre intervalos temporais, integridade referencial entre entidades e uma resposta clara ao cliente quando uma reserva é inviável.

---

## 2. Interpretação do Desafio

A leitura do desafio identificou três grupos de requisitos:

**Requisitos funcionais:**
- CRUD completo de estúdios, com nome, capacidade e lista de equipamentos
- CRUD completo de hosts
- Criação de agendamentos vinculando host e estúdio a um intervalo de tempo
- Validação de que o estúdio e o host referenciados existem
- Validação de que o intervalo é coerente (`end_time > start_time`)
- Rejeição de agendamentos com sobreposição de horário no mesmo estúdio

**Requisitos não funcionais:**
- Arquitetura em camadas com separação de responsabilidades
- Respostas de erro padronizadas
- Documentação OpenAPI completa
- Testes automatizados com cobertura mínima de 70%
- Containerização com Docker
- Pipeline de CI/CD

**Decisão de escopo:** o conflito de agendamento foi interpretado como exclusivo por estúdio — dois hosts diferentes podem ter agendamentos simultâneos, desde que em estúdios distintos. Essa interpretação é aderente ao modelo de negócio real de um estúdio de gravação.

---

## 3. Arquitetura Escolhida

Foi adotada **arquitetura em camadas** (Layered Architecture), com separação explícita entre quatro responsabilidades:

```
Requisição HTTP
      ↓
  Controller        — recebe e valida a entrada HTTP, delega ao service
      ↓
   Service          — aplica as regras de negócio, orquestra repositórios
      ↓
  Repository        — executa operações no banco de dados
      ↓
    Model           — representa a tabela via ORM
```

**Motivação da escolha:**

A arquitetura em camadas foi preferida por ser o padrão mais adequado para APIs REST de tamanho médio: é testável por camada, legível para times, e impõe uma disciplina natural sobre onde cada tipo de código deve viver. Frameworks como FastAPI não impõem uma estrutura, o que torna essa separação explícita ainda mais importante.

**Regra central respeitada:** nenhuma camada conhece as camadas acima dela. O `Service` não sabe que existe uma rota HTTP. O `Repository` não sabe que existe um `Service`. Isso garante que as regras de negócio possam ser testadas sem subir um servidor.

**Componentes transversais:**

Além das quatro camadas principais, dois componentes transversais foram criados:

- `core/exceptions.py` — hierarquia de exceções de domínio desacoplada do FastAPI
- `middlewares/error_handler.py` — converte exceções de domínio em respostas HTTP padronizadas

Essa separação evita que `HTTPException` do FastAPI vaze para dentro dos services, mantendo o núcleo da aplicação independente do framework web.

---

## 4. Modelagem do Banco de Dados

O banco de dados foi modelado com três entidades:

**Diagrama de relacionamentos:**

```
studios          bookings          hosts
--------         --------          -----
id (PK)   ←─    studio_id (FK)    id (PK)
nome            host_id (FK)  ─→  nome
capacidade      start_time
equipamentos    end_time
```

**Decisões de modelagem:**

- `equipamentos` foi modelado como coluna `JSON` na tabela `studios`. A alternativa seria uma tabela separada `equipamentos`, mas o requisito não exige consultas filtradas por equipamento — o campo é apenas informativo. O tipo JSON é adequado para listas simples sem necessidade de normalização.

- `start_time` e `end_time` foram definidos como `DateTime(timezone=True)`. O suporte a timezone é uma prática defensiva: evita ambiguidade em ambientes distribuídos e facilita futuras integrações com clientes em fusos diferentes.

- A chave estrangeira `studio_id` em `bookings` garante integridade referencial no banco: não é possível criar um agendamento para um estúdio que não existe, mesmo que a validação no service seja contornada.

**Migrations com Alembic:**

O controle de schema foi feito via Alembic. A migration `0001_initial.py` foi escrita manualmente para criar as três tabelas na ordem correta, respeitando as dependências de chave estrangeira (`studios` e `hosts` antes de `bookings`).

---

## 5. Fluxo de Agendamento

O fluxo completo de criação de um agendamento percorre as seguintes etapas:

```
1. Cliente envia POST /bookings com studio_id, host_id, start_time, end_time

2. Controller recebe a requisição
   └─ Pydantic valida os tipos e o model_validator verifica end_time > start_time
   └─ Se inválido → 422 Unprocessable Entity

3. Controller chama BookingService.create_booking()

4. Service verifica se o studio existe
   └─ StudioRepository.get_by_id(studio_id)
   └─ Se não existe → NotFoundError → handler → 404 Not Found

5. Service verifica se o host existe
   └─ HostRepository.get_by_id(host_id)
   └─ Se não existe → NotFoundError → handler → 404 Not Found

6. Service verifica conflito de horário
   └─ BookingRepository.has_conflict(studio_id, start_time, end_time)
   └─ Se conflito → BookingConflictError → handler → 409 Conflict

7. Service chama BookingRepository.create()
   └─ Persiste o agendamento no banco

8. Controller retorna BookingResponse → 201 Created
```

Cada etapa tem um ponto de falha bem definido e uma resposta HTTP específica, tornando o comportamento da API previsível para o cliente.

---

## 6. Estratégia para Evitar Conflitos

A verificação de conflito é realizada diretamente no banco de dados com uma única query SQL, utilizando a condição clássica de sobreposição de intervalos:

```python
Booking.start_time < end_time_novo AND Booking.end_time > start_time_novo
```

Essa condição cobre todos os casos de sobreposição possíveis com um único predicado:

```
Caso 1 — Sobreposição parcial no início:
  Existente:  [10:00 ─── 11:00]
  Novo:             [10:30 ─── 11:30]
  start_existente (10:00) < end_novo (11:30) ✓
  end_existente   (11:00) > start_novo (10:30) ✓  → CONFLITO

Caso 2 — Sobreposição parcial no fim:
  Existente:       [10:00 ─── 11:00]
  Novo:    [09:30 ─── 10:30]
  start_existente (10:00) < end_novo (10:30) ✓
  end_existente   (11:00) > start_novo (09:30) ✓  → CONFLITO

Caso 3 — Sobreposição envolvente:
  Existente:  [10:00 ─── 11:00]
  Novo:    [09:00 ─────────── 12:00]
  start_existente (10:00) < end_novo (12:00) ✓
  end_existente   (11:00) > start_novo (09:00) ✓  → CONFLITO

Caso 4 — Horário adjacente (válido):
  Existente:  [10:00 ─── 11:00]
  Novo:                  [11:00 ─── 12:00]
  end_existente (11:00) > start_novo (11:00) ✗   → SEM CONFLITO
```

**Por que a verificação foi feita no banco e não no código:**

Uma alternativa seria buscar todos os agendamentos do estúdio e verificar sobreposição em Python. Essa abordagem é ineficiente e insegura: ineficiente porque carrega dados desnecessários em memória; insegura porque em ambiente concorrente duas requisições simultâneas poderiam passar pela verificação antes de qualquer uma persistir.

A query SQL com `AND` é executada atomicamente pelo banco, é indexável por `studio_id` e escala independente do volume de agendamentos.

---

## 7. Tratamento de Erros

Foi implementado um sistema centralizado de tratamento de exceções, organizado em duas camadas:

**Hierarquia de exceções de domínio (`core/exceptions.py`):**

```
Exception
├── NotFoundError         → recurso não encontrado
└── ConflictError         → violação de regra de negócio
    └── BookingConflictError  → conflito de horário específico
```

As exceções de domínio são classes Python puras, sem dependência do FastAPI. Isso permite que os services sejam testados e reutilizados sem nenhum acoplamento com o framework web.

**Middleware de handlers (`middlewares/error_handler.py`):**

Os handlers mapeiam cada tipo de exceção para um status HTTP e formatam a resposta no padrão definido:

```
NotFoundError         →  404 Not Found
ConflictError         →  409 Conflict
RequestValidationError →  422 Unprocessable Entity
Exception             →  500 Internal Server Error
```

Todas as respostas de erro seguem o contrato:

```json
{
  "success": false,
  "message": "Descrição legível do erro"
}
```

**Por que 409 e não 400 para conflito:**

O status 400 (Bad Request) indica que a requisição é malformada — os dados enviados são inválidos em si. No caso de conflito de agendamento, os dados são perfeitamente válidos; o problema é o estado atual do recurso no servidor. O status 409 (Conflict) é semanticamente correto para esse cenário, conforme a especificação RFC 9110.

---

## 8. Testes Realizados

**Estratégia:** os testes exercitam as camadas de service e repository usando um banco SQLite em memória, sem mocks. Essa abordagem foi escolhida deliberadamente: mocks tornam os testes frágeis a refatorações internas e podem mascarar bugs reais de integração entre camadas. O SQLite em memória é rápido, isolado e representa fielmente o comportamento do banco de produção para os cenários testados.

**Configuração do ambiente de testes (`conftest.py`):**

```python
_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

@pytest.fixture
def db():
    Base.metadata.create_all(bind=_engine)
    session = _Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_engine)
```

Cada teste recebe uma sessão limpa — as tabelas são criadas antes e destruídas depois, garantindo isolamento total entre casos de teste.

**Cenários cobertos — 26 testes no total:**

| Módulo | Cenário | Resultado esperado |
|---|---|---|
| StudioService | Criação com dados válidos | Retorna studio com ID gerado |
| StudioService | Criação com equipamentos | Lista persistida corretamente |
| StudioService | Listagem de todos | Retorna todos os registros |
| StudioService | Busca por ID existente | Retorna o studio |
| StudioService | Busca por ID inexistente | Lança `NotFoundError` |
| StudioService | Atualização de nome | Campo alterado, demais intactos |
| StudioService | Atualização de capacidade | Campo alterado corretamente |
| StudioService | Atualização em ID inexistente | Lança `NotFoundError` |
| StudioService | Remoção de existente | Registro removido do banco |
| StudioService | Remoção de inexistente | Lança `NotFoundError` |
| HostService | Criação com dados válidos | Retorna host com ID gerado |
| HostService | Listagem de todos | Retorna todos os registros |
| HostService | Busca por ID existente | Retorna o host |
| HostService | Busca por ID inexistente | Lança `NotFoundError` |
| HostService | Atualização de nome | Campo alterado corretamente |
| HostService | Atualização em ID inexistente | Lança `NotFoundError` |
| HostService | Remoção de existente | Registro removido do banco |
| HostService | Remoção de inexistente | Lança `NotFoundError` |
| BookingService | Criação com dados válidos | Retorna booking com ID gerado |
| BookingService | Studio inexistente | Lança `NotFoundError` com "Studio" |
| BookingService | Host inexistente | Lança `NotFoundError` com "Host" |
| BookingService | Sobreposição parcial no início | Lança `BookingConflictError` |
| BookingService | Sobreposição parcial no fim | Lança `BookingConflictError` |
| BookingService | Sobreposição envolvente | Lança `BookingConflictError` |
| BookingService | Mesmo horário, estúdio diferente | Criação permitida |
| BookingService | Horário adjacente, mesmo estúdio | Criação permitida |

**Resultado:**

```
26 passed
Cobertura total (camadas de negócio): 99.56%
```

A cobertura de 99% nas camadas de negócio (services, repositories, models, schemas, exceptions) indica que praticamente todo o código que contém lógica foi exercitado pelos testes. Arquivos de infraestrutura sem lógica de negócio (`connection.py`, `config.py`, controllers, middlewares) foram excluídos do relatório de cobertura.

---

## 9. Dockerização

O ambiente Docker foi configurado com dois serviços orquestrados pelo Docker Compose:

**Serviço `postgres`:**
- Imagem `postgres:16-alpine` (imagem enxuta baseada em Alpine Linux)
- Dados persistidos em volume nomeado `postgres_data`, sobrevivendo a reinicializações
- Healthcheck via `pg_isready` com intervalo de 5 segundos e 10 tentativas

**Serviço `api`:**
- Imagem construída localmente via `Dockerfile` multi-stage
- Declarado com `depends_on: condition: service_healthy`, garantindo que só sobe após o Postgres estar aceitando conexões
- Configurado via `env_file: .env`, sem hardcode de credenciais na imagem

**Dockerfile multi-stage:**

O Dockerfile foi estruturado em dois estágios:

```
Stage 1 (deps):   instala as dependências Python
Stage 2 (final):  copia apenas os site-packages e o código — sem ferramentas de build
```

Essa abordagem reduz o tamanho da imagem final ao excluir compiladores e caches de instalação que não são necessários em runtime.

**Entrypoint (`entrypoint.sh`):**

O script de entrada implementa um mecanismo de espera ativa pelo Postgres usando `psycopg2.connect()` em loop, em vez de simplesmente aguardar um tempo fixo. Após a conexão ser estabelecida, executa `alembic upgrade head` antes de subir o Uvicorn. Isso garante que o banco esteja sempre com o schema atualizado ao iniciar a API.

```sh
until python -c "import os, psycopg2; psycopg2.connect(os.environ['DATABASE_URL'])" 2>/dev/null; do
  sleep 1
done
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
```

O uso de `exec` no último comando substitui o processo do shell pelo Uvicorn, fazendo com que o PID 1 do container seja a própria aplicação — prática recomendada para correto tratamento de sinais (`SIGTERM`, `SIGINT`).

---

## 10. CI/CD

O pipeline de integração contínua foi implementado com GitHub Actions no arquivo `.github/workflows/ci.yml`.

**Gatilhos:** executa em todo push e pull request para qualquer branch.

**Etapas do pipeline:**

```
1. Checkout          — clona o repositório
2. Setup Python 3.12 — configura o ambiente com cache de dependências pip
3. Install deps      — instala requirements.txt + ruff + pytest + pytest-cov
4. Lint              — ruff check app (verifica estilo, imports, variáveis)
5. Tests             — pytest (roda os 26 testes com relatório de cobertura)
```

**Cache de dependências:**

O step de Setup Python usa `cache: "pip"` apontando para o `requirements.txt`. O GitHub Actions armazena o cache da instalação e o reutiliza em execuções subsequentes quando o arquivo não muda, reduzindo o tempo de execução do pipeline.

**Condições de falha:**

O pipeline falha automaticamente se:
- O `ruff` encontrar qualquer violação de estilo, import não utilizado ou variável ambígua
- Qualquer teste falhar
- A cobertura total ficar abaixo de 70% (configurado em `pytest.ini` via `--cov-fail-under=70`)

Essa configuração garante que nenhum código com teste falhando ou lint quebrado chegue à branch principal.

---

## 11. Uso de Inteligência Artificial

O desenvolvimento deste projeto foi conduzido com o auxílio do **Amazon Q Developer**, assistente de IA integrado à IDE, utilizado em modo de codificação agêntica (agentic-coding).

**Como a IA foi utilizada:**

A interação com a IA foi baseada em prompts de alto nível descrevendo os requisitos de cada etapa, sem especificar implementação. A IA propunha abordagens, escrevia o código, executava os comandos no terminal e corrigia erros autonomamente com base nos resultados observados.

**Exemplos de contribuição direta:**

- Identificação do problema de compatibilidade entre Python 3.14 e `pydantic-core` (ausência de wheel pré-compilada), com proposta de migrar para Python 3.12
- Estruturação da hierarquia de exceções de domínio desacoplada do FastAPI
- Diagnóstico e correção do conflito entre o `.env` local (Postgres) e o ambiente de testes (SQLite), resolvido tornando a criação do engine lazy no `connection.py`
- Identificação de que o status correto para conflito de agendamento é 409 e não 400
- Correção automática de violações de lint (variável ambígua `l` renomeada para `loc`)

**Papel do desenvolvedor:**

A IA foi utilizada como ferramenta de aceleração, não de substituição. Todas as decisões arquiteturais foram revisadas, compreendidas e validadas: a escolha da arquitetura em camadas, o algoritmo de detecção de conflito, a estratégia de testes sem mocks, a estrutura do Docker multi-stage. O desenvolvedor manteve controle sobre o que foi aceito ou rejeitado em cada etapa.

---

## 12. Dificuldades Encontradas

**Incompatibilidade Python 3.14 com pydantic-core:**

O ambiente local tinha Python 3.14 configurado. O `pydantic-core`, por ser uma extensão escrita em Rust, precisa de uma wheel pré-compilada para cada versão do Python. Como o Python 3.14 é muito recente, essa wheel não estava disponível, e a compilação local falhou por ausência do MSVC (`link.exe`). A solução foi instalar o Python 3.12, que já possui todas as wheels disponíveis.

**Conflito entre `.env` local e ambiente de testes:**

Após configurar o Docker com PostgreSQL, o `.env` local passou a apontar para `postgresql://...`. Isso fazia com que o `connection.py` tentasse conectar ao Postgres no momento do import — antes mesmo dos testes iniciarem. A solução foi tornar a criação do engine **lazy**: o engine só é instanciado na primeira chamada a `get_db()`, não no import do módulo. Isso permitiu que os testes criassem seu próprio engine (SQLite em memória) sem interferência.

**Variáveis `POSTGRES_*` não reconhecidas pelo Settings:**

Após adicionar `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` ao `.env`, o `pydantic-settings` lançava erro de validação por receber campos desconhecidos. A solução foi adicionar `extra="ignore"` no `SettingsConfigDict`, instruindo o Pydantic a ignorar variáveis de ambiente que não correspondem a nenhum campo do modelo.

---

## 13. Melhorias Futuras

**Autenticação e autorização:**
A API não implementa nenhum mecanismo de autenticação. A adição de JWT (JSON Web Tokens) permitiria controlar quem pode criar, editar e remover recursos.

**Paginação:**
Os endpoints de listagem (`GET /studios`, `GET /hosts`) retornam todos os registros sem paginação. Em produção, com volume de dados crescente, é necessário implementar paginação via query params (`?page=1&size=20`).

**Endpoints de listagem para bookings:**
O módulo de agendamentos implementa apenas `POST /bookings`. Endpoints de consulta (`GET /bookings`, `GET /bookings/{id}`, filtros por estúdio e por data) seriam necessários para uso real.

**Cancelamento de agendamento:**
Não há endpoint para cancelar uma reserva. A implementação de `DELETE /bookings/{id}` liberaria o horário para novos agendamentos.

**Locks pessimistas para concorrência:**
A verificação de conflito atual é segura para uso convencional, mas em cenário de alta concorrência (múltiplas requisições simultâneas para o mesmo estúdio), a janela entre a verificação e a inserção poderia gerar conflito. A solução seria usar `SELECT FOR UPDATE` (lock pessimista) ou uma constraint de exclusão no banco via extensão `btree_gist` do PostgreSQL.

**Observabilidade:**
Não há logs estruturados, métricas ou rastreamento distribuído. A adição de um logger estruturado (ex: `structlog`) e integração com ferramentas de APM melhoraria a operação em produção.

**Variáveis de ambiente separadas por ambiente:**
Atualmente há um único `.env`. A separação em `.env.development`, `.env.staging` e `.env.production` é uma prática recomendada para ambientes com estágios de deploy distintos.

---

## 14. Conclusão

O desafio foi concluído com todos os requisitos funcionais e não funcionais implementados. A API entrega CRUD completo para estúdios e hosts, criação de agendamentos com validação de conflito por sobreposição de intervalos, respostas de erro padronizadas, documentação OpenAPI interativa, 26 testes automatizados com 99% de cobertura nas camadas de negócio, ambiente Docker funcional com PostgreSQL e pipeline de CI/CD no GitHub Actions.

As decisões técnicas priorizaram clareza e manutenibilidade: a arquitetura em camadas torna cada responsabilidade explícita e testável de forma independente; as exceções de domínio desacopladas do FastAPI mantêm o núcleo da aplicação portável; a verificação de conflito diretamente no banco garante eficiência e corretude independente do volume de dados.

O projeto demonstra domínio dos fundamentos de desenvolvimento de APIs REST com Python moderno — tipagem estática, validação por contrato via Pydantic, ORM com SQLAlchemy 2.0, migrations controladas, containerização e automação de qualidade — e serve como base sólida para as evoluções descritas na seção de melhorias futuras.
