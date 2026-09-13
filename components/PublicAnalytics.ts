const VISITOR_STORAGE_KEY = 'arunika_visitor_id';

type LandingEventName = 'view' | 'cta_click';

const isVisitorId = (value: unknown): value is string => (
  typeof value === 'string'
  && /^vis_[a-z0-9_]+$/.test(value)
  && value.length <= 128
);

export const getVisitorId = () => {
  try {
    const storedValue = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (storedValue) {
      try {
        const parsedValue: unknown = JSON.parse(storedValue);
        if (isVisitorId(parsedValue)) {
          window.localStorage.setItem(VISITOR_STORAGE_KEY, parsedValue);
          return parsedValue;
        }
      } catch {
        if (isVisitorId(storedValue)) return storedValue;
      }
    }
  } catch {
    // Private browsing or disabled storage should not prevent a public page
    // from rendering or sending a best-effort event.
  }

  const id = `vis_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
  try {
    window.localStorage.setItem(VISITOR_STORAGE_KEY, id);
  } catch {
    // The generated id is still useful for this page view when storage fails.
  }
  return id;
};

export const getDeviceType = () => {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
};

const getSource = () => {
  if (typeof window === 'undefined') return 'direct';
  const hashQueryIndex = window.location.hash.indexOf('?');
  const hashQuery = hashQueryIndex >= 0 ? window.location.hash.slice(hashQueryIndex + 1) : '';
  const searchParams = new URLSearchParams(window.location.search || hashQuery);
  return searchParams.get('ref') || searchParams.get('utm_source') || 'direct';
};

const getReferrer = () => {
  if (typeof document === 'undefined' || !document.referrer) return 'direct';
  try {
    return new URL(document.referrer).origin;
  } catch {
    return 'external';
  }
};

export const trackPublicLandingEvent = async (
  client: any,
  slug: string,
  eventName: LandingEventName,
  eventLabel = ''
) => {
  if (!client || !slug || typeof window === 'undefined') return false;

  try {
    const hashRoute = window.location.hash.startsWith('#/') ? window.location.hash : '';
    const currentPath = `${window.location.pathname}${window.location.search}${hashRoute}`;
    const { data, error } = await client.rpc('track_public_landing_event', {
      p_slug: decodeURIComponent(slug).slice(0, 100),
      p_event_name: eventName,
      p_event_label: eventLabel.slice(0, 120),
      p_visitor_id: getVisitorId(),
      p_device_type: getDeviceType(),
      p_user_agent: navigator.userAgent.slice(0, 512),
      p_referrer: getReferrer().slice(0, 512),
      p_source: getSource().slice(0, 120),
      p_full_path: currentPath.slice(0, 2048)
    });
    if (error) throw error;
    return data !== false;
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Landing analytics event was not recorded.', error);
    return false;
  }
};
