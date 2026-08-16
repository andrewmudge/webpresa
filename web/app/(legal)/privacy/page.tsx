import type { Metadata } from 'next';
import { LegalDocument } from '../LegalDocument';

export const metadata: Metadata = {
  title: 'Privacy Policy — Webpresa',
  description: 'How Webpresa collects, uses, discloses, and protects information.',
};

const SUPPORT_EMAIL = 'support@webpresa.com';

export default function PrivacyPage() {
  return (
    <div className="py-10 sm:py-14">
      <LegalDocument title="Webpresa Privacy Policy" effectiveDate="August 16, 2026">
        <p>Webpresa (&ldquo;Webpresa,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy.</p>
        <p>This Privacy Policy explains how we collect, use, disclose, and protect information when you:</p>
        <ul>
          <li>visit webpresa.com;</li>
          <li>view a website preview created by Webpresa;</li>
          <li>create or use a Webpresa account;</li>
          <li>purchase a Webpresa subscription;</li>
          <li>use a website hosted by Webpresa;</li>
          <li>submit information through a Webpresa-hosted website;</li>
          <li>communicate with Webpresa; or</li>
          <li>otherwise interact with our websites, applications, and services.</li>
        </ul>
        <p>Collectively, these are referred to as the &ldquo;Services.&rdquo;</p>
        <p>By using the Services, you acknowledge the practices described in this Privacy Policy.</p>

        <h2>1. Information We Collect</h2>
        <p>The information we collect depends on how you interact with Webpresa.</p>

        <h3>A. Information You Provide to Us</h3>
        <p>We may collect information that you provide directly to us, including:</p>
        <ul>
          <li>name;</li>
          <li>email address;</li>
          <li>telephone number;</li>
          <li>business name;</li>
          <li>business address;</li>
          <li>business website;</li>
          <li>account credentials;</li>
          <li>billing information;</li>
          <li>subscription information;</li>
          <li>domain information;</li>
          <li>website content;</li>
          <li>logos, photographs, and other uploaded materials;</li>
          <li>communications with Webpresa;</li>
          <li>support requests;</li>
          <li>feedback; and</li>
          <li>other information you choose to provide.</li>
        </ul>

        <h3>B. Account Information</h3>
        <p>When you create a Webpresa account, we may collect information such as:</p>
        <ul>
          <li>your name;</li>
          <li>email address;</li>
          <li>business associated with your account;</li>
          <li>account identifiers;</li>
          <li>authentication information;</li>
          <li>account status;</li>
          <li>subscription status; and</li>
          <li>account activity.</li>
        </ul>
        <p>Passwords may be processed through authentication providers and security systems used by Webpresa.</p>
        <p>We do not need access to your plaintext password to provide the Services.</p>

        <h3>C. Payment Information</h3>
        <p>When you purchase a Webpresa subscription, payment information is processed by our payment processor.</p>
        <p>Webpresa may receive information such as:</p>
        <ul>
          <li>payment status;</li>
          <li>billing name;</li>
          <li>billing address;</li>
          <li>payment method type;</li>
          <li>the last few digits of a payment card;</li>
          <li>subscription plan;</li>
          <li>billing interval;</li>
          <li>transaction identifiers;</li>
          <li>payment dates; and</li>
          <li>payment history.</li>
        </ul>
        <p>Webpresa does not generally receive or store your complete payment-card number.</p>

        <h3>D. Business Information</h3>
        <p>Webpresa may collect information about businesses from customers, publicly available sources, and third-party data providers.</p>
        <p>This information may include:</p>
        <ul>
          <li>business name;</li>
          <li>address;</li>
          <li>telephone number;</li>
          <li>website address;</li>
          <li>business category;</li>
          <li>business hours;</li>
          <li>publicly available descriptions;</li>
          <li>geographic service area;</li>
          <li>publicly available reviews or ratings;</li>
          <li>publicly available images;</li>
          <li>logos;</li>
          <li>social-media or directory links; and</li>
          <li>other publicly available business information.</li>
        </ul>
        <p>We may use this information to identify businesses that may benefit from Webpresa, analyze existing websites, create website previews, personalize outreach, and provide the Services.</p>

        <h2>2. Website Previews</h2>
        <p>Webpresa may create preview websites for businesses before the business becomes a Webpresa customer.</p>
        <p>To create these previews, we may use business information obtained from:</p>
        <ul>
          <li>publicly accessible websites;</li>
          <li>search engines;</li>
          <li>business directories;</li>
          <li>mapping or business-information providers;</li>
          <li>publicly available social profiles;</li>
          <li>third-party data providers; and</li>
          <li>other publicly accessible sources.</li>
        </ul>
        <p>A preview may be accessible through a Webpresa URL such as:</p>
        <p>
          <strong>webpresa.com/b/[business-slug]</strong>
        </p>
        <p>
          If you represent a business displayed in a Webpresa preview and believe information should be corrected or
          removed, you may contact us at <strong>{SUPPORT_EMAIL}</strong>.
        </p>

        <h2>3. Website Visitor and Technical Information</h2>
        <p>When someone visits Webpresa or a website hosted by Webpresa, we may automatically collect certain technical information.</p>
        <p>This may include:</p>
        <ul>
          <li>IP address;</li>
          <li>browser type;</li>
          <li>operating system;</li>
          <li>device type;</li>
          <li>approximate geographic location derived from IP address;</li>
          <li>referring URL;</li>
          <li>pages viewed;</li>
          <li>links clicked;</li>
          <li>date and time of access;</li>
          <li>session information;</li>
          <li>device or browser identifiers;</li>
          <li>error information;</li>
          <li>performance information; and</li>
          <li>other standard internet activity information.</li>
        </ul>
        <p>We may use this information to operate, secure, analyze, troubleshoot, and improve the Services.</p>

        <h2>4. QR Codes, Access Codes, and Campaign Tracking</h2>
        <p>Webpresa may use QR codes, links, access codes, or similar technologies to measure the effectiveness of marketing campaigns.</p>
        <p>When you scan a Webpresa QR code, follow a campaign link, or use an access code, we may collect information such as:</p>
        <ul>
          <li>campaign identifier;</li>
          <li>business identifier;</li>
          <li>postcard or marketing-piece identifier;</li>
          <li>date and time;</li>
          <li>IP address;</li>
          <li>browser or device information;</li>
          <li>referring information;</li>
          <li>destination page;</li>
          <li>general device category; and</li>
          <li>actions associated with the campaign.</li>
        </ul>
        <p>We use this information to measure campaign performance, understand engagement, prevent fraud or abuse, and improve our marketing and Services.</p>

        <h2>5. Contact Forms and Leads</h2>
        <p>Some websites hosted by Webpresa may contain contact forms, quote-request forms, or similar lead-generation features.</p>
        <p>When a visitor submits one of these forms, information may include:</p>
        <ul>
          <li>name;</li>
          <li>email address;</li>
          <li>telephone number;</li>
          <li>message;</li>
          <li>requested service;</li>
          <li>business inquiry; and</li>
          <li>other information submitted through the form.</li>
        </ul>
        <h3>Webpresa&rsquo;s Role</h3>
        <p>Webpresa provides the technology that allows this information to be transmitted to the business operating the website.</p>
        <p>The business receiving the inquiry may use the information according to its own privacy practices.</p>
        <p>Webpresa may process and temporarily or permanently store lead information as necessary to:</p>
        <ul>
          <li>transmit the inquiry;</li>
          <li>provide the Services;</li>
          <li>troubleshoot delivery;</li>
          <li>prevent spam and abuse;</li>
          <li>maintain records;</li>
          <li>provide customer support; and</li>
          <li>secure the Services.</li>
        </ul>
        <p>If you submit information to a Webpresa customer&rsquo;s website, that customer may independently control how it uses your information.</p>
        <p>Questions about how a particular business uses information submitted through its website should generally be directed to that business.</p>

        <h2>6. Cookies and Similar Technologies</h2>
        <p>Webpresa and service providers that help us operate the Services may use cookies and similar technologies.</p>
        <p>These technologies may be used for purposes such as:</p>
        <ul>
          <li>authentication;</li>
          <li>maintaining sessions;</li>
          <li>remembering preferences;</li>
          <li>security;</li>
          <li>fraud prevention;</li>
          <li>understanding website usage;</li>
          <li>measuring performance;</li>
          <li>troubleshooting;</li>
          <li>attribution; and</li>
          <li>improving the Services.</li>
        </ul>
        <p>Some cookies may be necessary for the Services to function.</p>
        <p>Your browser may allow you to block or delete cookies. Certain features may not work properly if required cookies are disabled.</p>

        <h2>7. How We Use Information</h2>
        <p>We may use information we collect to:</p>
        <ul>
          <li>provide and operate Webpresa;</li>
          <li>create website previews;</li>
          <li>generate and host customer websites;</li>
          <li>create and manage accounts;</li>
          <li>authenticate users;</li>
          <li>process subscriptions;</li>
          <li>process and deliver leads;</li>
          <li>connect and manage domains;</li>
          <li>provide customer support;</li>
          <li>communicate with customers;</li>
          <li>send account, billing, renewal, security, and service notifications;</li>
          <li>analyze website and product usage;</li>
          <li>measure marketing campaigns;</li>
          <li>personalize the Services;</li>
          <li>improve website generation and design systems;</li>
          <li>detect and prevent fraud, spam, abuse, and security threats;</li>
          <li>diagnose technical problems;</li>
          <li>maintain and improve infrastructure;</li>
          <li>enforce our Terms of Service;</li>
          <li>protect Webpresa, our customers, and others;</li>
          <li>comply with legal obligations; and</li>
          <li>establish, exercise, or defend legal claims.</li>
        </ul>

        <h2>8. Artificial Intelligence and Automated Systems</h2>
        <p>Webpresa may use artificial intelligence and automated systems to provide portions of the Services.</p>
        <p>For example, these systems may assist with:</p>
        <ul>
          <li>analyzing existing websites;</li>
          <li>evaluating website quality;</li>
          <li>generating website content;</li>
          <li>generating or modifying website layouts;</li>
          <li>processing business information;</li>
          <li>classifying businesses;</li>
          <li>generating recommendations; and</li>
          <li>improving Webpresa&rsquo;s services.</li>
        </ul>
        <p>Information may be transmitted to third-party technology providers when necessary to provide these functions.</p>
        <p>We seek to limit information provided to third parties to what is reasonably necessary for the applicable purpose.</p>
        <p>Customers should not submit highly sensitive personal information to Webpresa&rsquo;s AI-powered features unless specifically requested.</p>

        <h2>9. How We Disclose Information</h2>
        <p>We may disclose information in the following circumstances.</p>

        <h3>A. Service Providers</h3>
        <p>We use third-party companies to help operate Webpresa.</p>
        <p>These may include providers of:</p>
        <ul>
          <li>cloud infrastructure;</li>
          <li>website hosting;</li>
          <li>authentication;</li>
          <li>payment processing;</li>
          <li>domain registration and DNS services;</li>
          <li>email delivery;</li>
          <li>artificial intelligence;</li>
          <li>website analysis;</li>
          <li>mapping and business information;</li>
          <li>analytics;</li>
          <li>security;</li>
          <li>monitoring;</li>
          <li>customer support; and</li>
          <li>other technology services.</li>
        </ul>
        <p>These providers may process information as necessary to provide services to Webpresa.</p>

        <h3>B. Customer Businesses</h3>
        <p>When someone submits an inquiry through a Webpresa-hosted customer website, we may disclose that information to the customer that operates the website.</p>
        <p>This is necessary to deliver the inquiry requested by the visitor.</p>

        <h3>C. Legal Requirements</h3>
        <p>We may disclose information if we reasonably believe disclosure is necessary to:</p>
        <ul>
          <li>comply with applicable law;</li>
          <li>respond to lawful legal process;</li>
          <li>respond to valid government requests;</li>
          <li>investigate fraud or illegal activity;</li>
          <li>enforce our agreements;</li>
          <li>protect the security of the Services; or</li>
          <li>protect the rights, safety, or property of Webpresa, our customers, or others.</li>
        </ul>

        <h3>D. Business Transactions</h3>
        <p>If Webpresa is involved in a merger, acquisition, financing, reorganization, bankruptcy, sale of assets, or similar transaction, information may be transferred as part of that transaction.</p>
        <p>Any successor may continue processing information in accordance with this Privacy Policy or provide notice of materially different practices as required by law.</p>

        <h3>E. With Your Direction or Consent</h3>
        <p>We may disclose information when you direct us to do so or otherwise consent to the disclosure.</p>

        <h2>10. Sale of Personal Information</h2>
        <p>Webpresa does <strong>not currently sell personal information for monetary consideration</strong>.</p>
        <p>We also do not currently operate an advertising business in which customer personal information is sold to third-party advertisers.</p>
        <p>If our practices materially change, we will update this Privacy Policy and provide any notices or choices required by applicable law.</p>
        <p>
          Certain privacy laws may define terms such as &ldquo;sale,&rdquo; &ldquo;sharing,&rdquo; or &ldquo;targeted
          advertising&rdquo; more broadly than an ordinary monetary sale. Where applicable, Webpresa will provide
          rights and disclosures required under those laws.
        </p>

        <h2>11. Sensitive Information</h2>
        <p>Webpresa is designed primarily for business website creation and hosting.</p>
        <p>
          You should not use Webpresa to intentionally collect or store highly sensitive personal information unless
          the applicable Webpresa feature expressly supports that use.
        </p>
        <p>For example, customers should not intentionally use standard Webpresa contact forms to collect:</p>
        <ul>
          <li>Social Security numbers;</li>
          <li>financial account passwords;</li>
          <li>complete payment-card information;</li>
          <li>medical records;</li>
          <li>health diagnoses;</li>
          <li>biometric identifiers;</li>
          <li>government identification numbers; or</li>
          <li>similarly sensitive information.</li>
        </ul>
        <p>Webpresa is not represented as a system designed for storing regulated medical information or other specialized categories of sensitive information unless expressly stated otherwise.</p>

        <h2>12. Data Retention</h2>
        <p>We retain information for as long as reasonably necessary to:</p>
        <ul>
          <li>provide the Services;</li>
          <li>maintain customer accounts;</li>
          <li>process subscriptions;</li>
          <li>maintain website content;</li>
          <li>provide website previews;</li>
          <li>maintain security and audit records;</li>
          <li>prevent fraud and abuse;</li>
          <li>comply with legal obligations;</li>
          <li>resolve disputes;</li>
          <li>enforce agreements; and</li>
          <li>support legitimate business operations.</li>
        </ul>
        <p>Retention periods vary depending on the type of information and why we collected it.</p>
        <p>For example, some account, payment, security, transaction, and audit information may need to be retained after an account is canceled.</p>
        <p>When information is no longer reasonably necessary, we may delete, anonymize, or aggregate it.</p>

        <h2>13. What Happens After Subscription Cancellation</h2>
        <p>Canceling a Webpresa subscription does not necessarily result in immediate deletion of all information associated with the account or website.</p>
        <p>As explained in our Terms of Service, after the paid subscription period ends, a website originally created by Webpresa may continue to exist at a Webpresa-owned URL such as:</p>
        <p>
          <strong>webpresa.com/b/[business-slug]</strong>
        </p>
        <p>Customer account features and custom-domain publishing may no longer be available.</p>
        <p>We may retain information reasonably necessary for:</p>
        <ul>
          <li>maintaining the Webpresa-hosted version;</li>
          <li>maintaining business and transaction records;</li>
          <li>preventing fraud or abuse;</li>
          <li>security and audit purposes;</li>
          <li>resolving disputes; and</li>
          <li>complying with applicable law.</li>
        </ul>
        <p>
          A business may request removal of a publicly accessible Webpresa-hosted version by contacting{' '}
          <strong>{SUPPORT_EMAIL}</strong>.
        </p>

        <h2>14. Data Security</h2>
        <p>Webpresa uses administrative, technical, and organizational safeguards designed to protect information against unauthorized access, loss, misuse, alteration, or disclosure.</p>
        <p>These measures may include:</p>
        <ul>
          <li>access controls;</li>
          <li>authentication controls;</li>
          <li>encrypted network communications;</li>
          <li>cloud security controls;</li>
          <li>logging and monitoring;</li>
          <li>restricted administrative access;</li>
          <li>security testing;</li>
          <li>infrastructure protections; and</li>
          <li>other safeguards appropriate to the nature of the information we process.</li>
        </ul>
        <p>However, no internet service, computer system, transmission method, or storage system can be guaranteed to be completely secure.</p>
        <p>You are responsible for protecting your account credentials and notifying us if you suspect unauthorized access to your account.</p>

        <h2>15. Data Breaches and Security Incidents</h2>
        <p>If Webpresa becomes aware of a security incident affecting personal information, we may investigate the incident, take appropriate steps to mitigate harm, and provide notifications when required by applicable law.</p>

        <h2>16. Your Privacy Choices and Rights</h2>
        <p>Depending on where you live and the laws that apply, you may have rights regarding your personal information.</p>
        <p>These rights may include the ability to request:</p>
        <ul>
          <li>confirmation that we process your personal information;</li>
          <li>access to personal information;</li>
          <li>correction of inaccurate personal information;</li>
          <li>deletion of certain personal information;</li>
          <li>a portable copy of certain personal information;</li>
          <li>information about categories of personal information processed;</li>
          <li>information about categories of recipients;</li>
          <li>opt-out from certain sales, sharing, or targeted advertising activities where applicable; and</li>
          <li>review or appeal of certain privacy-request decisions where required by law.</li>
        </ul>
        <p>Not every right applies in every jurisdiction or circumstance.</p>
        <p>We may need to verify your identity before processing a request.</p>
        <p>We may also deny or limit requests where permitted by law, including when information must be retained for security, fraud prevention, legal compliance, contractual obligations, or other permitted purposes.</p>
        <p>To submit a privacy request, contact:</p>
        <p>
          <strong>{SUPPORT_EMAIL}</strong>
        </p>
        <p>and include enough information for us to identify your account or request.</p>
        <p>We will respond within the period required by applicable law.</p>

        <h2>17. Authorized Agents</h2>
        <p>Where permitted by applicable law, you may authorize another person to submit a privacy request on your behalf.</p>
        <p>We may request documentation demonstrating that the person is authorized to act for you and may separately verify your identity.</p>

        <h2>18. Marketing Communications</h2>
        <p>Webpresa may send marketing communications regarding our products and services where permitted by law.</p>
        <p>You may unsubscribe from marketing email by following the unsubscribe instructions included in the communication.</p>
        <p>Even if you unsubscribe from marketing messages, we may continue sending non-promotional communications related to:</p>
        <ul>
          <li>your account;</li>
          <li>your subscription;</li>
          <li>payments;</li>
          <li>domains;</li>
          <li>website operation;</li>
          <li>security;</li>
          <li>support;</li>
          <li>legal notices; and</li>
          <li>other Service-related matters.</li>
        </ul>

        <h2>19. Do Not Track and Browser Signals</h2>
        <p>Some browsers and devices provide privacy preference signals.</p>
        <p>Because legal and technical standards regarding these signals continue to develop, Webpresa will respond to legally required browser-based opt-out mechanisms where applicable.</p>
        <p>Traditional &ldquo;Do Not Track&rdquo; signals may not have a consistent industry-standard meaning.</p>

        <h2>20. Children&rsquo;s Privacy</h2>
        <p>Webpresa is intended for businesses and adults.</p>
        <p>The Services are not directed to children under 13, and Webpresa does not knowingly collect personal information directly from children under 13 through account registration.</p>
        <p>
          If you believe a child has provided personal information directly to Webpresa without appropriate
          authorization, contact us at <strong>{SUPPORT_EMAIL}</strong>.
        </p>
        <p>We may delete the information as appropriate.</p>
        <p>Customers operating websites through Webpresa are responsible for ensuring that their own collection of information from children complies with applicable law.</p>

        <h2>21. Third-Party Websites</h2>
        <p>The Services may contain links to websites or services operated by third parties.</p>
        <p>Webpresa does not control the privacy practices of those third parties.</p>
        <p>This Privacy Policy does not apply to information collected directly by third-party websites or services.</p>
        <p>You should review the privacy policies of third parties before providing information to them.</p>

        <h2>22. International Visitors</h2>
        <p>Webpresa is based in the United States.</p>
        <p>If you access the Services from outside the United States, information may be transferred to, processed, or stored in the United States and other countries where Webpresa or our service providers operate.</p>
        <p>Those countries may have different privacy and data-protection laws than your country.</p>

        <h2>23. State Privacy Rights</h2>
        <p>Residents of certain U.S. states may have additional privacy rights under state law.</p>
        <p>The applicability of those laws may depend on factors such as Webpresa&rsquo;s size, revenue, number of consumers whose information is processed, and how information is used.</p>
        <p>Where a state privacy law applies to Webpresa, we will honor applicable rights and obligations required under that law.</p>
        <p>Submitting a privacy request will not result in unlawful discrimination against you for exercising a privacy right.</p>

        <h2>24. Customer Websites and Customer Privacy Obligations</h2>
        <p>Businesses using Webpresa remain responsible for determining which privacy laws apply to their own businesses and websites.</p>
        <p>A Webpresa customer may need its own privacy disclosures depending on:</p>
        <ul>
          <li>the information it collects;</li>
          <li>its industry;</li>
          <li>its location;</li>
          <li>where its customers are located;</li>
          <li>its use of advertising or analytics technologies; and</li>
          <li>other legal requirements.</li>
        </ul>
        <p>Webpresa&rsquo;s Privacy Policy does not automatically replace privacy disclosures that a customer may independently be required to provide to visitors of its own business website.</p>

        <h2>25. Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time.</p>
        <p>When we do, we will update the Effective Date at the top of this Policy.</p>
        <p>If we make material changes to how we process personal information, we may provide additional notice where required by law.</p>
        <p>Your continued use of the Services after an updated Privacy Policy becomes effective is subject to the updated Policy.</p>

        <h2>26. Contact Us</h2>
        <p>If you have questions about this Privacy Policy or Webpresa&rsquo;s privacy practices, or if you want to exercise an applicable privacy right, contact:</p>
        <p>
          <strong>Webpresa</strong>
          <br />
          Email: {SUPPORT_EMAIL}
        </p>
        <p>For general customer support:</p>
        <p>
          <strong>{SUPPORT_EMAIL}</strong>
        </p>
      </LegalDocument>
    </div>
  );
}
