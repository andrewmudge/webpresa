1.	Getting Started
Initial setup
Storefront is a fully hosted, brandable storefront that lets you sell domain names directly to your customers. Before you can open your store and start taking orders, you'll complete a one-time setup process in Storefront Manager.
This guide walks you through everything you need to do to activate your Storefront, from logging in for the first time through to going live.
If you're interested in exploring Storefront's developer features, including the API, see the Developers section.
Storefront and your OpenSRS account
Storefront is a separate product built on top of your existing OpenSRS reseller account. Your customers shop and manage domains through your Storefront; domain registrations are fulfilled behind the scenes through your OpenSRS account, which is why your OpenSRS account balance needs to stay funded.
Storefront also supports a curated subset of the TLDs available in OpenSRS. Not every TLD you can register through the RCP is available for customer self-service purchase in your store.

📘
Storefront vs. Storefront Manager
This guide uses Storefront to mean your customer-facing store and Storefront Manager to mean the administrative area you're using right now to set it up. If that distinction is new to you, see How Storefront and OpenSRS Work Together for the full picture.
Before you begin
Make sure you have the following ready before starting setup:
•	An OpenSRS account with a balance of at least $10. Storefront uses your OpenSRS account balance to cover the cost of domain registrations on behalf of your customers. Add funds at any time in the Reseller Control Panel (RCP).
•	A Stripe account (or be prepared to create one). Storefront uses Stripe to process customer payments and pay out your earnings. If you don't have a Stripe account yet, you'll be guided through creating one during setup.
Accessing Storefront Manager
Storefront Manager (manage.shopco.com) and the OpenSRS Reseller Control Panel share credentials, so you can move between them without logging in again. Changes made in one do not automatically appear in the other.
Log in directly
1.	Navigate to manage.shopco.com/login.
2.	Enter your OpenSRS username and password.
3.	Click Login.
You can access Storefront Manager from any modern browser on a desktop, tablet, or mobile device.
Log in from the OpenSRS Reseller Control Panel
If you are already logged in to the RCP, navigate to Storefront Manager without logging in again.
1.	Log in to the RCP at manage.opensrs.com.
2.	Hover over the arrow in the main menu.
3.	Select Storefront from the dropdown.
On your first login to Storefront Manager, you'll land on the Getting Started page. This page guides you through the three required setup steps. The Activate button remains inactive until all three are complete.
Step 1: Connect your Stripe account
Stripe handles all customer payments: credit card processing, payouts to your bank account, and payment receipts. You need to connect a Stripe account before your store can accept orders.
1.	From the Getting Started page, click Set up a payment account. This opens your payment settings. You can also reach them at any time from the store menu in the top-right corner: select Storefront Settings, then Payments.
2.	Click Connect Stripe.
3.	A new window opens to begin the Stripe onboarding flow. Follow the prompts to either create a new Stripe account or connect an existing one.
4.	Once complete, you'll be redirected back to Storefront Manager.
What to expect from Stripe verification:
Stripe status	What it means	What to do
Complete	Your account is verified and ready.	Nothing, you're all set.
Pending	Stripe is still reviewing your account.	Wait for Stripe to complete verification. This can take a few days.
Restricted / Restricted Soon	Stripe needs more information from you.	Return to Payments in Storefront Settings and complete the additional steps Stripe is requesting.
Rejected	Stripe was unable to verify your account.	Contact OpenSRS Support for assistance.

If your OpenSRS account balance is below $10, you'll see a warning on your dashboard. Add funds in the RCP before attempting to activate.
Step 2: Review your domain pricing
Before activating, review and set the retail pricing your customers will see in your store.
1.	From the Getting Started page, click Review your domain pricing. You can also reach pricing at any time from the store menu in the top-right corner by selecting Pricing Settings.
2.	Storefront offers two approaches:
o	Default markup: a single percentage markup that applies to all TLDs automatically. Optionally enable pretty pricing so all prices end in .99 or .00.
o	Per-TLD pricing: a custom markup or specific retail price for individual TLDs. Per-TLD prices override your default markup for those TLDs.
3.	Review the pricing and save your changes.
You don't need to get pricing perfect before activating; you can update it at any time. The important thing is to review it so you know what your customers will see.
For a full walkthrough, see Setting Up Domain Pricing.
Step 3: Configure your store settings
This step covers the core details that identify your store and ensure customers can reach you for support.
1.	From the Getting Started page, click Customize your Storefront. You can also reach these settings from the store menu in the top-right corner: select Storefront Settings, then General.
Store name
Your store name appears throughout the customer-facing storefront and on order receipts.
Enter your store name in the Store name field and click Save.
Support email address
Your support email is displayed to customers when they need help. Storefront also uses it as the sender address for all outgoing customer emails: order confirmations, renewal reminders, and expiry notices.
1.	Click Add support email address (if no email is set) or Change (if one already exists).
2.	Enter your email address in the pop-up and confirm.
Verify your sender domain
By default, your support email shows as Unverified. Authenticating your sender domain improves deliverability. Emails from unverified domains are more likely to be filtered to spam by customer email providers.
To authenticate, click Authenticate domain next to your support email address and follow the steps. This requires adding DNS records to your domain at your registrar.
Storefront hostname
By default, your storefront is accessible at [your-username].shopco.com. To use your own domain, follow the hostname configuration in General settings. Add the hostname where your domain's DNS records are hosted, which is often your domain registrar.
Store status
Your store status controls whether your storefront is open to customers. You'll activate your store in the next step. This toggle is also how you deactivate and reactivate it later.
Deactivating takes your store offline immediately. Customers cannot browse, search, or purchase until you reactivate. Existing customers will not be able to log into Storefront to manage their domains.
Personal website
Add a link to your business website in the Link to Main Website field. This may appear in your storefront depending on your theme and configuration.
Branding settings
Logo, brand colour, favicon, and custom homepage content are managed under Branding & Content in Storefront Settings. These are optional during initial setup but affect your customers' first impression of your store. See Customizing Your Branding for a full walkthrough.
Activating your Storefront
Once all three required steps are complete, the Activate button becomes available on the Getting Started page.
Click Activate to open your store. Here's what happens:
•	Your storefront goes live at [your-username].shopco.com (or your custom domain if configured).
•	Customers can now browse, register, and manage domains through your store.
•	The Getting Started page is removed from your navigation.
•	You'll land on your Storefront Manager dashboard, where you can monitor orders, manage customers, and adjust your settings.
Troubleshooting
I can't find the Activate button.
The Activate button only appears when all three required setup steps are complete: Stripe connected, pricing reviewed, and general settings configured. Check which steps are still showing as incomplete on the Getting Started page.
I forgot my password.
Your Storefront Manager and RCP passwords are the same, so a reset applies to both. Navigate to manage.opensrs.com, click Login, then Forgot password. Enter your username and click Send. The reset email goes to the address on your OpenSRS account.
I can log in to the RCP but not Storefront Manager.
Your credentials are shared, so if RCP login works, Storefront Manager should accept the same credentials. Clear your browser cache and try again, or try a different browser. If the issue persists, contact OpenSRS Support.
Customers say they're not receiving order confirmation emails.
Check whether your sender domain is verified in General settings. Unverified sender domains have higher spam filter rates. Also confirm the support email address is correct.
How Storefront and OpenSRS work together
If you're an existing OpenSRS reseller setting up Storefront for the first time, you might notice that the two products feel different, have different URLs, and have different capabilities. Storefront and OpenSRS are tightly connected, but it's important to understand how they relate, differ, and work together.
The three pieces
There are three distinct interfaces involved:
OpenSRS (the Reseller Control Panel) is your wholesale registrar account — your relationship with Tucows as a domain reseller. It's a funded domain registrar account used to register domains, manage reseller settings, and access the full OpenSRS product catalog. Your customers never see or interact with OpenSRS directly.
Storefront is the retail layer built on top of your OpenSRS account. It has two parts:
•	The customer-facing store — a branded website your customers visit to search for and buy domains, check out with a credit card, and manage their domains and renewals. This lives at your username.shopco.com URL (or your custom domain).
•	Storefront Manager — a separate administrative interface only you (the reseller) can access, at manage.shopco.com. This is where you manage customers, orders, pricing, branding, Stripe, DNS, event logs, reports, and all store settings.
A useful way to think about it: OpenSRS is your registrar account, the customer-facing Storefront is your shop window, and Storefront Manager is your back office.
________________________________________
How they connect
When a customer buys a domain through your Storefront, here's what happens:
1.	Your customer searches for a domain and adds it to their cart on your customer-facing store.
2.	They check out and pay by credit card. Stripe collects the payment and deposits it directly into your connected bank account.
3.	Behind the scenes, OpenSRS registers the domain at wholesale cost, debiting that amount from your OpenSRS account balance. A Storefront processing fee is also deducted.
4.	The domain appears in Storefront Manager under that customer's account, and in your customer's portal where they can manage DNS, renew, and so on.
Your customers only ever see steps 1–2. Steps 3–4 happen automatically and invisibly.
________________________________________
Why your OpenSRS account balance needs to stay funded
Stripe is collecting money from customers — so why does the OpenSRS balance also need to stay funded?
They're two separate transactions. Your Stripe account is your own, not Tucows'. Stripe collects your revenue; that money is yours and goes straight to your bank. OpenSRS separately bills you the wholesale domain cost from your OpenSRS balance. If your OpenSRS balance runs out, new domain registrations will fail even if customers could pay successfully via Stripe.
Your OpenSRS balance is your working capital for fulfilling orders. Keep enough in your balance to cover a typical week of expected orders.
Add funds at any time in the Reseller Control Panel. Storefront Manager will show a warning on your dashboard when your balance drops below $25.
________________________________________
Why not all OpenSRS TLDs are available in Storefront
OpenSRS supports hundreds of TLDs across gTLDs and ccTLDs. Storefront supports a growing but curated subset of those. Most TLDs that are in OpenSRS but not yet in Storefront are on the roadmap. A small number have registry requirements (such as manual approval processes) that make them unsuitable for automated self-service purchase.
See the full list: List of Storefront TLDs Currently Offered.
If a TLD you want to offer isn't in Storefront, you can still register and manage those domains for your customers through the OpenSRS Reseller Control Panel — they just won't appear in your Storefront.
________________________________________
Why some OpenSRS features aren't in Storefront yet
Storefront is a newer, actively developed product being built out incrementally. Some things available in your OpenSRS account aren't yet available in Storefront. For example:
•	Email hosting — not yet available as a Storefront product
•	SSL certificates — not yet available as a Storefront product
•	Premium and aftermarket domains — not yet available as a Storefront product
•	Multiple OpenSRS sub-accounts — Storefront Manager login uses your primary OpenSRS credentials; sub-accounts are not separately supported yet
You can follow what's been shipped and what's coming at opensrs.com/storefront-roadmap-release-notes.
Contact OpenSRS Support if you'd like confirmation on whether something specific is on the roadmap or to request additional features.
________________________________________
Summary
	OpenSRS (RCP)	Storefront	Storefront Manager
What it is	Your wholesale domain registrar account	Your branded retail store	Your back-office admin console
Who uses it	You	Your customers	You
URL	manage.opensrs.com	username.shopco.com (or custom domain)
manage.shopco.com
What it handles	Domain registration at wholesale cost, account balance, full product catalog	Domain search, checkout, customer accounts, domain management	Customers, orders, pricing, settings, DNS, reports, Stripe
Funded by	Your OpenSRS account balance	—	—
Revenue flows to	—	Your Stripe account (Storefront fee + domain cost deducted per order)	—
1.	
Getting Started
Setting up Stripe
Storefront uses Stripe to process credit card payments from your customers. When a customer buys a domain through your store, Stripe collects the payment on your behalf and deposits it directly to your connected bank account. You keep the full sale amount; OpenSRS deducts the domain cost and a $0.75 per-order processing fee from your OpenSRS account balance separately.
You need to connect a Stripe account before you can activate your Storefront and accept orders. If you don't already have a Stripe account, you'll create one during setup — it's free to sign up.
How payments work
1.	Customer pays — your customer enters their credit card at checkout. Stripe processes the payment and the full amount lands in your connected Stripe account, minus Stripe's own processing fees.
2.	Domain cost is covered — OpenSRS deducts the wholesale cost of the domain registration from your OpenSRS account balance.
3.	Processing fee is deducted — a $0.75 per-order fee is deducted from your OpenSRS account balance for each completed order.
4.	You keep the rest — your Stripe account retains everything the customer paid, minus Stripe's fees. Earnings are paid out to your bank on Stripe's standard payout schedule.
This is why your OpenSRS account balance needs to stay funded — it covers domain costs and the processing fee on every order. If your balance hits zero, new orders will fail even if your customers are paying successfully.
________________________________________
Before you begin
•	You'll need a Stripe account. If you don't have one, you can create one at stripe.com during the setup flow. Stripe accounts are free to create.
•	Your OpenSRS account balance must be above $10 before you can activate your Storefront. Add funds at any time in the Reseller Control Panel (RCP).
________________________________________
Connecting your Stripe account
1.	Log in to Storefront Manager.
2.	From the Getting Started page, click Connect your account with Stripe — or navigate to Settings → Payments and click Connect Stripe.
3.	A new window will open, taking you to the Storefront app on Stripe. Sign in to your existing Stripe account, or create a new one.
4.	Review and accept the permissions Storefront requests, then complete the Stripe onboarding flow.
5.	Once complete, you'll be redirected back to your Storefront Payments page.
________________________________________
Stripe account verification statuses
After connecting, Stripe reviews your account. This can take from a few minutes to a few days.
Status	What it means	What to do
Complete	Your account is verified and ready to accept payments.	Nothing — you're all set.
Pending	Stripe is still reviewing your account.	Wait for Stripe to complete verification. Check your email for any requests from Stripe.
Restricted / Restricted Soon	Stripe needs additional information before your account can process payments.	Return to Settings → Payments and follow the prompts to complete the required Stripe steps.
Rejected	Stripe was unable to approve your account.	Contact Stripe for assistance.

Your Storefront cannot be activated until your Stripe status is Complete.
________________________________________
Keeping your OpenSRS account funded
Your OpenSRS account balance is drawn down with every order. If your balance runs out, orders will start failing for your customers even though Stripe is collecting their payments fine.
To add funds:
1.	Log in to the Reseller Control Panel (RCP).
2.	Navigate to Billing → Add Funds and top up your balance.
Storefront will show a low balance warning on your dashboard when your account balance drops below $25.
📘
Use OpenSRS low balance notifications
We recommend configuring account balance notifications within OpenSRS. This ensures that you never run out of account balance to fund your Storefront purchases.

________________________________________
Switching to a different Stripe account
If you need to connect a different Stripe account, you can switch without any downtime for your store.
1.	Log in to Storefront Manager.
2.	Navigate to Settings → Payments.
3.	Click Switch Stripe Account.
4.	Confirm the switch in the popup — you'll be taken to the Stripe OAuth flow in a new tab.
5.	Complete the Stripe connection for your new account.
Orders in progress are not affected by switching accounts.
________________________________________
Troubleshooting
I connected Stripe but my Storefront still won't activate.
Check that your Stripe status shows Complete in Settings → Payments. Also confirm your OpenSRS account balance is above $10.
My customers are getting payment errors at checkout.
This is most often caused by a low or zero OpenSRS account balance. Check your balance in the RCP and add funds if needed. Also check your Stripe account status in Settings → Payments.
I don't see the Connect Stripe button.
If you've already connected a Stripe account, you'll see your account status instead of the connect button. To switch accounts, use the Switch Stripe Account option described above.
I set up Stripe but didn't finish — where do I continue?
If you dismissed the Stripe setup prompt during initial login, a banner will appear on your Storefront dashboard. Click it to return to the payments setup, or go to Settings → Payments → Connect Stripe directly.
Storefront nameservers
Every domain registered through your Storefront needs nameservers, the servers that answer DNS queries for that domain. Your nameserver choice determines two things: whether your customers can manage their own DNS records in Storefront, and whether DNS templates apply automatically at registration.
Storefront (Shopco) DNS vs. custom nameservers
Storefront supports two nameserver configurations for new registrations.
Shopco DNS (default) uses Storefront's own nameservers:
•	a.ns.shopco.com
•	b.ns.shopco.com
•	c.ns.shopco.com
When a domain uses Shopco DNS:
•	Your customers can view and edit their DNS records in the Storefront customer portal.
•	DNS templates apply automatically at registration (if you have one configured).
•	Customers can reset their DNS to the template default.
•	You can manage DNS records on a customer's behalf via Storefront Manager.
Custom nameservers use a nameserver set you define, typically your own DNS provider or a third-party service. When a domain uses custom nameservers:
•	DNS is managed at your external provider, not in Storefront.
•	Customers cannot view or edit DNS in the Storefront portal.
•	DNS templates do not apply at registration.
•	You manage DNS records outside of Storefront entirely.
The nameserver choice is a reseller-level setting that applies to all new registrations in your store. Individual customers can still change their domain's nameservers after registration from their Storefront account.
Configure default nameservers for new registrations
The default nameserver setting applies to every new domain registered in your store from that point forward. It does not change the nameservers on domains already registered.
Use Shopco DNS (default)
Shopco DNS is the default for new Storefronts. If you haven't changed the setting, no action is needed.
To restore Shopco DNS as the default:
1.	Log in to Storefront Manager.
2.	Open the store menu in the top-right corner and select Storefront Settings.
3.	Select Advanced Settings, then Domain Defaults.
4.	In the Nameservers section, select Use default nameservers.
5.	Click Save Changes.
Use custom nameservers
1.	Open the store menu in the top-right corner and select Storefront Settings.
2.	Select Advanced Settings, then Domain Defaults.
3.	In the Nameservers section, select Use your nameservers.
4.	Enter your nameserver addresses (up to 4).
5.	Click Save Changes.
Change nameservers on an existing domain
Resellers can change nameservers on any domain in their store. Customers can change nameservers on their own domains from the Storefront customer portal.
To change nameservers on a domain as the reseller:
1.	Navigate to the domain's details page in Storefront Manager and select the DNS tab.
2.	Find the Nameservers section.
3.	Click Edit Nameservers.
4.	Enter the new nameserver addresses.
5.	Click Save.
To switch a domain to Shopco DNS, click Reset to default in the Nameservers section and confirm. This sets the domain to a.ns.shopco.com, b.ns.shopco.com, c.ns.shopco.com
Nameserver changes propagate across the internet within minutes to 48 hours depending on the domain's TTL and caching by resolvers.
What your customer sees
When a domain uses Shopco DNS, the customer sees a DNS Records section on their domain's page in the Storefront portal. They can add, edit, and delete records there without contacting you.
When a domain uses custom nameservers, the DNS Records section either does not appear or shows a message indicating DNS is managed externally. The customer cannot edit DNS in Storefront.
Troubleshooting
A customer can't see DNS records for their domain in Storefront
The domain is using custom nameservers. DNS records for custom-nameserver domains are managed at the external provider, not in Storefront. To enable Storefront DNS management, switch the domain to Shopco DNS nameservers. If the domain has existing DNS records to preserve, see Transfering systemDNS zones to Storefront for the migration process.
DNS templates aren't applying to new registrations
Confirm that Use default nameservers is selected in Storefront Settings → Advanced Settings → Domain Defaults. DNS templates only apply to domains using Shopco DNS. If you've set custom nameservers as the default, templates will not apply.
I changed the default nameserver setting but existing domains weren't affected
The default nameserver setting only applies to new registrations going forward. Changing it does not update nameservers on domains already registered. Update individual domains manually if needed.
A nameserver change isn't taking effect
Nameserver changes propagate across the internet and can take up to 48 hours. If propagation seems stalled after 48 hours, verify the new nameservers are responding correctly and contact OpenSRS Support if the issue persists.
Using the test environment
The Storefront test environment is a sandboxed version of your store where you can simulate the full reseller and customer experience without affecting live data or processing real payments. Use it before activating your store to verify your setup, or any time you want to test a configuration change before applying it to your live store.
How the test environment works
The test environment is a parallel instance of your Storefront: a separate URL, separate login, same functionality. It mirrors your live Storefront's feature set exactly. Anything you can do in your live store, you can do in the test environment.
The key difference is payment processing. The test environment automatically connects to Stripe's sandbox mode rather than your live Stripe account. No real transactions occur. To simulate a customer checkout, use Stripe's test credit card numbers. These trigger the full payment flow without charging any card.
Your test environment has a separate password from your live Storefront and RCP. This is intentional. It prevents accidental cross-environment actions.
Data in the test environment is isolated. Domains registered, customers created, and settings changed in the test environment do not appear in or affect your live store.
Before you begin
The test environment initializes automatically the first time you log in to your live Storefront Manager. Log in to manage.shopco.com first if you haven't already.
Step 1: Access the Test Storefront Manager
1.	Navigate to manage.test.shopco.com.
2.	Log in:
o	First time: use your existing OpenSRS username and password.
o	Returning: use the password you set during your first test environment login.
If you cannot log in, contact OpenSRS Support to request a password reset for the test environment. This is separate from a live account reset.
Step 2: Set up the test environment
Configure the test Storefront the same way you would your live store.
1.	Complete the settings you want to test: pricing, branding, general settings.
2.	Connect Stripe. The test environment routes automatically to Stripe sandbox mode. Use Stripe's test credit card numbers to simulate checkout transactions.
Step 3: Access the test customer storefront
1.	Navigate to [your-username].test.shopco.com, replacing [your-username] with your reseller username.
2.	Browse, search for domains, and complete a simulated checkout using Stripe test cards.
a.	Stripe makes available a set of test credit cards: https://docs.stripe.com/testing?testing-method=card-numbers
What you can test
Everything available in your live Storefront is available in the test environment. For task-specific instructions, use the live articles; the steps are identical in both environments.
•	Initial setup
•	Setting Up Domain Pricing in Storefront
•	Customizing Your Storefront Branding
•	Setting up Stripe
•	Storefront Nameservers
Troubleshooting
I can't log in to the test environment.
Your test environment password is separate from your live Storefront and RCP credentials. If you've forgotten it, contact OpenSRS Support to request a password reset specifically for the test environment.
My test environment settings aren't matching my live store.
The test environment initializes from your live Storefront at first login, but changes made after that point are independent. If you update your live store settings, apply the same changes in the test environment manually.
A test checkout failed even though I used a Stripe test card.
Confirm the test environment is connected to Stripe in Settings → Payments. The test environment uses Stripe sandbox mode, but you still need to complete the Stripe connection flow. Also verify you're using a valid test card number from Stripe's testing documentation.
DNS templates
A DNS template is a saved set of DNS records that Storefront automatically applies to each domain your customers register through your store. Instead of manually configuring DNS on every new domain, you define the records once and let Storefront handle the rest at registration time.
📘
DNS templates require Shopco nameservers
Templates only work on domains using Shopco DNS nameservers (a.ns.shopco.com, b.ns.shopco.com, c.ns.shopco.com). Domains using custom nameservers are not affected.
Templates, manual DNS, and query strings
These three tools serve different points in a domain's DNS lifecycle.
DNS templates define the baseline configuration for new registrations. They apply once, at the moment of registration, and set up the DNS records your customers start with. If a customer later modifies their DNS and wants to start over, they can reset to the template default.
Manual DNS management handles changes after registration, including adding, editing, or removing individual records on a domain that's already active. This is the day-to-day tool for DNS maintenance. See Managing DNS records.
Query strings extend templates by letting you pre-select a specific template for a customer session before they even start browsing your store. This is useful when you know which service a customer is signing up for and want the right DNS applied at registration automatically, without any manual steps. See Using Querystrings.
Supported record types
DNS templates support the following record types:
Type	Required fields
A	Hostname, IP address, TTL
AAAA	Hostname, IPv6 address, TTL
CNAME	Hostname, target name, TTL
MX	Hostname, priority, mail server, TTL
SRV	Hostname, priority, weight, port, server, TTL
TXT	Hostname, content, TTL
TTL defaults to 15 minutes for all record types unless you specify otherwise.
Use {{domain}} as a placeholder in any record field. Storefront substitutes the registered domain name when the template is applied. This is useful for CNAME records that reference the domain itself.
Create a DNS template
1.	Log in to Storefront Manager.
2.	Open the store menu in the top-right corner and select Storefront Settings.
3.	Select Advanced Settings, then Domain Defaults.
4.	In the DNS Templates section, click Create Template (for your first template) or Add New Template.
5.	Enter a template name. This name is visible to customers if they reset their DNS, so use something descriptive, for example "Standard Hosting" or "Pro Hosting".
6.	Click + Add Record and fill in the fields for each record type you need.
7.	Click Add Record to Template to save each record.
8.	Review the Automatically apply this template to new domain registrations toggle. Leave it on to activate the template immediately, or turn it off to save it without activating.
9.	Click Save Changes.
Storefront warns you if the template contains duplicate records of the same type and hostname. Resolve any duplicates before saving.
Manage your templates
Each template appears as a row on the Domain Defaults page. From the three-dot menu or the expand arrow, you can edit, activate or deactivate, or delete a template.
Set a default template
If you have multiple templates, designate one as the default. The default template applies when no specific template has been selected for a registration, including when a query-string session has expired.
To set a template as default, open the template and toggle Set as default template before saving.
How templates behave over time
Templates apply to new registrations only. Changing or deleting a template does not update DNS records on domains already registered. The one exception: if a customer resets their DNS to default, Storefront applies the template as it exists at that moment, not as it was when the domain was registered. If no active template exists, the reset-to-default option does not appear in the customer's portal.
Apply templates automatically using query strings
Query strings let you pre-select a specific DNS template for a customer session before they visit your store. When the customer registers a domain, Storefront applies the template associated with the session automatically.
Append a dnstemplateid parameter to any Storefront URL you share with customers:
Text
https://www.yourdomain.com?dnstemplateid=7161d6b2-84cc-44df-93fc-69ef6c75bd9e
Find your template ID
1.	Navigate to Storefront Settings → Advanced Settings → Domain Defaults.
2.	Expand the DNS template you want to use.
3.	In the Apply this template using a link section, click View Details.
4.	Copy the Template ID (UUID format) or the full pre-constructed URL.
Session behaviour
The selected template stays active for the customer's session. If the customer logs out and returns without following a new template link, subsequent registrations use your default template. If the customer clicks a different template link, the new template replaces the previous one. The most recently clicked link wins. Sessions expire automatically after 7 days.
Combining query string parameters
Parameter	Description
dnstemplateid	UUID of the DNS template to apply at registration
extuserid	Your internal user ID, stored on the Storefront customer record for cross-system linking. Must be alphanumeric.
Combined example:
Text
https://www.yourdomain.com?dnstemplateid=7161d6b2-84cc-44df-93fc-69ef6c75bd9e&extuserid=acme-user-1042
The extuserid value appears on the Customer Detail page in Storefront Manager and can be added, changed, or removed manually at any time.
Example: Two service tiers, two templates
Suppose you offer a Standard plan and a Pro plan, each requiring different DNS records. You create two DNS templates, one per plan, and generate two query-string links. Customers purchasing a Standard plan are directed to your Storefront with the Standard template link; Pro customers use the Pro template link. Each customer gets the correct DNS configuration automatically at registration.
Embed a template-linked domain search on your website
To let customers search for and register a domain directly from your website with a template pre-selected:
HTML
<!-- Replace {template_id} with your Template ID from Storefront Manager -->
<!-- Replace {reseller_hostname} with your Storefront hostname (e.g., domains.yourbusiness.com) -->

<form id="searchForm" data-template-id="{template_id}">
  <label for="query">Find your domain:</label>
  <input type="text" id="query" name="query" placeholder="example.com" required>
  <input type="submit" value="Search">
</form>

<script>
  (function () {
    const BASE = 'https://{reseller_hostname}/site/availability/';

    function normalizeDomain(input) {
      if (!input) return '';
      return input.trim()
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '');
    }

    document.querySelectorAll('form[data-template-id]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var templateId = form.dataset.templateId;
        var input = form.querySelector('input[name="query"]');
        var domain = normalizeDomain(input ? input.value : '');
        if (!domain) {
          alert('Please enter a domain name.');
          return;
        }
        var url = BASE + encodeURIComponent(domain) + '?dnstemplateid=' + encodeURIComponent(templateId);
        window.open(url, '_blank');
      });
    });
  })();
</script>
What the customer sees
When a domain is registered with a template active, the DNS records from that template are already in place when the customer first logs in, no setup required on their end.
From their domain details page, the customer can see all their DNS records, add new ones, edit existing records, or delete records. If a template is active on your store, they also see a Reset to Default option, which restores the DNS to the current template configuration.
The template name you set is shown to customers in the reset flow so they know what they're reverting to.
Troubleshooting
Template is not being applied to new registrations
Confirm the domain is using Shopco DNS nameservers. Templates do not apply to custom-nameserver domains. Check that the template's active toggle is on. If using a query string link, verify the template ID in the URL matches the ID in Storefront Manager.
Customer's DNS was not restored after reset
The reset applies the template as it exists at the moment of reset, not at registration. If the template has been updated since the domain was registered, the customer sees the current version. If no active template exists, the reset-to-default option does not appear.
The extuserid value isn't showing on the Customer Detail page
Confirm the extuserid parameter was included in the URL the customer used and that the value is alphanumeric. The value can also be added or edited manually on the Customer Detail page.
A customer registered a domain without the template being applied
The most common cause is session expiry or logout between clicking the template link and completing registration. Your default template (if set) would have applied instead. Check whether a default template is configured. If not, no template applies to registrations outside an active query-string session.
1.	Extending Your Store
Injecting custom code
The Custom Code feature lets you inject HTML, CSS, or JavaScript into the <head> or <body> of your Storefront's customer-facing pages. It's the mechanism you'd use to add tools like Google Analytics, a live chat widget, custom fonts, or SEO meta tags, and it's also how you can apply CSS to fine-tune your Storefront's appearance beyond what the built-in branding settings offer.
Header vs. footer: what goes where
Custom Code gives you two separate injection points, and choosing the right one matters.
Header (<head> section) is the right place for:
•	Analytics and tracking scripts (Google Analytics, Google Tag Manager, Meta Pixel)
•	Custom SEO meta tags
•	CSS styles and custom fonts: putting these in the header ensures they apply before the page renders, preventing a flash of unstyled content
•	Any code that needs to be available before the page is visible to the customer
Footer (just before </body>) is the right place for:
•	Live chat widgets and support tools (Intercom, Zendesk, Tidio, etc.)
•	Any script that should load after the page content, which is most scripts, since loading them last keeps your store fast for customers
When in doubt, use the footer for scripts. Scripts in the footer don't block page rendering, which means customers see your store faster. CSS, however, belongs in the header.
Before you start
Test in the PTE environment first. Custom code runs live on your store the moment you enable it. Paste and test your code in the Storefront test environment before touching your production store. This lets you catch errors without your customers seeing a broken page.
Start with the built-in branding settings. Before reaching for custom CSS, check what's already available under Settings → General. You can set your brand colour, upload a logo, add a favicon, and configure custom content without writing any code. Custom CSS is best used for adjustments the built-in settings can't make, not as a replacement for them.
Adding custom code
1.	Log in to Storefront Manager.
2.	Navigate to Settings → Advanced Settings → Custom Code.
3.	You'll see two sections: Header Code and Footer Code. Each has its own text field and an independent enable/disable toggle.
4.	Paste your code into the appropriate field, Header or Footer, based on the guidance above.
5.	Make sure the toggle for that section is set to Enabled.
6.	Click Save.
Your code is now live on your Storefront for all visitors.
Enabling and disabling code
Each section, Header and Footer, has its own toggle, so you can control them independently. This is useful in a few scenarios:
•	Temporarily disable a script without losing it, for example while troubleshooting a site issue, or when a third-party service is down.
•	Save code but not activate it yet: paste your code, leave the toggle off, and enable it when you're ready.
When you disable a section, the code is preserved in the editor but completely removed from your live store. Re-enabling it makes it active again instantly.
Common use cases and examples
Customizing your Storefront's appearance with CSS
The Header field accepts <style> blocks, which means you can use CSS to change the look of your Storefront beyond what the built-in brand colour setting provides. This is useful if you want your Storefront to more closely match an existing website.
Paste a <style> block into the Header field. Here's an example covering the most common appearance adjustments:
HTML
<style>
  /* =============================================
     STOREFRONT APPEARANCE CUSTOMIZATION
     Paste this into: Settings → Advanced Settings → Custom Code → Header
     Test in the PTE environment before applying to production.
  ============================================= */

  /* --- Button colour ---
     Changes the primary action buttons (Search, Add to Cart, etc.)
     Replace #1a56db with your brand's hex colour. */
  .btn-primary,
  button[type="submit"] {
    background-color: #1a56db !important;
    border-color: #1a56db !important;
  }

  .btn-primary:hover,
  button[type="submit"]:hover {
    background-color: #1648c0 !important;
    border-color: #1648c0 !important;
  }

  /* --- Link colour --- */
  a {
    color: #1a56db !important;
  }

  a:hover {
    color: #1648c0 !important;
  }

  /* --- Custom font --- */
  body {
    font-family: 'Inter', sans-serif !important;
  }

  /* --- Background colour --- */
  body {
    background-color: #f9fafb !important;
  }

  /* --- Domain search bar --- */
  .domain-search-input {
    border-radius: 8px !important;
    border-color: #1a56db !important;
  }
</style>
Not a developer? Claude can write this for you. If CSS feels unfamiliar, Claude, Anthropic's AI assistant, is well-suited to generating custom CSS from plain English. Describe what you want in simple terms, for example, "OpenSRS Storefront supports a Custom Code feature. Write CSS for me that makes my Storefront look like my website." Claude will generate a ready-to-paste <style> block. You can paste it directly into the Header field, then test it in your PTE environment before going live. You don't need any coding knowledge to use it.
A few things to know about custom CSS:
•	Use browser developer tools (F12 > Inspector) to identify the exact CSS class names you want to target on your live storefront. Class names may change between Storefront releases, so check after updates.
•	!important is needed for most overrides because Storefront's own styles will otherwise take precedence.
•	Small changes, such as a different button colour or font, are low risk. Larger layout changes can have unexpected side effects. Always test thoroughly in PTE first.
•	CSS applied here affects the public-facing pages of your Storefront (search, checkout). The logged-in customer portal uses the standard Storefront interface and is styled separately.
Loading a custom font
To use a custom font from Google Fonts, add two things to the Header field: the font <link> tag and a <style> block referencing it.
HTML
<!-- Step 1: Load the font -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">

<!-- Step 2: Apply it -->
<style>
  body {
    font-family: 'Inter', sans-serif !important;
  }
</style>
Replace Inter with the name of any Google Font. Visit fonts.google.com to browse options and generate your <link> tag.
Google Analytics 4
Paste the GA4 script tag from your Google Analytics property into the Header field:
HTML
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
Replace G-XXXXXXXXXX with your actual Measurement ID from Google Analytics.
Google Tag Manager
Paste the GTM <script> snippet into the Header field. If GTM also provides a <noscript> snippet, paste that into the Footer field.
Live chat widget
Most chat tools (Intercom, Tidio, Zendesk, etc.) provide a JavaScript snippet. Paste it into the Footer field, since these tools are designed to load after the page content and don't need to be in the header.
Important warnings
Errors in your code can break your Storefront. Unclosed tags, missing semicolons, or JavaScript errors can cause your store to display incorrectly or fail to load entirely. Always:
•	Test in the PTE environment before enabling on production
•	Validate your code before pasting; browser developer tools (F12) can catch syntax errors
•	If your store breaks after adding custom code, disable the affected section immediately using the toggle, then fix your code before re-enabling
Only use code from trusted sources. Custom code runs with full access to your Storefront's pages. A malicious or compromised third-party script could affect your customers' experience. Only paste code from services you trust and have verified.
Custom code does not apply inside the logged-in customer area. The custom header is shown on public-facing pages of your Storefront (search, domain listings, checkout). Once a customer is logged in to their domain management portal, the standard Storefront interface is used, so your custom header won't appear there. The custom footer code does apply in the logged-in area.
There is no hard character limit, but very large scripts may hit backend limits. If you need to load a large library, host it externally and reference it with a <script src="..."> tag rather than pasting the entire library inline.
Troubleshooting
My store looks broken after adding code
Disable the affected section (Header or Footer) using the toggle and save. This will immediately remove the custom code from your live store. Review and fix your code in the PTE environment before re-enabling.
My CSS changes aren't taking effect
Make sure your <style> block is in the Header field (not footer), the toggle is enabled, and you've saved. If it's still not working, open browser developer tools (F12 → Inspector), find the element you're trying to style, and check whether another rule is overriding yours. You may need to add !important to your CSS property.
My code is saved but not doing anything
Check that the toggle for the relevant section is set to Enabled and that you've clicked Save. If it's enabled and saved, check your browser's developer console (F12 → Console tab) for JavaScript errors that may be preventing the script from running.
I'm not sure if my analytics code is working
Use the browser Network tab (F12 → Network) to check whether the analytics request is being fired on page load. Most analytics tools also have their own debugging extensions (e.g. Google Tag Assistant for GA4) that make this easier.
1.	Extending Your Store
Using querystrings
Storefront supports two URL query string parameters that let you pass context from your own platform into a customer's Storefront session — before they even start browsing your store. Both parameters work by appending values to any Storefront URL you share with customers.
•	dnstemplateid — pre-selects a specific DNS template for the customer's session, so the right DNS configuration is applied automatically when they register a domain.
•	extuserid — associates a Storefront customer account with an identifier from your own system, so you can link records across platforms.
________________________________________
How query strings work
When a customer follows a URL containing one or both parameters, Storefront stores those values for the duration of the session. The parameters take effect silently — customers don't see them and don't need to do anything differently.
Both parameters can be used together or separately, and can be appended to any page in your Storefront:
https://[your-storefront]?dnstemplateid=7161d6b2-84cc-44df-93fc-69ef6c75bd9e&extuserid=acme-user-1042
A common pattern: a customer signs up for a hosted service on your platform. You generate a link containing their internal user ID (extuserid) and the DNS template for that service (dnstemplateid). When they follow the link and register their domain, the DNS is configured correctly and their Storefront account is linked to your system — all without manual steps.
________________________________________
Embedding a query-string link in your website
You can pre-populate both parameters in a domain search form on your own site. See DNS templates for a complete HTML/JavaScript example that embeds a domain search form with dnstemplateid pre-selected.
________________________________________
Troubleshooting
The extuserid value isn't appearing on the Customer Detail page
Confirm the extuserid parameter was alphanumeric and was included in the URL the customer followed. The value can also be added manually on the Customer Detail page in Storefront Manager.
The DNS template isn't being applied even though dnstemplateid is in the URL
Confirm the template ID in the URL matches the ID shown in Storefront Manager. Also confirm the template is active and that the domain being registered uses Shopco nameservers — templates don't apply to custom-nameserver domains. See DNS templates for full troubleshooting.
A customer registered a domain without the template or user ID being captured
This usually means the customer's session expired, or they logged out and back in without following the link again. Sessions expire after 7 days. Confirm the customer followed the correct link directly before registering.
Working with customers and domains
Storefront Manager gives you full visibility into every customer account in your store and every domain those customers own. You can create accounts on customers' behalf, edit their details, manage their domain settings directly, and log in as a customer to assist them without sharing credentials. This is the primary toolset for reseller support work.
________________________________________
How customer management works in Storefront
Your role in Storefront is both store operator and support agent. Customers interact with their accounts through the customer-facing storefront. You manage those same accounts, and assist with them, through Storefront Manager.
Most actions your customers can take on their own, you can also take on their behalf. The distinction is important because it affects how actions are recorded: when you act from Storefront Manager, the event log records the actor as Reseller. When you use the Log in as Customer feature to act inside the customer's own session, the event log records the actor as As Customer. Both are distinct from actions the customer takes themselves, which appear as Customer.
This matters when investigating issues. If a customer says they didn't make a change, checking the actor field in the event log tells you immediately whether it was them, you, or the system.
________________________________________
Find a customer
All customer management starts from the Customers section in Storefront Manager.
1.	Log in to Storefront Manager.
2.	Select Customers from the left navigation menu.
The customer list is sorted by last login date by default. Click anywhere on a customer's row to open their account. You no longer need to click the username specifically.
To work with the list:
•	Click Filters to narrow by status (Active, Suspended, or Locked Out).
•	Click Table Columns to choose which columns appear and save your preferred layout.
•	Click Export CSV to download the current list.
Each row also has an ellipsis menu with two quick actions: Suspend/Activate the account and Send Password Reset. Both open a confirmation pop-up before the action is applied.
To find a specific customer quickly, use global search at the top of the navigation menu, or press Ctrl+K (Windows) or Cmd+K (Mac). Global search looks across customers, domains, and orders at once. See Using Global Search [LINK NEEDED: new Confluence draft].
________________________________________
Create a customer account
Customers create their own accounts during checkout, but you can create accounts on their behalf before a purchase, for example to prepare accounts before a domain import, or to match accounts to your own systems.
1.	Navigate to Customers.
2.	Click Add Customer. This opens the Add New Customer page. Adding a customer is now a full page rather than a pop-up window.
3.	Enter the customer's details. The required fields are email address and username.
4.	Click Add Customer to create the account. Storefront takes you straight to the new customer's details page. Clicking Cancel instead returns you to the customer list without creating an account.
Storefront generates a random password for the account automatically, and you never see it. This prevents insecure practices like emailing passwords to customers.
To notify your customer, check the box to send a welcome email. The email includes:
•	A Login to your account button with a one-time login token
•	Instructions to set their own password
•	Your store's branding (logo and colour)
The customer follows the link, sets their password, and reviews their account details. If you don't send the welcome email, you can send a password reset email later from the customer's details page.
________________________________________
Edit customer details
The customer details page opens on the Overview tab. Across the top, tabs let you switch to Orders, Domains, Subscriptions, Notes, and Event Log for that customer. Customer notes appear on the right of the Overview tab, where you can read up to three notes, add a new one, or click See all notes to open the Notes tab.
The Overview tab is organized into three sections, each edited through its own pop-up:
•	Account Details: account status, password (Send Password Reset), and currency preference. Username, created date, and last login are shown here for reference.
•	Contact Details: email address, phone number, and address.
•	Customer ID: add an external ID to match the account to your own systems, or open the customer's record in Stripe using the Stripe ID link.
To suspend an account, open the status pop-up and set the status to Suspended. The customer cannot log in until you reactivate it. Their domains and account data are not affected. Suspension is typically used when fraud is suspected or the customer requests a temporary account freeze.
________________________________________
Log in as a customer
The Log in as Customer feature opens the customer's storefront session in a new browser tab, with full access to their account. Use it to provide hands-on support without asking the customer to share their credentials.
1.	Open the customer's details page in Storefront Manager.
2.	Click Log in as Customer.
3.	A new tab opens showing the customer's account in the customer-facing storefront.
From this session you can:
•	Browse and purchase domains on the customer's behalf
•	Update DNS records and nameservers
•	Change domain settings: auto-renew, domain lock, contact privacy
•	Update WHOIS contact information
•	Manage domain forwarding
•	Reset the customer's password from inside the account
All actions taken in this session are recorded in the event log with the actor As Customer, distinguishing them from actions the customer took themselves.
If the session token expires before you use it, the tab shows a standard login error. Return to Storefront Manager and click Log in as Customer again.
________________________________________
View and manage a customer's domains
1.	Open the customer's details page.
2.	Select the Domains tab.
The domains list shows all domains registered to this customer, with their expiry date, auto-renew status, and WHOIS privacy status.
Click anywhere on a domain's row to open the domain details page. It opens on the Overview tab, where you can manage:
Setting	What it does
Auto-renew	Toggle on or off. When on, Storefront renews the domain automatically before expiry if the customer has a payment method on file.
Domain lock	Toggle on or off. A locked domain cannot be transferred out until the lock is removed.
Contact privacy	Toggle on or off. Hides the customer's WHOIS contact details from public lookup.
DNS template	Apply a pre-configured set of DNS records to the domain.
Manage these settings using the toggles on the domain's Overview tab. The ellipsis menu on the same page holds Change Customer and View Customer.
When you unlock a domain, an auth code section appears with the code hidden. Click Reveal to display it. The auth code is what a customer needs to transfer the domain away to another registrar.
Changes take effect immediately and are logged in the domain's event log.
________________________________________
View a customer's subscriptions
Select the Subscriptions tab from the customer's details page to see every product subscription tied to this customer — the same view as the main Products page, filtered to just this customer. Click any row to open that subscription's details page. See Managing Customer Subscriptions in Storefront for how to manage a subscription from there.
________________________________________
Move a domain to a different customer account
Use the domain push tool when a domain needs to move from one customer account to another, for example when consolidating duplicate accounts, fulfilling a domain sale, or helping a customer reorganize their portfolio.
1.	Open the domain details page.
2.	Open the ellipsis menu and select Change Customer.
3.	Choose the destination account:
o	To push to an existing account, type the username or email in the search bar and select it.
o	To push to a new account, fill in the new account details and click Create Account.
4.	Optionally, check the box to send a welcome email to the new account.
5.	Confirm the push.
The domain moves immediately. The previous customer account loses access to it. DNS settings, WHOIS data, and domain configuration carry over to the new account unchanged.
________________________________________
What your customer sees
Customers manage their domains and account through the customer-facing storefront at [your-username].shopco.com. They see:
•	Their registered domains, with expiry dates and renewal status
•	DNS management for domains using Storefront nameservers
•	Order history and receipts
•	Account settings including password and contact details
Customers do not have visibility into your Storefront Manager, they cannot see your pricing configuration, other customers' accounts, or your store settings.
When you perform actions on their behalf (either from Storefront Manager or via Log in as Customer), those changes appear immediately in their account. They receive emails for actions that would normally trigger a customer notification, for example, if you initiate a domain renewal.
________________________________________
Troubleshooting
A customer says they can't log in.
Open the customer's details page in Storefront Manager and check their account status. If the account shows Suspended, change the status back to Active. If the account is active, use the Send password reset email option to send them a reset link.
A customer says a domain setting changed and they didn't do it.
Open the domain's event log and look for the relevant settings change. Check the By column. If it shows Reseller, you or someone on your team made the change from Storefront Manager. If it shows As Customer, a reseller was logged in as the customer when the change was made. If it shows Customer, the customer made the change from their own session.
A customer has duplicate accounts and wants to consolidate their domains.
Use the domain push tool to move their domains from the secondary account to the primary one. See the push instructions above. Once all domains are moved, the secondary account can be suspended or left empty.
I pushed a domain to the wrong account.
Push the domain again from the new account to the correct destination account. The push tool is available from the ellipsis menu on the domain details page regardless of which customer currently holds the domain.
A customer didn't receive their welcome email.
Ask the customer to check their spam folder. If it's not there, confirm the email address on their account is correct. From the customer details page, you can use Send password reset email as an alternative way to get them access without resending the full welcome email.
Managing DNS records
Storefront lets you manage DNS records for any domain in your store that uses Shopco DNS nameservers. You can view, add, edit, and delete records from the domain details page — either from your Storefront Manager reseller view, or by logging in as the customer to make changes on their behalf.
Customers can manage their own DNS directly from the Storefront customer portal, without contacting you.
________________________________________
What Storefront DNS management covers
DNS record management in Storefront applies only to domains using Shopco DNS nameservers (a.ns.shopco.com, b.ns.shopco.com, c.ns.shopco.com). Storefront is not involved in DNS management for domains using custom nameservers — those records are managed at the external DNS provider.
If a domain uses Shopco DNS, the DNS Records section on the domain details page shows all current records and allows editing. If the domain uses custom nameservers, the section shows an advisory message and editing is not available.
Supported record types: A, AAAA, CNAME, MX, TXT, SRV, CAA.
________________________________________
View DNS records
1.	Log in to Storefront Manager.
2.	Navigate to the domain's details page — either via Customers → [customer name] → Domains → [domain name], or via the global Domains tab.
3.	Scroll to the DNS Records section.
Each record shows its type, name (hostname), value, and TTL.
________________________________________
Add a DNS record
1.	On the domain details page, scroll to DNS Records.
2.	Click Add Record.
3.	Select the record type.
4.	Fill in the required fields — name, value, and TTL.
5.	Click Save.
The record takes effect immediately for Storefront's DNS. Propagation to resolvers depends on the TTL and can take up to 48 hours.
________________________________________
Edit a DNS record
1.	Find the record in the DNS Records table.
2.	Click Edit next to the record.
3.	Update the fields.
4.	Click Save.
________________________________________
Delete a DNS record
1.	Find the record in the DNS Records table.
2.	Click Delete next to the record.
3.	Confirm the deletion.
Deleted records are removed immediately. DNS propagation timelines apply.
________________________________________
Reset DNS to default
If a DNS template is active on your store, the Reset to Default option restores all DNS records on a domain to the current template configuration.
Note: This overwrites all existing records on the domain — it is not a selective reset.
1.	On the domain details page, scroll to DNS Records.
2.	Click Reset to Default.
3.	Confirm the action.
If no active DNS template is configured, the Reset to Default option does not appear.
________________________________________
Change nameservers on a domain
1.	On the domain details page, scroll to the Nameservers section.
2.	Click Edit Nameservers.
3.	Enter the new nameserver addresses.
4.	Click Save.
To switch a domain back to Shopco DNS, click Reset to default in the Nameservers section. This sets the nameservers to a.ns.shopco.com, b.ns.shopco.com, c.ns.shopco.com.
❗
Changing nameservers from Shopco DNS to custom nameservers removes DNS management from Storefront — the DNS Records section will no longer show editable records.
________________________________________
Managing DNS on a customer's behalf
If you need to make DNS changes on a customer's behalf without logging in as them, use the domain details page in Storefront Manager — the same DNS Records section is available there with full editing access.
Alternatively, use Log in as Customer from the customer details page. This opens the customer's Storefront account in a new tab where you can make changes exactly as the customer would. Actions taken in a Log in as Customer session are recorded in the event log as As Customer, distinguishing them from changes made directly from Storefront Manager.
See Managing Customer Accounts and Domains for full details on the Log in as Customer feature.
________________________________________
What your customer sees
Customers manage their DNS from the domain details page in the Storefront customer portal. The experience mirrors what you see in Storefront Manager — the same record types, the same edit/delete controls, and the same Reset to Default option (if a template is active). Changes customers make appear in the domain's event log under the Settings category.
________________________________________
Troubleshooting
The DNS Records section isn't showing on a domain's page
The domain is using custom nameservers. Switch the domain to Shopco DNS nameservers to enable DNS management in Storefront. If the domain has existing records to preserve, migrate them first — see Transfering systemDNS zones to Storefront.
A DNS change isn't taking effect for customers
DNS changes propagate based on the record's TTL. Changes with a 15-minute TTL (the default) typically propagate within 15–30 minutes, but may take up to 48 hours. Confirm the change is saved correctly in the DNS Records table.
I reset a domain to default but it applied unexpected records
Reset to Default applies the DNS template as it currently exists, not as it was when the domain was first registered. If the template has been updated since registration, those updates are applied. Check the current template configuration in Settings → Advanced Settings → Domain Defaults.
A customer deleted a DNS record they shouldn't have
Deleted records cannot be recovered — you'll need to add the record again manually. Use Log in as Customer or manage the record directly from Storefront Manager. For MX and SPF records, verify the correct values with the customer's email provider before re-adding.
Link your own customer ID to Storefront
If you already track customers in your own system — a CRM, a billing platform, your own user database — you can tag each Storefront customer record with that same ID. This lets you match a Storefront customer back to your own records, in either direction, without having to guess based on name or email.
There are two ways to set this ID, depending on how the customer reaches Storefront.
Option 1: Set it when a customer arrives via a link
If you're sending customers to your Storefront from your own website or platform, add an extuserid query string parameter to the link:
https://yourstorefront.com?extuserid=your-internal-id-123
Storefront reads this parameter, stores it in the customer's session, and applies it to their customer record once they complete registration.
Option 2: Set it when creating a customer via the API
If you're creating customers programmatically — for example, during a migration or automated signup — include external_user_id in the request body:
JSON
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane.doe@example.com",
  "username": "janedoe01",
  "external_user_id": "your-internal-id-123",
  ...
}
Where the ID shows up
Once set, the ID is visible on the customer's Customer Detail page in Storefront Manager, and is returned in the customer object whenever you fetch that customer via the API. It can also be added, changed, or removed manually from Storefront Manager at any time.
📘
Not just for customer IDs
Despite the name, external_user_id can hold any value you want — an internal customer ID, an account number, a campaign tag, whatever's useful for matching this record back to your own systems.
Where this is used
Linking your own ID to a Storefront customer is the foundation for several other integrations:
•	Migrate an Existing Customer Base Into Storefront — set your existing customer IDs during bulk creation, so every migrated customer is already linked
•	Notify Your CRM the Moment a Customer Registers — use the ID to match an incoming webhook event back to your own customer record
1.	Common Flows
Automatically configure DNS based on customer plan
If you offer more than one product or plan — say, a standard site builder and a more advanced one — each might need different DNS records pointed at your service. You can automate this entirely, so the correct DNS is applied the moment a customer registers a domain, with no manual setup and no code required on your end.
This combines two Storefront features: DNS Templates, which define a reusable set of DNS records, and Querystrings, which let you specify which template to apply before the customer even starts checkout.
How it works
Imagine you offer two plans with different DNS requirements:
•	Standard Site Builder — needs an A record at the root and a CNAME at www pointing to your service
•	cPanel Web Hosting Plan — needs a different set of records
You create one DNS Template per plan in Storefront Manager, each with a clear, human-readable name (this name is also what the customer sees if they ever choose to reset their DNS).
Set it up
1.	In Storefront Manager, create a DNS Template for each plan, with the records that plan requires.
2.	Open the template's details and find Apply this template using a link. This gives you the Template ID and a ready-made link with the query string already attached.
3.	Use that link (or build your own using the Template ID) wherever you send customers to your Storefront — for example, a "Get a Domain" button inside your own product that already knows which plan the customer is on.
https://yourwebsite.com?dnstemplateid=7161d6b2-84cc-44df-93fc-69ef6c75bd9e
What happens
When a customer arrives via that link, Storefront stores the Template ID in their session. The moment they complete a domain registration, Storefront automatically applies every record from that template to the new domain — no manual DNS setup, for you or the customer.
The applied template is shown on the domain's details page, and can be changed or removed manually in Storefront Manager if needed.
Combine it with a customer ID
You can stack a extuserid query string onto the same link to also tag the customer with your own internal ID at the same time:
https://yourwebsite.com?dnstemplateid=7161d6b2-84cc-44df-93fc-69ef6c75bd9e&extuserid=your-internal-id-123
See Link Your Own Customer ID to Storefront for more on this.
Redirect a customer into their Storefront account
If a customer is already logged in on your own platform, you shouldn't have to make them log in again separately to manage their domain on Storefront. You can generate a one-time link that drops them directly into their Storefront account, fully authenticated, with a single API call.
This combines customer creation with the SSO URL endpoint.
How it works
1.	Your customer authenticates on your own platform, as usual.
2.	From your backend, call the SSO URL endpoint for that customer's Storefront ID:
POST /v1/customer/{customer_id}/sso_url
3.	Storefront returns a ready-to-use login URL and its expiry time:
JSON
{
  "url": "https://yourstorefront.com/site/validate?token=...&queue=continue",
  "expires_at": "2026-08-11T17:15:36.129392Z"
}
4.	Redirect the customer's browser to that URL. No further request is needed — it already contains everything required to log them in.
What to know before using this
📘
The link is short-lived and single-use
The URL expires 15 minutes after it's generated, and can only be used once — whether or not the login succeeds. Generate it immediately before redirecting the customer; don't generate it in advance or store it for later use.
📘
This bypasses two-factor authentication
Because the customer already authenticated on your platform, a token login does not prompt for any 2FA configured on their Storefront account. Only generate this URL immediately before redirecting an already-authenticated customer.
Every login completed this way is recorded in your Storefront event log, so you can audit how often it's used.
A good use case
A "Manage My Domains" button inside your own customer dashboard is the classic use for this — the customer clicks it, and lands directly on their domain list in Storefront, with no second login screen in between.
1.	Managing Billing & Payments
Managing customer subscriptions
Once a customer subscribes to one of your products, you'll need to keep track of that subscription — check its status, step in if a payment fails, or immediately cut off access if something looks wrong.
This article covers viewing and managing customer subscriptions from Storefront Manager. For setting up the products themselves, see Creating and Managing Products in Storefront.
________________________________________
Viewing all subscriptions
Select Products from the main navigation menu in Storefront Manager. This is separate from Settings → Product Catalog, which is where you create and manage the products themselves — see Creating and Managing Products in Storefront if that's what you're looking for.
If you don't have any subscribers yet, you'll see a link to add a product instead. Once you have at least one subscription, this page shows a table with:
•	ID
•	Customer
•	Product Name
•	Price
•	Billing Period
•	Status
•	Created Date
•	Renewal Date
You can search the table by ID, customer, or product name; filter by status, product, or billing period (only products and billing periods with at least one subscription appear as filter options); and export the full table to CSV.
________________________________________
Subscription statuses
Status	What it means
Active	The subscription is in good standing and billing normally.
Payment Failed	A renewal payment didn't go through. Storefront automatically retries the customer's payment method; no action is required from you unless the customer needs to update their card.
Suspended	The subscription is no longer accessible to the customer, but it can still be reactivated. This happens after payment retries are exhausted, when a customer turns off auto-renew and reaches their period end, or when you manually suspend it.
Expired	The subscription has been terminated in the backend and can no longer be reactivated. The customer would need to start a new subscription.
Note: Your customers don't see these four statuses the way you do. On their side, both Suspended and Expired subscriptions simply show as "Expired" — Storefront doesn't expose the distinction to avoid confusing them with reseller-facing terminology. If a customer says their subscription shows "Expired" but they'd like it back, check the actual status on the subscription details page in Storefront Manager before telling them it's unrecoverable. A Suspended subscription can still be reactivated; a genuinely Expired one cannot.
________________________________________
The subscription details page
Click any row in the subscriptions table to open that subscription's details page.
Overview tab — subscription status, a link to view the product, pricing and billing details, the current billing cycle, and the create date. Customer details appear in the right-hand column with a link to the customer's own details page.
Orders tab — every order tied to this subscription, including the original purchase and every renewal since (each renewal creates its own order).
Event Log tab — the subscription's event history, filtered from the same event log used across Storefront Manager. See Using the Storefront Event Log for how to read and search event log entries.
________________________________________
Managing a subscription
Enabling or disabling renewal
Available while a subscription is Active.
•	Disable Renewal — turns off auto-renew. The subscription keeps running until its current billing period ends, then moves to Suspended rather than renewing.
•	Enable Renewal — available once renewal has been disabled. Turns auto-renew back on for the current subscription.
Both actions show a confirmation pop-up before taking effect.
Suspending a subscription immediately
Use this when you need to cut off a customer's access right away — for example, suspected fraud or a customer mistake — without waiting for the billing period to end and without deleting the subscription.
1.	Open the subscription's details page.
2.	Click Suspend Subscription.
3.	Confirm in the pop-up.
The subscription moves to Suspended immediately. The customer keeps their subscription record, but can no longer use the service.
Reactivating a subscription
Available while a subscription is Suspended.
1.	Open the subscription's details page.
2.	Click Reactivate Subscription.
3.	Confirm in the pop-up.
If the subscription is still within its current billing period, it returns to Active with no charge. If it's past the billing period, Storefront charges the customer's card on file — if the charge succeeds, the subscription returns to Active; if it fails, the subscription stays Suspended.
________________________________________
Refunding a subscription
Subscriptions are refunded through the same refund flow as any other order — open the order from the subscription's Orders tab, or from the Orders page directly, and issue a full or partial refund. See Issuing Refunds in Storefront for the full refund process, including Stripe fees and processing times.
The subscription-specific choice comes up during the refund: whether to also de-provision the service.
•	De-provision selected — the subscription is immediately suspended and canceled, and shows as Expired in Storefront Manager. The order shows as Refunded or Partially Refunded.
•	De-provision not selected — the subscription stays Active and continues billing normally. The order still shows as Refunded or Partially Refunded.
________________________________________
Viewing subscriptions from a customer's account
A customer's subscriptions also appear on their own customer details page in Storefront Manager, filtered to that customer, the same way their orders and domains do. This is a quick way to see everything a specific customer subscribes to without searching the full subscriptions table. See Managing Customer Accounts and Domains for more on the customer details page generally.
________________________________________
What your customer sees
Customers manage their own subscriptions from their account on your storefront, under Your Subscriptions. From there they can:
•	View all their subscriptions, with status (shown as Active, Payment Failed, or Expired — see the note above on how this maps to your view), created date, and renewal date.
•	Cancel an active subscription, which turns off auto-renew. It keeps running until the current period ends, then moves to the customer-visible "Expired" state.
•	Resume a subscription they previously canceled, as long as it hasn't reached its period end yet — this undoes the cancellation with no other change.
•	Reactivate a subscription within 7 days of it lapsing. This retries their payment method automatically. Past the 7-day window, the customer no longer has a self-service option and only you can reactivate it from Storefront Manager.
Customers also receive automatic emails at key points in the subscription lifecycle:
•	A renewal reminder, timed to the reminder dates you set when creating the product, worded differently depending on whether their auto-renew is on (their card will be charged) or off (their subscription is ending).
•	An expiration email, sent the day after a subscription lapses.
•	A payment failed email, sent when a renewal payment doesn't go through, with a link for the customer to update their billing information.
________________________________________
Troubleshooting
A customer says their subscription shows "Expired" — can it still be recovered?
Check the subscription's actual status on its details page in Storefront Manager. Customers see "Expired" for both the Suspended and Expired states. If it shows Suspended in Storefront Manager, you can still reactivate it. If it shows Expired, the subscription is terminated and the customer needs to start a new one.
A subscription shows Payment Failed — what do I need to do?
Nothing right away — Storefront automatically retries the customer's payment method. If the customer needs to update their card, direct them to their billing page. If retries don't succeed, the subscription moves to Suspended.
I need to cut off a customer's access immediately.
Use Suspend Subscription from the subscription's details page. This blocks access without deleting the subscription record, and it can be reactivated later if needed.
A customer is past their 7-day self-service reactivation window and wants their subscription back.
You can still reactivate it from the subscription's details page in Storefront Manager. If it's outside the current billing period, reactivating will charge their card on file.
I refunded an order, but the subscription is still active.
That's expected if you didn't choose to de-provision during the refund. Open the subscription and suspend it manually if you want to cut off access, or reopen the refund flow if you meant to select de-provision.
Can I assign a product to a customer manually within the Storefront Manager?
At this time, a product can only be added to a customer if the customer purchases that product from your Storefront. This feature will be added shortly, so check back soon!

