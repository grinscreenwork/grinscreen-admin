import { PageHeader } from "@/components/ui";
import { TestimonialForm } from "@/components/forms/TestimonialForm";

export const metadata = { title: "Add testimonial" };

export default function NewTestimonialPage() {
  return (
    <>
      <PageHeader title="Add testimonial" />
      <TestimonialForm />
    </>
  );
}
