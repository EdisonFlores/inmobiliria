import { useEffect, useState } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const defaultSiteSettings = {
  singleton_key: 'main',
  business_name: 'Amazonia Propiedades EC',
  tagline_es: 'Más que propiedades, un legado para tu familia.',
  home_title_es: 'Tu próximo legado comienza en la Amazonía.',
  home_subtitle_es: 'Encuentra casas, terrenos, fincas y lotes seleccionados en la Amazonía ecuatoriana.',
  about_es: 'Somos una empresa inmobiliaria comprometida con acompañarte de forma cercana y segura.',
  sell_title_es: 'Tu propiedad merece la mejor oportunidad.',
  sell_body_es: 'Nuestro equipo te acompaña desde la valoración hasta la firma.',
  phone: '',
  email: '',
  city: 'Macas, Morona Santiago',
  address: '',
  facebook_url: '',
  instagram_url: '',
  logo_url: '',
  hero_desktop_url: '',
  hero_mobile_url: '',
  about_image_url: '',
  sell_image_url: '',
  brand_primary: '#063f2d',
  brand_secondary: '#c79a3b',
  show_properties: true,
  show_success_cases: true,
  show_sell_with_us: true,
  show_advisors: true,
};

const isConfigured = Boolean(supabaseUrl && supabasePublishableKey);
const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;

export async function supabaseGet(table, params = {}, signal) {
  if (!isConfigured) throw new Error('Supabase no está configurado.');
  const query = new URLSearchParams(params);
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
      Accept: 'application/json',
    },
    signal,
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.message || `Supabase respondió ${response.status}`);
  }
  return response.json();
}

export async function createPublicClientContact(items, purpose = 'property_interest') {
  if (!isConfigured) throw new Error('Supabase no está configurado.');
  const propertyIds = items.filter(item => item.kind === 'property').map(item => item.id);
  const lotIds = items.filter(item => item.kind === 'lot').map(item => item.id);
  const isGeneralContact = items.length === 0;
  const rpcName = isGeneralContact
    ? purpose === 'seller' ? 'create_public_seller_contact' : 'create_public_general_contact'
    : 'create_public_client_contact';
  const body = isGeneralContact ? {} : {
    p_property_ids: propertyIds,
    p_lot_ids: lotIds,
    p_public_base_url: new URL(import.meta.env.BASE_URL, window.location.origin).href.replace(/\/$/, ''),
  };
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo generar el código cliente.');
  return data;
}

export function useSiteSettings() {
  const [state, setState] = useState({
    settings: defaultSiteSettings,
    loading: isConfigured,
    error: null,
  });

  useEffect(() => {
    if (!isConfigured) {
      setState((current) => ({ ...current, loading: false, error: 'Supabase no está configurado.' }));
      return;
    }

    const controller = new AbortController();
    async function loadSettings() {
      try {
        const [remoteSettings] = await supabaseGet('site_settings', {
          select: '*',
          singleton_key: 'eq.main',
        }, controller.signal);
        setState({
          settings: { ...defaultSiteSettings, ...(remoteSettings || {}) },
          loading: false,
          error: null,
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.warn('No se pudo cargar la configuración pública; se usarán valores de respaldo.', error);
        setState({ settings: defaultSiteSettings, loading: false, error: error.message });
      }
    }
    loadSettings();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--forest', safeColor(state.settings.brand_primary, defaultSiteSettings.brand_primary));
    root.style.setProperty('--gold', safeColor(state.settings.brand_secondary, defaultSiteSettings.brand_secondary));
    document.title = state.settings.business_name || defaultSiteSettings.business_name;
  }, [state.settings]);

  return state;
}

export function whatsappUrl(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  // WhatsApp requiere formato internacional sin el signo +. En Ecuador,
  // convierte automáticamente 09XXXXXXXX a 5939XXXXXXXX.
  if (/^0\d{9}$/.test(digits)) digits = `593${digits.slice(1)}`;
  return digits ? `https://wa.me/${digits}` : '#';
}
