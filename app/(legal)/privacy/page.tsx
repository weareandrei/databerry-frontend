import type { Metadata } from 'next'
import {
  LegalTitle,
  LastUpdated,
  LegalLead,
  LegalSection,
  LegalSubheading,
  LegalList,
} from '../(components)/LegalHeading'

export const metadata: Metadata = {
  title: 'Privacy Policy — Databerry',
  description:
    'How Databerry collects, uses, stores, and shares data — including data accessed via Google APIs and other third-party integrations.',
}

const LAST_UPDATED = 'May 2, 2026'

export default function PrivacyPage() {
  return (
    <article>
      <LegalTitle>Privacy Policy</LegalTitle>
      <LastUpdated date={LAST_UPDATED} />

      <LegalLead>
        This Privacy Policy explains what data <strong>Databerry</strong>{' '}
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, why, and what we do
        with it. Databerry is a dashboard for connecting and viewing data
        from third&#8209;party tools you already use; the data we touch is
        a means to that end, not the product.
      </LegalLead>

      <LegalSection id="data-we-collect" title="1. Data we collect">
        <LegalSubheading>1.1 Account information</LegalSubheading>
        <p>
          When you sign up we collect your email address, hashed password
          (managed by our authentication provider, Supabase), and any
          profile details you choose to enter. We use this to identify you,
          authenticate you, and contact you about the Service.
        </p>

        <LegalSubheading>
          1.2 Credentials for connected integrations
        </LegalSubheading>
        <p>
          When you connect a third&#8209;party tool — Stripe,
          Google&nbsp;Analytics, PostHog, Calendly, custom webhooks, or
          others — we store the credential needed to access that tool on
          your behalf. Depending on the tool, this is either an
          OAuth&nbsp;access&nbsp;token (revocable from your account at the
          provider) or an API key you paste in. Credentials are scoped
          read&#8209;only wherever the third party supports it.
        </p>

        <LegalSubheading>
          1.3 Data fetched from connected integrations
        </LegalSubheading>
        <p>
          To render the metrics you choose, we periodically fetch data
          from your connected tools and cache the necessary subset in our
          database. Examples:
        </p>
        <LegalList>
          <li>
            <strong>Stripe</strong> — charges, customers, subscriptions,
            products, and the line items needed to attribute revenue
            (read&#8209;only). We never write to your Stripe account.
          </li>
          <li>
            <strong>Google&nbsp;Analytics</strong> — pageviews, sessions,
            users, and traffic source breakdowns for the property you
            select.
          </li>
          <li>
            <strong>PostHog</strong> — event counts, funnel results,
            retention matrices, and the live values you choose to
            track.
          </li>
          <li>
            <strong>Calendly</strong> — meeting counts and basic meeting
            metadata.
          </li>
        </LegalList>
        <p>
          We fetch only what&apos;s needed for the views you create, and
          you can disconnect any integration at any time to stop fetching
          immediately.
        </p>

        <LegalSubheading>1.4 Usage analytics</LegalSubheading>
        <p>
          We use PostHog to understand how the Service is used in
          aggregate (which pages people visit, which connections they
          create, which views are popular). This includes IP addresses
          and device/browser metadata. We do not sell or share this
          data with third&#8209;party advertisers.
        </p>
      </LegalSection>

      <LegalSection
        id="google-api"
        title="2. Use of Google APIs and Limited Use compliance"
      >
        <p>
          Databerry&apos;s Google&nbsp;Analytics integration uses the
          Google&nbsp;Analytics&nbsp;Data&nbsp;API and Google&nbsp;Analytics
          Admin API to read property-level metrics (e.g. pageviews,
          sessions, traffic sources) on properties you explicitly authorise.
          We comply with the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:underline"
          >
            Google API Services User Data Policy
          </a>
          , including its Limited Use requirements. Specifically, our use
          of information received from Google APIs adheres to the
          following:
        </p>
        <LegalList>
          <li>
            We use Google user data <strong>only</strong> to provide and
            improve user&#8209;facing features within Databerry —
            primarily, displaying your Google&nbsp;Analytics metrics in the
            dashboard you&apos;ve set up.
          </li>
          <li>
            We do <strong>not</strong> transfer Google user data to third
            parties except as necessary to operate the Service (e.g. our
            hosting and database providers — see Section&nbsp;5), to
            comply with applicable law, or as part of a merger or
            acquisition with appropriate user notice.
          </li>
          <li>
            We do <strong>not</strong> use Google user data for serving
            advertisements, including retargeting or
            personalised&#8209;ads use cases.
          </li>
          <li>
            We do <strong>not</strong> allow humans to read your Google
            user data, except: (a) with your explicit consent for a
            specific support request; (b) when necessary for security
            (e.g. investigating abuse); (c) to comply with applicable
            law; or (d) where the data has been aggregated and
            anonymised, and is used for internal operations.
          </li>
          <li>
            We do <strong>not</strong> use Google user data to develop,
            improve, or train generalised AI or machine&#8209;learning
            models.
          </li>
        </LegalList>
        <p>
          You can revoke Databerry&apos;s access to your
          Google&nbsp;Analytics account at any time by disconnecting the
          integration in Databerry, or directly at{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:underline"
          >
            myaccount.google.com/permissions
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How we use your data">
        <p>We use the data described above to:</p>
        <LegalList>
          <li>Provide, maintain, and operate the Service</li>
          <li>
            Authenticate you, secure your account, and prevent fraud or
            abuse
          </li>
          <li>
            Render the dashboards, charts, and lists you&apos;ve set up
          </li>
          <li>
            Respond to support requests and communicate updates about
            the Service
          </li>
          <li>
            Improve the Service in aggregate (which features get used,
            which break)
          </li>
          <li>Comply with legal obligations</li>
        </LegalList>
        <p>
          We do <strong>not</strong> sell your data, share it with
          advertisers, or use the contents of your connected tools to
          train AI/ML models.
        </p>
      </LegalSection>

      <LegalSection id="storage" title="4. Where data is stored">
        <p>
          We use Supabase as our primary database and authentication
          provider. Data is stored on Supabase&apos;s infrastructure
          (which itself sits on AWS). Backend services are hosted on
          Railway. Connection credentials are stored in Supabase tables
          and accessed only by our backend services to fetch your data.
        </p>
        <p>
          Databases, tokens, and traffic between services are protected
          using industry&#8209;standard encryption in transit (TLS) and at
          rest. Access to production systems is restricted to a small
          number of operators.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="5. Sharing">
        <p>
          We share data only with infrastructure providers necessary to
          operate the Service:
        </p>
        <LegalList>
          <li>
            <strong>Supabase</strong> — database, authentication
          </li>
          <li>
            <strong>Railway</strong> — backend hosting
          </li>
          <li>
            <strong>Vercel</strong> — frontend hosting + analytics
          </li>
          <li>
            <strong>PostHog</strong> — product analytics on Databerry
            itself (not the PostHog data of yours that we display)
          </li>
          <li>
            <strong>The third&#8209;party tools you connect</strong> —
            we make calls to their APIs on your behalf using credentials
            you authorised
          </li>
        </LegalList>
        <p>
          We may also disclose data when required by law, to protect
          rights and safety, or in connection with a merger, acquisition,
          or sale of assets (in which case we&apos;ll notify you in
          advance).
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="6. Cookies and analytics">
        <p>
          We use cookies (or equivalent local storage) for authentication
          (keeping you signed in) and for analytics via PostHog. We
          don&apos;t use third&#8209;party advertising cookies.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="7. Your rights">
        <p>
          Depending on where you live, you may have rights under privacy
          laws like the GDPR (EU/UK) or CCPA (California) including:
        </p>
        <LegalList>
          <li>
            <strong>Access</strong> — request a copy of the personal
            data we hold about you
          </li>
          <li>
            <strong>Correction</strong> — ask us to fix data that&apos;s
            inaccurate
          </li>
          <li>
            <strong>Deletion</strong> — ask us to delete your account and
            associated data (you can also do this from your settings)
          </li>
          <li>
            <strong>Portability</strong> — request your data in a
            machine&#8209;readable format
          </li>
          <li>
            <strong>Withdraw consent</strong> — disconnect any
            integration at any time
          </li>
          <li>
            <strong>Lodge a complaint</strong> — with your local data
            protection authority
          </li>
        </LegalList>
        <p>
          To exercise any of these, email{' '}
          <a
            href="mailto:team@heavenmade.org"
            className="font-medium text-brand hover:underline"
          >
            team@heavenmade.org
          </a>
          . We aim to respond within 30 days.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="8. Retention">
        <p>
          We keep your data while your account is active. When you delete
          your account we delete your account record, stored credentials,
          and the cached integration data we hold. Backups and logs may
          persist for up to 30 days before purge. Aggregated, anonymised
          analytics may be retained longer.
        </p>
      </LegalSection>

      <LegalSection id="children" title="9. Children's privacy">
        <p>
          The Service is not directed to children under 16, and we
          don&apos;t knowingly collect personal information from anyone
          under 16. If you believe we&apos;ve done so, contact us and
          we&apos;ll delete the relevant data.
        </p>
      </LegalSection>

      <LegalSection
        id="international"
        title="10. International data transfers"
      >
        <p>
          We are based outside the EU/UK. Where your data is transferred
          across borders, we rely on appropriate safeguards (such as
          Standard Contractual Clauses) where required by law.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. The
          &ldquo;Last&nbsp;updated&rdquo; date at the top of the page
          reflects the most recent change. Material changes will be
          announced via email or in&#8209;app notice before they take
          effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <p>
          Questions about privacy or this policy? Email{' '}
          <a
            href="mailto:team@heavenmade.org"
            className="font-medium text-brand hover:underline"
          >
            team@heavenmade.org
          </a>
          .
        </p>
      </LegalSection>
    </article>
  )
}
