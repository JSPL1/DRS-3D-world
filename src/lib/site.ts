/**
 * Single source of truth for brand + contact details.
 * Values taken from the DRS 3D WORLD visiting card.
 */

export const site = {
  name: 'DRS 3D WORLD',
  shortName: 'DRS',
  legalName: 'DRS 3D World',
  tagline: '3D Printing & Innovation',
  slogan: 'Bringing your ideas to life, one layer at a time',
  description:
    'DRS 3D WORLD is a next-generation 3D printing and innovation studio in Bhubaneswar — 3D printing, 3D design, rapid prototyping, model making, product development and custom solutions.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',

  contact: {
    phone: '6371989465',
    phoneIntl: '+916371989465',
    whatsapp: '916371989465',
    email: 'drs3dworld@gmail.com',
    address: {
      line1: 'N-6-363, Block N6',
      line2: 'IRC Village, Nayapalli',
      city: 'Bhubaneswar',
      postalCode: '751013',
      state: 'Odisha',
      country: 'India',
    },
  },

  /** Services exactly as listed on the card, expanded with the studio's wider offer. */
  services: [
    { slug: '3d-printing', title: '3D Printing', primary: true },
    { slug: '3d-design', title: '3D Design', primary: true },
    { slug: 'prototyping', title: 'Rapid Prototyping', primary: true },
    { slug: 'model-making', title: 'Model Making', primary: true },
    { slug: 'product-development', title: 'Product Development', primary: true },
    { slug: 'custom-solutions', title: 'Custom Solutions', primary: true },
    { slug: 'reverse-engineering', title: 'Reverse Engineering', primary: false },
    { slug: 'cad-design', title: 'CAD Design', primary: false },
    { slug: 'stl-repair', title: 'STL Repair', primary: false },
    { slug: 'architectural-models', title: 'Architectural Models', primary: false },
    { slug: 'medical-models', title: 'Medical Models', primary: false },
    { slug: 'industrial-parts', title: 'Industrial Parts', primary: false },
    { slug: 'corporate-gifts', title: 'Corporate Gifts', primary: false },
    { slug: 'miniatures', title: 'Miniatures', primary: false },
    { slug: 'custom-figurines', title: 'Custom Figurines', primary: false },
    { slug: '3d-scanning', title: '3D Scanning', primary: false },
  ],

  industries: [
    'Medical',
    'Education',
    'Automotive',
    'Mining',
    'Steel',
    'Manufacturing',
    'Architecture',
    'Construction',
    'Robotics',
    'Defence',
    'Consumer Products',
    'Jewellery',
    'Electronics',
    'Research',
  ],

  nav: [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Services', href: '/services' },
    { label: 'Industries', href: '/industries' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Videos', href: '/videos' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
} as const;

export const whatsappLink = (message?: string) =>
  `https://wa.me/${site.contact.whatsapp}${
    message ? `?text=${encodeURIComponent(message)}` : ''
  }`;

export const formattedAddress = [
  site.contact.address.line1,
  site.contact.address.line2,
  `${site.contact.address.city}, ${site.contact.address.postalCode}`,
  `${site.contact.address.state}, ${site.contact.address.country}`,
].join('\n');
