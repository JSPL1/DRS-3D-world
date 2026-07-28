import type { Metadata } from 'next';

import { SectionHeading } from '@/components/ui/Reveal';
import { getSettings } from '@/lib/queries';
import { DEFAULT_RATES, type QuoteRates } from '@/lib/stl';

import { QuoteCalculator } from './QuoteCalculator';

export const metadata: Metadata = {
  title: 'Instant 3D printing quote',
  description:
    'Upload an STL and get an itemised 3D printing price in seconds — material, machine time, finishing and GST, calculated from your own geometry.',
};

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

export default function QuotePage() {
  const settings = getSettings();

  const num = (key: string, fallback: number) => {
    const value = Number(settings[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const rates: QuoteRates = {
    machinePerHour: num('quote_machine_rate_per_hour', DEFAULT_RATES.machinePerHour),
    labourPerHour: num('quote_labour_rate_per_hour', DEFAULT_RATES.labourPerHour),
    electricityPerKwh: num('quote_electricity_rate_per_kwh', DEFAULT_RATES.electricityPerKwh),
    printerWatts: num('quote_printer_watts', DEFAULT_RATES.printerWatts),
    profitMarginPercent: num('quote_profit_margin_percent', DEFAULT_RATES.profitMarginPercent),
    setupFee: num('quote_setup_fee', DEFAULT_RATES.setupFee),
    gstPercent: num('gst_percent', DEFAULT_RATES.gstPercent),
    freeDeliveryAbove: num('free_delivery_above', DEFAULT_RATES.freeDeliveryAbove),
    deliveryFee: DEFAULT_RATES.deliveryFee,
  };

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Instant quote"
          title={
            <>
              Upload your file.
              <br />
              <span className="text-flame">Get the price.</span>
            </>
          }
          lead="Your STL is read here in your browser. We work out volume, wall and infill, material weight, machine hours, finishing and GST — and show you every line of it."
        />

        <div className="mt-14">
          <QuoteCalculator rates={rates} />
        </div>
      </div>
    </div>
  );
}
