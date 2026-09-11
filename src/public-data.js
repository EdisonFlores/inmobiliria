import { useEffect, useState } from 'react';
import { supabaseGet } from './site-settings';

const typeNames = {
  house: 'Casa',
  apartment: 'Departamento',
  land: 'Terreno',
  farm: 'Finca',
  lot: 'Lote',
  subdivision: 'Lotización',
  commercial: 'Local comercial',
  office: 'Oficina',
  warehouse: 'Bodega',
  other: 'Otro',
};

const statusNames = {
  available: 'Disponible',
  reserved: 'Reservada',
};

export function normalizeProperty(property) {
  const allMedia = (property.property_media || [])
    .filter((item) => item.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const images = allMedia
    .filter((item) => item.media_type === 'image')
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || (a.sort_order || 0) - (b.sort_order || 0));
  const locationParts = [property.sector, property.parish, property.canton, property.province]
    .filter((value, index, values) => value && values.indexOf(value) === index);
  const areaValue = Number(property.land_area_m2 || property.construction_area_m2) || 0;

  return {
    ...property,
    type: typeNames[property.property_type] || typeNames.other,
    badge: property.featured ? 'Destacada' : statusNames[property.commercial_status] || 'Disponible',
    title: property.title_es,
    titleEn: property.title_en || property.title_es,
    location: locationParts.join(' · ') || 'Ubicación por confirmar',
    areaValue,
    area: areaValue ? `${new Intl.NumberFormat('es-EC').format(areaValue)} m²` : '',
    priceValue: property.show_price && property.price != null ? Number(property.price) : null,
    beds: property.bedrooms,
    baths: property.bathrooms,
    media: allMedia,
    images,
    panoramas: allMedia.filter((item) => item.media_type === 'panorama_360'),
    videos: allMedia.filter((item) => item.media_type === 'video'),
    image: images[0]?.resource_url || images[0]?.thumbnail_url || '',
    imageAlt: images[0]?.alt_text_es || property.title_es,
    position: 'center',
  };
}

export function usePublicProperty(identifier) {
  const [state, setState] = useState({ property: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    const identifierColumn = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(identifier) ? 'id' : 'slug';
    const select = [
      'id,slug,code,property_type,commercial_status,title_es,title_en,short_description_es,description_es,description_en',
      'price,show_price,negotiable,land_area_m2,construction_area_m2,bedrooms,bathrooms,parking_spaces,floors,year_built,property_condition',
      'frontage_m,depth_m,topography,road_relation,road_surface,land_use,flood_risk,deed_status,water_source,living_rooms,dining_rooms,kitchens',
      'furnished_status,construction_material,roof_material,province,canton,parish,sector,location_reference,latitude,longitude,boundary_geojson,location_visibility',
      'property_media(*)',
    ].join(',');

    async function load() {
      try {
        const rows = await supabaseGet('properties', {
          select,
          [identifierColumn]: `eq.${identifier}`,
          publication_status: 'eq.published',
          limit: '1',
        }, controller.signal);
        if (!rows?.[0]) throw new Error('No encontramos esta propiedad o ya no está publicada.');
        const property = normalizeProperty(rows[0]);
        const [featureResult, serviceResult, subdivisionResult] = await Promise.allSettled([
          supabaseGet('property_features', { select: '*', property_id: `eq.${property.id}`, order: 'sort_order.asc' }, controller.signal),
          supabaseGet('property_services', { select: '*', property_id: `eq.${property.id}`, order: 'sort_order.asc' }, controller.signal),
          property.property_type === 'subdivision'
            ? supabaseGet('subdivisions', { select: '*', property_id: `eq.${property.id}`, limit: '1' }, controller.signal)
            : Promise.resolve([]),
        ]);
        property.features = featureResult.status === 'fulfilled' ? featureResult.value : [];
        property.services = serviceResult.status === 'fulfilled' ? serviceResult.value : [];
        property.subdivision = subdivisionResult.status === 'fulfilled' ? subdivisionResult.value?.[0] || null : null;
        property.lots = [];
        if (property.subdivision?.id) {
          try {
            const lots = await supabaseGet('lots', {
              select: 'id,lot_code,code,frontage_m,depth_m,area_m2,price,commercial_status,publication_status,boundary_geojson',
              subdivision_id: `eq.${property.subdivision.id}`,
              publication_status: 'eq.published',
              order: 'lot_code.asc',
            }, controller.signal);
            let lotMedia = [];
            if (lots.length) {
              try {
                lotMedia = await supabaseGet('lot_media', {
                  select: 'id,lot_id,media_type,resource_url,thumbnail_url,title_es,alt_text_es,sort_order',
                  lot_id: `in.(${lots.map(lot => lot.id).join(',')})`,
                  media_type: 'eq.image',
                  order: 'sort_order.asc',
                }, controller.signal);
              } catch (mediaError) {
                console.warn('No se pudieron cargar las imágenes públicas de los lotes.', mediaError);
              }
            }
            property.lots = lots.map(lot => ({
              ...lot,
              media: lotMedia.filter(item => item.lot_id === lot.id),
            }));
          } catch (lotError) {
            console.warn('No se pudieron cargar los lotes públicos.', lotError);
          }
        }
        setState({ property, loading: false, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setState({ property: null, loading: false, error: error.message });
      }
    }
    load();
    return () => controller.abort();
  }, [identifier]);

  return state;
}

export function usePublishedProperties() {
  const [state, setState] = useState({ properties: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await supabaseGet('properties', {
          select: 'id,slug,property_type,commercial_status,title_es,title_en,short_description_es,price,show_price,negotiable,province,canton,parish,sector,land_area_m2,construction_area_m2,bedrooms,bathrooms,featured,published_at,property_media(id,media_type,resource_url,thumbnail_url,title_es,alt_text_es,is_cover,is_active,sort_order)',
          publication_status: 'eq.published',
          commercial_status: 'in.(available,reserved)',
          order: 'featured.desc,published_at.desc',
        }, controller.signal);
        const subdivisionProperties = (data || []).filter(property => property.property_type === 'subdivision');
        let subdivisions = [];
        let lots = [];
        if (subdivisionProperties.length) {
          subdivisions = await supabaseGet('subdivisions', {
            select: 'id,property_id,planned_lot_count',
            property_id: `in.(${subdivisionProperties.map(property => property.id).join(',')})`,
          }, controller.signal);
          if (subdivisions.length) {
            lots = await supabaseGet('lots', {
              select: 'id,subdivision_id,price,commercial_status,publication_status',
              subdivision_id: `in.(${subdivisions.map(subdivision => subdivision.id).join(',')})`,
              publication_status: 'eq.published',
            }, controller.signal);
          }
        }
        const properties = (data || []).map(rawProperty => {
          const property = normalizeProperty(rawProperty);
          const subdivision = subdivisions.find(item => item.property_id === property.id);
          if (!subdivision) return property;
          const propertyLots = lots.filter(lot => lot.subdivision_id === subdivision.id);
          const prices = propertyLots.map(lot => Number(lot.price)).filter(price => Number.isFinite(price) && price >= 0);
          return {
            ...property,
            subdivisionSummary: {
              planned: subdivision.planned_lot_count,
              published: propertyLots.length,
              available: propertyLots.filter(lot => lot.commercial_status === 'available').length,
              reserved: propertyLots.filter(lot => lot.commercial_status === 'reserved').length,
              minimumPrice: prices.length ? Math.min(...prices) : null,
            },
          };
        });
        setState({ properties, loading: false, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setState({ properties: [], loading: false, error: error.message });
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return state;
}

export function usePublicSuccessCases() {
  const [state, setState] = useState({ cases: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const cases = await supabaseGet('success_cases', {
          select: 'id,property_id,lot_id,slug,title_es,summary_es,sale_date,visit_completed,documents_completed,notary_completed,handover_completed,is_featured,sort_order,created_at',
          publication_status: 'eq.published',
          order: 'is_featured.desc,sort_order.asc,sale_date.desc',
        }, controller.signal);

        if (!cases.length) {
          setState({ cases: [], loading: false, error: null });
          return;
        }

        const caseIds = cases.map(item => item.id);
        const propertyIds = [...new Set(cases.map(item => item.property_id).filter(Boolean))];
        const lotIds = [...new Set(cases.map(item => item.lot_id).filter(Boolean))];
        const [mediaResult, propertyResult, lotResult] = await Promise.allSettled([
          supabaseGet('success_case_media', {
            select: 'id,success_case_id,media_type,stage,resource_url,thumbnail_url,caption_es,sort_order',
            success_case_id: `in.(${caseIds.join(',')})`,
            media_type: 'eq.image',
            order: 'sort_order.asc',
          }, controller.signal),
          propertyIds.length ? supabaseGet('properties', {
            select: 'id,slug,property_type,title_es,title_en,province,canton,parish,sector,land_area_m2,construction_area_m2',
            id: `in.(${propertyIds.join(',')})`,
          }, controller.signal) : Promise.resolve([]),
          lotIds.length ? supabaseGet('lots', {
            select: 'id,lot_code,code,area_m2,frontage_m,depth_m',
            id: `in.(${lotIds.join(',')})`,
          }, controller.signal) : Promise.resolve([]),
        ]);

        const media = mediaResult.status === 'fulfilled' ? mediaResult.value : [];
        const properties = propertyResult.status === 'fulfilled' ? propertyResult.value : [];
        const lots = lotResult.status === 'fulfilled' ? lotResult.value : [];
        const normalized = cases.map(item => {
          const property = properties.find(value => value.id === item.property_id);
          const lot = lots.find(value => value.id === item.lot_id);
          const caseMedia = media.filter(value => value.success_case_id === item.id);
          const locationParts = [property?.sector, property?.parish, property?.canton, property?.province]
            .filter((value, index, values) => value && values.indexOf(value) === index);
          const area = Number(lot?.area_m2 || property?.land_area_m2 || property?.construction_area_m2) || null;
          return {
            ...item,
            property,
            lot,
            media: caseMedia,
            title: item.title_es,
            titleEn: property?.title_en || item.title_es,
            location: locationParts.join(' · ') || 'Ubicación por confirmar',
            area: area ? `${new Intl.NumberFormat('es-EC').format(area)} m²` : '',
            image: caseMedia[0]?.resource_url || caseMedia[0]?.thumbnail_url || '',
            position: 'center',
          };
        });
        setState({ cases: normalized, loading: false, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setState({ cases: [], loading: false, error: error.message });
      }
    }

    load();
    return () => controller.abort();
  }, []);

  return state;
}
