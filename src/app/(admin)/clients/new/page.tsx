import { PageHeader } from "@/components/ui";
import { ClientForm } from "@/components/forms/ClientForm";

export const metadata = { title: "Add client" };

export default function NewClientPage() {
  return (
    <>
      <PageHeader title="Add client" />
      <ClientForm />
    </>
  );
}
