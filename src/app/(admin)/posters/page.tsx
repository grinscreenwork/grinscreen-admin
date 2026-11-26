import Link from "next/link";
import { listPosters } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton, FlagToggle } from "@/components/RowActions";
import { SortableList } from "@/components/SortableList";
import { deletePoster, reorderPosters, setPosterFlag } from "@/app/actions/posters";

export const metadata = { title: "Posters" };

export default async function PostersPage() {
  const posters = await listPosters();

  return (
    <>
      <PageHeader
        title="Posters"
        description="Static designs shown in the portfolio carousel. A poster can hold one image or a swipeable set."
        action={<LinkButton href="/posters/new" variant="primary">+ Add poster</LinkButton>}
      />
      {posters.length === 0 ? (
        <EmptyState title="No posters yet." action={<LinkButton href="/posters/new" variant="primary">Add your first poster</LinkButton>} />
      ) : (
        <SortableList
          onReorder={reorderPosters}
          items={posters.map((p) => ({
            id: p.id,
            label: p.title,
            content: (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 py-3 pr-3 sm:flex sm:gap-4">
                <Link href={`/posters/${p.id}`} className="shrink-0">
                  <div className="h-20 w-16 overflow-hidden rounded-md bg-bg">
                    {p.images[0] && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/posters/${p.id}`} className="block truncate font-medium hover:text-brand-bright">
                    {p.title}
                  </Link>
                  <p className="truncate text-xs text-fg-muted">{p.description || "No description"}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                    {p.images.length} image{p.images.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 border-t border-border pt-3 sm:contents">
                  <div className="flex items-center gap-5">
                    <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                      Live
                      <FlagToggle label={`Published: ${p.title}`} checked={p.published} onToggle={setPosterFlag.bind(null, p.id, "published")} />
                    </label>
                    <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                      Featured
                      <FlagToggle label={`Featured: ${p.title}`} checked={p.featured} onToggle={setPosterFlag.bind(null, p.id, "featured")} />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <LinkButton href={`/posters/${p.id}`} size="sm">Edit</LinkButton>
                    <DeleteButton what={`"${p.title}"`} onDelete={deletePoster.bind(null, p.id)} />
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
