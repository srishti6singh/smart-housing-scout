import { useState } from 'react';
import { photoUrl } from '../../../shared/listings';
import type { Listing } from '../../../shared/types';
import { Dialog } from '../Dialog';
import { IconGrid } from '../icons';
import { Img } from '../Img';
import { Carousel } from '../ListingCard';

/** Airbnb-style gallery: one large image and four small, with "Show all photos". */
export function Gallery({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  const [main, ...rest] = listing.photos;
  const small = rest.slice(0, 4);

  return (
    <>
      <div className="md:hidden">
        <Carousel photos={listing.photos} title={listing.title} rounded="rounded-card" />
      </div>
      <div className="relative hidden h-[440px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-card md:grid">
        <button type="button" onClick={() => setOpen(true)} className="group col-span-2 row-span-2 overflow-hidden" aria-label={`Open all photos, starting with ${main.room}`}>
          <Img src={photoUrl(main.url, 1100)} alt={main.alt} room={main.room} className="transition-transform duration-300 group-hover:scale-[1.02]" />
        </button>
        {small.map((p) => (
          <button key={p.id} type="button" onClick={() => setOpen(true)} className="group overflow-hidden" aria-label={`Open all photos: ${p.room}`}>
            <Img src={photoUrl(p.url, 560)} alt={p.alt} room={p.room} className="transition-transform duration-300 group-hover:scale-[1.03]" />
          </button>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="btn-secondary absolute bottom-4 right-4 px-4 py-2 shadow-lift">
          <IconGrid size={16} /> Show all photos
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-faint">Listing photos supplied by the landlord. Sample listing: stock photos, illustrative only.</p>

      <Dialog open={open} onClose={() => setOpen(false)} title={`All photos · ${listing.street}`} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          {listing.photos.map((p, i) => (
            <figure key={p.id} className={i === 0 ? 'sm:col-span-2' : ''}>
              <div className="aspect-[4/3] overflow-hidden rounded-img">
                <Img src={photoUrl(p.url, 1100)} alt={p.alt} room={p.room} loading="lazy" />
              </div>
              <figcaption className="mt-2 text-sm text-ink-muted">{p.room}</figcaption>
            </figure>
          ))}
        </div>
      </Dialog>
    </>
  );
}
