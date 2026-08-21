import type { EmailSequence } from '@/domain/models/email-template';

export interface DefaultEmailCopy {
  subject: string;
  /** Plain text with `\n\n` paragraph breaks — `renderTemplate()` converts to `<p>` tags for the HTML body and uses this verbatim for the text body. */
  body: string;
}

/**
 * The default Postcard Follow-Up copy (`implementation.md`, Marketing
 * stage, "Default email copy") — used both for first-ever seeding
 * (`ensureMarketingCampaignExists()`) and the admin "Reset to default"
 * action. The CTA is to get the owner to view their preview website, not to
 * explain every Webpresa feature.
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<EmailSequence, DefaultEmailCopy> = {
  1: {
    subject: 'I built a website for {{businessName}}',
    body: `Hello,

I recently sent something to {{businessName}} in the mail and wanted to follow up in case you missed it.

I came across your business and thought your website could use an update, so I went ahead and built a new one for you.

It's already live as a private preview — no signup required to take a look.

See what I built for {{businessName}}:

{{previewUrl}}

If you have any questions, just reply to this email. It comes directly to me.

Andrew
Owner and Founder Webpresa
andrew@webpresa.com

{{unsubscribeUrl}}`,
  },
  2: {
    subject: 'Re: I built a website for {{businessName}}',
    body: `Hi again,

Just wanted to follow up on the website I built for {{businessName}}.

The idea behind Webpresa is simple: instead of asking you to hire a designer, pay thousands upfront, and wait weeks to see a website, I build it first.

You get to see the finished website before deciding if you want it.

If you like yours, it's $39/month with hosting included. There's no big upfront website bill.

Take a look:

{{previewUrl}}

Andrew
Owner and Founder Webpresa
andrew@webpresa.com

{{unsubscribeUrl}}`,
  },
  3: {
    subject: 'Should I close this out?',
    body: `Hey,

I haven't heard back, so I'll make this my last email.

I built the website preview for {{businessName}} because I thought I could improve what you currently have.

If you'd like to see it before I close this out, it's still available here:

{{previewUrl}}

If it's not something you're interested in, no worries at all.

Andrew
Owner and Founder Webpresa
andrew@webpresa.com

{{unsubscribeUrl}}`,
  },
};
