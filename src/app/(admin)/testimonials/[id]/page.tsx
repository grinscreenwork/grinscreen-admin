import { getTestimonial } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TestimonialForm } from "@/components/forms/TestimonialForm";

export const metadata = { title: "Edit testimonial" };

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const testimonial = await getTestimonial(id);
  return (
    <>
      <PageHeader title="Edit testimonial" description={`${testimonial.client_name} · ${testimonial.organization}`} />
      <TestimonialForm testimonial={testimonial} />
    </>
  );
}
