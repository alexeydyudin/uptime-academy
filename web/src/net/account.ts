import { toast } from '../game/state';
import { api } from './api';
import { disablePush, enablePush, pushSupported } from './push';
import { login, logout, register, reloadMe, session } from './sync';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function renderButton(): void {
  const b = el<HTMLButtonElement>('acctBtn');
  const me = session.me;
  b.textContent = me ? me.name.slice(0, 1).toUpperCase() : 'Войти';
  b.classList.toggle('avatar', !!me);
  b.setAttribute('aria-label', me ? `Аккаунт ${me.name}` : 'Войти или зарегистрироваться');
}

function hours(selected: number): string {
  return Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === selected ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('');
}

function renderModal(mode: 'login' | 'register'): void {
  const body = el<HTMLDivElement>('acctBody');
  const me = session.me;
  if (me) {
    body.innerHTML = `
      <h2>${escapeHtml(me.name)}</h2>
      <p class="muted">${escapeHtml(me.email)} · прогресс синхронизируется между устройствами</p>
      ${me.isAdmin ? '<p class="muted"><b>Режим админа:</b> все уроки открыты, жизни не тратятся.</p>' : ''}
      <div class="field"><label for="remindHour">Когда утке напоминать</label>
        <select id="remindHour">${hours(me.remindHour)}</select>
        <small>Часовой пояс: ${escapeHtml(me.tz)}. В 23:00 будет ещё «последний шанс», если серия под угрозой.</small></div>
      <div class="row">
        ${
          me.pushEnabled
            ? '<button class="btn ghost" id="pushOff">Выключить уведомления</button><button class="btn ghost" id="pushTest">Тест</button>'
            : `<button class="btn ok" id="pushOn" ${pushSupported() ? '' : 'disabled'}>Включить уведомления утки</button>`
        }
      </div>
      ${pushSupported() ? '' : '<small class="muted">Этот браузер не умеет push. На iPhone добавь сайт на экран «Домой» и открой оттуда.</small>'}
      <div class="row end"><button class="btn ghost" id="logout">Выйти</button><button class="btn" id="acctClose">Готово</button></div>`;
    el('remindHour').onchange = async (e) => {
      await api.patch('/api/me', { remindHour: Number((e.target as HTMLSelectElement).value) });
      await reloadMe();
      toast('Время напоминаний сохранено');
    };
    const on = document.getElementById('pushOn');
    if (on) on.onclick = () => run(async () => { await enablePush(); await reloadMe(); toast('Уведомления включены'); });
    const off = document.getElementById('pushOff');
    if (off) off.onclick = () => run(async () => { await disablePush(); await reloadMe(); });
    const test = document.getElementById('pushTest');
    if (test) test.onclick = () => run(async () => { const r = await api.post<{ sent: number }>('/api/push/test'); toast(r.sent ? 'Отправлено, проверь уведомления' : 'Подписок нет, включи уведомления заново'); });
    el('logout').onclick = () => run(async () => { await logout(); close(); });
    el('acctClose').onclick = close;
    return;
  }
  const reg = mode === 'register';
  body.innerHTML = `
    <h2>${reg ? 'Новый аккаунт' : 'Вход'}</h2>
    <p class="muted">Аккаунт нужен для синхронизации, живой лиги и напоминаний. Играть можно и без него.</p>
    <form id="acctForm" novalidate>
      ${reg ? '<div class="field"><label for="fName">Имя в лиге</label><input id="fName" autocomplete="nickname" maxlength="32" required></div>' : ''}
      <div class="field"><label for="fEmail">Почта</label><input id="fEmail" type="email" autocomplete="email" required></div>
      <div class="field"><label for="fPass">Пароль</label><input id="fPass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" minlength="8" required>${reg ? '<small>Минимум 8 символов</small>' : ''}</div>
      <p class="err" id="fErr" hidden></p>
      <div class="row end"><button type="button" class="btn ghost" id="acctClose">Отмена</button><button class="btn" type="submit">${reg ? 'Создать' : 'Войти'}</button></div>
    </form>
    <p class="muted switch">${reg ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?'} <button class="link" id="acctSwitch">${reg ? 'Войти' : 'Зарегистрироваться'}</button></p>`;
  el('acctSwitch').onclick = () => renderModal(reg ? 'login' : 'register');
  el('acctClose').onclick = close;
  el<HTMLFormElement>('acctForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = el<HTMLInputElement>('fEmail').value;
    const pass = el<HTMLInputElement>('fPass').value;
    const err = el<HTMLParagraphElement>('fErr');
    err.hidden = true;
    try {
      if (reg) await register(el<HTMLInputElement>('fName').value, email, pass);
      else await login(email, pass);
      toast(reg ? 'Аккаунт создан. Прогресс перенесён.' : 'С возвращением');
      renderModal('login');
    } catch (ex) {
      err.textContent = (ex as Error).message;
      err.hidden = false;
    }
  };
}

async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    renderModal('login');
  } catch (e) {
    toast((e as Error).message);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function open(): void {
  renderModal('login');
  el('acctModal').hidden = false;
}
function close(): void {
  el('acctModal').hidden = true;
}

export function initAccount(): void {
  el('acctBtn').onclick = open;
  el('acctModal').onclick = (e) => {
    if (e.target === e.currentTarget) close();
  };
  session.onChange(renderButton);
  renderButton();
}
