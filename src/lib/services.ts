export interface Service {
  slug: string;
  title: string;
  short: string;
  description: string;
  points: string[];
  icon: 'tooth' | 'child' | 'implant' | 'surgery' | 'wisdom';
}

export const SERVICES: Service[] = [
  {
    slug: 'general-dentistry',
    title: 'General Dentistry',
    short: 'Check-ups, cleaning, fillings and preventive care to keep your whole family’s teeth healthy.',
    description:
      'Regular dental care is the foundation of a healthy smile. We examine your teeth and gums, identify problems early and explain your options clearly, so you can make confident decisions about your treatment.',
    points: [
      'Comprehensive oral examination and advice',
      'Professional scaling and cleaning',
      'Treatment of cavities and tooth restorations',
      'Guidance on daily oral hygiene and prevention',
    ],
    icon: 'tooth',
  },
  {
    slug: 'paediatric-dentistry',
    title: 'Paediatric Dentistry',
    short: 'Gentle, friendly dental care designed to help children feel calm and confident.',
    description:
      'Children deserve a dental experience that feels safe and positive. We take time to explain each step in simple language, treat early decay and help parents build healthy brushing and eating habits that last a lifetime.',
    points: [
      'Child-friendly examinations and preventive care',
      'Early detection and treatment of cavities',
      'Advice for parents on brushing, diet and oral habits',
      'A reassuring, patient approach for anxious little ones',
    ],
    icon: 'child',
  },
  {
    slug: 'implantology-and-prosthesis',
    title: 'Implantology and Prosthesis',
    short: 'Replace missing teeth with dental implants and prosthetic restorations built for function and comfort.',
    description:
      'Missing teeth affect chewing, speech and confidence. After a careful assessment, we plan implant-supported and other prosthetic solutions to restore your bite and your smile as naturally as possible.',
    points: [
      'Assessment and planning for dental implants',
      'Surgical placement of implants',
      'Prosthetic restorations such as crowns, bridges and dentures',
      'Follow-up care to protect your investment',
    ],
    icon: 'implant',
  },
  {
    slug: 'extraction-and-minor-oral-surgery',
    title: 'Extraction and Minor Oral Surgery',
    short: 'Careful tooth removal and minor surgical procedures, with your comfort at the centre of every step.',
    description:
      'When a tooth cannot be saved, or a small surgical procedure is needed, Doctor Ayesha’s training in oral and maxillofacial surgery supports a careful, planned approach, with clear aftercare instructions so healing goes smoothly.',
    points: [
      'Removal of damaged, decayed or non-restorable teeth',
      'Minor surgical procedures inside the mouth',
      'Clear before-and-after treatment guidance',
      'Support through the healing period',
    ],
    icon: 'surgery',
  },
  {
    slug: 'wisdom-tooth-removal',
    title: 'Wisdom Tooth Removal',
    short: 'Expert assessment and removal of painful, impacted or problematic wisdom teeth.',
    description:
      'Wisdom teeth can become painful, infected or trapped beneath the gum. We assess each tooth, explain whether removal is advisable and carry out the procedure with careful planning and aftercare.',
    points: [
      'Examination and assessment of wisdom teeth',
      'Planning for impacted or partially erupted teeth',
      'Surgical removal when it is recommended',
      'Aftercare advice for a comfortable recovery',
    ],
    icon: 'wisdom',
  },
];

export const SERVICE_SLUGS = SERVICES.map((s) => s.slug) as [string, ...string[]];

export const serviceTitle = (slug: string) => SERVICES.find((s) => s.slug === slug)?.title ?? slug;
