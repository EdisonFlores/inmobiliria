const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

let scriptPromise;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`);
    const script = existing || document.createElement('script');
    const onReady = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile no pudo iniciarse.'));
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', () => reject(new Error('No se pudo cargar la verificación de seguridad.')), { once: true });
    if (!existing) {
      script.src = TURNSTILE_SCRIPT;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export async function requestTurnstileToken(lang = 'es') {
  if (!SITE_KEY) {
    throw new Error(lang === 'es'
      ? 'La protección contra spam todavía no está configurada.'
      : 'Spam protection is not configured yet.');
  }

  const turnstile = await loadTurnstile();
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.className = 'turnstile-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', lang === 'es' ? 'Verificación de seguridad' : 'Security verification');

    const card = document.createElement('section');
    card.className = 'turnstile-card';
    const heading = document.createElement('h2');
    heading.textContent = lang === 'es' ? 'Verificación de seguridad' : 'Security verification';
    const description = document.createElement('p');
    description.textContent = lang === 'es'
      ? 'Confirma que eres una persona para continuar con el asesor.'
      : 'Confirm you are human to continue with an advisor.';
    const widget = document.createElement('div');
    widget.className = 'turnstile-widget';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'turnstile-cancel';
    cancel.textContent = lang === 'es' ? 'Cancelar' : 'Cancel';

    card.append(heading, description, widget, cancel);
    overlay.append(card);
    document.body.append(overlay);
    document.body.classList.add('modal-open');

    let widgetId;
    let settled = false;
    const close = (error, token) => {
      if (settled) return;
      settled = true;
      if (widgetId !== undefined) turnstile.remove(widgetId);
      overlay.remove();
      document.body.classList.remove('modal-open');
      if (error) reject(error);
      else resolve(token);
    };

    cancel.addEventListener('click', () => close(new DOMException('Cancelado', 'AbortError')));
    overlay.addEventListener('mousedown', event => {
      if (event.target === overlay) close(new DOMException('Cancelado', 'AbortError'));
    });

    widgetId = turnstile.render(widget, {
      sitekey: SITE_KEY,
      action: 'contact',
      theme: 'auto',
      size: 'flexible',
      callback: token => close(null, token),
      'error-callback': () => close(new Error(lang === 'es'
        ? 'No se pudo completar la verificación. Inténtalo nuevamente.'
        : 'Security verification failed. Please try again.')),
      'expired-callback': () => turnstile.reset(widgetId),
    });
  });
}
