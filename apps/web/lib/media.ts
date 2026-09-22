/**
 * صور التقرير: صورة القمر الصناعي وصورة الموقع.
 *
 * قراران:
 * ١. **الصور لا تغادر الجهاز.** لا رفع ولا خادم — تُضغط في المتصفح وتُحفظ
 *    في IndexedDB. أرض المستثمر وموقعها معلومة حسّاسة قبل الصفقة.
 * ٢. **IndexedDB لا localStorage.** صورة واحدة تتجاوز حصّة localStorage
 *    (نحو ٥ ميغا) فتُسقط معها كل حالة العمل المحفوظة. الفصل يحمي الاثنين.
 */

const DB = 'investreal-media';
const STORE = 'land-images';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    // تصفّح خاص أو تخزين معطّل — الأداة تعمل بلا صور محفوظة.
    return null;
  }
}

export type ImageSlot = 'satellite' | 'site';

export const putImage = (slot: ImageSlot, dataUrl: string) =>
  withStore('readwrite', (s) => s.put(dataUrl, slot));

export const getImage = (slot: ImageSlot) =>
  withStore<string>('readonly', (s) => s.get(slot) as IDBRequest<string>);

export const removeImage = (slot: ImageSlot) =>
  withStore('readwrite', (s) => s.delete(slot));

/**
 * الضغط قبل الحفظ: لقطة قمر صناعي من الجوال قد تتجاوز ٨ ميغا، وهي في
 * التقرير لا تحتاج أكثر من ١٦٠٠ بكسل. الحدّ يحمي التخزين وسرعة الطباعة.
 */
export function compressImage(file: File, maxPx = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('الملف ليس صورة صالحة'));
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('تعذّر تجهيز الصورة'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
