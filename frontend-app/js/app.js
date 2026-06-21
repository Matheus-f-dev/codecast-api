/**
 * app.js — Controlador principal da interface
 *
 * Responsabilidades:
 *  - Navegação entre seções (studios / hosts / bookings)
 *  - Controle de estado local (qual item está sendo editado, etc.)
 *  - Renderização das tabelas
 *  - Exibição de formulários, toast e modal de confirmação
 *  - Delegação das chamadas à API (via api.js)
 *
 * Separação de responsabilidades:
 *  - api.js  → faz as requisições HTTP
 *  - app.js  → controla a UI e reage aos dados
 */

/* ─────────────────────────────────────────────────────────────────────────
   Estado da aplicação
───────────────────────────────────────────────────────────────────────── */
const state = {
  studios:  [],   // cache local da lista de estúdios
  hosts:    [],   // cache local da lista de hosts
  bookings: [],   // cache local da lista de agendamentos

  // Controle de edição (null = criação, número = ID sendo editado)
  editingStudioId: null,
  editingHostId:   null,

  // Callback pendente do modal de confirmação
  pendingDeleteFn: null,
};

/* ─────────────────────────────────────────────────────────────────────────
   Utilitários de UI
───────────────────────────────────────────────────────────────────────── */

/**
 * Exibe uma mensagem temporária no canto inferior direito.
 * @param {string} message - Texto da mensagem
 * @param {'success'|'error'|'info'} type - Tipo visual
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast--${type} toast--visible`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('toast--visible'), 3500);
}

/**
 * Abre o modal de confirmação de exclusão.
 * @param {Function} onConfirm - Função executada ao confirmar
 */
function openConfirmModal(onConfirm) {
  state.pendingDeleteFn = onConfirm;
  document.getElementById('modal-confirm').classList.remove('hidden');
}

function closeConfirmModal() {
  state.pendingDeleteFn = null;
  document.getElementById('modal-confirm').classList.add('hidden');
}

/**
 * Exibe ou oculta os três estados de uma tabela: loading, empty, table.
 * @param {string} prefix - 'studios' | 'hosts' | 'bookings'
 * @param {'loading'|'empty'|'table'} show - Estado a exibir
 */
function setTableState(prefix, show) {
  document.getElementById(`${prefix}-loading`).classList.toggle('hidden', show !== 'loading');
  document.getElementById(`${prefix}-empty`).classList.toggle('hidden',   show !== 'empty');
  document.getElementById(`${prefix}-table`).classList.toggle('hidden',   show !== 'table');
}

/** Limpa as mensagens de erro de campo de um formulário. */
function clearFieldErrors(formEl) {
  formEl.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

/** Define a mensagem de erro de um campo específico. */
function setFieldError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

/**
 * Formata uma string ISO 8601 para exibição amigável.
 * Ex: "2025-01-15T10:00:00" → "15/01/2025 10:00"
 */
function formatDatetime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/* ─────────────────────────────────────────────────────────────────────────
   Navegação entre seções
───────────────────────────────────────────────────────────────────────── */
function initNavigation() {
  const btns = document.querySelectorAll('.nav__btn');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.section;

      // Atualiza botões
      btns.forEach(b => b.classList.toggle('nav__btn--active', b === btn));

      // Alterna seções
      document.querySelectorAll('.section').forEach(sec => {
        sec.classList.toggle('section--active', sec.id === `section-${target}`);
        sec.classList.toggle('hidden', sec.id !== `section-${target}`);
      });

      // Carrega dados da seção ao entrar nela
      if (target === 'studios')  loadStudios();
      if (target === 'hosts')    loadHosts();
      if (target === 'bookings') loadBookings();
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Estúdios
───────────────────────────────────────────────────────────────────────── */

/**
 * Define qual bloco da seção de estúdios está visível.
 * @param {'loading'|'error'|'empty'|'grid'} state
 */
function setStudiosState(show) {
  document.getElementById('studios-loading').classList.toggle('hidden', show !== 'loading');
  document.getElementById('studios-error').classList.toggle('hidden',   show !== 'error');
  document.getElementById('studios-empty').classList.toggle('hidden',   show !== 'empty');
  document.getElementById('studios-grid').classList.toggle('hidden',    show !== 'grid');
}

/**
 * Gera o HTML de um card de estúdio.
 * A barra de capacidade usa um máximo de referência de 20 pessoas.
 */
function buildStudioCard(studio) {
  const MAX_CAP = 20;
  const fillPct = Math.min((studio.capacidade / MAX_CAP) * 100, 100);

  const tagsHtml = (studio.equipamentos || []).length
    ? studio.equipamentos.map(e => `<span class="tag">${e}</span>`).join('')
    : '<span class="studio-card__no-equip">Nenhum equipamento cadastrado</span>';

  const card = document.createElement('article');
  card.className = 'studio-card';
  card.innerHTML = `
    <div class="studio-card__header">
      <div class="studio-card__icon">🎧</div>
      <h2 class="studio-card__name">${studio.nome}</h2>
    </div>

    <div class="studio-card__meta">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>${studio.capacidade} pessoa${studio.capacidade !== 1 ? 's' : ''}</span>
      <div class="studio-card__capacity-bar">
        <div class="studio-card__capacity-fill" style="width: ${fillPct}%"></div>
      </div>
    </div>

    <div class="studio-card__divider"></div>

    <div>
      <p class="studio-card__equip-label">Equipamentos</p>
      <div class="studio-card__tags">${tagsHtml}</div>
    </div>
  `;
  return card;
}

/** Renderiza os cards de estúdios com base em state.studios. */
function renderStudios() {
  if (state.studios.length === 0) {
    setStudiosState('empty');
    return;
  }

  const grid = document.getElementById('studios-grid');
  grid.innerHTML = '';
  state.studios.forEach(studio => grid.appendChild(buildStudioCard(studio)));
  setStudiosState('grid');
}

/** Busca os estúdios na API, atualiza o estado e renderiza. */
async function loadStudios() {
  setStudiosState('loading');
  try {
    state.studios = await StudiosAPI.getAll();
    renderStudios();
  } catch (err) {
    // Exibe o estado de erro com a mensagem retornada pela API (ou rede)
    document.getElementById('studios-error-msg').textContent = err.message;
    setStudiosState('error');
  }
}

/** Registra os handlers da seção de estúdios. */
function initStudiosHandlers() {
  // Botão "Atualizar" no cabeçalho da seção
  document.getElementById('btn-refresh-studios').addEventListener('click', loadStudios);

  // Botão "Tentar novamente" no estado de erro
  document.getElementById('btn-retry-studios').addEventListener('click', loadStudios);
}

/* ─────────────────────────────────────────────────────────────────────────
   Hosts
───────────────────────────────────────────────────────────────────────── */

function renderHosts() {
  const tbody = document.getElementById('hosts-tbody');
  tbody.innerHTML = '';

  if (state.hosts.length === 0) {
    setTableState('hosts', 'empty');
    return;
  }

  setTableState('hosts', 'table');

  state.hosts.forEach(host => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${host.id}</td>
      <td>${host.nome}</td>
      <td>
        <button class="btn btn--icon" data-action="edit-host" data-id="${host.id}" title="Editar">✏️</button>
        <button class="btn btn--icon" data-action="delete-host" data-id="${host.id}" title="Remover">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadHosts() {
  setTableState('hosts', 'loading');
  try {
    state.hosts = await HostsAPI.getAll();
    renderHosts();
  } catch (err) {
    setTableState('hosts', 'empty');
    showToast(err.message, 'error');
  }
}

function openHostFormCreate() {
  state.editingHostId = null;
  document.getElementById('form-host-title').textContent = 'Novo host';
  document.getElementById('host-form').reset();
  clearFieldErrors(document.getElementById('host-form'));
  document.getElementById('form-host').classList.remove('hidden');
}

function openHostFormEdit(id) {
  const host = state.hosts.find(h => h.id === id);
  if (!host) return;

  state.editingHostId = id;
  document.getElementById('form-host-title').textContent = 'Editar host';
  document.getElementById('host-nome').value = host.nome;
  clearFieldErrors(document.getElementById('host-form'));
  document.getElementById('form-host').classList.remove('hidden');
}

function closeHostForm() {
  document.getElementById('form-host').classList.add('hidden');
  state.editingHostId = null;
}

function getHostFormData() {
  const nome = document.getElementById('host-nome').value.trim();
  clearFieldErrors(document.getElementById('host-form'));

  if (nome.length < 2) {
    setFieldError('err-host-nome', 'O nome deve ter pelo menos 2 caracteres.');
    return null;
  }

  return { nome };
}

function initHostsHandlers() {
  document.getElementById('btn-new-host').addEventListener('click', openHostFormCreate);
  document.getElementById('btn-cancel-host').addEventListener('click', closeHostForm);

  document.getElementById('host-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = getHostFormData();
    if (!payload) return;

    try {
      if (state.editingHostId) {
        await HostsAPI.update(state.editingHostId, payload);
        showToast('Host atualizado!', 'success');
      } else {
        await HostsAPI.create(payload);
        showToast('Host criado!', 'success');
      }
      closeHostForm();
      loadHosts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('hosts-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id = parseInt(btn.dataset.id, 10);

    if (btn.dataset.action === 'edit-host')   openHostFormEdit(id);

    if (btn.dataset.action === 'delete-host') {
      openConfirmModal(async () => {
        try {
          await HostsAPI.remove(id);
          showToast('Host removido.', 'success');
          loadHosts();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Bookings
───────────────────────────────────────────────────────────────────────── */

function renderBookings() {
  const tbody = document.getElementById('bookings-tbody');
  tbody.innerHTML = '';

  if (state.bookings.length === 0) {
    setTableState('bookings', 'empty');
    return;
  }

  setTableState('bookings', 'table');

  state.bookings.forEach(b => {
    const studioName = state.studios.find(s => s.id === b.studio_id)?.nome ?? b.studio_id;
    const hostName   = state.hosts.find(h => h.id === b.host_id)?.nome   ?? b.host_id;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.id}</td>
      <td>${studioName}</td>
      <td>${hostName}</td>
      <td>${formatDatetime(b.start_time)}</td>
      <td>${formatDatetime(b.end_time)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/** Popula os <select> do formulário de booking com dados do estado atual. */
function populateBookingSelects() {
  const studioSel = document.getElementById('booking-studio');
  const hostSel   = document.getElementById('booking-host');

  studioSel.innerHTML = '<option value="">Selecione um estúdio</option>';
  hostSel.innerHTML   = '<option value="">Selecione um host</option>';

  state.studios.forEach(s => {
    studioSel.insertAdjacentHTML('beforeend', `<option value="${s.id}">${s.nome}</option>`);
  });

  state.hosts.forEach(h => {
    hostSel.insertAdjacentHTML('beforeend', `<option value="${h.id}">${h.nome}</option>`);
  });
}

async function loadBookings() {
  setTableState('bookings', 'loading');

  try {
    if (state.studios.length === 0) state.studios = await StudiosAPI.getAll();
    if (state.hosts.length === 0)   state.hosts   = await HostsAPI.getAll();
  } catch (_) { /* ignora — nomes serão exibidos como IDs */ }

  try {
    state.bookings = await BookingsAPI.getAll();
    renderBookings();
  } catch (err) {
    setTableState('bookings', 'empty');
  }
}

async function openBookingForm() {
  // Garante que os selects têm dados atualizados
  if (state.studios.length === 0) state.studios = await StudiosAPI.getAll().catch(() => []);
  if (state.hosts.length === 0)   state.hosts   = await HostsAPI.getAll().catch(() => []);

  populateBookingSelects();
  document.getElementById('booking-form').reset();
  clearFieldErrors(document.getElementById('booking-form'));
  document.getElementById('form-booking').classList.remove('hidden');
}

function closeBookingForm() {
  document.getElementById('form-booking').classList.add('hidden');
}

function getBookingFormData() {
  const studio_id = parseInt(document.getElementById('booking-studio').value, 10);
  const host_id   = parseInt(document.getElementById('booking-host').value,   10);
  const date      = document.getElementById('booking-date').value;
  const startTime = document.getElementById('booking-start').value;
  const endTime   = document.getElementById('booking-end').value;

  let valid = true;
  clearFieldErrors(document.getElementById('booking-form'));

  if (!studio_id) { setFieldError('err-booking-studio', 'Selecione um estúdio.'); valid = false; }
  if (!host_id)   { setFieldError('err-booking-host',   'Selecione um host.');    valid = false; }
  if (!date)      { setFieldError('err-booking-date',   'Informe a data.');       valid = false; }
  if (!startTime) { setFieldError('err-booking-start',  'Informe a hora de início.'); valid = false; }
  if (!endTime)   { setFieldError('err-booking-end',    'Informe a hora de fim.'); valid = false; }

  if (valid && endTime <= startTime) {
    setFieldError('err-booking-end', 'O término deve ser posterior ao início.');
    valid = false;
  }

  if (!valid) return null;

  return {
    studio_id,
    host_id,
    start_time: new Date(`${date}T${startTime}`).toISOString(),
    end_time:   new Date(`${date}T${endTime}`).toISOString(),
  };
}

function initBookingsHandlers() {
  document.getElementById('btn-new-booking').addEventListener('click', openBookingForm);
  document.getElementById('btn-cancel-booking').addEventListener('click', closeBookingForm);

  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = getBookingFormData();
    if (!payload) return;

    try {
      const booking = await BookingsAPI.create(payload);
      state.bookings.push(booking);
      showToast('Agendamento criado!', 'success');
      closeBookingForm();
      renderBookings();
    } catch (err) {
      // Conflito de horário → 409
      const msg = err.status === 409
        ? `Conflito de horário: ${err.message}`
        : err.message;
      showToast(msg, 'error');
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Modal de confirmação — handlers globais
───────────────────────────────────────────────────────────────────────── */
function initModalHandlers() {
  document.getElementById('modal-confirm-ok').addEventListener('click', async () => {
    if (state.pendingDeleteFn) await state.pendingDeleteFn();
    closeConfirmModal();
  });

  document.getElementById('modal-confirm-cancel').addEventListener('click', closeConfirmModal);

  // Fecha ao clicar no overlay
  document.getElementById('modal-confirm').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeConfirmModal();
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Inicialização
───────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initStudiosHandlers();
  initHostsHandlers();
  initBookingsHandlers();
  initModalHandlers();

  // Carrega a seção inicial
  loadStudios();
});
