export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    if (navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null)
        );
      });
    }
    return null;
  }
}

export async function getCurrentLocationAsAddress(): Promise<string | null> {
  const pos = await getCurrentLocation();
  if (!pos) return null;
  const { lat, lng } = pos;
  const coordsStr = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
  if (!navigator.onLine) return coordsStr;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    const addr = data?.address;
    if (addr) {
      const parts = [
        addr.road,
        addr.house_number,
        addr.neighbourhood || addr.suburb,
        addr.city || addr.town || addr.village,
        addr.state,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : coordsStr;
    }
  } catch {
    /* fallback to coords */
  }
  return coordsStr;
}
