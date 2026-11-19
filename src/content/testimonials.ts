/**
 * Genuine patient testimonials ONLY – supplied by the clinic, with the patient's permission.
 * While this list is empty the testimonials section is hidden (no invented reviews).
 *
 * Example entry:
 *   { name: 'A. Khan', text: 'Exact words of the patient…', service: 'Wisdom Tooth Removal' }
 */
export interface Testimonial {
  name: string;
  text: string;
  service?: string;
}

export const TESTIMONIALS: Testimonial[] = [];
