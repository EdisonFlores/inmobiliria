const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const PRIVACY_POLICY_VERSION = '2026-09-11';

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
      ? 'Antes de generar tu código de cliente, acepta la política y completa la verificación.'
      : 'Before generating your client code, accept the policy and complete the verification.';
    const consent = document.createElement('label');
    consent.className = 'privacy-consent';
    const consentInput = document.createElement('input');
    consentInput.type = 'checkbox';
    consentInput.required = true;
    const consentText = document.createElement('span');
    consentText.append(lang === 'es' ? 'Acepto la ' : 'I accept the ');
    const privacyLink = document.createElement('a');
    privacyLink.href = `${import.meta.env.BASE_URL}politica-de-privacidad`;
    privacyLink.target = '_blank';
    privacyLink.rel = 'noopener noreferrer';
    privacyLink.textContent = lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy';
    consentText.append(privacyLink, lang === 'es'
      ? ' para el tratamiento de mi código de cliente y mi interés inmobiliario.'
      : ' for processing my client code and real estate interest.');
    consent.append(consentInput, consentText);
    const verifyButton = document.createElement('button');
    verifyButton.type = 'button';
    verifyButton.className = 'turnstile-continue privacy-verify';
    verifyButton.disabled = true;
    verifyButton.textContent = lang === 'es' ? 'Aceptar y verificar' : 'Accept and verify';
    const widget = document.createElement('div');
    widget.className = 'turnstile-widget privacy-widget';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'turnstile-cancel';
    cancel.textContent = lang === 'es' ? 'Cancelar' : 'Cancel';

    card.append(heading, description, consent, verifyButton, widget, cancel);
    overlay.append(card);
    document.body.append(overlay);
    document.body.classList.add('modal-open');

    let widgetId;
    let settled = false;
    let verificationStarted = false;
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
    consentInput.addEventListener('change', () => {
      verifyButton.disabled = !consentInput.checked;
    });
    verifyButton.addEventListener('click', () => {
      if (!consentInput.checked || verificationStarted) return;
      verificationStarted = true;
      consentInput.disabled = true;
      verifyButton.disabled = true;
      verifyButton.textContent = lang === 'es' ? 'Completa la verificación' : 'Complete verification';
      widget.classList.add('visible');
      widgetId = turnstile.render(widget, {
        sitekey: SITE_KEY,
        action: 'contact',
        theme: 'auto',
        size: 'flexible',
        callback: token => close(null, {
          token,
          privacyAccepted: true,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        }),
        'error-callback': () => close(new Error(lang === 'es'
          ? 'No se pudo completar la verificación. Inténtalo nuevamente.'
          : 'Security verification failed. Please try again.')),
        'expired-callback': () => turnstile.reset(widgetId),
      });
    });
  });
}

export function openVerifiedContactWindow(lang = 'es') {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.className = 'turnstile-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', lang === 'es' ? 'Continuar a WhatsApp' : 'Continue to WhatsApp');

    const card = document.createElement('section');
    card.className = 'turnstile-card turnstile-success';
    const badge = document.createElement('span');
    badge.className = 'turnstile-success-badge';
    badge.textContent = '✓';
    const heading = document.createElement('h2');
    heading.textContent = lang === 'es' ? 'Verificación completada' : 'Verification complete';
    const description = document.createElement('p');
    description.textContent = lang === 'es'
      ? 'Ahora puedes continuar y comunicarte con el asesor por WhatsApp.'
      : 'You can now continue and contact the advisor on WhatsApp.';
    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'turnstile-continue';
    continueButton.textContent = lang === 'es' ? 'Continuar a WhatsApp' : 'Continue to WhatsApp';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'turnstile-cancel';
    cancel.textContent = lang === 'es' ? 'Cancelar' : 'Cancel';

    card.append(badge, heading, description, continueButton, cancel);
    overlay.append(card);
    document.body.append(overlay);
    document.body.classList.add('modal-open');

    let settled = false;
    const close = (error, popup) => {
      if (settled) return;
      settled = true;
      overlay.remove();
      document.body.classList.remove('modal-open');
      if (error) reject(error);
      else resolve(popup);
    };
    const cancelFlow = () => close(new DOMException('Cancelado', 'AbortError'));

    continueButton.addEventListener('click', () => {
      const popup = window.open('about:blank', '_blank');
      if (!popup) {
        close(new Error(lang === 'es'
          ? 'El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes e inténtalo nuevamente.'
          : 'The browser blocked the new tab. Allow pop-ups and try again.'));
        return;
      }
      popup.document.title = lang === 'es' ? 'Preparando contacto…' : 'Preparing contact…';
      popup.document.body.innerHTML = `<p style="font:16px system-ui;padding:30px">${lang === 'es' ? 'Generando código cliente y asignando asesor…' : 'Generating client code and assigning advisor…'}</p>`;
      popup.opener = null;
      close(null, popup);
    });
    cancel.addEventListener('click', cancelFlow);
    overlay.addEventListener('mousedown', event => {
      if (event.target === overlay) cancelFlow();
    });
  });
}
