import { PageHeader } from '@/components/admin/Shell';
import { TestimonialEditor, type CustomerOption, type TestimonialRow } from '@/components/admin/TestimonialEditor';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Testimonials' };

export default async function AdminTestimonialsPage() {
  await requirePermission('testimonials.edit');

  const testimonials = await all<TestimonialRow>(
    `SELECT id, author_name, author_role, company, avatar_url, quote, rating, is_featured, is_active
     FROM testimonials ORDER BY is_featured DESC, sort_order`,
  );

  // Registered customers, so a testimonial can reuse the photo already on
  // their account rather than the admin re-uploading it.
  const customers = await all<CustomerOption>(
    `SELECT id, name, email, avatar_url FROM users
     WHERE role = 'customer' AND status = 'active' ORDER BY name LIMIT 200`,
  );

  return (
    <>
      <PageHeader
        title="Testimonials"
        subtitle="Add, edit and order the quotes shown on the homepage. Featured ones appear first."
      />
      <TestimonialEditor testimonials={testimonials} customers={customers} />
    </>
  );
}
