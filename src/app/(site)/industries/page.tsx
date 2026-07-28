import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/Button';
import { Reveal, RevealGroup, RevealItem, SectionHeading } from '@/components/ui/Reveal';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Industries',
  description:
    'Medical, education, automotive, mining, steel, manufacturing, architecture, construction, robotics, defence, consumer products, jewellery, electronics and research.',
};

const NOTES: Record<string, string> = {
  Medical: 'Patient-specific anatomy from DICOM for surgical rehearsal, plus teaching models that section cleanly.',
  Education: 'Classroom sets, robotics chassis and demonstration models built to survive a room of students.',
  Automotive: 'Intake prototypes, jigs, fixtures and interior trim patterns in heat-resistant materials.',
  Mining: 'Replacement components and wear parts for equipment whose original supplier no longer exists.',
  Steel: 'Fixtures, gauges and pattern-making for foundry work around Rourkela and Angul.',
  Manufacturing: 'Assembly jigs, gauges and bridge production between prototype and tooling.',
  Architecture: 'Massing and presentation models at 1:100 to 1:500, from Revit, Rhino or IFC.',
  Construction: 'Site models, formwork prototypes and component mock-ups for client sign-off.',
  Robotics: 'Chassis, brackets, gearboxes and end effectors in engineering polymers.',
  Defence: 'Airframes, housings and field-replaceable parts under signed agreement.',
  'Consumer Products': 'Concept models, packaging mock-ups and small-batch production.',
  Jewellery: 'Castable masters at 25 micron that burn out with no residual ash.',
  Electronics: 'Enclosures, light pipes, panel mounts and cable management.',
  Research: 'Custom labware, rigs and one-off apparatus that no catalogue sells.',
};

export default function IndustriesPage() {
  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Industries"
          title={
            <>
              Fourteen sectors,
              <br />
              <span className="text-flame">one studio</span>.
            </>
          }
          lead="A cardiac model and a mining wear part want almost nothing in common. We have learned what each one needs, mostly by getting it wrong first."
        />

        <RevealGroup className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {site.industries.map((industry, i) => (
            <RevealItem key={industry}>
              <section
                id={industry.toLowerCase().replace(/\s+/g, '-')}
                className="glass h-full scroll-mt-28 rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-flame-500/30"
              >
                <span className="font-mono text-xs text-flame-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
                  {industry}
                </h2>
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-300">
                  {NOTES[industry]}
                </p>
              </section>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal>
          <div className="glass-strong mt-16 rounded-3xl px-8 py-14 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Your sector not listed?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-300">
              It only means nobody from it has asked us yet. The constraints are usually familiar
              even when the industry is not.
            </p>
            <div className="mt-8">
              <ButtonLink href="/contact" size="lg">Tell us what you need</ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
