import Link from "next/link";
import { listPhotos } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton, FlagToggle } from "@/components/RowActions";
import { SortableList } from "@/components/SortableList";
import { deletePhoto, reorderPhotos, setPhotoPublished } from "@/app/actions/photos";
import { BulkPhotoUpload } from "./BulkPhotoUpload";

export const metadata = { title: "Photography" };

export default async function PhotographyPage() {
  const photos = await listPhotos();

  return (
    <>
      <PageHeader
        title="Photography"
        description="Photos shown in the Photography section of the portfolio and on the Photography page."
      />
      <BulkPhotoUpload />
      {photos.length === 0 ? (
        <EmptyState title="No photos yet. Add some above." />
      ) : (
        <SortableList
          onReorder={reorderPhotos}
          items={photos.map((p) => ({
            id: p.id,
            label: p.title || "photo",
            content: (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 py-3 pr-3 sm:flex sm:gap-4">
                <Link href={`/photography/${p.id}`} className="shrink-0">
                  <div className="h-20 w-28 overflow-hidden rounded-md bg-bg">
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/photography/${p.id}`} className="block truncate font-medium hover:text-brand-bright">
                    {p.title || <span className="font-normal text-fg-muted">No caption</span>}
                  </Link>
                  {p.width && p.height ? (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                      {p.width > p.height ? "Landscape" : p.width < p.height ? "Portrait" : "Square"}
                    </p>
                  ) : null}
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 border-t border-border pt-3 sm:contents">
                  <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                    Live
                    <FlagToggle label={`Published: ${p.title || "photo"}`} checked={p.published} onToggle={setPhotoPublished.bind(null, p.id)} />
                  </label>
                  <div className="flex items-center gap-2">
                    <LinkButton href={`/photography/${p.id}`} size="sm">Edit</LinkButton>
                    <DeleteButton what="this photo" onDelete={deletePhoto.bind(null, p.id)} />
                  </div>
                </div>
              </div>
            ),
          }))}
        />
      )}
    </>
  );
}
