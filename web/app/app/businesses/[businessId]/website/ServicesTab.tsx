import type { PreviewContent } from '@/domain/models/site-preview';
import { Card, TextField, SaveButton } from '../FormBits';
import { updateSectionContentActionCustomer } from '../actions';

interface Props {
  businessId: string;
  content?: PreviewContent;
  isReadOnly: boolean;
}

const EXTRA_ROWS = 2;

export function ServicesTab({ businessId, content, isReadOnly }: Props) {
  if (!content) {
    return (
      <Card title="No website yet">
        <p className="text-sm text-gray-500">Your website hasn&apos;t been created yet.</p>
      </Card>
    );
  }

  const services = content.services ?? [];
  const serviceRows = [...services, ...Array(EXTRA_ROWS).fill({ name: '', description: '' })];

  const differentiators = content.differentiators ?? [];
  const differentiatorRows = [...differentiators, ...Array(EXTRA_ROWS).fill({ title: '', description: '' })];

  const areas = content.serviceAreas ?? [];
  const areaRows = [...areas, ...Array(EXTRA_ROWS).fill('')];

  return (
    <div className="space-y-6">
      <Card title="Services" description="Up to 10 services you offer. Leave a row blank to skip it.">
        <form action={updateSectionContentActionCustomer.bind(null, businessId, 'services')} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Section heading (optional)" name="sectionHeadline" defaultValue={content.servicesSection?.headline} disabled={isReadOnly} />
            <TextField label="Section subheading (optional)" name="sectionSubheadline" defaultValue={content.servicesSection?.subheadline} disabled={isReadOnly} />
          </div>
          <div className="space-y-3">
            {serviceRows.slice(0, 10).map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2 border border-gray-100 rounded-lg p-3">
                <TextField label={`Service ${i + 1} name`} name={`services.${i}.name`} defaultValue={row.name} disabled={isReadOnly} maxLength={100} />
                <TextField label="Description" name={`services.${i}.description`} defaultValue={row.description} disabled={isReadOnly} maxLength={500} />
              </div>
            ))}
          </div>
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>

      <Card title="Why choose us" description="Short differentiators shown in their own section.">
        <form action={updateSectionContentActionCustomer.bind(null, businessId, 'whyChooseUs')} className="space-y-4">
          <TextField label="Section heading (optional)" name="sectionHeadline" defaultValue={content.whyChooseUsSection?.headline} disabled={isReadOnly} />
          <div className="space-y-3">
            {differentiatorRows.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2 border border-gray-100 rounded-lg p-3">
                <TextField label={`Title ${i + 1}`} name={`differentiators.${i}.title`} defaultValue={row.title} disabled={isReadOnly} maxLength={80} />
                <TextField label="Description" name={`differentiators.${i}.description`} defaultValue={row.description} disabled={isReadOnly} maxLength={300} />
              </div>
            ))}
          </div>
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>

      <Card title="Service areas" description="Cities or regions you serve.">
        <form action={updateSectionContentActionCustomer.bind(null, businessId, 'serviceAreas')} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Section heading (optional)" name="sectionHeadline" defaultValue={content.serviceAreasSection?.headline} disabled={isReadOnly} />
            <TextField label="Section subheading (optional)" name="sectionSubheadline" defaultValue={content.serviceAreasSection?.subheadline} disabled={isReadOnly} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {areaRows.slice(0, 10).map((value, i) => (
              <TextField key={i} label={`Area ${i + 1}`} name={`serviceAreas.${i}.value`} defaultValue={value} disabled={isReadOnly} maxLength={80} />
            ))}
          </div>
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>
    </div>
  );
}
