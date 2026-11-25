(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const turnstileTokens = {};
  const turnstileIds = {};
  let turnstileEnabled = false;

  function tomorrowToronto() {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const date = new Date(today + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  }

  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = tomorrowToronto();
  });
  el('year').textContent = new Date().getFullYear();

  const menu = document.querySelector('.nav-toggle');
  const nav = el('primary-nav');
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? '✕' : '☰';
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = '☰';
  }));

  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(chip => {
      chip.classList.toggle('active', chip === button);
      chip.setAttribute('aria-pressed', String(chip === button));
    });
    document.querySelectorAll('.package-card').forEach(card => {
      card.hidden = selected !== 'all' && card.dataset.category !== selected;
    });
  }));

  document.querySelectorAll('.request-package').forEach(button => button.addEventListener('click', () => {
    el('event-package').value = button.dataset.package;
    el('request').scrollIntoView({ behavior: 'smooth', block: 'start' });
    el('event-package').focus({ preventScroll: true });
  }));

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', ...options });
    let result = {};
    try { result = await response.json(); } catch {}
    if (!response.ok) throw new Error(result.error || 'Sorry, something went wrong. Please try again.');
    return result;
  }

  function showError(message) {
    const error = el('event-error');
    error.textContent = message;
    error.hidden = false;
  }

  function resetTurnstile() {
    if (turnstileEnabled && window.turnstile && turnstileIds.event != null) {
      window.turnstile.reset(turnstileIds.event);
      turnstileTokens.event = '';
    }
  }

  async function setupTurnstile() {
    let config;
    try { config = await api('/api/config'); } catch { return; }
    if (!config.turnstileSiteKey) return;
    turnstileEnabled = true;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      const container = document.querySelector('[data-turnstile="event"]');
      if (!container) return;
      turnstileIds.event = window.turnstile.render(container, {
        sitekey: config.turnstileSiteKey,
        theme: 'light',
        callback: token => { turnstileTokens.event = token; },
        'expired-callback': () => { turnstileTokens.event = ''; },
        'error-callback': () => { turnstileTokens.event = ''; }
      });
    };
    document.head.append(script);
  }

  el('event-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    el('event-error').hidden = true;
    if (!form.reportValidity()) return;
    if (turnstileEnabled && !turnstileTokens.event) {
      showError('Please complete the security check.');
      return;
    }
    const body = {
      ...Object.fromEntries(new FormData(form)),
      turnstileToken: turnstileTokens.event || ''
    };
    const button = form.querySelector('button[type="submit"]');
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Sending your request…';
    try {
      await api('/api/request-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      form.hidden = true;
      const success = el('event-success');
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      showError(error.message);
      resetTurnstile();
    } finally {
      button.innerHTML = originalLabel;
      if (!form.hidden) button.disabled = false;
    }
  });

  setupTurnstile();
})();
