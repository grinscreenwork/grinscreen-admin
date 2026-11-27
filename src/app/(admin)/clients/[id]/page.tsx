import { getClient } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "@/components/forms/ClientForm";

export const metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  return (
    <>
      <PageHeader title="Edit client" description={client.name} />
      <ClientForm client={client} />
    </>
  );
}
