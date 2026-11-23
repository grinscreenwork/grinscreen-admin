import Link from "next/link";
import { listTestimonials } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton, FlagToggle } from "@/components/RowActions";
import { deleteTestimonial, setTestimonialFlag } from "@/app/actions/testimonials";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const items = await listTestimonials();

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="What clients say. Featured ones appear on the home and portfolio pages."
        action={<LinkButton href="/testimonials/new" variant="primary">+ Add testimonial</LinkButton>}
      />
      {items.length === 0 ? (
        <EmptyState title="No testimonials yet." action={<LinkButton href="/testimonials/new" variant="primary">Add your first testimonial</LinkButton>} />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {items.map((t) => (
            <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-xl border border-border bg-surface p-3 sm:flex sm:gap-4">
              <Link href={`/testimonials/${t.id}`} className="shrink-0">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-bg">
                  {t.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/testimonials/${t.id}`} className="block truncate font-medium hover:text-brand-bright">
                  {t.client_name}
                  <span className="font-normal text-fg-muted"> · {t.organization}</span>
                </Link>
                <p className="line-clamp-2 text-xs text-fg-muted">&ldquo;{t.quote}&rdquo;</p>
              </div>
              {/* Mobile: its own row under the title. Desktop (`contents`): inline, as before. */}
              <div className="col-span-2 flex items-center justify-between gap-4 border-t border-border pt-3 sm:contents">
              <div className="flex items-center gap-5">
                <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                  Live
                  <FlagToggle label={`Published: ${t.client_name}`} checked={t.published} onToggle={setTestimonialFlag.bind(null, t.id, "published")} />
                </label>
                <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                  Featured
                  <FlagToggle label={`Featured: ${t.client_name}`} checked={t.featured} onToggle={setTestimonialFlag.bind(null, t.id, "featured")} />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <LinkButton href={`/testimonials/${t.id}`} size="sm">Edit</LinkButton>
                <DeleteButton what={`${t.client_name}'s testimonial`} onDelete={deleteTestimonial.bind(null, t.id)} />
              </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
