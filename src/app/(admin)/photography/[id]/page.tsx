import { getPhoto } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { PhotoForm } from "@/components/forms/PhotoForm";

export const metadata = { title: "Edit photo" };

export default async function EditPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await getPhoto(id);
  return (
    <>
      <PageHeader title="Edit photo" />
      <PhotoForm photo={photo} />
    </>
  );
}
