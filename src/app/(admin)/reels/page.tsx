import Link from "next/link";
import { listReels } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton, FlagToggle } from "@/components/RowActions";
import { deleteReel, setReelFlag } from "@/app/actions/reels";

export const metadata = { title: "Reels" };

export default async function ReelsPage() {
  const reels = await listReels();

  return (
    <>
      <PageHeader
        title="Reels"
        description="Short-form videos shown on the home and portfolio pages. They always play muted."
        action={<LinkButton href="/reels/new" variant="primary">+ Add reel</LinkButton>}
      />
      {reels.length === 0 ? (
        <EmptyState title="No reels yet." action={<LinkButton href="/reels/new" variant="primary">Add your first reel</LinkButton>} />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {reels.map((r) => (
            <li key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-xl border border-border bg-surface p-3 sm:flex sm:gap-4">
              <Link href={`/reels/${r.id}`} className="shrink-0">
                <div className="h-24 w-[54px] overflow-hidden rounded-md bg-bg">
                  {r.poster_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.poster_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/reels/${r.id}`} className="block truncate font-medium hover:text-brand-bright">
                  {r.title}
                </Link>
                <p className="truncate text-xs text-fg-muted">{r.description || r.client_name || "No description"}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">{r.aspect_ratio} · order {r.sort_order}</p>
              </div>
              {/* Mobile: its own row under the title. Desktop (`contents`): inline, as before. */}
              <div className="col-span-2 flex items-center justify-between gap-4 border-t border-border pt-3 sm:contents">
              <div className="flex items-center gap-5">
                <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                  Live
                  <FlagToggle label={`Published: ${r.title}`} checked={r.published} onToggle={setReelFlag.bind(null, r.id, "published")} />
                </label>
                <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                  Home
                  <FlagToggle label={`Featured on home: ${r.title}`} checked={r.featured} onToggle={setReelFlag.bind(null, r.id, "featured")} />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <LinkButton href={`/reels/${r.id}`} size="sm">Edit</LinkButton>
                <DeleteButton what={`"${r.title}" (it will also be removed from any case study using it)`} onDelete={deleteReel.bind(null, r.id)} />
              </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
