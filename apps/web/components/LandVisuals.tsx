'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Card, NumberField, TextField } from '@/components/ui';
import { ParcelSketch, SIDE_LABEL, type ParcelDims } from '@/components/ParcelSketch';
import { compressImage, getImage, putImage, removeImage, type ImageSlot } from '@/lib/media';
import { mapsUrl, parseCoordinates } from '@/lib/geo';

/**
 * الأدلّة المرئية: صورة القمر الصناعي، كروكي الأبعاد، وكيو آر للموقع.
 *
 * تقرير بلا صورة يُقرأ كرأي. وهذه الثلاثة تُجيب أسئلة يسألها كل قارئ
 * بعد الرقم مباشرةً: كيف تبدو؟ وما شكلها وأبعادها؟ وأين هي بالضبط؟
 */

function ImageSlotCard({ slot, title, hint, value, onChange }: {
  slot: ImageSlot; title: string; hint: string;
  value: string | null; onChange: (v: string | null) => void;
}) {
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressImage(file);
      await putImage(slot, dataUrl);
      onChange(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل الصورة');
    }
  };

  const clear = async () => {
    await removeImage(slot);
    onChange(null);
    if (input.current) input.current.value = '';
  };

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink/50">{hint}</p>
        </div>
        {value && (
          <button onClick={clear} className="shrink-0 text-[12px] text-danger/80 hover:underline">إزالة</button>
        )}
      </div>

      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={title} className="w-full rounded-xl border border-black/[0.07] object-cover" />
      ) : (
        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/15 px-3 py-8 text-center text-[13px] text-ink/45 hover:bg-paper">
          <input ref={input} type="file" accept="image/*" className="hidden"
            onChange={(e) => pick(e.target.files?.[0])} />
          اختر صورة من جهازك
        </label>
      )}
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  );
}

export function LandVisuals({
  dims, onDims, areaSqm, location, onLocation, images, onImage, districtLabel,
}: {
  dims: ParcelDims;
  onDims: (d: ParcelDims) => void;
  areaSqm: number;
  location: string;
  onLocation: (v: string) => void;
  images: { satellite: string | null; site: string | null };
  onImage: (slot: ImageSlot, v: string | null) => void;
  districtLabel: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const url = mapsUrl(location);
  const coords = parseCoordinates(location);

  useEffect(() => {
    let alive = true;
    if (!url) { setQr(null); return; }
    QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then((d) => { if (alive) setQr(d); })
      .catch(() => { if (alive) setQr(null); });
    return () => { alive = false; };
  }, [url]);

  const setSide = (side: keyof typeof SIDE_LABEL, v: number) => onDims({ ...dims, [side]: v });
  const toggleStreet = (side: keyof typeof SIDE_LABEL) =>
    onDims({
      ...dims,
      streetSides: dims.streetSides.includes(side)
        ? dims.streetSides.filter((s) => s !== side)
        : [...dims.streetSides, side],
    });

  return (
    <Card title="الأدلّة المرئية" hint="الصور تبقى على جهازك ولا تُرفع إلى أي خادم.">
      <div className="grid gap-5 md:grid-cols-2">
        <ImageSlotCard slot="satellite" title="صورة القمر الصناعي"
          hint="لقطة من الخرائط تُظهر الأرض ومحيطها والطرق حولها."
          value={images.satellite} onChange={(v) => onImage('satellite', v)} />
        <ImageSlotCard slot="site" title="صورة الموقع"
          hint="صورة من الزيارة الميدانية: الواجهة، الشارع، حالة الأرض."
          value={images.site} onChange={(v) => onImage('site', v)} />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[14px] font-semibold">كروكي الأرض</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['north', 'south', 'east', 'west'] as const).map((side) => (
              <div key={side} className="rounded-xl border border-black/[0.07] p-2">
                <NumberField label={`ضلع ${SIDE_LABEL[side]}`} value={dims[side]}
                  onChange={(v) => setSide(side, v)} suffix="م" />
                <label className="mt-1.5 flex items-center gap-2 text-[12px] text-ink/60">
                  <input type="checkbox" checked={dims.streetSides.includes(side)}
                    onChange={() => toggleStreet(side)} />
                  مطلّ على شارع
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-[14px] font-semibold">الرسم بمقياسه</h3>
          <ParcelSketch dims={dims} areaSqm={areaSqm} label={districtLabel} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <h3 className="mb-2 text-[14px] font-semibold">موقع الأرض وكيو آر المعاينة</h3>
          <TextField label="الإحداثيات أو رابط الخرائط" value={location} onChange={onLocation}
            placeholder="24.774265, 46.738586" />
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink/50">
            {coords
              ? `إحداثيات مقروءة: ${coords.lat}, ${coords.lng} — الكيو آر يفتح الموقع مباشرةً في تطبيق الخرائط.`
              : url
                ? 'رابط مقروء — سيُرمَّز كما هو.'
                : 'الصق إحداثيات مفصولة بفاصلة، أو رابط موقع من تطبيق الخرائط.'}
          </p>
        </div>
        {qr && (
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="كيو آر لموقع الأرض" className="mx-auto h-32 w-32 rounded-xl border border-black/[0.07]" />
            <p className="mt-1 text-[11px] text-ink/50">امسحه للذهاب إلى الأرض</p>
          </div>
        )}
      </div>
    </Card>
  );
}

/** يستعيد الصور المحفوظة عند فتح الصفحة. */
export function useStoredImages() {
  const [images, setImages] = useState<{ satellite: string | null; site: string | null }>({
    satellite: null, site: null,
  });
  useEffect(() => {
    let alive = true;
    Promise.all([getImage('satellite'), getImage('site')]).then(([satellite, site]) => {
      if (alive) setImages({ satellite, site });
    });
    return () => { alive = false; };
  }, []);
  const set = (slot: ImageSlot, v: string | null) => setImages((s) => ({ ...s, [slot]: v }));
  return { images, setImage: set };
}
