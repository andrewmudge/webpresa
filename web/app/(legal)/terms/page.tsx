import type { Metadata } from 'next';
import { LegalDocument } from '../LegalDocument';

export const metadata: Metadata = {
  title: 'Terms of Service — Webpresa',
  description: 'The terms that govern your access to and use of Webpresa.',
};

const SUPPORT_EMAIL = 'support@webpresa.com';

export default function TermsPage() {
  return (
    <div className="py-10 sm:py-14">
      <LegalDocument title="Webpresa Terms of Service" effectiveDate="August 16, 2026">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the website design, hosting,
          publishing, editing, and related services provided by Webpresa (&ldquo;Webpresa,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
        </p>
        <p>
          By creating an account, purchasing a Webpresa subscription, clicking to accept these Terms, or using the
          Services, you agree to be bound by these Terms.
        </p>
        <p>
          If you are accepting these Terms on behalf of a business or other organization, you represent that you
          have authority to bind that organization to these Terms. In that case, &ldquo;you&rdquo; and
          &ldquo;your&rdquo; refer to that organization.
        </p>

        <h2>1. The Webpresa Service</h2>
        <p>Webpresa provides a subscription-based website service for businesses.</p>
        <p>Depending on the features available with your subscription, the Services may include:</p>
        <ul>
          <li>a Webpresa-designed website;</li>
          <li>website hosting;</li>
          <li>website publishing;</li>
          <li>tools for editing or updating website content;</li>
          <li>connection of a custom domain;</li>
          <li>contact or lead-generation features;</li>
          <li>maintenance and technical updates; and</li>
          <li>other website-related features made available by Webpresa.</li>
        </ul>
        <p>
          Your subscription provides access to the Services. Unless expressly stated otherwise, purchasing a
          subscription does not transfer ownership of Webpresa&rsquo;s software, platform, templates, systems, or
          other proprietary technology to you.
        </p>

        <h2>2. Website Previews</h2>
        <p>Webpresa may create a preview or demonstration website for a business before that business becomes a customer.</p>
        <p>
          A preview is provided for evaluation purposes and may contain information obtained from publicly available
          sources, third-party data providers, or information supplied to Webpresa.
        </p>
        <p>Preview websites may contain incomplete, outdated, inaccurate, or placeholder information.</p>
        <p>You are responsible for reviewing your website and requesting or making any necessary corrections before relying on it for your business.</p>

        <h2>3. Subscription Plans and Pricing</h2>
        <p>Webpresa currently offers the following subscription options:</p>
        <h3>Monthly Plan — $39 per month</h3>
        <p>The Monthly Plan is billed $39 each month and automatically renews monthly until canceled.</p>
        <h3>Annual Plan — $375 per year</h3>
        <p>The Annual Plan is billed $375 in advance for one year of service and automatically renews annually until canceled.</p>
        <p>The Annual Plan represents approximately a 20% discount compared with paying the standard $39 monthly price for twelve months.</p>
        <p>There is <strong>no free trial</strong> for either subscription option.</p>
        <p>Your subscription begins when your initial payment is successfully processed.</p>
        <p>
          By subscribing, you authorize Webpresa and its payment processor to charge your selected payment method
          according to the billing interval you select, plus any applicable taxes, until you cancel your
          subscription.
        </p>
        <p>Your selected price and billing frequency will be displayed before you complete your purchase.</p>

        <h2>4. Automatic Renewal</h2>
        <p>Subscriptions automatically renew unless canceled before the applicable renewal date.</p>
        <p>If you select the Monthly Plan, your subscription will renew approximately once each month at the then-applicable monthly subscription price.</p>
        <p>If you select the Annual Plan, your subscription will renew approximately once each year at the then-applicable annual subscription price.</p>
        <p>
          By purchasing a subscription, you expressly authorize Webpresa and its payment processor to charge your
          payment method for each recurring subscription payment until you cancel.
        </p>
        <p>Webpresa will provide renewal notices when required by applicable law.</p>

        <h2>5. Cancellation</h2>
        <p>You may cancel your subscription at any time.</p>
        <p>
          Cancellation prevents your subscription from renewing for another billing period. Cancellation does{' '}
          <strong>not</strong> immediately terminate the period for which you have already paid.
        </p>
        <h3>Monthly Plan</h3>
        <p>If you cancel a Monthly Plan, you will continue to have access to the paid Services through the end of your current monthly billing period.</p>
        <p>You will not be charged for another month after cancellation becomes effective.</p>
        <h3>Annual Plan</h3>
        <p>If you cancel an Annual Plan, you will continue to have access to the paid Services through the end of your current annual billing period.</p>
        <p>
          Cancellation of an Annual Plan prevents the subscription from renewing for another year but does not
          convert the subscription to a monthly plan or result in a prorated refund for the unused portion of the
          year.
        </p>
        <p>
          For example, if you purchase an Annual Plan and cancel after four months, your paid Webpresa service will
          generally remain available for the remaining eight months of your annual subscription. You will not be
          charged for another year.
        </p>
        <p>Except where required by law, subscription payments are non-refundable.</p>
        <p>Webpresa will provide an online method for canceling your subscription.</p>

        <h2>6. What Happens to Your Website After Cancellation</h2>
        <p>
          At the end of your paid subscription period, Webpresa may discontinue paid hosting features, custom-domain
          publishing, editing access, lead-delivery features, and other paid features associated with your account.
        </p>
        <p>
          If your website was originally created by Webpresa, Webpresa may continue to make a version of the website
          available on a Webpresa-owned URL, such as:
        </p>
        <p>
          <strong>webpresa.com/b/[business-slug]</strong>
        </p>
        <p>You acknowledge that cancellation of your paid subscription does not necessarily require Webpresa to permanently delete the website or its public preview.</p>
        <p>After your paid subscription expires:</p>
        <ul>
          <li>your custom domain may no longer display the Webpresa-hosted website;</li>
          <li>the website may revert to or remain accessible through a Webpresa-owned URL;</li>
          <li>paid account and editing features may become unavailable;</li>
          <li>Webpresa may identify the site as a Webpresa-hosted or preview website; and</li>
          <li>Webpresa may later modify, archive, unpublish, or delete the Webpresa-hosted version.</li>
        </ul>
        <p>
          If you want Webpresa to remove a publicly accessible Webpresa-hosted version of your website after
          cancellation, you may submit a removal request to <strong>{SUPPORT_EMAIL}</strong>. Webpresa will process
          valid removal requests subject to applicable law and legitimate recordkeeping requirements.
        </p>

        <h2>7. Domains</h2>
        <p>You may connect a domain name that you own or control to your Webpresa website.</p>
        <p>Unless Webpresa expressly agrees otherwise, you are responsible for:</p>
        <ul>
          <li>registering and maintaining your domain;</li>
          <li>paying domain registration and renewal fees;</li>
          <li>maintaining access to your registrar account;</li>
          <li>keeping domain contact information accurate; and</li>
          <li>completing any DNS or verification steps necessary to connect the domain.</li>
        </ul>
        <p>Webpresa does not obtain ownership of a domain merely because the domain is connected to the Services.</p>
        <p>
          If a domain is registered through a third-party registrar or domain-registration service made available
          through Webpresa, the registrar&rsquo;s terms and policies may also apply.
        </p>
        <p>Cancellation of Webpresa does not automatically cancel a separately purchased domain registration.</p>
        <p>You are responsible for changing your DNS records if you want your domain to point to another website after your Webpresa subscription ends.</p>

        <h2>8. Your Content and Business Information</h2>
        <p>
          You retain ownership of the business names, logos, photographs, written content, trademarks, and other
          materials that you provide to Webpresa (&ldquo;Customer Content&rdquo;).
        </p>
        <p>
          You grant Webpresa a non-exclusive, worldwide, royalty-free license to host, reproduce, display, modify,
          format, and otherwise use Customer Content as reasonably necessary to create, operate, maintain, and
          provide your website and the Services.
        </p>
        <p>
          This license continues for as long as reasonably necessary to provide the Services or maintain a
          Webpresa-hosted version of the website as permitted by these Terms.
        </p>
        <p>You represent that you have the necessary rights and permissions to provide Customer Content to Webpresa and authorize its use.</p>

        <h2>9. Publicly Available and Third-Party Information</h2>
        <p>To create website previews and websites efficiently, Webpresa may use information obtained from publicly available sources or third-party services.</p>
        <p>This may include:</p>
        <ul>
          <li>business names;</li>
          <li>addresses;</li>
          <li>telephone numbers;</li>
          <li>business hours;</li>
          <li>business categories;</li>
          <li>publicly available descriptions;</li>
          <li>links;</li>
          <li>publicly available images or logos; and</li>
          <li>other publicly available business information.</li>
        </ul>
        <p>Third-party information may be inaccurate, outdated, incomplete, or subject to third-party rights.</p>
        <p>You are responsible for reviewing the final website and notifying Webpresa of information that should be corrected or removed.</p>

        <h2>10. Customer Responsibilities</h2>
        <p>You are responsible for the accuracy, legality, and appropriateness of the content published on your website.</p>
        <p>You agree not to use the Services to publish or promote content that:</p>
        <ul>
          <li>violates applicable law;</li>
          <li>infringes another person&rsquo;s intellectual property rights;</li>
          <li>is fraudulent or materially deceptive;</li>
          <li>contains malicious software or harmful code;</li>
          <li>unlawfully collects or discloses personal information; or</li>
          <li>otherwise materially interferes with Webpresa or its users.</li>
        </ul>
        <p>You are responsible for complying with laws and regulations applicable to your particular business, industry, advertising, and website.</p>
        <p>Webpresa is a website technology provider and does not provide legal, tax, regulatory, or professional compliance advice.</p>

        <h2>11. Website Content and AI-Assisted Features</h2>
        <p>
          Webpresa may use artificial intelligence, automated systems, templates, or third-party technology to
          assist in creating website layouts, copy, images, recommendations, or other content.
        </p>
        <p>AI-generated and automated content may contain errors.</p>
        <p>
          You are responsible for reviewing your website for accuracy before using or publishing claims about your
          business, services, pricing, qualifications, licenses, guarantees, availability, or other material
          information.
        </p>
        <p>Webpresa does not guarantee that automatically generated content will be accurate, complete, unique, or appropriate for every business.</p>

        <h2>12. Intellectual Property</h2>
        <p>Webpresa and its licensors retain all rights in the Webpresa platform and related technology, including:</p>
        <ul>
          <li>software;</li>
          <li>source code;</li>
          <li>website-generation systems;</li>
          <li>templates and reusable components;</li>
          <li>administrative systems;</li>
          <li>designs and design systems;</li>
          <li>APIs;</li>
          <li>automation;</li>
          <li>algorithms;</li>
          <li>documentation;</li>
          <li>trademarks; and</li>
          <li>other Webpresa technology and intellectual property.</li>
        </ul>
        <p>Your subscription gives you a limited right to use the Services during your subscription. It does not transfer ownership of Webpresa&rsquo;s platform or underlying technology.</p>
        <p>You retain ownership of your Customer Content as described in these Terms.</p>

        <h2>13. Website Portability</h2>
        <p>
          Unless Webpresa expressly offers an export or transfer feature, your Webpresa subscription does not
          include delivery of Webpresa source code, platform code, infrastructure, proprietary templates, or
          website-generation technology.
        </p>
        <p>You may use your own Customer Content elsewhere.</p>
        <p>Webpresa is not required to recreate your Webpresa website on another hosting provider or technology platform after cancellation.</p>

        <h2>14. Search Engines and SEO</h2>
        <p>Webpresa may implement technical features intended to help search engines discover and understand your website.</p>
        <p>However, Webpresa does <strong>not guarantee</strong>:</p>
        <ul>
          <li>search-engine rankings;</li>
          <li>placement on Google or other search engines;</li>
          <li>website traffic;</li>
          <li>leads;</li>
          <li>sales;</li>
          <li>calls;</li>
          <li>revenue;</li>
          <li>customer acquisition;</li>
          <li>indexing within any particular period; or</li>
          <li>any particular business result.</li>
        </ul>
        <p>Search-engine rankings and traffic depend on numerous factors outside Webpresa&rsquo;s control.</p>

        <h2>15. Third-Party Services</h2>
        <p>
          The Services may rely on third-party providers for services such as hosting, payments, domains, email
          delivery, analytics, mapping, artificial intelligence, infrastructure, and other functionality.
        </p>
        <p>Webpresa is not responsible for outages, changes, errors, suspensions, or other failures caused by third-party providers outside Webpresa&rsquo;s reasonable control.</p>
        <p>Your use of certain third-party services may also be subject to those providers&rsquo; terms.</p>

        <h2>16. Availability and Changes to the Service</h2>
        <p>We aim to provide reliable service, but no online service is available without interruption.</p>
        <p>Webpresa does not guarantee that the Services will always be available, uninterrupted, secure, or error-free.</p>
        <p>We may perform maintenance, deploy updates, change infrastructure, modify features, or temporarily restrict access when reasonably necessary to operate or protect the Services.</p>
        <p>We may add, modify, or discontinue features over time.</p>
        <p>If we make a change that materially reduces the core functionality of your paid subscription, you may cancel your subscription.</p>

        <h2>17. Payments</h2>
        <p>Payments may be processed by a third-party payment processor.</p>
        <p>Webpresa does not necessarily store your complete payment-card information.</p>
        <p>You agree to provide accurate billing information and authorize Webpresa and its payment processor to charge your payment method for subscription fees, taxes, and other charges that you expressly authorize.</p>
        <p>If payment fails, we may retry the payment and may suspend paid features until payment is successfully completed.</p>

        <h2>18. Refunds</h2>
        <p>Except where required by law, subscription payments are non-refundable once a billing period begins.</p>
        <h3>Monthly subscriptions</h3>
        <p>Monthly payments are not prorated or refunded for unused portions of a month after cancellation.</p>
        <h3>Annual subscriptions</h3>
        <p>Annual subscriptions are prepaid for the full annual subscription period. Cancellation stops the next annual renewal but does not ordinarily entitle you to a partial or prorated refund for unused months remaining in the current annual subscription period.</p>
        <p>You will continue receiving the Services through the end of the annual period for which you have paid.</p>
        <p>Nothing in this section limits any refund, cancellation right, or other remedy required by applicable law.</p>

        <h2>19. Account Security</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for activity conducted through your account.</p>
        <p>You agree to notify Webpresa promptly if you believe your account has been compromised.</p>
        <p>Webpresa may take reasonable steps to protect accounts and the Services, including temporarily restricting access when suspicious or unauthorized activity is detected.</p>

        <h2>20. Suspension and Termination</h2>
        <p>Webpresa may suspend or terminate access to the Services if you:</p>
        <ul>
          <li>fail to pay amounts due;</li>
          <li>materially violate these Terms;</li>
          <li>use the Services unlawfully;</li>
          <li>infringe third-party rights;</li>
          <li>attempt to compromise the security or operation of the Services; or</li>
          <li>create a material risk to Webpresa, its infrastructure, its providers, or other users.</li>
        </ul>
        <p>When reasonably practical, Webpresa will provide notice and an opportunity to correct the issue before termination.</p>
        <p>Webpresa may immediately suspend access when reasonably necessary to prevent fraud, unlawful activity, security threats, or material harm.</p>

        <h2>21. Disclaimer of Warranties</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo;</p>
        <p>WEBPRESA DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.</p>
        <p>WEBPRESA DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED OR ERROR-FREE OR THAT USE OF THE SERVICES WILL PRODUCE ANY PARTICULAR BUSINESS, MARKETING, SEARCH-ENGINE, OR FINANCIAL RESULT.</p>
        <p>Some jurisdictions do not allow certain warranty exclusions, so some of these exclusions may not apply to you.</p>

        <h2>22. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WEBPRESA AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS, AND
          AFFILIATES WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
          DAMAGES, OR FOR LOST PROFITS, LOST REVENUE, LOST BUSINESS, LOST DATA, LOSS OF GOODWILL, OR BUSINESS
          INTERRUPTION ARISING FROM OR RELATED TO THE SERVICES.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WEBPRESA&rsquo;S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR
          RELATING TO THE SERVICES OR THESE TERMS WILL NOT EXCEED THE GREATER OF:
        </p>
        <ul>
          <li>THE AMOUNTS YOU PAID TO WEBPRESA DURING THE SIX MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR</li>
          <li>ONE HUNDRED DOLLARS ($100).</li>
        </ul>
        <p>These limitations apply regardless of the legal theory asserted and even if Webpresa has been advised that damages are possible.</p>
        <p>Nothing in these Terms excludes liability that cannot legally be excluded or limited.</p>

        <h2>23. Indemnification</h2>
        <p>
          To the extent permitted by law, you agree to defend, indemnify, and hold harmless Webpresa and its owners,
          officers, employees, contractors, and affiliates from third-party claims, damages, liabilities, losses,
          and reasonable costs arising from:
        </p>
        <ul>
          <li>Customer Content you provide;</li>
          <li>your business operations;</li>
          <li>your products or services;</li>
          <li>your violation of applicable law;</li>
          <li>your infringement of another person&rsquo;s rights; or</li>
          <li>your material violation of these Terms.</li>
        </ul>
        <p>This obligation does not apply to the extent a claim results from Webpresa&rsquo;s own unlawful conduct.</p>

        <h2>24. Privacy</h2>
        <p>Your use of the Services is also subject to the Webpresa Privacy Policy.</p>
        <p>The Privacy Policy explains how Webpresa collects, uses, stores, and shares personal information.</p>
        <p>If you use your website to collect information from your own customers or website visitors, you are responsible for determining and complying with privacy laws applicable to your business.</p>

        <h2>25. Communications</h2>
        <p>
          By creating an account, you agree that Webpresa may send you transactional and service-related
          communications, including billing notices, renewal notices, account notifications, security notices,
          website notices, and important changes to the Services or these Terms.
        </p>
        <p>Marketing communications, where applicable, will be handled in accordance with applicable law.</p>

        <h2>26. Changes to Pricing</h2>
        <p>Webpresa may change subscription pricing in the future.</p>
        <p>Any price change applicable to an existing subscription will be communicated before the new price is charged when required by applicable law.</p>
        <p>A change to the Monthly Plan price does not necessarily result in the same percentage change to the Annual Plan price or discount.</p>
        <p>If you do not agree with a future price change, you may cancel your subscription before the new price takes effect.</p>

        <h2>27. Changes to These Terms</h2>
        <p>Webpresa may update these Terms from time to time.</p>
        <p>If we make material changes, we will provide reasonable notice when required by law.</p>
        <p>Your continued use of the Services after updated Terms become effective constitutes acceptance of those Terms to the extent permitted by law.</p>

        <h2>28. Governing Law</h2>
        <p>These Terms are governed by the laws of the State of Florida, without regard to its conflict-of-laws principles.</p>
        <p>
          Subject to applicable law, any legal action arising from or relating to these Terms or the Services will
          be brought in the state or federal courts located in <strong>Escambia County, Florida</strong>, and each
          party consents to the jurisdiction and venue of those courts.
        </p>

        <h2>29. General Terms</h2>
        <p>These Terms, together with any policies or additional terms expressly incorporated into them, constitute the agreement between you and Webpresa regarding the Services.</p>
        <p>If any provision is found unenforceable, the remaining provisions will remain in effect.</p>
        <p>Webpresa&rsquo;s failure to enforce a provision does not waive its right to enforce that provision later.</p>
        <p>
          You may not transfer your rights under these Terms without Webpresa&rsquo;s consent. Webpresa may assign
          these Terms in connection with a merger, acquisition, reorganization, sale of assets, or similar business
          transaction.
        </p>
        <p>Nothing in these Terms creates a partnership, joint venture, employment relationship, franchise, or agency relationship between you and Webpresa.</p>

        <h2>30. Contact</h2>
        <p>Questions about these Terms may be sent to:</p>
        <p>
          <strong>Webpresa</strong>
          <br />
          Email: {SUPPORT_EMAIL}
        </p>

        <p>
          <strong>
            By creating a Webpresa account or purchasing a subscription, you acknowledge that you have read and
            agree to these Terms of Service.
          </strong>
        </p>
      </LegalDocument>
    </div>
  );
}
