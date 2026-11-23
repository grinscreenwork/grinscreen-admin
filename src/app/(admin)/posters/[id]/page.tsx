import { getPoster } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { PosterForm } from "@/components/forms/PosterForm";

export const metadata = { title: "Edit poster" };

export default async function EditPosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poster = await getPoster(id);
  return (
    <>
      <PageHeader title="Edit poster" description={poster.title} />
      <PosterForm poster={poster} />
    </>
  );
}
