import { listBookings } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { BookingsList } from "./BookingsList";

export const metadata = { title: "Bookings" };

export default async function BookingsPage() {
  const bookings = await listBookings();
  return (
    <>
      <PageHeader title="Bookings" description="Meeting requests submitted through the website's Book a Call page." />
      <BookingsList bookings={bookings} />
    </>
  );
}
