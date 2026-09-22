/**
 * موقع الأرض: رابط خرائط وكيو آر كود.
 *
 * الغرض عملي بحت: قارئ التقرير الذي أقنعه الرقم سيسأل بعدها مباشرةً
 * «وين بالضبط؟». الكيو آر يختصر الطريق من الورقة إلى الموقع.
 */

/** يقبل إحداثيات ملصوقة بأي شكل معتاد: «24.77, 46.73» أو رابط خرائط. */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const text = input.trim();
  if (!text) return null;

  // من رابط خرائط: @lat,lng أو q=lat,lng أو !3dlat!4dlng
  const patterns = [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return validate(Number(m[1]), Number(m[2]));
  }

  const pair = text.match(/^(-?\d+(?:\.\d+)?)\s*[,،]\s*(-?\d+(?:\.\d+)?)$/);
  if (pair) return validate(Number(pair[1]), Number(pair[2]));
  return null;
}

function validate(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** الرابط الذي يُرمَّز في الكيو آر: يفتح الموقع في تطبيق الخرائط مباشرةً. */
export function mapsUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const coords = parseCoordinates(text);
  if (coords) return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  return /^https?:\/\//i.test(text) ? text : null;
}
