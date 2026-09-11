import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'pannellum';
import 'pannellum/build/pannellum.css';
import amazoniaBanner from '../assets/amazonia-banner.png';
import {
  AlertCircle, ArrowLeft, ArrowRight, Bath, BedDouble, Bot, Building2, Calendar, Camera, Car, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, FileCheck2,
  Heart, Languages, LandPlot, Mail, MapPin, Menu, MessageCircle, Mic, Phone,
  Maximize2, Moon, Play, Rotate3D, RotateCcw, Ruler, Search, ShieldCheck,
  ShoppingBag, SlidersHorizontal, Sparkles, Sun, Trash2, Trees, Volume2, VolumeX, X,
  MousePointerClick,
} from 'lucide-react';
import './styles.css';
import { createPublicClientContact, useSiteSettings, whatsappUrl } from './site-settings';
import { usePublishedProperties, usePublicProperty, usePublicSuccessCases } from './public-data';

const BASE_URL = import.meta.env.BASE_URL;
const images = { 'amazonia-banner.png': amazoniaBanner };
const asset = (name) => images[name];
const propertyTypeLabels = {
  house: ['Casa', 'House'], apartment: ['Departamento', 'Apartment'], land: ['Terreno', 'Land'],
  farm: ['Finca', 'Farm'], lot: ['Lote', 'Lot'], subdivision: ['Lotización', 'Subdivision'],
  commercial: ['Local comercial', 'Commercial property'], office: ['Oficina', 'Office'],
  warehouse: ['Bodega', 'Warehouse'], other: ['Otro', 'Other'],
};
const propertyTypeLabel = (type, lang) => (propertyTypeLabels[type] || propertyTypeLabels.other)[lang === 'es' ? 0 : 1];
const pageUrl = (path = '/') => `${BASE_URL}${path.replace(/^\//, '')}`;
const currentPage = () => {
  const relative = window.location.pathname.startsWith(BASE_URL)
    ? window.location.pathname.slice(BASE_URL.length)
    : window.location.pathname.replace(/^\//, '');
  return `/${relative}`.replace(/\/+$/, '') || '/';
};

const INTEREST_CART_KEY = 'amazonia-interest-cart';
const CART_CHANGE_EVENT = 'amazonia-cart-change';
function readInterestCart() {
  try {
    const value = JSON.parse(localStorage.getItem(INTEREST_CART_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function saveInterestCart(items) {
  localStorage.setItem(INTEREST_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT, { detail: items }));
}
function useInterestCart() {
  const [items, setItems] = useState(readInterestCart);
  useEffect(() => {
    const sync = event => setItems(event.detail || readInterestCart());
    const syncStorage = () => setItems(readInterestCart());
    window.addEventListener(CART_CHANGE_EVENT, sync);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener(CART_CHANGE_EVENT, sync);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);
  const update = next => { setItems(next); saveInterestCart(next); };
  const toggle = item => update(items.some(value => value.key === item.key)
    ? items.filter(value => value.key !== item.key)
    : [...items, item]);
  const remove = key => update(items.filter(value => value.key !== key));
  const clear = () => update([]);
  return { items, toggle, remove, clear, includes: key => items.some(value => value.key === key) };
}
function advisorInterestMessage(lang, { title, code, link }) {
  const reference = code ? `${lang === 'es' ? ' Código' : ' Code'}: ${code}.` : '';
  return lang === 'es'
    ? `Hola, estoy interesado en la propiedad "${title}".${reference}\n${link}\nQuisiera más información.`
    : `Hello, I am interested in the property "${title}".${reference}\n${link}\nI would like more information.`;
}
function advisorWhatsappUrl(phone, message) {
  return phone ? `${whatsappUrl(phone)}?text=${encodeURIComponent(message)}` : '#';
}
async function openRegisteredAdvisorContact(event, items, lang, purpose = 'property_interest') {
  event.preventDefault();
  if (openRegisteredAdvisorContact.pending) return;
  openRegisteredAdvisorContact.pending = true;
  const popup = window.open('about:blank', '_blank');
  if (popup) {
    popup.document.title = lang === 'es' ? 'Preparando contacto…' : 'Preparing contact…';
    popup.document.body.innerHTML = `<p style="font:16px system-ui;padding:30px">${lang === 'es' ? 'Generando código cliente y asignando asesor…' : 'Generating client code and assigning advisor…'}</p>`;
    popup.opener = null;
  }
  try {
    const contact = await createPublicClientContact(items, purpose);
    const destination = advisorWhatsappUrl(contact.advisor_phone, contact.whatsapp_message);
    if (popup) popup.location.replace(destination);
    else window.open(destination, '_blank', 'noopener,noreferrer');
  } catch (error) {
    popup?.close();
    window.alert(`${lang === 'es' ? 'No se pudo iniciar el contacto' : 'Could not start contact'}: ${error.message}`);
  } finally {
    openRegisteredAdvisorContact.pending = false;
  }
}

const copy = {
  es: {
    nav: { home: 'Inicio', about: 'Nosotros', properties: 'Propiedades', success: 'Casos de éxito', sell: 'Vende con nosotros', contact: 'Contáctanos' },
    heroKicker: 'Propiedades con propósito', heroTitle: <>Tu próximo legado comienza <em>en la Amazonía.</em></>,
    heroText: 'Encuentra casas, terrenos, fincas, lotes y proyectos seleccionados en la Amazonía ecuatoriana.',
    explore: 'Explorar propiedades', story: 'Conoce nuestra historia', families: 'Familias felices', years: 'Creando legado',
    aboutKicker: 'Nuestra esencia', aboutTitle: <>Más que propiedades,<br/><em>un legado para tu familia.</em></>,
    aboutLead: 'Más que propiedades, un legado para tu familia.',
    aboutText: 'Acompañamos a compradores y vendedores con información clara, atención cercana y propiedades verificadas en cada etapa del proceso inmobiliario.',
    legal: 'Seguridad jurídica', earth: 'Conexión con la tierra', discover: 'Descubre nuestros espacios',
    propKicker: 'Encuentra tu lugar', propTitle: <>Propiedades para <em>nuevos comienzos</em></>, propIntro: 'Explora casas, terrenos, fincas, lotes y lotizaciones disponibles en Morona Santiago.',
    search: 'Buscar por nombre o ubicación', all: 'Todas', house: 'Casa', land: 'Terreno', results: 'propiedades encontradas', from: 'Desde', details: 'Ver propiedad', advisor: 'Contactar un asesor', addCart: 'Agregar al carrito', removeCart: 'Quitar del carrito', clearCart: 'Vaciar carrito', cart: 'Propiedades de interés', cartEmpty: 'Aún no has agregado propiedades.', cartHint: 'Guarda aquí las opciones que deseas consultar con un asesor.', catalogLoading: 'Cargando propiedades…', catalogError: 'No pudimos cargar las propiedades en este momento.', retry: 'Reintentar', consult: 'Consultar', perLot: 'Precio por lote',
    detailBack: 'Volver a propiedades', reference: 'Precio referencial', surface: 'Superficie', bedrooms: 'Dormitorios', bathrooms: 'Baños', documentation: 'Documentación', inOrder: 'En regla',
    description: 'Descripción', features: 'Características', services: 'Servicios y acceso', location: 'Ubicación de la propiedad', mapNote: 'El polígono representa el área referencial de la propiedad.', noMap: 'La ubicación cartográfica todavía no está disponible.', notFound: 'No se pudo mostrar esta propiedad.', viewVideo: 'Reproducir video', propertyVideo: 'Video de la propiedad', videoHint: 'Conoce la propiedad mediante su presentación audiovisual.', gallery360Hint: 'Selecciona una vista panorámica y arrastra para explorarla.',
    gallery: 'Galería multimedia', image: 'Imagen', video: 'Video', available: 'Disponible',
    successKicker: 'Historias reales', successTitle: <>Decisiones que se convierten en <em>nuevos comienzos</em></>,
    successIntro: 'Cada venta representa una historia de confianza. Conoce las propiedades que encontraron nuevos dueños y el acompañamiento brindado desde la primera visita hasta la firma y entrega.', sold: 'Vendida', soldProperties: 'Propiedades vendidas', viewProcess: 'Ver proceso de venta', salesProcess: 'Proceso de venta', saleCompleted: 'Venta completada', processGallery: 'Galería del proceso',
    visit: 'Visita al terreno', review: 'Revisión documental', notary: 'Firma en notaría', delivery: 'Entrega de la propiedad',
    sellKicker: 'Vende con nosotros', sellTitle: <>Tu propiedad merece<br/><em>la mejor oportunidad.</em></>,
    sellText: 'Promocionamos tu inmueble de forma profesional y te acompañamos durante todo el proceso para vender con seguridad.',
    valuation: 'Valoración profesional y transparente', promotion: 'Fotografía y promoción estratégica', support: 'Acompañamiento legal de principio a fin', sellCta: 'Quiero vender mi propiedad',
    contactTitle: 'Hablemos de tu próximo proyecto.', whatsapp: 'Escríbenos por WhatsApp',
    chatTitle: 'Amazonia Propiedades EC', chatStatus: 'Asistente virtual', chatHello: '¡Hola! ¿Qué tipo de propiedad estás buscando?', chatHint: 'Próximamente podrás aplicar filtros mediante esta conversación.', chatPlaceholder: 'Escribe tu consulta...', voice: 'Lectura por voz', voiceHint: 'Actívala y mueve el cursor sobre el contenido.', voiceOn: 'Lectura activada', voiceOff: 'Lectura desactivada', light: 'Modo claro', dark: 'Modo oscuro', expand: 'Ampliar imagen', virtualTour: 'Galería de imágenes 360°', dragTour: 'Arrastra para explorar la imagen en 360°', close: 'Cerrar', previous: 'Anterior', next: 'Siguiente', filters: 'Filtros', propertyType: 'Tipo de propiedad', lot: 'Lote', farm: 'Finca', size: 'Tamaño', minimum: 'Mínimo', maximum: 'Máximo', province: 'Provincia', canton: 'Cantón', parish: 'Parroquia', any: 'Todas', clearFilters: 'Limpiar filtros', applyFilters: 'Aplicar filtros', noResults: 'No encontramos propiedades con estos filtros.',
  },
  en: {
    nav: { home: 'Home', about: 'About us', properties: 'Properties', success: 'Success stories', sell: 'Sell with us', contact: 'Contact us' },
    heroKicker: 'Properties with purpose', heroTitle: <>Your next legacy begins <em>in the Amazon.</em></>,
    heroText: 'Find selected homes, land, farms, lots and developments across the Ecuadorian Amazon.',
    explore: 'Explore properties', story: 'Discover our story', families: 'Happy families', years: 'Building legacies',
    aboutKicker: 'Our essence', aboutTitle: <>More than properties,<br/><em>a legacy for your family.</em></>,
    aboutLead: 'More than properties, a legacy for your family.',
    aboutText: 'We support buyers and sellers with clear information, personal attention and verified properties throughout every stage of the real estate process.',
    legal: 'Legal certainty', earth: 'Connection to the land', discover: 'Discover our spaces',
    propKicker: 'Find your place', propTitle: <>Properties for <em>new beginnings</em></>, propIntro: 'Explore homes, land, farms, lots and subdivisions available in Morona Santiago.',
    search: 'Search by name or location', all: 'All', house: 'House', land: 'Land', results: 'properties found', from: 'From', details: 'View property', advisor: 'Contact an advisor', addCart: 'Add to cart', removeCart: 'Remove from cart', clearCart: 'Clear cart', cart: 'Properties of interest', cartEmpty: 'You have not added any properties yet.', cartHint: 'Keep the options you want to discuss with an advisor here.', catalogLoading: 'Loading properties…', catalogError: 'We could not load properties right now.', retry: 'Try again', consult: 'Ask for price', perLot: 'Price per lot',
    detailBack: 'Back to properties', reference: 'Reference price', surface: 'Area', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', documentation: 'Documentation', inOrder: 'Verified',
    description: 'Description', features: 'Features', services: 'Services and access', location: 'Property location', mapNote: 'The polygon represents the approximate property area.', noMap: 'The map location is not available yet.', notFound: 'This property could not be displayed.', viewVideo: 'Play video', propertyVideo: 'Property video', videoHint: 'Discover the property through its audiovisual presentation.', gallery360Hint: 'Choose a panoramic view and drag to explore it.',
    gallery: 'Media gallery', image: 'Image', video: 'Video', available: 'Available',
    successKicker: 'Real stories', successTitle: <>Decisions that become <em>new beginnings</em></>,
    successIntro: 'Every sale is a story built on trust. Discover the properties that found new owners and the support provided from the first visit through signing and handover.', sold: 'Sold', soldProperties: 'Sold properties', viewProcess: 'View sale process', salesProcess: 'Sale process', saleCompleted: 'Sale completed', processGallery: 'Process gallery',
    visit: 'Property visit', review: 'Document review', notary: 'Notary signing', delivery: 'Property handover',
    sellKicker: 'Sell with us', sellTitle: <>Your property deserves<br/><em>the best opportunity.</em></>,
    sellText: 'We market your property professionally and support you throughout the process so you can sell with confidence.',
    valuation: 'Professional and transparent valuation', promotion: 'Strategic photography and promotion', support: 'End-to-end legal guidance', sellCta: 'I want to sell my property',
    contactTitle: 'Let’s talk about your next project.', whatsapp: 'Message us on WhatsApp',
    chatTitle: 'Amazonia Propiedades EC', chatStatus: 'Virtual assistant', chatHello: 'Hello! What kind of property are you looking for?', chatHint: 'You will soon be able to apply filters through this conversation.', chatPlaceholder: 'Type your question...', voice: 'Voice reading', voiceHint: 'Enable it and move the cursor over the content.', voiceOn: 'Reading enabled', voiceOff: 'Reading disabled', light: 'Light mode', dark: 'Dark mode', expand: 'Expand image', virtualTour: '360° image gallery', dragTour: 'Drag to explore the image in 360°', close: 'Close', previous: 'Previous', next: 'Next', filters: 'Filters', propertyType: 'Property type', lot: 'Lot', farm: 'Farm', size: 'Size', minimum: 'Minimum', maximum: 'Maximum', province: 'Province', canton: 'County', parish: 'Parish', any: 'All', clearFilters: 'Clear filters', applyFilters: 'Apply filters', noResults: 'No properties match these filters.',
  },
};

function useLanguage() {
  const [lang, setLang] = useState(() => localStorage.getItem('amazonia-language') || 'es');
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const toggle = () => setLang((current) => {
    const next = current === 'es' ? 'en' : 'es';
    localStorage.setItem('amazonia-language', next);
    return next;
  });
  return { lang, toggle, t: copy[lang] };
}

function Brand({ settings }) {
  const name = settings.business_name || 'Amazonia Propiedades EC';
  return <a className={`brand ${settings.logo_url ? 'brand-with-logo' : ''}`} href={pageUrl('/')} aria-label={name}>{settings.logo_url ? <img className="brand-logo" src={cloudinaryVersion(settings.logo_url, 'c_limit,w_440,q_auto:eco,f_auto')} alt={name} decoding="async"/> : <><span className="brand-mark"><Trees size={22}/></span><span className="brand-wordmark"><strong>Amazonia</strong><small>Propiedades <em>EC</em></small></span></>}</a>;
}

function Header({ t, lang, toggle, theme, toggleTheme, settings }) {
  const [open, setOpen] = useState(false);
  const { items: cartItems } = useInterestCart();
  const path = currentPage();
  const links = [[t.nav.home, '/', true], [t.nav.about, '/#nosotros', true], [t.nav.properties, '/propiedades', settings.show_properties], [t.nav.success, '/casos-de-exito', settings.show_success_cases], [t.nav.sell, '/vende-con-nosotros', settings.show_sell_with_us]].filter(([, , visible]) => visible);
  const contactUrl = settings.phone ? '#contacto' : settings.email ? `mailto:${settings.email}` : '#contacto';
  const startGeneralContact = settings.phone
    ? event => openRegisteredAdvisorContact(event, [], lang, 'general')
    : undefined;
  return <>
    <header className="site-header"><div className="container nav-wrap"><Brand settings={settings}/><nav className="desktop-nav">{links.map(([label, href]) => <a className={path === href.split('#')[0] ? 'active' : ''} href={pageUrl(href)} key={href}>{label}</a>)}</nav><button className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'light' ? t.dark : t.light} title={theme === 'light' ? t.dark : t.light}>{theme === 'light' ? <Moon size={16}/> : <Sun size={16}/>}</button><button className="language-toggle" onClick={toggle} aria-label={lang === 'es' ? 'Cambiar idioma' : 'Change language'}><Languages size={16}/><span>{lang === 'es' ? 'EN' : 'ES'}</span></button><a className={`header-cart ${path === '/carrito' ? 'active' : ''}`} href={pageUrl('/carrito')} aria-label={t.cart}><ShoppingBag/>{cartItems.length > 0 && <b>{cartItems.length}</b>}</a><a className="button button-small desktop-contact" href={contactUrl} onClick={startGeneralContact}>{t.nav.contact}<ArrowRight size={16}/></a><button className="menu-button" onClick={() => setOpen(true)} aria-label={lang === 'es' ? 'Abrir menú' : 'Open menu'}><Menu/></button></div></header>
    {open && <div className="mobile-drawer"><div className="drawer-top"><Brand settings={settings}/><button onClick={() => setOpen(false)}><X/></button></div><nav>{links.map(([label, href]) => <a href={pageUrl(href)} key={href}>{label}<ArrowRight size={18}/></a>)}<a href={pageUrl('/carrito')}>{t.cart}<span className="drawer-cart-count">{cartItems.length}</span></a></nav><div className="drawer-preferences"><button className="language-toggle mobile-language" onClick={toggle}><Languages/>{lang === 'es' ? 'English' : 'Español'}</button><button className="language-toggle mobile-language" onClick={toggleTheme}>{theme === 'light' ? <Moon/> : <Sun/>}{theme === 'light' ? t.dark : t.light}</button></div></div>}
  </>;
}

function Footer({ t, lang, settings }) {
  const tagline = lang === 'es' ? settings.tagline_es : 'More than properties, a legacy for your family.';
  const location = settings.address || settings.city;
  return <footer><div className="container footer-main"><div className="footer-brand"><Brand settings={settings}/><p>{tagline}</p>{(settings.facebook_url || settings.instagram_url) && <div className="footer-socials">{settings.facebook_url && <a href={settings.facebook_url} target="_blank" rel="noreferrer"><b>f</b><span>Facebook</span></a>}{settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noreferrer"><b>ig</b><span>Instagram</span></a>}</div>}</div><nav className="footer-column" aria-label={lang === 'es' ? 'Explorar' : 'Explore'}><strong>{lang === 'es' ? 'Explorar' : 'Explore'}</strong><a href={pageUrl('/')}>{t.nav.home}</a><a href={pageUrl('/#nosotros')}>{t.nav.about}</a>{settings.show_properties && <a href={pageUrl('/propiedades')}>{t.nav.properties}</a>}</nav><nav className="footer-column" aria-label={lang === 'es' ? 'Servicios' : 'Services'}><strong>{lang === 'es' ? 'Servicios' : 'Services'}</strong>{settings.show_success_cases && <a href={pageUrl('/casos-de-exito')}>{t.nav.success}</a>}{settings.show_sell_with_us && <a href={pageUrl('/vende-con-nosotros')}>{t.nav.sell}</a>}<a href={pageUrl('/carrito')}>{t.cart}</a></nav><div className="footer-column footer-contact"><strong>{lang === 'es' ? 'Información de contacto' : 'Contact information'}</strong>{location && <span><MapPin/>{location}</span>}{settings.phone && <a href={`tel:${settings.phone.replace(/\s/g, '')}`}><Phone/>{settings.phone}</a>}{settings.email && <a href={`mailto:${settings.email}`}><Mail/>{settings.email}</a>}</div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} {settings.business_name}. {lang === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}</span><span className="developer-credit">{lang === 'es' ? 'Sitio web desarrollado por' : 'Website developed by'} <a href="https://edisonflores.vercel.app/" target="_blank" rel="noopener noreferrer">Edison Flores<ArrowRight/></a></span></div></footer>;
}

function Assistants({ t, lang }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);

  useEffect(() => {
    if (!voiceActive || !('speechSynthesis' in window)) return;
    let timer;
    let lastText = '';
    const speakElement = (event) => {
      const target = event.target.closest('a, button, h1, h2, h3, p, li, label, blockquote, .property-card, .feature-list > span');
      if (!target || target.closest('.chat-panel, .voice-popover, .chat-float, .voice-float')) return;
      const text = (target.getAttribute('aria-label') || target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 260);
      if (!text || text === lastText) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'es' ? 'es-EC' : 'en-US';
        utterance.rate = .92;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
        lastText = text;
      }, 320);
    };
    document.addEventListener('mouseover', speakElement);
    document.addEventListener('focusin', speakElement);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseover', speakElement);
      document.removeEventListener('focusin', speakElement);
      window.speechSynthesis.cancel();
    };
  }, [voiceActive, lang]);

  const toggleVoice = () => {
    setVoiceOpen(true);
    setVoiceActive((current) => {
      if (current) window.speechSynthesis?.cancel();
      return !current;
    });
  };
  return <>
    {voiceOpen && <div className={`voice-popover ${voiceActive ? 'is-listening' : ''}`}><button onClick={() => { setVoiceOpen(false); setVoiceActive(false); }}><X size={16}/></button><span className="voice-orb">{voiceActive ? <Volume2/> : <VolumeX/>}</span><strong>{t.voice}</strong><p>{t.voiceHint}</p><b>{voiceActive ? t.voiceOn : t.voiceOff}</b><div className="voice-waves"><i/><i/><i/><i/><i/></div></div>}
    <button className={`voice-float ${voiceActive ? 'active' : ''}`} onClick={toggleVoice} aria-label={voiceActive ? t.voiceOff : t.voice}>{voiceActive ? <Volume2/> : <Mic/>}</button>
    {chatOpen && <aside className="chat-panel"><div className="chat-head"><span><Bot/></span><div><strong>{t.chatTitle}</strong><small>{t.chatStatus}</small></div><button onClick={() => setChatOpen(false)}><X/></button></div><div className="chat-body"><div className="bot-message">{t.chatHello}</div><div className="chat-chips"><span>{t.house}</span><span>{t.land}</span><span>Macas</span></div><p>{t.chatHint}</p></div><div className="chat-input"><input placeholder={t.chatPlaceholder} disabled/><button disabled><ArrowRight/></button></div></aside>}
    <button className="chat-float" onClick={() => setChatOpen(!chatOpen)} aria-label={t.chatTitle}><MessageCircle/></button>
  </>;
}

function PageShell({ children, language, settings, configLoading }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('amazonia-theme') || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('amazonia-theme', theme);
  }, [theme]);
  useEffect(() => {
    const prepareWhatsappLinks = () => document
      .querySelectorAll('a[href*="wa.me"],a[href*="whatsapp.com"]')
      .forEach(link => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
    prepareWhatsappLinks();
    const observer = new MutationObserver(prepareWhatsappLinks);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [children, settings.phone]);
  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light');
  return <><Header {...language} theme={theme} toggleTheme={toggleTheme} settings={settings}/>{configLoading && <div className="site-config-loading" role="status" aria-live="polite"><span/>{language.lang === 'es' ? 'Actualizando sitio…' : 'Updating website…'}</div>}<main>{children}</main><Footer t={language.t} lang={language.lang} settings={settings}/><Assistants t={language.t} lang={language.lang}/></>;
}

function HomePage({ t, settings, lang }) {
  const heroTitle = lang === 'es' && settings.home_title_es ? settings.home_title_es : t.heroTitle;
  const heroText = lang === 'es' && settings.home_subtitle_es ? settings.home_subtitle_es : t.heroText;
  const aboutText = lang === 'es' && settings.about_es ? settings.about_es : t.aboutText;
  const tagline = lang === 'es' && settings.tagline_es ? settings.tagline_es : t.aboutLead;
  const heroImage = cloudinaryVersion(settings.hero_desktop_url, 'c_limit,w_1800,q_auto:good,f_auto') || asset('amazonia-banner.png');
  const heroMobileImage = cloudinaryVersion(settings.hero_mobile_url, 'c_limit,w_900,q_auto:good,f_auto');
  const aboutImage = cloudinaryVersion(settings.about_image_url, 'c_limit,w_1400,q_auto:good,f_auto') || asset('amazonia-banner.png');
  return <>
    <section className="hero home-hero"><div className="hero-glow"/><div className="container hero-content"><div className="hero-copy"><span className="eyebrow"><span/>{t.heroKicker}</span><h1>{heroTitle}</h1><p>{heroText}</p><div className="hero-actions">{settings.show_properties && <a className="button button-gold" href={pageUrl('/propiedades')}>{t.explore}<ArrowRight size={18}/></a>}<a className="text-link" href="#nosotros"><span className="play"><Play size={15} fill="currentColor"/></span>{t.story}</a></div><div className="hero-proof trust-proof"><div><ShieldCheck/><span><strong>{t.legal}</strong><small>{t.inOrder}</small></span></div><i/><div><MapPin/><span><strong>{settings.city || t.location}</strong><small>{t.support}</small></span></div></div></div><div className="hero-visual"><div className="hero-image-frame"><picture>{heroMobileImage && <source media="(max-width: 620px)" srcSet={heroMobileImage}/>}<img src={heroImage} alt={settings.business_name} fetchPriority="high" decoding="async"/></picture></div><div className="floating-card"><span><ShieldCheck/></span><div><strong>{t.legal}</strong><small>{tagline}</small></div><Check/></div></div></div></section>
    <section className="home-links"><div className="container home-link-grid">{settings.show_properties && <a href={pageUrl('/propiedades')}><LandPlot/><span><small>01</small><strong>{t.nav.properties}</strong></span><ArrowRight/></a>}{settings.show_success_cases && <a href={pageUrl('/casos-de-exito')}><Sparkles/><span><small>02</small><strong>{t.nav.success}</strong></span><ArrowRight/></a>}{settings.show_sell_with_us && <a href={pageUrl('/vende-con-nosotros')}><CircleDollarSign/><span><small>03</small><strong>{t.nav.sell}</strong></span><ArrowRight/></a>}</div></section>
    <section id="nosotros" className="section about-section"><div className="container about-grid"><div className="about-collage"><div className="about-main"><img src={aboutImage} alt={`${t.nav.about} — ${settings.business_name}`} loading="lazy" decoding="async"/></div><div className="experience-seal location-seal"><MapPin/><span>{settings.city || settings.business_name}</span></div></div><div className="about-copy"><span className="eyebrow dark"><span/>{t.aboutKicker}</span><h2>{t.aboutTitle}</h2><p className="lead">{tagline}</p><p>{aboutText}</p><div className="values"><div><span><ShieldCheck/></span><div><strong>{t.legal}</strong><small>{lang === 'es' ? 'Información clara y acompañamiento durante el proceso.' : 'Clear information and guidance throughout the process.'}</small></div></div><div><span><Trees/></span><div><strong>{t.earth}</strong><small>{lang === 'es' ? 'Propiedades seleccionadas en la Amazonía ecuatoriana.' : 'Selected properties in the Ecuadorian Amazon.'}</small></div></div></div>{settings.show_properties && <a className="inline-link" href={pageUrl('/propiedades')}>{t.discover}<ArrowRight/></a>}</div></div></section>
    <ContactStrip t={t} lang={lang} settings={settings}/>
  </>;
}

function InnerHero({ kicker, title, text, className = '' }) {
  return <section className={`inner-hero ${className}`}><div className="container"><span className="eyebrow"><span/>{kicker}</span><h1>{title}</h1>{text && <p>{text}</p>}</div></section>;
}

function cloudinaryVersion(url, transformation) {
  if (!url?.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transformation}/`);
}

function PanoramaViewer({ scene }) {
  const container = useRef(null);
  useEffect(() => {
    if (!container.current || !scene?.src || !window.pannellum) return undefined;
    const viewer = window.pannellum.viewer(container.current, {
      type: 'equirectangular', panorama: scene.src, autoLoad: true, showControls: true,
      showFullscreenCtrl: true, showZoomCtrl: true, mouseZoom: true, draggable: true,
      pitch: 0, minPitch: 0, maxPitch: 0, yaw: 0, hfov: 105, minHfov: 45, maxHfov: 120,
      compass: false, keyboardZoom: false, friction: 0.18,
    });
    return () => viewer.destroy();
  }, [scene]);
  return <div ref={container} className="tour-real-panorama" aria-label={scene?.label}/>;
}

function VirtualTour({ property, t, compact = false, panoramas = property.panoramas || [] }) {
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState(0);
  const scenes = panoramas.map((item, index) => ({
    src: cloudinaryVersion(item.resource_url, 'c_limit,w_4096,q_auto:good,f_auto'),
    preview: item.thumbnail_url || cloudinaryVersion(item.resource_url, 'c_fill,w_640,h_360,q_auto:eco,f_auto'),
    label: item.title_es || `Vista ${index + 1}`,
  }));
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', closeOnEscape, true); };
  }, [open]);
  if (!scenes.length) return null;
  const tourOverlay = open ? createPortal(
    <div className="tour-player-backdrop" onPointerDown={(event) => event.target === event.currentTarget && setOpen(false)}><button className="tour-overlay-close" onClick={() => setOpen(false)} aria-label={t.close}><X/></button><section className="tour-player-modal" role="dialog" aria-modal="true" aria-label={t.virtualTour}><div className="tour-player-screen"><PanoramaViewer scene={scenes[scene]}/><div className="tour-player-top"><div><span><Rotate3D/></span><div><strong>{property.title}</strong><small><MapPin/>{property.location}</small></div></div><b>VISOR 360°</b></div><div className="tour-drag-hint"><Rotate3D/><span>{t.dragTour}</span></div></div><div className="tour-scene-strip"><div><strong>{t.virtualTour}</strong><small>{t.gallery360Hint}</small></div><div>{scenes.map((item,index) => <button key={`${item.label}-${index}`} className={scene === index ? 'active' : ''} onClick={() => setScene(index)}><span><img src={item.preview} alt={item.label}/><i>{index + 1}</i></span><b>{item.label}</b></button>)}</div><span>{String(scene + 1).padStart(2,'0')} / {String(scenes.length).padStart(2,'0')}</span></div></section></div>, document.body,
  ) : null;
  return <>{!compact ? <button className="panorama-preview" onClick={() => setOpen(true)} aria-label={t.virtualTour}><img src={scenes[0].preview} alt={scenes[0].label}/><span><i><Rotate3D/></i><strong>{scenes[0].label}</strong><small>{t.dragTour}</small></span><b><Maximize2/>{t.virtualTour}</b></button> : <button className="tour-card-button" onClick={() => setOpen(true)}><Rotate3D/>{t.virtualTour}</button>}{tourOverlay}</>;
}

function PropertyCard({ property, t, lang, inCart, toggleCart, settings }) {
  const title = lang === 'es' ? property.title : property.titleEn;
  const isSubdivision = property.property_type === 'subdivision';
  const typeLabel = propertyTypeLabel(property.property_type, lang);
  const badgeLabel = property.featured
    ? (lang === 'es' ? 'Destacada' : 'Featured')
    : ({ available: lang === 'es' ? 'Disponible' : 'Available', reserved: lang === 'es' ? 'Reservada' : 'Reserved', sold: lang === 'es' ? 'Vendida' : 'Sold' }[property.commercial_status] || property.badge);
  const price = property.property_type === 'subdivision'
    ? property.subdivisionSummary?.minimumPrice != null
      ? `${lang === 'es' ? 'Desde' : 'From'} ${new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.subdivisionSummary.minimumPrice)}`
      : t.perLot
    : property.priceValue == null
      ? t.consult
      : new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.priceValue);
  const propertyLink = new URL(pageUrl(`/propiedades/${property.slug || property.id}`), window.location.origin).href;
  const advisorUrl = advisorWhatsappUrl(settings.phone, advisorInterestMessage(lang, { title, code: property.code, link: propertyLink }));
  const detailHref = pageUrl(`/propiedades/${property.slug || property.id}`);
  const openFromCard = event => {
    if (event.target.closest('a,button,input,select,textarea')) return;
    window.location.href = detailHref;
  };
  const openFromKeyboard = event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
      event.preventDefault();
      window.location.href = detailHref;
    }
  };
  return <article className={`property-card clickable-property-card ${isSubdivision ? 'subdivision-card' : ''}`} role="link" tabIndex="0" onClick={openFromCard} onKeyDown={openFromKeyboard} aria-label={`${t.details}: ${title}`}>
    <div className="property-image">{property.image ? <img src={cloudinaryVersion(property.image, 'c_fill,w_900,h_650,q_auto:eco,f_auto')} alt={property.imageAlt || title} style={{objectPosition: property.position}} loading="lazy" decoding="async"/> : <div className="property-image-placeholder"><Building2/></div>}<span className="property-badge">{badgeLabel}</span>{!isSubdivision && <button className={`favorite cart-card-toggle ${inCart ? 'active' : ''}`} onClick={() => toggleCart(property)} aria-label={inCart ? t.removeCart : t.addCart} title={inCart ? t.removeCart : t.addCart}><ShoppingBag fill={inCart ? 'currentColor' : 'none'}/></button>}</div>
    <div className="property-body">
      <div className="property-meta"><span>{typeLabel}</span><span><MapPin/>{property.location}</span></div>
      <h3>{title}</h3>
      <div className={`property-features ${isSubdivision ? 'subdivision-summary' : ''}`}>
        {isSubdivision ? <><span><LandPlot/>{property.subdivisionSummary?.available || 0} {lang === 'es' ? 'disponibles' : 'available'}</span><span><Building2/>{property.subdivisionSummary?.published || 0} {lang === 'es' ? 'lotes publicados' : 'published lots'}</span></> : <>{property.area && <span><LandPlot/>{property.area}</span>}{property.beds && <span><BedDouble/>{property.beds}</span>}{property.baths && <span><Bath/>{property.baths}</span>}</>}
      </div>
      <div className="property-footer"><div><small>{isSubdivision ? (lang === 'es' ? 'Precio referencial' : 'Reference price') : property.priceValue == null ? '' : t.from}</small><strong>{price}</strong></div><a className="detail-arrow" href={detailHref} aria-label={t.details}><ArrowRight/></a></div>
      {isSubdivision ? <div className="subdivision-card-actions"><a className="subdivision-card-cta" href={detailHref}><MapPin/>{lang === 'es' ? 'Ver lotes disponibles' : 'View available lots'}<ArrowRight/></a>{settings.phone && <a className="subdivision-advisor-cta" href={advisorUrl} onClick={event => openRegisteredAdvisorContact(event, [{ kind: 'property', id: property.id }], lang)}><MessageCircle/>{t.advisor}</a>}</div> : <div className="catalog-card-buttons"><button className={`catalog-cart-button ${inCart ? 'selected' : ''}`} onClick={() => toggleCart(property)}>{inCart ? <Check/> : <ShoppingBag/>}{inCart ? t.removeCart : t.addCart}</button>{settings.phone && <a className="advisor-card-button" href={advisorUrl} onClick={event => openRegisteredAdvisorContact(event, [{ kind: 'property', id: property.id }], lang)}><MessageCircle/>{t.advisor}</a>}</div>}
    </div>
  </article>;
}

function PropertiesPage({ t, lang, settings }) {
  const { properties: liveProperties, loading, error } = usePublishedProperties();
  const cart = useInterestCart();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');
  const [province, setProvince] = useState('');
  const [canton, setCanton] = useState('');
  const [parish, setParish] = useState('');
  const provinces = [...new Set(liveProperties.map(p => p.province).filter(Boolean))];
  const cantons = [...new Set(liveProperties.filter(p => !province || p.province === province).map(p => p.canton).filter(Boolean))];
  const parishes = [...new Set(liveProperties.filter(p => (!province || p.province === province) && (!canton || p.canton === canton)).map(p => p.parish).filter(Boolean))];
  const activeCount = [filter !== 'all', minSize, maxSize, province, canton, parish].filter(Boolean).length;
  const filtered = useMemo(() => liveProperties.filter(p => {
    const text = `${p.title} ${p.titleEn} ${p.location} ${p.province} ${p.canton} ${p.parish}`.toLowerCase();
    return (filter === 'all' || p.property_type === filter)
      && text.includes(query.toLowerCase())
      && (!minSize || p.areaValue >= Number(minSize))
      && (!maxSize || p.areaValue <= Number(maxSize))
      && (!province || p.province === province)
      && (!canton || p.canton === canton)
      && (!parish || p.parish === parish);
  }), [liveProperties, filter, query, minSize, maxSize, province, canton, parish]);
  const resetFilters = () => { setFilter('all'); setMinSize(''); setMaxSize(''); setProvince(''); setCanton(''); setParish(''); };
  const typeValues = [...new Set(liveProperties.map(p => p.property_type))];
  const types = [['all',t.all], ...typeValues.map(value => [value, propertyTypeLabel(value, lang)])];
  const toggleCart = property => cart.toggle({ key: `property:${property.id}`, kind: 'property', id: property.id, code: property.code, title: property.title, titleEn: property.titleEn, image: property.image, location: property.location, price: property.price, link: pageUrl(`/propiedades/${property.slug || property.id}`) });
  return <><InnerHero kicker={t.propKicker} title={t.propTitle} text={t.propIntro}/><section className="catalog-section"><div className="container"><div className="catalog-toolbar advanced-toolbar"><label className="catalog-search"><Search/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search}/></label><button className={`advanced-filter-toggle ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal/><span>{t.filters}</span>{activeCount > 0 && <b>{activeCount}</b>}<ChevronDown/></button><a className="catalog-cart-trigger" href={pageUrl('/carrito')}><ShoppingBag/><span>{t.cart}</span>{cart.items.length > 0 && <b>{cart.items.length}</b>}</a><span>{filtered.length} {t.results}</span></div><div className="filter-pills property-type-pills">{types.map(([value,label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>{filtersOpen && <div className="advanced-filter-panel"><div className="filter-panel-head"><div><span><SlidersHorizontal/></span><div><strong>{t.filters}</strong><small>{t.propertyType} · {t.size} · {t.location}</small></div></div><button onClick={() => setFiltersOpen(false)} aria-label={t.close}><X/></button></div><div className="filter-panel-grid"><fieldset><legend><Ruler/>{t.size}</legend><div className="size-inputs"><label><span>{t.minimum}</span><div><input type="number" min="0" value={minSize} onChange={e => setMinSize(e.target.value)} placeholder="0"/><b>m²</b></div></label><i>—</i><label><span>{t.maximum}</span><div><input type="number" min="0" value={maxSize} onChange={e => setMaxSize(e.target.value)} placeholder="5.000"/><b>m²</b></div></label></div></fieldset><fieldset className="location-fieldset"><legend><MapPin/>{t.location}</legend><label><span>{t.province}</span><select value={province} onChange={e => { setProvince(e.target.value); setCanton(''); setParish(''); }}><option value="">{t.any}</option>{provinces.map(value => <option key={value}>{value}</option>)}</select></label><label><span>{t.canton}</span><select value={canton} onChange={e => { setCanton(e.target.value); setParish(''); }}><option value="">{t.any}</option>{cantons.map(value => <option key={value}>{value}</option>)}</select></label><label><span>{t.parish}</span><select value={parish} onChange={e => setParish(e.target.value)}><option value="">{t.any}</option>{parishes.map(value => <option key={value}>{value}</option>)}</select></label></fieldset></div><div className="filter-panel-actions"><button onClick={resetFilters}><RotateCcw/>{t.clearFilters}</button><button className="button" onClick={() => setFiltersOpen(false)}>{t.applyFilters}<ArrowRight/></button></div></div>}{loading && <div className="catalog-state"><span className="catalog-spinner"/><strong>{t.catalogLoading}</strong></div>}{error && <div className="catalog-state error"><ShieldCheck/><strong>{t.catalogError}</strong><small>{error}</small><button onClick={() => window.location.reload()}>{t.retry}</button></div>}{!loading && !error && <><div className="property-grid catalog-grid">{filtered.map(p => <PropertyCard key={p.id} property={p} t={t} lang={lang} settings={settings} inCart={cart.includes(`property:${p.id}`)} toggleCart={toggleCart}/>)}</div>{filtered.length === 0 && <div className="catalog-empty"><Search/><h3>{t.noResults}</h3><button onClick={resetFilters}>{t.clearFilters}</button></div>}</>}</div></section><ContactStrip t={t} lang={lang} settings={settings}/></>;
}

function LotImageCarousel({ lot, close, t }) {
  const [index, setIndex] = useState(0);
  const images = lot.media || [];
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKeyDown = event => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') setIndex(current => (current - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') setIndex(current => (current + 1) % images.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close, images.length]);
  if (!images.length) return null;
  const current = images[index];
  const move = delta => setIndex(value => (value + delta + images.length) % images.length);
  return createPortal(<div className="lot-gallery-backdrop" role="dialog" aria-modal="true" aria-label={`${t.gallery} ${lot.lot_code || lot.code}`} onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="lot-gallery-modal">
      <header><div><small>{t.gallery}</small><h3>{lot.lot_code || lot.code}</h3></div><span>{index + 1} / {images.length}</span><button onClick={close} aria-label={t.close}><X/></button></header>
      <div className="lot-gallery-stage"><img src={cloudinaryVersion(current.resource_url, 'c_limit,w_2000,q_auto:good,f_auto')} alt={current.alt_text_es || current.title_es || `${lot.lot_code || lot.code} ${index + 1}`} decoding="async"/>{images.length > 1 && <><button className="lot-gallery-prev" onClick={() => move(-1)} aria-label={t.previous}><ChevronLeft/></button><button className="lot-gallery-next" onClick={() => move(1)} aria-label={t.next}><ChevronRight/></button></>}</div>
      <div className="lot-gallery-thumbs">{images.map((image,indexValue) => <button key={image.id || indexValue} className={indexValue === index ? 'active' : ''} onClick={() => setIndex(indexValue)}><img src={image.thumbnail_url || cloudinaryVersion(image.resource_url, 'c_fill,w_320,h_220,q_auto:eco,f_auto')} alt="" loading="lazy" decoding="async"/></button>)}</div>
    </section>
  </div>, document.body);
}

function PropertyMap({ t, property, lang, settings }) {
  const element = useRef(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [galleryLot, setGalleryLot] = useState(null);
  const cart = useInterestCart();
  const lotCode = lot => lot.lot_code || lot.code || (lang === 'es' ? 'Lote' : 'Lot');
  const lotLink = lot => `${window.location.origin}${window.location.pathname}#lote-${encodeURIComponent(lotCode(lot))}`;
  const lotCartItem = lot => ({ key: `lot:${lot.id}`, kind: 'lot', id: lot.id, code: lotCode(lot), title: `${lotCode(lot)} · ${property.title}`, titleEn: `${lotCode(lot)} · ${property.title}`, image: lot.media?.[0]?.thumbnail_url || lot.media?.[0]?.resource_url || '', location: property.location, link: lotLink(lot), price: lot.price, area_m2: lot.area_m2 });
  const isInCart = lot => cart.includes(`lot:${lot.id}`);
  const toggleLotCart = lot => cart.toggle(lotCartItem(lot));
  const advisorMessage = lot => lang === 'es'
    ? `Hola, estoy interesado en el lote ${lotCode(lot)} de ${property.title}. Quisiera más información.\n${lotLink(lot)}`
    : `Hello, I am interested in lot ${lotCode(lot)} at ${property.title}. I would like more information.\n${lotLink(lot)}`;
  const advisorUrlFor = message => settings.phone ? `${whatsappUrl(settings.phone)}?text=${encodeURIComponent(message)}` : '#';
  const selectLot = lot => {
    setSelectedLot(lot);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#lote-${encodeURIComponent(lot.lot_code || lot.code || '')}`);
  };
  const closeLot = () => {
    setSelectedLot(null);
    if (window.location.hash.startsWith('#lote-')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };
  useEffect(() => {
    if (!element.current || element.current._leaflet_id) return;
    const hasPoint = Number.isFinite(Number(property.latitude)) && Number.isFinite(Number(property.longitude));
    const map = L.map(element.current, { scrollWheelZoom: false }).setView(hasPoint ? [Number(property.latitude), Number(property.longitude)] : [-2.308,-78.1115], hasPoint ? 16 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const statusColors = { available: '#0AF70E', reserved: '#EFF934', sold: '#E32E07', not_available: '#8B9186' };
    const lotsWithGeometry = (property.lots || []).filter(lot => lot.boundary_geojson);
    if (lotsWithGeometry.length) {
      const features = lotsWithGeometry.map(lot => ({ type: 'Feature', properties: { lot }, geometry: lot.boundary_geojson }));
      const lotLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
        style: feature => { const color = statusColors[feature.properties.lot.commercial_status] || statusColors.not_available; return { color, weight: 3, opacity: 1, fillColor: color, fillOpacity: .28, className: 'publicLotPolygon' }; },
        onEachFeature: (feature, layer) => {
          const lot = feature.properties.lot;
          layer.bindTooltip(lot.lot_code || lot.code || 'Lote', { permanent: true, direction: 'center', className: 'public-lot-code-label' });
          layer.on('click', () => selectLot(lot));
        },
      }).addTo(map);
      const bounds = lotLayer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [35,35], maxZoom: 18 });
      const requestedCode = decodeURIComponent(window.location.hash.replace(/^#lote-/, ''));
      const requestedLot = requestedCode && lotsWithGeometry.find(lot => (lot.lot_code || lot.code) === requestedCode);
      if (requestedLot) setSelectedLot(requestedLot);
    } else if (property.boundary_geojson) {
      const area = L.geoJSON(property.boundary_geojson, { style: { color: '#0AF70E', weight: 3, opacity: .9, fillColor: '#0AF70E', fillOpacity: .2 } }).addTo(map);
      area.bindPopup(`<strong>${property.title}</strong><br>${t.mapNote}`);
      map.fitBounds(area.getBounds(), { padding: [35,35], maxZoom: 18 });
    } else if (hasPoint) {
      const point = L.circleMarker([Number(property.latitude), Number(property.longitude)], { radius: 10, color: '#ffffff', weight: 3, fillColor: '#0AF70E', fillOpacity: .85 }).addTo(map);
      point.bindPopup(`<strong>${property.title}</strong>`);
    }
    return () => map.remove();
  }, [t.mapNote, property]);
  const statusLabels = lang === 'es'
    ? { available: 'Disponible', reserved: 'Reservado', sold: 'Vendido', not_available: 'No disponible' }
    : { available: 'Available', reserved: 'Reserved', sold: 'Sold', not_available: 'Not available' };
  return <div className="public-property-map">
    <div className="public-lot-guide"><MousePointerClick/><span><strong>{lang === 'es' ? 'Elige el lote que quieres consultar' : 'Choose the lot you want to view'}</strong><small>{lang === 'es' ? 'Selecciona una tarjeta o haz clic directamente sobre un polígono del mapa.' : 'Select a card or click directly on a polygon on the map.'}</small></span></div>
    <div className="public-lot-selector" aria-label={lang === 'es' ? 'Listado de lotes' : 'Lot list'}>{(property.lots || []).map(lot => <button key={lot.id} className={`${selectedLot?.id === lot.id ? 'active' : ''} lot-${lot.commercial_status}`} onClick={() => selectLot(lot)}><i/><span><strong>{lotCode(lot)}</strong><small>{statusLabels[lot.commercial_status] || lot.commercial_status}</small></span><ChevronRight/></button>)}</div>
    <div className="public-lot-legend">{Object.entries(statusLabels).map(([status,label]) => <span key={status} className={`lot-${status}`}><i/>{label}</span>)}</div>
    <div className="public-map-stage">
      <div ref={element} className="osm-map" aria-label={t.location}/>
      {!selectedLot && <div className="public-lot-map-hint"><MousePointerClick/><span><strong>{lang === 'es' ? 'Selecciona un polígono' : 'Select a polygon'}</strong><small>{lang === 'es' ? 'Los códigos identifican cada lote en el mapa.' : 'The codes identify each lot on the map.'}</small></span></div>}
      {cart.items.length > 0 && <a className="public-lot-cart-trigger" href={pageUrl('/carrito')}><ShoppingBag/><span>{t.cart}</span><b>{cart.items.length}</b></a>}
      {selectedLot && <aside className="public-lot-detail">
        <button className="public-lot-close" onClick={closeLot} aria-label={t.close}><X/></button>
        {selectedLot.media?.length > 0 && <button className="public-lot-photo" onClick={() => setGalleryLot(selectedLot)}><img src={selectedLot.media[0].thumbnail_url || cloudinaryVersion(selectedLot.media[0].resource_url, 'c_fill,w_700,h_420,q_auto:eco,f_auto')} alt={selectedLot.media[0].alt_text_es || lotCode(selectedLot)} loading="lazy" decoding="async"/><span><Camera/>{lang === 'es' ? `Click para ver ${selectedLot.media.length} ${selectedLot.media.length === 1 ? 'imagen' : 'imágenes'}` : `Click to view ${selectedLot.media.length} ${selectedLot.media.length === 1 ? 'image' : 'images'}`}</span></button>}
        <span className={`lot-status lot-${selectedLot.commercial_status}`}>{statusLabels[selectedLot.commercial_status] || selectedLot.commercial_status}</span>
        <h3>{lotCode(selectedLot)}</h3>
        <dl><div><dt>{lang === 'es' ? 'Área' : 'Area'}</dt><dd>{selectedLot.area_m2 ? `${Number(selectedLot.area_m2).toLocaleString('es-EC')} m²` : (lang === 'es' ? 'Por confirmar' : 'To be confirmed')}</dd></div><div><dt>{lang === 'es' ? 'Precio' : 'Price'}</dt><dd>{selectedLot.price != null ? new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(selectedLot.price) : t.consult}</dd></div><div><dt>{lang === 'es' ? 'Frente' : 'Frontage'}</dt><dd>{selectedLot.frontage_m ? `${selectedLot.frontage_m} m` : '—'}</dd></div><div><dt>{lang === 'es' ? 'Fondo' : 'Depth'}</dt><dd>{selectedLot.depth_m ? `${selectedLot.depth_m} m` : '—'}</dd></div></dl>
        {selectedLot.commercial_status === 'available'
          ? <div className="public-lot-actions"><button className={isInCart(selectedLot) ? 'selected' : ''} onClick={() => toggleLotCart(selectedLot)}>{isInCart(selectedLot) ? <Check/> : <ShoppingBag/>}{isInCart(selectedLot) ? t.removeCart : t.addCart}</button>{settings.phone && <a href={advisorUrlFor(advisorMessage(selectedLot))} onClick={event => openRegisteredAdvisorContact(event, [{ kind: 'lot', id: selectedLot.id }], lang)}><MessageCircle/>{t.advisor}</a>}</div>
          : <p className="public-lot-unavailable">{lang === 'es' ? 'Este lote no está disponible para consultas ni para agregar al carrito.' : 'This lot is not available for inquiries or to add to the cart.'}</p>}
      </aside>}
    </div>
    {galleryLot && <LotImageCarousel lot={galleryLot} close={() => setGalleryLot(null)} t={t}/>}
  </div>;
}

function youtubeEmbed(url) {
  try {
    const parsed = new URL(url);
    let id = parsed.hostname.includes('youtu.be') ? parsed.pathname.slice(1) : parsed.pathname.startsWith('/shorts/') || parsed.pathname.startsWith('/embed/') ? parsed.pathname.split('/')[2] : parsed.searchParams.get('v');
    id = (id || '').split(/[?&]/)[0];
    return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : '';
  } catch { return ''; }
}

function MediaCarousel({ t, media, fallbackImage }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const gallery = media.length ? media : [{ id: 'fallback', media_type: 'image', resource_url: fallbackImage, title_es: t.gallery }];
  const current = gallery[index] || gallery[0];
  const move = (delta) => setIndex((index + delta + gallery.length) % gallery.length);
  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => event.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', closeOnEscape); };
  }, [expanded]);
  const stage = (lightbox = false) => <div className={lightbox ? 'lightbox-stage' : 'media-stage'}>{current.media_type === 'video' && youtubeEmbed(current.resource_url) ? <iframe className="property-video-frame" src={youtubeEmbed(current.resource_url)} title={current.title_es || t.video} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/> : <img className={!lightbox ? 'expandable-property-image' : ''} src={cloudinaryVersion(current.resource_url || current.thumbnail_url, lightbox ? 'c_limit,w_2400,q_auto:good,f_auto' : 'c_limit,w_1600,q_auto:good,f_auto')} alt={current.alt_text_es || current.title_es || `${t.gallery} ${index + 1}`} onClick={() => !lightbox && setExpanded(true)} decoding="async"/>}<span className="media-counter">{index + 1} / {gallery.length}</span>{gallery.length > 1 && <><button className="carousel-prev" onClick={() => move(-1)} aria-label={t.previous}><ChevronLeft/></button><button className="carousel-next" onClick={() => move(1)} aria-label={t.next}><ChevronRight/></button></>}{!lightbox && current.media_type !== 'video' && <button className="expand-media" onClick={() => setExpanded(true)} aria-label={t.expand}><Maximize2/><span>{t.expand}</span></button>}</div>;
  return <><div className="media-gallery">{stage()}<div className="media-thumbs">{gallery.map((item,i) => <button key={item.id || i} className={i === index ? 'active' : ''} onClick={() => setIndex(i)}><img src={item.thumbnail_url || cloudinaryVersion(item.resource_url, 'c_fill,w_420,h_280,q_auto:eco,f_auto')} alt="" loading="lazy" decoding="async"/>{item.media_type === 'video' && <Play fill="currentColor"/>}</button>)}</div></div>{expanded && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={t.expand}><header><div><span>{t.gallery}</span><strong>{index + 1} / {gallery.length}</strong></div><button onClick={() => setExpanded(false)} aria-label={t.close}><X/></button></header>{stage(true)}<div className="lightbox-filmstrip">{gallery.map((item,i) => <button key={item.id || i} className={i === index ? 'active' : ''} onClick={() => setIndex(i)}><img src={item.thumbnail_url || cloudinaryVersion(item.resource_url, 'c_fill,w_420,h_280,q_auto:eco,f_auto')} alt="" loading="lazy" decoding="async"/>{item.media_type === 'video' && <Play fill="currentColor"/>}</button>)}</div></div>}</>;
}

function PropertyVideos({ t, videos, fallbackImage }) {
  const [activeVideo, setActiveVideo] = useState(null);
  if (!videos.length) return null;
  return <section className="property-video-section"><header><div><span className="eyebrow dark"><span/>{t.video}</span><h2>{t.propertyVideo}</h2><p>{t.videoHint}</p></div><span>{videos.length}</span></header><div className="property-video-list">{videos.map((video,index) => { const embed = youtubeEmbed(video.resource_url); const youtubeId = embed ? embed.split('/embed/')[1]?.split('?')[0] : ''; const preview = video.thumbnail_url || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : fallbackImage); return <article key={video.id || index}><div className="property-video-player">{activeVideo === index ? (embed ? <iframe src={`${embed}&autoplay=1`} title={video.title_es || `${t.video} ${index + 1}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/> : <video src={video.resource_url} poster={preview || undefined} controls autoPlay preload="metadata"/>) : <button className="video-preview" onClick={() => setActiveVideo(index)} aria-label={t.viewVideo}>{preview && <img src={cloudinaryVersion(preview, 'c_fill,w_1200,h_675,q_auto:eco,f_auto')} alt="" loading="lazy" decoding="async"/>}<span><Play fill="currentColor"/></span><b>{t.viewVideo}</b></button>}</div>{video.title_es && <strong>{video.title_es}</strong>}</article>; })}</div></section>;
}

function PropertyDetailPage({ t, lang, identifier, settings }) {
  const { property, loading, error } = usePublicProperty(identifier);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const cart = useInterestCart();
  if (loading) return <section className="detail-state"><span className="catalog-spinner"/><strong>{t.catalogLoading}</strong></section>;
  if (error || !property) return <section className="detail-state error"><Building2/><h1>{t.notFound}</h1><p>{error}</p><a className="button" href={pageUrl('/propiedades')}><ArrowLeft/>{t.detailBack}</a></section>;
  const title = lang === 'es' ? property.title : property.titleEn;
  const description = lang === 'en'
    ? property.description_en || ''
    : property.description_es || property.short_description_es || '';
  const isSubdivision = property.property_type === 'subdivision';
  const lots = property.lots || [];
  const lotStatusCount = status => lots.filter(lot => lot.commercial_status === status).length;
  const lotPrices = lots.map(lot => Number(lot.price)).filter(value => Number.isFinite(value) && value > 0);
  const minimumLotPrice = lotPrices.length ? Math.min(...lotPrices) : null;
  const price = isSubdivision
    ? minimumLotPrice ? `${lang === 'es' ? 'Desde' : 'From'} ${new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(minimumLotPrice)}` : t.perLot
    : property.priceValue == null ? t.consult : new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.priceValue);
  const imageMedia = property.media.filter(item => item.media_type === 'image');
  const hasLotPolygons = lots.some(lot => lot.boundary_geojson);
  // En una lotización, el marcador general no representa la disponibilidad.
  // Solo mostramos el mapa cuando existen lotes públicos con geometría propia.
  const hasMap = isSubdivision
    ? hasLotPolygons
    : property.boundary_geojson || (property.latitude != null && property.longitude != null);
  const missingMapMessage = isSubdivision
    ? (lang === 'es'
      ? 'Los polígonos de esta lotización todavía no están publicados. Puedes dibujarlos o importar un archivo GeoJSON desde el panel administrativo.'
      : 'The polygons for this subdivision have not been published yet. You can draw them or import a GeoJSON file from the admin panel.')
    : t.noMap;
  const standardQuickItems = [
    [LandPlot, t.surface, property.land_area_m2 ? `${new Intl.NumberFormat('es-EC').format(property.land_area_m2)} m²` : property.construction_area_m2 ? `${new Intl.NumberFormat('es-EC').format(property.construction_area_m2)} m²` : null],
    [BedDouble, t.bedrooms, property.bedrooms],
    [Bath, t.bathrooms, property.bathrooms],
    [Car, lang === 'es' ? 'Parqueaderos' : 'Parking', property.parking_spaces],
  ].filter(([, , value]) => value != null && value !== '');
  const subdivisionQuickItems = [
    [LandPlot, lang === 'es' ? 'Lotes publicados' : 'Published lots', lots.length || property.subdivision?.planned_lot_count || null],
    [Check, lang === 'es' ? 'Disponibles' : 'Available', lots.length ? lotStatusCount('available') : null],
    [Calendar, lang === 'es' ? 'Reservados' : 'Reserved', lots.length ? lotStatusCount('reserved') : null],
    [Building2, lang === 'es' ? 'Vendidos' : 'Sold', lots.length ? lotStatusCount('sold') : null],
  ].filter(([, , value]) => value != null && value !== '');
  const standardDetailItems = [
    [LandPlot, t.surface, property.land_area_m2 ? `${new Intl.NumberFormat('es-EC').format(property.land_area_m2)} m²` : null],
    [Building2, lang === 'es' ? 'Construcción' : 'Construction', property.construction_area_m2 ? `${new Intl.NumberFormat('es-EC').format(property.construction_area_m2)} m²` : null],
    [BedDouble, t.bedrooms, property.bedrooms], [Bath, t.bathrooms, property.bathrooms],
    [Car, lang === 'es' ? 'Parqueaderos' : 'Parking', property.parking_spaces],
    [Building2, lang === 'es' ? 'Tipo' : 'Type', propertyTypeLabel(property.property_type, lang)],
    [Building2, lang === 'es' ? 'Pisos' : 'Floors', property.floors],
    [Calendar, lang === 'es' ? 'Año de construcción' : 'Year built', property.year_built],
    [MapPin, lang === 'es' ? 'Frente × fondo' : 'Front × depth', property.frontage_m && property.depth_m ? `${property.frontage_m} × ${property.depth_m} m` : null],
    [FileCheck2, t.documentation, property.deed_status || null],
  ].filter(([, , value]) => value != null && value !== '');
  const subdivisionDetailItems = [
    [LandPlot, lang === 'es' ? 'Cantidad planificada' : 'Planned lots', property.subdivision?.planned_lot_count],
    [Ruler, lang === 'es' ? 'Ancho de vías internas' : 'Internal road width', property.subdivision?.internal_road_width_m ? `${property.subdivision.internal_road_width_m} m` : null],
    [Trees, lang === 'es' ? 'Área verde' : 'Green area', property.subdivision?.green_area_m2 ? `${Number(property.subdivision.green_area_m2).toLocaleString('es-EC')} m²` : null],
    [FileCheck2, lang === 'es' ? 'Estado legal' : 'Legal status', property.subdivision?.legal_status],
    [FileCheck2, lang === 'es' ? 'Escrituras individuales' : 'Individual deeds', property.subdivision ? (property.subdivision.individual_deeds ? (lang === 'es' ? 'Sí' : 'Yes') : (lang === 'es' ? 'No' : 'No')) : null],
    [CircleDollarSign, lang === 'es' ? 'Financiamiento' : 'Financing', property.subdivision ? (property.subdivision.financing_available ? (lang === 'es' ? 'Disponible' : 'Available') : (lang === 'es' ? 'No disponible' : 'Not available')) : null],
  ].filter(([, , value]) => value != null && value !== '');
  const quickItems = isSubdivision ? subdivisionQuickItems : standardQuickItems;
  const detailItems = isSubdivision ? subdivisionDetailItems : standardDetailItems;
  const serviceItems = [...(property.features || []).map(item => ({ ...item, available: true })), ...(property.services || []).filter(item => item.is_available !== false).map(item => ({ ...item, available: true }))];
  const propertyLink = `${window.location.origin}${window.location.pathname}`;
  const advisorUrl = advisorWhatsappUrl(settings.phone, advisorInterestMessage(lang, { title, code: property.code, link: propertyLink }));
  const propertyCartKey = `property:${property.id}`;
  const propertyCartItem = { key: propertyCartKey, kind: 'property', id: property.id, code: property.code, title: property.title, titleEn: property.titleEn, image: property.image, location: property.location, price, area_m2: property.land_area_m2 || property.construction_area_m2, link: propertyLink };
  const propertyCartButton = !isSubdivision && <button className={`detail-cart-button ${cart.includes(propertyCartKey) ? 'selected' : ''}`} onClick={() => cart.toggle(propertyCartItem)}>{cart.includes(propertyCartKey) ? <Check/> : <ShoppingBag/>}{cart.includes(propertyCartKey) ? t.removeCart : t.addCart}</button>;
  const canContactProperty = Boolean(settings.phone && !isSubdivision);
  const phoneHref = settings.phone ? `tel:${settings.phone.replace(/\s/g, '')}` : '#';
  return <>
    <section className="detail-top"><div className="container"><a href={pageUrl('/propiedades')}><ArrowLeft/>{t.detailBack}</a><div className="detail-heading"><div><span className={`detail-status ${property.commercial_status}`}><i/>{({ available: t.available, reserved: lang === 'es' ? 'Reservada' : 'Reserved', sold: lang === 'es' ? 'Vendida' : 'Sold', not_available: lang === 'es' ? 'No disponible' : 'Not available' })[property.commercial_status] || t.available}</span><h1>{title}</h1><p><MapPin/>{property.location}</p>{quickItems.length > 0 && <div className="detail-hero-facts">{quickItems.map(([Icon,label,value]) => <span key={label}><Icon/><b>{value}</b><small>{label}</small></span>)}</div>}</div><div><small>{t.reference}</small><strong>{price}</strong>{property.negotiable && <em>{lang === 'es' ? 'Precio negociable' : 'Negotiable price'}</em>}{propertyCartButton}{canContactProperty && <a className="button button-gold" href={advisorUrl} onClick={event => openRegisteredAdvisorContact(event, [{ kind: 'property', id: property.id }], lang)}><MessageCircle/>{lang === 'es' ? 'Contactar asesor' : 'Contact advisor'}</a>}</div></div></div></section>
    <section className="detail-content"><div className="container">
      <MediaCarousel t={t} media={imageMedia} fallbackImage={property.image || asset('amazonia-banner.png')}/>
      {quickItems.length > 0 && <section className="property-quick-summary"><span className="eyebrow dark"><span/>{lang === 'es' ? 'Resumen' : 'Overview'}</span><h2>{lang === 'es' ? 'Características principales' : 'Main features'}</h2><div className="quick-summary-grid">{quickItems.map(([Icon,label,value]) => <span key={label}><Icon/><small>{label}</small><strong>{value}</strong></span>)}</div></section>}
      <div className={`property-detail-layout ${isSubdivision ? 'without-advisor' : ''}`}><main className="property-main-flow">
        <section className="property-information"><span className="eyebrow dark"><span/>{lang === 'es' ? 'Información' : 'Information'}</span><h2>{t.description}</h2><p className={!descriptionExpanded && description.length > 420 ? 'description-collapsed' : ''}>{description || (lang === 'es' ? 'Solicita información adicional a uno de nuestros asesores.' : 'Ask one of our advisors for additional information.')}</p>{description.length > 420 && <button className="description-toggle" onClick={() => setDescriptionExpanded(value => !value)}>{descriptionExpanded ? (lang === 'es' ? 'Ver menos' : 'Show less') : (lang === 'es' ? 'Ver descripción completa' : 'Read full description')}<ChevronDown/></button>}{detailItems.length > 0 && <><h3>{isSubdivision ? (lang === 'es' ? 'Detalles de la lotización' : 'Subdivision details') : (lang === 'es' ? 'Detalles del inmueble' : 'Property details')}</h3><div className="detail-facts-grid">{detailItems.map(([Icon,label,value]) => <span key={label}><Icon/><small>{label}</small><strong>{value}</strong></span>)}</div></>}</section>
        {serviceItems.length > 0 && <section className="property-services"><h2>{t.services}</h2><div className="service-access-grid">{serviceItems.map((item,index) => <span key={item.id || `${item.name_es}-${index}`}><Check/><b>{lang === 'es' ? 'Disponible' : 'Available'}</b><small>{lang === 'en' && item.name_en ? item.name_en : item.name_es}</small></span>)}</div></section>}
        <section className="map-block"><div><span className="eyebrow dark"><span/>OpenStreetMap</span><h2>{isSubdivision ? (lang === 'es' ? 'Disponibilidad de lotes' : 'Lot availability') : t.location}</h2><p><MapPin/>{property.location}</p><small>{hasMap ? (isSubdivision ? (lang === 'es' ? 'Selecciona un polígono para consultar el estado, área, precio, medidas e imágenes del lote.' : 'Select a polygon to view the lot status, area, price, dimensions and images.') : t.mapNote) : missingMapMessage}</small>{property.location_reference && <small>{property.location_reference}</small>}</div>{hasMap ? <PropertyMap t={t} lang={lang} settings={settings} property={{...property,title}}/> : <div className="map-empty"><MapPin/><span>{missingMapMessage}</span></div>}</section>
        <PropertyVideos t={t} videos={property.videos} fallbackImage={property.image}/>
        {property.panoramas.length > 0 && <section className="panorama-intro"><div><span className="eyebrow dark"><span/>360°</span><h2>{t.virtualTour}</h2><p>{t.gallery360Hint}</p></div><VirtualTour property={{...property,title}} t={t} panoramas={property.panoramas}/></section>}
        {!isSubdivision && <section className="property-final-cta"><span><MessageCircle/></span><div><h2>{lang === 'es' ? '¿Te interesa esta propiedad?' : 'Interested in this property?'}</h2><p>{lang === 'es' ? 'Habla con un asesor para recibir más información o coordinar una visita.' : 'Talk to an advisor for more information or to arrange a visit.'}</p></div>{canContactProperty && <div><a className="button button-gold" href={advisorUrl} onClick={event => openRegisteredAdvisorContact(event, [{ kind: 'property', id: property.id }], lang)}><MessageCircle/>{lang === 'es' ? 'Contactarse con un asesor' : 'Contact an advisor'}</a></div>}</section>}
      </main>{!isSubdivision && <aside className="advisor-box"><span><MessageCircle/></span><small>{lang === 'es' ? 'Atención personalizada' : 'Personal assistance'}</small><h3>{t.advisor}</h3><p>{lang === 'es' ? 'Recibe información y coordina una visita directamente con nuestro equipo.' : 'Get information and arrange a visit directly with our team.'}</p>{property.code && <div className="property-reference"><small>{lang === 'es' ? 'Código de propiedad' : 'Property code'}</small><strong>{property.code}</strong></div>}{canContactProperty && <a className="button" href={advisorUrl} onClick={event => openRegisteredAdvisorContact(event, [{ kind: 'property', id: property.id }], lang)}><MessageCircle/>WhatsApp</a>}</aside>}</div>
    </div></section>
    {canContactProperty && <nav className="mobile-contact-bar" aria-label={lang === 'es' ? 'Opciones de contacto' : 'Contact options'}><a href={advisorUrl} onClick={event => openRegisteredAdvisorContact(event, [{ kind: 'property', id: property.id }], lang)}><MessageCircle/>WhatsApp</a><a href={phoneHref}><Phone/>{lang === 'es' ? 'Llamar' : 'Call'}</a></nav>}
  </>;
}

function SoldCaseCard({ item, t, lang }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(0);
  const title = lang === 'es' ? item.title : item.titleEn;
  const stageNames = { visit: t.visit, documents: t.review, notary: t.notary, handover: t.delivery, other: lang === 'es' ? 'Otro' : 'Other' };
  const photos = item.media?.length
    ? item.media.map(entry => ({ src: entry.resource_url || entry.thumbnail_url, label: (lang === 'es' && entry.caption_es) || stageNames[entry.stage] || t.salesProcess }))
    : [{ src: item.image || asset('amazonia-banner.png'), label: t.salesProcess }];
  const stages = [[MapPin,t.visit,item.visit_completed],[FileCheck2,t.review,item.documents_completed],[Building2,t.notary,item.notary_completed],[Check,t.delivery,item.handover_completed]];
  const saleDate = item.sale_date
    ? new Intl.DateTimeFormat(lang === 'es' ? 'es-EC' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${item.sale_date}T00:00:00Z`))
    : (lang === 'es' ? 'Fecha por confirmar' : 'Date to be confirmed');
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const close = event => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', close); };
  }, [open]);
  return <><article className="sold-property-card"><div className="sold-property-image"><img src={item.image || asset('amazonia-banner.png')} alt={title} style={{objectPosition:item.position}}/><span><Check/>{t.sold}</span><small>{saleDate}</small></div><div className="sold-property-body"><p><MapPin/>{item.location}</p><h3>{title}</h3><div>{item.area && <span><LandPlot/>{item.area}</span>}<span><ShieldCheck/>{t.saleCompleted}</span></div><div className="sold-card-footer"><div><small>{item.lot ? (lang === 'es' ? 'Lote vendido' : 'Sold lot') : (lang === 'es' ? 'Propiedad vendida' : 'Sold property')}</small><strong>{item.lot ? (item.lot.lot_code || item.lot.code) : saleDate}</strong></div><button onClick={() => setOpen(true)}>{t.viewProcess}<ArrowRight/></button></div></div></article>{open && <div className="sold-process-backdrop" onMouseDown={event => event.target === event.currentTarget && setOpen(false)}><section className="sold-process-modal" role="dialog" aria-modal="true"><button className="sold-modal-close" onClick={() => setOpen(false)} aria-label={t.close}><X/></button><div className="sold-process-gallery"><div className="sold-main-photo"><img src={photos[photo].src} alt={photos[photo].label}/><span>{String(photo+1).padStart(2,'0')} / {String(photos.length).padStart(2,'0')}</span><strong>{photos[photo].label}</strong>{photos.length > 1 && <><button className="sold-prev" onClick={() => setPhoto((photo-1+photos.length)%photos.length)}><ChevronLeft/></button><button className="sold-next" onClick={() => setPhoto((photo+1)%photos.length)}><ChevronRight/></button></>}</div><div className="sold-thumbnails">{photos.map((entry,index)=><button key={index} className={photo===index?'active':''} onClick={()=>setPhoto(index)}><img src={entry.src} alt=""/><span>{String(index+1).padStart(2,'0')}</span></button>)}</div></div><div className="sold-process-info"><span className="eyebrow dark"><span/>{t.salesProcess}</span><h2>{title}</h2><p><MapPin/>{item.location}</p><blockquote>“{lang === 'es' ? item.summary_es || 'Un proceso claro, seguro y acompañado en cada etapa.' : 'A clear, secure process with support at every stage.'}”</blockquote><div className="sold-timeline">{stages.map(([Icon,label,complete],index)=><div className={complete?'complete':''} key={label}><span><Icon/></span><div><small>{lang === 'es' ? 'ETAPA' : 'STAGE'} 0{index+1}</small><strong>{label}</strong></div></div>)}</div><div className="sold-info-footer"><div><small>{t.saleCompleted}</small><strong>{saleDate}</strong></div><span><Check/>{stages.filter(([, , complete]) => complete).length}/4</span></div></div></section></div>}</>;
}

function SuccessPage({ t, lang, settings }) {
  const { cases, loading, error } = usePublicSuccessCases();
  return <><InnerHero kicker={t.successKicker} title={t.successTitle}/><section className="success-page sold-catalog"><div className="container"><div className="sold-catalog-heading"><div><span className="eyebrow dark"><span/>{t.soldProperties}</span><h2>{t.salesProcess}</h2></div><p>{t.successIntro}</p></div>{loading ? <div className="detail-state"><span className="catalog-spinner"/><strong>{lang === 'es' ? 'Cargando casos de éxito…' : 'Loading success stories…'}</strong></div> : error ? <div className="detail-state error"><AlertCircle/><h3>{lang === 'es' ? 'No pudimos cargar los casos de éxito' : 'We could not load the success stories'}</h3><p>{error}</p></div> : cases.length ? <div className="sold-property-grid">{cases.map(item=><SoldCaseCard key={item.id} item={item} t={t} lang={lang}/>)}</div> : <div className="detail-state"><ShieldCheck/><h3>{lang === 'es' ? 'Próximamente compartiremos nuevas historias' : 'We will share new stories soon'}</h3><p>{lang === 'es' ? 'Los casos publicados desde el panel administrativo aparecerán aquí.' : 'Cases published from the admin panel will appear here.'}</p></div>}</div></section><ContactStrip t={t} lang={lang} settings={settings}/></>;
}

function SellPage({ t, lang, settings }) {
  const sellTitle = lang === 'es' && settings.sell_title_es ? settings.sell_title_es : t.sellTitle;
  const sellBody = lang === 'es' && settings.sell_body_es ? settings.sell_body_es : t.sellText;
  const benefits = lang === 'es'
    ? [
      [CircleDollarSign, t.valuation, 'Analizamos ubicación, características y mercado para orientar un precio competitivo y realista.'],
      [Camera, t.promotion, 'Presentamos tu propiedad con fotografías, video, ubicación y una ficha clara para atraer compradores reales.'],
      [ShieldCheck, t.support, 'Te acompañamos durante las consultas, visitas, negociación y documentación hasta concretar la venta.'],
    ]
    : [
      [CircleDollarSign, t.valuation, 'We assess location, features and market conditions to recommend a competitive, realistic price.'],
      [Camera, t.promotion, 'We present your property with photography, video, location and a clear listing to attract genuine buyers.'],
      [ShieldCheck, t.support, 'We support you through inquiries, visits, negotiation and documentation until the sale is completed.'],
    ];
  const steps = lang === 'es'
    ? [['01', 'Cuéntanos sobre tu propiedad', 'Un asesor recibe la información inicial y coordina el primer contacto.'], ['02', 'Revisión y valoración', 'Validamos las características, ubicación y documentación disponible.'], ['03', 'Publicación profesional', 'Preparamos el contenido y publicamos la propiedad en el catálogo.'], ['04', 'Visitas y cierre', 'Gestionamos interesados y acompañamos el proceso hasta la firma.']]
    : [['01', 'Tell us about your property', 'An advisor receives the initial information and coordinates the first contact.'], ['02', 'Review and valuation', 'We verify the features, location and available documentation.'], ['03', 'Professional listing', 'We prepare the content and publish the property in the catalogue.'], ['04', 'Visits and closing', 'We manage interested buyers and support the process through signing.']];
  return <><section className="sell-page-hero"><div className="sell-page-image"><img src={settings.sell_image_url || asset('amazonia-banner.png')} alt={lang === 'es' ? 'Propiedad en la Amazonía ecuatoriana' : 'Property in the Ecuadorian Amazon'}/></div><div className="sell-page-copy"><span className="eyebrow"><span/>{t.sellKicker}</span><h1>{sellTitle}</h1><p>{sellBody}</p><a className="button button-gold" href="#contacto" onClick={event => openRegisteredAdvisorContact(event, [], lang, 'seller')}><MessageCircle/>{t.sellCta}</a><small className="sell-advisor-note"><ShieldCheck/>{lang === 'es' ? 'Te asignaremos un asesor de nuestro equipo.' : 'An advisor from our team will be assigned to you.'}</small></div></section><section className="sell-benefits"><div className="container">{benefits.map(([Icon,title,text]) => <div key={title}><span><Icon/></span><h3>{title}</h3><p>{text}</p></div>)}</div></section><section className="sell-process"><div className="container"><header><span className="eyebrow dark"><span/>{lang === 'es' ? 'Proceso sencillo' : 'Simple process'}</span><h2>{lang === 'es' ? 'Así vendemos tu propiedad' : 'How we sell your property'}</h2><p>{lang === 'es' ? 'Un proceso ordenado y acompañado desde el primer contacto.' : 'An organized, supported process from the first contact.'}</p></header><div>{steps.map(([number,title,text]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}</div><a className="button" href="#contacto" onClick={event => openRegisteredAdvisorContact(event, [], lang, 'seller')}><MessageCircle/>{t.sellCta}</a></div></section><ContactStrip t={t} lang={lang} settings={settings}/></>;
}

function ContactStrip({ t, lang, settings }) {
  return <section id="contacto" className="contact-section"><div className="container contact-card"><div><span className="eyebrow"><span/>{settings.business_name}</span><h2>{t.contactTitle}</h2><p>{lang === 'es' ? settings.tagline_es : 'More than properties, a legacy for your family.'}</p>{settings.city && <small className="contact-location"><MapPin/>{settings.city}</small>}</div><div className="contact-actions"><a className="button button-whatsapp" href="#contacto" onClick={event => openRegisteredAdvisorContact(event, [], lang, 'general')}><MessageCircle/>{t.whatsapp}</a></div></div></section>;
}

function InterestCartPage({ t, lang, settings }) {
  const cart = useInterestCart();
  const absoluteLink = item => new URL(item.link || '/', window.location.origin).href;
  const contactMessage = cart.items.length
    ? (lang === 'es'
      ? `Hola, estoy interesado en las siguientes propiedades:\n${cart.items.map(item => `• ${item.code ? `${item.code} — ` : ''}${item.title}\n${absoluteLink(item)}`).join('\n')}\nQuisiera más información.`
      : `Hello, I am interested in the following properties:\n${cart.items.map(item => `• ${item.code ? `${item.code} — ` : ''}${item.titleEn || item.title}\n${absoluteLink(item)}`).join('\n')}\nI would like more information.`)
    : '';
  const advisorUrl = settings.phone && contactMessage ? `${whatsappUrl(settings.phone)}?text=${encodeURIComponent(contactMessage)}` : '#';
  return <>
    <InnerHero kicker={lang === 'es' ? 'Tu selección' : 'Your selection'} title={lang === 'es' ? <>Propiedades que <em>te interesan</em></> : <>Properties you are <em>interested in</em></>} text={lang === 'es' ? 'Revisa casas, terrenos, fincas y lotes antes de comunicarte con un asesor.' : 'Review homes, land, farms and lots before contacting an advisor.'}/>
    <section className="interest-cart-page"><div className="container">
      <header><div><ShoppingBag/><span><h2>{t.cart}</h2><p>{cart.items.length} {lang === 'es' ? 'elementos seleccionados' : 'selected items'}</p></span></div>{cart.items.length > 0 && <button onClick={cart.clear}><Trash2/>{t.clearCart}</button>}</header>
      {cart.items.length === 0 ? <div className="interest-cart-empty"><ShoppingBag/><h3>{t.cartEmpty}</h3><p>{t.cartHint}</p><a className="button" href={pageUrl('/propiedades')}>{t.explore}<ArrowRight/></a></div> : <div className="interest-cart-layout"><div className="interest-cart-list">{cart.items.map(item => <article key={item.key}>{item.image ? <img src={item.image} alt={item.title}/> : <span className="interest-cart-placeholder"><Building2/></span>}<div><small>{item.kind === 'lot' ? (lang === 'es' ? 'Lote de lotización' : 'Subdivision lot') : (lang === 'es' ? 'Propiedad' : 'Property')}</small><h3>{lang === 'en' ? item.titleEn || item.title : item.title}</h3>{item.location && <p><MapPin/>{item.location}</p>}<div>{item.area_m2 && <span><LandPlot/>{Number(item.area_m2).toLocaleString('es-EC')} m²</span>}{item.price != null && <strong>{typeof item.price === 'number' ? new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(item.price) : item.price}</strong>}</div><a href={item.link}>{t.details}<ArrowRight/></a></div><button onClick={() => cart.remove(item.key)} aria-label={t.removeCart}><Trash2/></button></article>)}</div><aside><span><MessageCircle/></span><h2>{t.advisor}</h2><p>{lang === 'es' ? 'Enviaremos en un solo mensaje los códigos y enlaces de todas tus propiedades seleccionadas.' : 'We will send the codes and links for all selected properties in one message.'}</p>{settings.phone && <a className="button" href={advisorUrl} onClick={event => openRegisteredAdvisorContact(event, cart.items.map(item => ({ kind: item.kind, id: item.id })), lang)}><MessageCircle/>WhatsApp</a>}</aside></div>}
    </div></section>
  </>;
}

function App() {
  const language = useLanguage();
  const { settings, loading: configLoading } = useSiteSettings();
  const path = currentPage();
  let page;
  const detailMatch = path.match(/^\/propiedades\/([^/]+)$/);
  if (detailMatch) page = <PropertyDetailPage t={language.t} lang={language.lang} identifier={decodeURIComponent(detailMatch[1])} settings={settings}/>;
  else if (path === '/propiedades') page = <PropertiesPage t={language.t} lang={language.lang} settings={settings}/>;
  else if (path === '/carrito') page = <InterestCartPage t={language.t} lang={language.lang} settings={settings}/>;
  else if (path === '/casos-de-exito') page = <SuccessPage t={language.t} lang={language.lang} settings={settings}/>;
  else if (path === '/vende-con-nosotros') page = <SellPage t={language.t} lang={language.lang} settings={settings}/>;
  else page = <HomePage t={language.t} lang={language.lang} settings={settings}/>;
  return <PageShell language={language} settings={settings} configLoading={configLoading}>{page}</PageShell>;
}

createRoot(document.getElementById('root')).render(<App/>);
