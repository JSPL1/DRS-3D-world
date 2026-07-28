import { ArrowRight, Check } from 'lucide-react';
import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/Button';
import { Reveal, RevealGroup, RevealItem, SectionHeading } from '@/components/ui/Reveal';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Services',
  description:
    '3D printing, 3D design, rapid prototyping, model making, product development, reverse engineering, CAD, STL repair and 3D scanning in Bhubaneswar.',
};

const DETAIL: Record<string, { blurb: string; points: string[] }> = {
  '3d-printing': {
    blurb:
      'FDM and SLA production on machines that run seven days a week. Over thirty filament colours in stock and four resin families, so we rarely have to compromise on the material to hit a date.',
    points: ['0.025 mm minimum layer height', '256 mm single-piece build volume', 'Larger parts split along hidden seams', 'Over thirty colours in stock'],
  },
  '3d-design': {
    blurb:
      'Concept through to production-ready CAD, by people who print what they draw. That matters more than it sounds — a designer who has never removed supports will keep designing parts that need them.',
    points: ['Parametric CAD in Fusion 360 and SolidWorks', 'Design for additive manufacture', 'Render approval before printing', 'Native files handed over, not just STLs'],
  },
  prototyping: {
    blurb:
      'Files in before noon, a finished part in your hands the next working day. Priced per 100 cm³ with no minimum order, so testing three variants costs about what one costs elsewhere.',
    points: ['Next-working-day turnaround', 'Free printability report', 'No minimum order quantity', 'NDA signed as a matter of course'],
  },
  'model-making': {
    blurb:
      'Presentation models where finish matters as much as geometry. Hand-sanded through four grits, painted to a reference, and packed so they arrive the way they left.',
    points: ['Hand-finished to a display standard', 'Colour matched to your reference', 'Edge-lit and engraved bases available', 'Foam-lined presentation packaging'],
  },
  'product-development': {
    blurb:
      'From a sketch to something manufacturable, with the tooling questions answered before you commit to a mould. We will tell you when printing stops being the right answer.',
    points: ['Concept, CAD, prototype, iterate', 'Design for injection moulding where it makes sense', 'Small-batch bridge production', 'Honest advice about when to stop printing'],
  },
  'custom-solutions': {
    blurb:
      'The jobs that do not fit a category. A fixture nobody sells, a replacement part that has been discontinued for fifteen years, a one-off for a museum. Bring us the awkward one.',
    points: ['Reverse-engineered replacement parts', 'Bespoke jigs and fixtures', 'Museum and heritage reproduction', 'One-offs welcome'],
  },
  'reverse-engineering': { blurb: 'We scan or measure the part you have and give you the CAD you never had.', points: ['3D scanning to 0.05 mm', 'Clean parametric CAD, not a mesh', 'Discontinued part reproduction'] },
  'cad-design': { blurb: 'Proper parametric models with a feature tree you can edit later.', points: ['Fusion 360, SolidWorks, Rhino', 'Editable feature history', 'Manufacturing drawings on request'] },
  'stl-repair': { blurb: 'Non-manifold edges, flipped normals, holes. We fix files other printers reject.', points: ['Watertight repair', 'Wall-thickness correction', 'Written report of what changed'] },
  'architectural-models': { blurb: 'Scale models for practices and developers, from Revit, SketchUp, Rhino or IFC.', points: ['1:100 to 1:500', 'Frosted resin glazing', 'Edge-lit acrylic bases'] },
  'medical-models': { blurb: 'Patient-specific anatomy segmented from DICOM for surgical rehearsal and teaching.', points: ['DICOM segmentation included', 'Tissue-analogue materials', 'Data handled under agreement'] },
  'industrial-parts': { blurb: 'Functional components in engineering polymers, for the floor rather than the shelf.', points: ['PA-CF, PC, ABS, PETG', 'Annealed for temperature', 'Batch production'] },
  'corporate-gifts': { blurb: 'Branded awards, desk pieces and mementos, from five to five hundred.', points: ['Volume pricing above twenty', 'Logo embedding and engraving', 'Presentation packaging'] },
  miniatures: { blurb: 'Tabletop and display miniatures at resin detail levels.', points: ['0.025 mm layers', 'Batch printing', 'Optional hand painting'] },
  'custom-figurines': { blurb: 'Personalised figures sculpted from your photographs.', points: ['Render approval first', 'Hand-painted faces', 'Engraved bases'] },
  '3d-scanning': { blurb: 'Physical object to usable digital model.', points: ['0.05 mm accuracy', 'Mesh clean-up included', 'Optional CAD conversion'] },
};

export default function ServicesPage() {
  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Services"
          title={
            <>
              What we can
              <br />
              <span className="text-flame">do for you</span>.
            </>
          }
          lead="Everything below runs through one studio in Bhubaneswar. Nothing is outsourced, so nobody quotes on our behalf and nobody else sets your date."
        />

        <div className="mt-16 flex flex-col gap-5">
          {site.services.map((service, index) => {
            const detail = DETAIL[service.slug];
            if (!detail) return null;

            return (
              <Reveal key={service.slug} delay={Math.min(index * 0.04, 0.3)}>
                <section
                  id={service.slug}
                  className="glass group scroll-mt-28 rounded-2xl p-7 transition-colors duration-500 hover:border-flame-500/25 sm:p-9"
                >
                  <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                    <div>
                      <span className="font-mono text-xs text-flame-500">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                        {service.title}
                      </h2>
                      {service.primary && (
                        <span className="mt-3 inline-block rounded-full bg-flame-500/12 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-flame-400">
                          Core service
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-[15px] leading-relaxed text-ink-200">{detail.blurb}</p>
                      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                        {detail.points.map((point) => (
                          <li key={point} className="flex items-start gap-2.5 text-[13.5px] text-ink-300">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-flame-500" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="glass-strong mt-16 rounded-3xl px-8 py-14 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Not sure which one you need?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-300">
              Describe the problem rather than the process. We will tell you what it actually needs —
              including when the answer is not 3D printing at all.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/contact" size="lg">
                Describe your project
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/quote" variant="secondary" size="lg">
                Price a file instead
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
