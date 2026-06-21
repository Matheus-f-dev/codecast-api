/**
 * api.js — Camada de comunicação com a Codecast API
 *
 * Responsabilidades:
 *  - Centralizar a URL base e os headers padrão
 *  - Abstrair fetch com tratamento de erros HTTP
 *  - Expor métodos semânticos por recurso (studios, hosts, bookings)
 *
 * Não contém lógica de UI. Não manipula o DOM.
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * Realiza uma requisição HTTP e trata erros de forma padronizada.
 * Lança um objeto { status, message } em caso de falha.
 *
 * @param {string} endpoint - Caminho relativo, ex: "/studios"
 * @param {RequestInit} options - Opções do fetch (method, body, etc.)
 * @returns {Promise<any>} Corpo da resposta em JSON (ou null para 204)
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = { 'Content-Type': 'application/json' };

  const response = await fetch(url, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  // 204 No Content não possui corpo
  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    // A API retorna { success: false, message: "..." } nos erros
    const message = data?.message || `Erro ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

/* ─────────────────────────────────────────────────────────────────────────
   Studios
───────────────────────────────────────────────────────────────────────── */
const StudiosAPI = {
  /** GET /studios — Lista todos os estúdios */
  getAll: () => request('/studios'),

  /** GET /studios/:id — Busca um estúdio por ID */
  getById: (id) => request(`/studios/${id}`),

  /** POST /studios — Cria um novo estúdio */
  create: (payload) => request('/studios', { method: 'POST', body: JSON.stringify(payload) }),

  /** PUT /studios/:id — Atualiza um estúdio existente */
  update: (id, payload) => request(`/studios/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  /** DELETE /studios/:id — Remove um estúdio */
  remove: (id) => request(`/studios/${id}`, { method: 'DELETE' }),
};

/* ─────────────────────────────────────────────────────────────────────────
   Hosts
───────────────────────────────────────────────────────────────────────── */
const HostsAPI = {
  /** GET /hosts — Lista todos os hosts */
  getAll: () => request('/hosts'),

  /** GET /hosts/:id — Busca um host por ID */
  getById: (id) => request(`/hosts/${id}`),

  /** POST /hosts — Cria um novo host */
  create: (payload) => request('/hosts', { method: 'POST', body: JSON.stringify(payload) }),

  /** PUT /hosts/:id — Atualiza um host existente */
  update: (id, payload) => request(`/hosts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  /** DELETE /hosts/:id — Remove um host */
  remove: (id) => request(`/hosts/${id}`, { method: 'DELETE' }),
};

/* ─────────────────────────────────────────────────────────────────────────
   Bookings
───────────────────────────────────────────────────────────────────────── */
const BookingsAPI = {
  /** POST /bookings — Cria um novo agendamento */
  create: (payload) => request('/bookings', { method: 'POST', body: JSON.stringify(payload) }),
};
