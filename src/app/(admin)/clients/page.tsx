import Link from "next/link";
import { listClients } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton, FlagToggle } from "@/components/RowActions";
import { SortableList } from "@/components/SortableList";
import { deleteClient, reorderClients, setClientPublished } from "@/app/actions/clients";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <>
      <PageHeader
        title="Clients"
        description="Logos shown in “Trusted by” on the home page, in the portfolio and on the Our Clients page. Hovering a logo shows the name you set here."
        action={<LinkButton href="/clients/new" variant="primary">+ Add client</LinkButton>}
      />
      {clients.length === 0 ? (
        <EmptyState title="No clients yet." action={<LinkButton href="/clients/new" variant="primary">Add your first client</LinkButton>} />
      ) : (
        <SortableList
          onReorder={reorderClients}
          items={clients.map((c) => ({
            id: c.id,
            label: c.name,
            content: (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 py-3 pr-3 sm:flex sm:gap-4">
                <Link href={`/clients/${c.id}`} className="shrink-0">
                  {/* Dark tile on purpose: this is the background the logo sits on, on the website. */}
                  <div className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-md bg-bg p-1.5">
                    <img src={c.logo_url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" decoding="async" />
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/clients/${c.id}`} className="block truncate font-medium hover:text-brand-bright">
                    {c.name}
                  </Link>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 border-t border-border pt-3 sm:contents">
                  <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                    Live
                    <FlagToggle label={`Published: ${c.name}`} checked={c.published} onToggle={setClientPublished.bind(null, c.id)} />
                  </label>
                  <div className="flex items-center gap-2">
                    <LinkButton href={`/clients/${c.id}`} size="sm">Edit</LinkButton>
                    <DeleteButton what={`${c.name}`} onDelete={deleteClient.bind(null, c.id)} />
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
