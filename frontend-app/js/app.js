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

/** Renderiza a tabela de estúdios com base em state.studios. */
function renderStudios() {
  const tbody = document.getElementById('studios-tbody');
  tbody.innerHTML = '';

  if (state.studios.length === 0) {
    setTableState('studios', 'empty');
    return;
  }

  setTableState('studios', 'table');

  state.studios.forEach(studio => {
    const tags = (studio.equipamentos || [])
      .map(e => `<span class="tag">${e}</span>`)
      .join('') || '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${studio.id}</td>
      <td>${studio.nome}</td>
      <td>${studio.capacidade}</td>
      <td>${tags}</td>
      <td>
        <button class="btn btn--icon" data-action="edit-studio" data-id="${studio.id}" title="Editar">✏️</button>
        <button class="btn btn--icon" data-action="delete-studio" data-id="${studio.id}" title="Remover">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/** Busca os estúdios na API e atualiza o estado e a UI. */
async function loadStudios() {
  setTableState('studios', 'loading');
  try {
    state.studios = await StudiosAPI.getAll();
    renderStudios();
  } catch (err) {
    setTableState('studios', 'empty');
    showToast(err.message, 'error');
  }
}

/** Abre o formulário de estúdio para criação. */
function openStudioFormCreate() {
  state.editingStudioId = null;
  document.getElementById('form-studio-title').textContent = 'Novo estúdio';
  document.getElementById('studio-form').reset();
  clearFieldErrors(document.getElementById('studio-form'));
  document.getElementById('form-studio').classList.remove('hidden');
}

/** Abre o formulário de estúdio pré-preenchido para edição. */
function openStudioFormEdit(id) {
  const studio = state.studios.find(s => s.id === id);
  if (!studio) return;

  state.editingStudioId = id;
  document.getElementById('form-studio-title').textContent = 'Editar estúdio';
  document.getElementById('studio-nome').value = studio.nome;
  document.getElementById('studio-capacidade').value = studio.capacidade;
  document.getElementById('studio-equipamentos').value = (studio.equipamentos || []).join(', ');
  clearFieldErrors(document.getElementById('studio-form'));
  document.getElementById('form-studio').classList.remove('hidden');
}

function closeStudioForm() {
  document.getElementById('form-studio').classList.add('hidden');
  state.editingStudioId = null;
}

/** Coleta e valida os dados do formulário de estúdio. */
function getStudioFormData() {
  const nome       = document.getElementById('studio-nome').value.trim();
  const capacidade = parseInt(document.getElementById('studio-capacidade').value, 10);
  const equip      = document.getElementById('studio-equipamentos').value;
  const equipamentos = equip ? equip.split(',').map(e => e.trim()).filter(Boolean) : [];

  let valid = true;
  clearFieldErrors(document.getElementById('studio-form'));

  if (nome.length < 2) {
    setFieldError('err-studio-nome', 'O nome deve ter pelo menos 2 caracteres.');
    valid = false;
  }
  if (!capacidade || capacidade < 1) {
    setFieldError('err-studio-capacidade', 'Informe uma capacidade maior que zero.');
    valid = false;
  }

  return valid ? { nome, capacidade, equipamentos } : null;
}

function initStudiosHandlers() {
  // Botão "Novo estúdio"
  document.getElementById('btn-new-studio').addEventListener('click', openStudioFormCreate);

  // Botão "Cancelar" no formulário
  document.getElementById('btn-cancel-studio').addEventListener('click', closeStudioForm);

  // Submit do formulário
  document.getElementById('studio-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = getStudioFormData();
    if (!payload) return;

    try {
      if (state.editingStudioId) {
        await StudiosAPI.update(state.editingStudioId, payload);
        showToast('Estúdio atualizado!', 'success');
      } else {
        await StudiosAPI.create(payload);
        showToast('Estúdio criado!', 'success');
      }
      closeStudioForm();
      loadStudios();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Delegação de eventos na tabela (editar / remover)
  document.getElementById('studios-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id = parseInt(btn.dataset.id, 10);

    if (btn.dataset.action === 'edit-studio') {
      openStudioFormEdit(id);
    }

    if (btn.dataset.action === 'delete-studio') {
      openConfirmModal(async () => {
        try {
          await StudiosAPI.remove(id);
          showToast('Estúdio removido.', 'success');
          loadStudios();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  });
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

  // Garante que studios e hosts estão carregados para resolver os nomes
  try {
    if (state.studios.length === 0) state.studios = await StudiosAPI.getAll();
    if (state.hosts.length === 0)   state.hosts   = await HostsAPI.getAll();
  } catch (_) { /* ignora — nomes serão exibidos como IDs */ }

  // Bookings ainda não tem endpoint GET — exibe estado vazio com aviso
  setTableState('bookings', 'empty');
  document.getElementById('bookings-empty').textContent =
    'Nenhum agendamento encontrado. Crie um novo agendamento acima.';
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
  const studio_id  = parseInt(document.getElementById('booking-studio').value, 10);
  const host_id    = parseInt(document.getElementById('booking-host').value,   10);
  const start_time = document.getElementById('booking-start').value;
  const end_time   = document.getElementById('booking-end').value;

  let valid = true;
  clearFieldErrors(document.getElementById('booking-form'));

  if (!studio_id) { setFieldError('err-booking-studio', 'Selecione um estúdio.'); valid = false; }
  if (!host_id)   { setFieldError('err-booking-host',   'Selecione um host.');    valid = false; }
  if (!start_time){ setFieldError('err-booking-start',  'Informe o início.');     valid = false; }
  if (!end_time)  { setFieldError('err-booking-end',    'Informe o término.');    valid = false; }

  if (valid && end_time <= start_time) {
    setFieldError('err-booking-end', 'O término deve ser posterior ao início.');
    valid = false;
  }

  if (!valid) return null;

  // Converte datetime-local (sem fuso) para ISO 8601
  return {
    studio_id,
    host_id,
    start_time: new Date(start_time).toISOString(),
    end_time:   new Date(end_time).toISOString(),
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
