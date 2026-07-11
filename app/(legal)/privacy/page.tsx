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

const LAST_UPDATED = 'May 16, 2026'

export default function PrivacyPage() {
  return (
    <article>
      <LegalTitle>Privacy Policy</LegalTitle>
      <LastUpdated date={LAST_UPDATED} />

      <LegalLead>
        This Privacy Policy explains what data <strong>Databerry</strong>{' '}
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, why, where it&apos;s
        stored, and how it&apos;s protected. Databerry is a dashboard for
        connecting and viewing data from third&#8209;party tools you already
        use; the data we touch is a means to that end, not the product.
        Databerry is operated by <strong>HeavenMade LLC</strong>, a company
        registered in Wyoming, USA. Contact:{' '}
        <a
          href="mailto:team@heavenmade.org"
          className="font-medium text-secondary hover:underline"
        >
          team@heavenmade.org
        </a>
        .
      </LegalLead>

      {/* ════════════════════════════════════════════════════════════
            1.  DATA WE COLLECT
            ════════════════════════════════════════════════════════════ */}
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
          Google&nbsp;Analytics, PostHog, Calendly, Sentry, or custom
          webhooks — we store the credential needed to access that tool
          on your behalf. Depending on the tool, this is either an
          OAuth&nbsp;access&nbsp;token + refresh&nbsp;token (revocable
          from your account at the provider) or an API key you paste in.
          Credentials are scoped read&#8209;only wherever the third party
          supports it. Every credential is encrypted before it&apos;s
          written to our database — see Section&nbsp;5 for details.
        </p>

        <LegalSubheading>
          1.3 Data fetched from connected integrations
        </LegalSubheading>
        <p>
          To render the metrics you choose, we fetch data from your
          connected tools. Most providers&apos; data is queried{' '}
          <strong>live on every dashboard render</strong> and never
          persisted server&#8209;side; the exception is Stripe, where we
          mirror a subset (charges, customers, subscriptions, products,
          line items) to support fast historical queries. Scope:
        </p>
        <LegalList>
          <li>
            <strong>Stripe</strong> — charges, customers, subscriptions,
            products, and the line items needed to attribute revenue
            (read&#8209;only, mirrored locally). We never write to your
            Stripe account.
          </li>
          <li>
            <strong>Google&nbsp;Analytics</strong> — pageviews, sessions,
            users, and traffic source breakdowns for the property you
            select. Live every render; <strong>never persisted</strong>.
          </li>
          <li>
            <strong>PostHog</strong> — event counts, funnel results,
            retention matrices, and the live values you choose to track.
            Live every render; only the cached &ldquo;today&apos;s tile
            value&rdquo; for daily counters is briefly stored.
          </li>
          <li>
            <strong>Calendly</strong> — meeting counts and basic meeting
            metadata. Live every render.
          </li>
          <li>
            <strong>Sentry</strong> — the list of unresolved issues in the
            Sentry organisation you authorise, for the period you select
            (title, occurrence count, last&#8209;seen timestamp, and a
            deep&#8209;link back into Sentry). Read&#8209;only via Sentry&apos;s
            public&#8209;integration OAuth flow. Live every render;{' '}
            <strong>never persisted</strong>. We never receive your
            users&apos; raw error payloads (stack traces, breadcrumbs,
            request bodies) — only the issue summaries the Sentry API
            returns for an org&#8209;level issues list.
          </li>
        </LegalList>
        <p>
          We fetch only what&apos;s needed for the views you create, and
          you can disconnect any integration at any time to stop fetching
          immediately. See Section&nbsp;6 for the deletion behaviour.
        </p>

        <LegalSubheading>1.4 Usage analytics</LegalSubheading>
        <p>
          We use PostHog to understand how the Service is used in
          aggregate (which pages people visit, which connections they
          create, which views are popular). This includes IP addresses
          and device/browser metadata. We do not sell or share this
          data with third&#8209;party advertisers, and the events here
          contain no Google user data.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            2.  GOOGLE USER DATA — explicit five-axis disclosure
            ════════════════════════════════════════════════════════════ */}
      <LegalSection
        id="google-user-data"
        title="2. Google user data — what we access, how we use it, and how we protect it"
      >
        <p>
          Databerry&apos;s Google&nbsp;Analytics integration uses the
          Google&nbsp;Analytics&nbsp;Data&nbsp;API and Google&nbsp;Analytics
          Admin&nbsp;API to read property&#8209;level metrics on properties
          you explicitly authorise. This section gives an exhaustive
          accounting per Google&apos;s required disclosures. Section&nbsp;3
          covers the equivalent commitments under Google&apos;s
          <em> Limited Use </em>requirements.
        </p>

        <LegalSubheading>
          2.1 Data accessed
        </LegalSubheading>
        <p>The application requests exactly one OAuth scope:</p>
        <LegalList>
          <li>
            <code className="text-xs">
              https://www.googleapis.com/auth/analytics.readonly
            </code>{' '}
            — read&#8209;only access to your Google&nbsp;Analytics
            properties.
          </li>
        </LegalList>
        <p>
          The Google&nbsp;Analytics integration <strong>does not</strong>{' '}
          request <code className="text-xs">openid</code>,{' '}
          <code className="text-xs">userinfo.email</code>, or{' '}
          <code className="text-xs">userinfo.profile</code>. The
          analytics&#8209;readonly scope by itself does not expose your
          Google account&apos;s email or profile name to Databerry.
        </p>
        <p>
          Separately, if you choose to <em>sign in</em> to Databerry using
          &ldquo;Continue with Google&rdquo; (a different OAuth flow,
          handled by our authentication provider Supabase), Databerry
          receives your email address — that&apos;s the email associated
          with your Databerry account, covered by §1.1. The
          Google&nbsp;Analytics integration does not piggyback on that
          sign&#8209;in or share its data with the GA integration; the two
          are independent OAuth flows with independent scopes and tokens.
        </p>
        <p>
          Through that scope, we call two Google APIs:
        </p>
        <LegalList>
          <li>
            <strong>Google&nbsp;Analytics&nbsp;Admin&nbsp;API</strong>{' '}
            (<code className="text-xs">analyticsadmin.googleapis.com/v1beta</code>) —
            once per OAuth callback, to list the GA4 properties under your
            account so you can pick which one to display.
          </li>
          <li>
            <strong>Google&nbsp;Analytics&nbsp;Data&nbsp;API</strong>{' '}
            (<code className="text-xs">analyticsdata.googleapis.com/v1beta</code>) —
            on every dashboard render, to fetch the metrics you&apos;ve
            chosen for the selected date range. We use{' '}
            <code className="text-xs">runReport</code> for historical
            queries and <code className="text-xs">runRealtimeReport</code>{' '}
            for the &ldquo;active users right now&rdquo; tile.
          </li>
        </LegalList>
        <p>The specific GA4 fields we query:</p>
        <LegalList>
          <li>
            Metrics: <code className="text-xs">totalUsers</code>,{' '}
            <code className="text-xs">sessions</code>,{' '}
            <code className="text-xs">screenPageViews</code>,{' '}
            <code className="text-xs">activeUsers</code> (realtime).
          </li>
          <li>
            Dimensions: <code className="text-xs">sessionSource</code>,{' '}
            <code className="text-xs">dateHour</code>,{' '}
            <code className="text-xs">date</code>.
          </li>
          <li>
            Property identifier and human&#8209;readable display name (so
            we can label which property a tile is showing).
          </li>
        </LegalList>
        <p>
          We do not request, fetch, or store any user&#8209;level identifiers
          (e.g. <code className="text-xs">clientId</code>,{' '}
          <code className="text-xs">userId</code>) or events that could
          identify a specific website visitor.
        </p>

        <LegalSubheading>2.2 Data usage</LegalSubheading>
        <p>
          The data described above is used <strong>only</strong> to
          render your Databerry dashboard — the metric tiles and traffic
          breakdowns you configured. It is not aggregated across users,
          not used for advertising, retargeting, or model training, and
          not sold or shared with any party other than the operational
          sub&#8209;processors listed in Section&nbsp;4.
        </p>

        <LegalSubheading>2.3 Data sharing</LegalSubheading>
        <p>
          See Section&nbsp;4 for the full sub&#8209;processor list, which
          notes specifically which sub&#8209;processors handle
          Google&nbsp;user&nbsp;data. In summary:
        </p>
        <LegalList>
          <li>
            Encrypted Google OAuth credentials (access&nbsp;token +
            refresh&nbsp;token) live in <strong>Supabase</strong>.
          </li>
          <li>
            Google API responses transit through{' '}
            <strong>Railway</strong> (our backend host) on their way to
            your browser; <strong>nothing is persisted server&#8209;side</strong>.
          </li>
          <li>
            <strong>PostHog</strong> (product analytics on Databerry
            itself) does <strong>not</strong> receive Google user data
            at all.
          </li>
        </LegalList>

        <LegalSubheading>2.4 Data storage &amp; protection</LegalSubheading>
        <p>
          The only Google&nbsp;user&nbsp;data we persist is the OAuth
          credential pair (access&nbsp;token, refresh&nbsp;token) plus
          the GA4 property&nbsp;ID and display&nbsp;name you select.
          Storage protection runs four layers deep:
        </p>
        <LegalList>
          <li>
            <strong>Application&#8209;layer encryption</strong> —
            Tokens are encrypted with AES&#8209;256&#8209;GCM (an
            authenticated encryption mode that detects tampering)
            before they leave the backend. The encryption key is
            <em> derived per&#8209;user </em>using HKDF&#8209;SHA256 over
            a master key that lives in our backend environment
            configuration, never in the database. A leaked database
            alone cannot be decrypted; an attacker would also need the
            master key, and would need to know each row&apos;s owning
            user UUID.
          </li>
          <li>
            <strong>Transport security</strong> — All traffic between
            your browser, our backend (Railway), and our database
            (Supabase), and outbound traffic to Google&apos;s APIs uses
            TLS&nbsp;1.2 or higher.
          </li>
          <li>
            <strong>Database&#8209;layer encryption at rest</strong> —
            Supabase additionally encrypts all stored data with AES&#8209;256
            at the disk level, including database backups.
          </li>
          <li>
            <strong>Access control</strong> — Production database access
            is limited to a single role key held by the backend service.
            On the human side, only the company&apos;s sole founder has
            access to production infrastructure. There are no other
            employees or contractors with production access today.
          </li>
        </LegalList>
        <p>
          Google API <em>query results</em> (pageviews, sessions, source
          breakdowns) are <strong>never</strong> persisted. Each chart
          re&#8209;queries the Google&nbsp;Analytics&nbsp;Data&nbsp;API
          live, and the response is forwarded to your browser without
          being saved server&#8209;side.
        </p>

        <LegalSubheading>2.5 Data retention &amp; deletion</LegalSubheading>
        <LegalList>
          <li>
            <strong>On disconnect</strong> — when you click the trash
            icon next to a Google&nbsp;Analytics connection in
            Databerry&apos;s Connections page, the encrypted credential
            row is deleted from our primary database immediately
            (within the same HTTP request). Any in&#8209;flight queries
            already in progress finish out and discard their results.
          </li>
          <li>
            <strong>Database backups</strong> — Supabase retains
            point&#8209;in&#8209;time recovery snapshots for up to{' '}
            <strong>14&nbsp;days</strong> on our current plan, after
            which they&apos;re automatically purged. Even within that
            window, credentials remain in their application&#8209;layer
            encrypted form (AES&#8209;256&#8209;GCM, per&#8209;user
            derived key) and are unusable without the master key, which
            is not stored in Supabase.
          </li>
          <li>
            <strong>Backend logs</strong> — Railway retains runtime
            logs for up to <strong>30&nbsp;days</strong> by default.
            Logs do <em>not</em> contain full credentials: access tokens
            are masked (e.g.&nbsp;<code className="text-xs">sk_test_…ibr2c</code>)
            before any log line is emitted, and our codebase encrypts
            tokens at rest regardless. We never log Google API response
            payloads.
          </li>
          <li>
            <strong>Account deletion</strong> — to delete the entire
            account and every associated record, email{' '}
            <a
              href="mailto:team@heavenmade.org"
              className="font-medium text-secondary hover:underline"
            >
              team@heavenmade.org
            </a>
            . We process deletion requests within{' '}
            <strong>48&nbsp;hours</strong> of receipt. The action wipes:
            the account record, every connection and its encrypted
            credentials, every project / folder / view you created,
            every cached integration data row, and the per&#8209;user
            settings record. Backup snapshots referenced above continue
            to age out per Supabase&apos;s retention window.
          </li>
        </LegalList>
        <p>
          You can also revoke Databerry&apos;s access to your
          Google&nbsp;Analytics account directly at{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-secondary hover:underline"
          >
            myaccount.google.com/permissions
          </a>
          {' '}— our stored credentials become unusable the moment Google
          revokes them, and our next refresh attempt will prompt you to
          reconnect.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            3.  GOOGLE LIMITED USE
            ════════════════════════════════════════════════════════════ */}
      <LegalSection
        id="google-limited-use"
        title="3. Google API Services — Limited Use compliance"
      >
        <p>
          Databerry&apos;s use of information received from Google APIs
          adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-secondary hover:underline"
          >
            Google API Services User Data Policy
          </a>
          , including its Limited Use requirements:
        </p>
        <LegalList>
          <li>
            We use Google user data <strong>only</strong> to provide and
            improve user&#8209;facing features within Databerry —
            specifically, displaying your Google&nbsp;Analytics metrics
            in your dashboard.
          </li>
          <li>
            We do <strong>not</strong> transfer Google user data to third
            parties except to the operational sub&#8209;processors listed
            in Section&nbsp;4 (each of whom is bound to confidentiality
            and security obligations under their own customer contracts),
            to comply with applicable law, or as part of a merger or
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
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            4.  SUB-PROCESSORS
            ════════════════════════════════════════════════════════════ */}
      <LegalSection id="subprocessors" title="4. Sub-processors">
        <p>
          We rely on the following sub&#8209;processors to operate
          Databerry. Each has its own privacy and security commitments
          under its standard customer terms.
        </p>
        <div className="overflow-x-auto">
          <table className="mt-4 min-w-full border-collapse text-xs leading-5 text-muted-foreground">
            <thead>
              <tr className="border-b border-stroke text-left">
                <th className="py-2 pr-4 font-semibold text-foreground">
                  Sub&#8209;processor
                </th>
                <th className="py-2 pr-4 font-semibold text-foreground">
                  Purpose
                </th>
                <th className="py-2 pr-4 font-semibold text-foreground">
                  Receives Google user data?
                </th>
                <th className="py-2 font-semibold text-foreground">
                  Privacy policy
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              <tr>
                <td className="py-2 pr-4 font-medium">Supabase</td>
                <td className="py-2 pr-4">Database + authentication</td>
                <td className="py-2 pr-4">
                  Yes — encrypted Google OAuth credentials only. Never
                  query results.
                </td>
                <td className="py-2">
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline"
                  >
                    supabase.com/privacy
                  </a>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Railway</td>
                <td className="py-2 pr-4">Backend hosting</td>
                <td className="py-2 pr-4">
                  Transits during query (request &amp; response). Not
                  persisted; logs scrub credentials.
                </td>
                <td className="py-2">
                  <a
                    href="https://railway.com/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline"
                  >
                    railway.com/legal/privacy
                  </a>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">PostHog</td>
                <td className="py-2 pr-4">
                  Product analytics on Databerry itself
                </td>
                <td className="py-2 pr-4">
                  No — only Databerry product&#8209;usage events; no Google
                  user data.
                </td>
                <td className="py-2">
                  <a
                    href="https://posthog.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline"
                  >
                    posthog.com/privacy
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          We may also disclose data when required by law, to protect
          rights and safety, or in connection with a merger, acquisition,
          or sale of assets (in which case we&apos;ll notify you in
          advance).
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            5.  SECURITY OF STORED CREDENTIALS
            ════════════════════════════════════════════════════════════ */}
      <LegalSection id="security" title="5. Security of stored credentials">
        <p>
          Every credential we store — OAuth tokens (Stripe, Calendly,
          Google&nbsp;Analytics, Sentry) and API keys (Stripe Manual,
          PostHog) — is protected with the same multi&#8209;layer scheme
          described
          in §2.4: AES&#8209;256&#8209;GCM application&#8209;layer
          encryption with a per&#8209;user derived key, on top of TLS in
          transit and AES&#8209;256 disk encryption at rest in Supabase.
          The master encryption key lives in our backend environment
          configuration and is never written to any database.
        </p>
        <p>
          Webhook signing secrets (used by some custom integrations) are
          stored as one&#8209;way SHA&#8209;256 hashes — we never need to
          recover the original value, only verify an incoming signature.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            6.  HOW WE USE YOUR DATA
            ════════════════════════════════════════════════════════════ */}
      <LegalSection id="how-we-use" title="6. How we use your data">
        <p>We use the data described above to:</p>
        <LegalList>
          <li>Provide, maintain, and operate the Service.</li>
          <li>
            Authenticate you, secure your account, and prevent fraud or
            abuse.
          </li>
          <li>
            Render the dashboards, charts, and lists you&apos;ve set up.
          </li>
          <li>
            Respond to support requests and communicate updates about
            the Service.
          </li>
          <li>
            Improve the Service in aggregate (which features get used,
            which break).
          </li>
          <li>Comply with legal obligations.</li>
        </LegalList>
        <p>
          We do <strong>not</strong> sell your data, share it with
          advertisers, or use the contents of your connected tools to
          train AI/ML models.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            7.  COOKIES
            ════════════════════════════════════════════════════════════ */}
      <LegalSection id="cookies" title="7. Cookies and analytics">
        <p>
          We use cookies (or equivalent local storage) for authentication
          (keeping you signed in) and for analytics via PostHog. We
          don&apos;t use third&#8209;party advertising cookies.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            8.  YOUR RIGHTS
            ════════════════════════════════════════════════════════════ */}
      <LegalSection id="rights" title="8. Your rights">
        <p>
          Depending on where you live, you may have rights under privacy
          laws like the GDPR (EU/UK) or CCPA (California) including:
        </p>
        <LegalList>
          <li>
            <strong>Access</strong> — request a copy of the personal
            data we hold about you.
          </li>
          <li>
            <strong>Correction</strong> — ask us to fix data that&apos;s
            inaccurate.
          </li>
          <li>
            <strong>Deletion</strong> — ask us to delete your account and
            associated data (we process within 48&nbsp;hours; see §2.5).
          </li>
          <li>
            <strong>Portability</strong> — request your data in a
            machine&#8209;readable format.
          </li>
          <li>
            <strong>Withdraw consent</strong> — disconnect any
            integration at any time, immediately wiping its credentials.
          </li>
          <li>
            <strong>Lodge a complaint</strong> — with your local data
            protection authority.
          </li>
        </LegalList>
        <p>
          To exercise any of these, email{' '}
          <a
            href="mailto:team@heavenmade.org"
            className="font-medium text-secondary hover:underline"
          >
            team@heavenmade.org
          </a>
          . We respond within 48&nbsp;hours.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            9.  CHILDREN
            ════════════════════════════════════════════════════════════ */}
      <LegalSection id="children" title="9. Children's privacy">
        <p>
          The Service is not directed to children under 16, and we
          don&apos;t knowingly collect personal information from anyone
          under 16. If you believe we&apos;ve done so, contact us and
          we&apos;ll delete the relevant data.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            10. INTERNATIONAL TRANSFERS
            ════════════════════════════════════════════════════════════ */}
      <LegalSection
        id="international"
        title="10. International data transfers"
      >
        <p>
          HeavenMade LLC (operating Databerry) is registered in Wyoming,
          USA. Where your data is transferred across borders, we rely on
          appropriate safeguards (such as the EU Standard Contractual
          Clauses) where required by law. Our sub&#8209;processors
          (Section&nbsp;4) maintain their own cross&#8209;border transfer
          compliance.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            11. CHANGES
            ════════════════════════════════════════════════════════════ */}
      <LegalSection id="changes" title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. The
          &ldquo;Last&nbsp;updated&rdquo; date at the top of the page
          reflects the most recent change. Material changes will be
          announced via email or in&#8209;app notice before they take
          effect.
        </p>
      </LegalSection>

      {/* ════════════════════════════════════════════════════════════
            12. CONTACT
            ════════════════════════════════════════════════════════════ */}
      <LegalSection id="contact" title="12. Contact">
        <p>
          Questions about privacy or this policy? Email{' '}
          <a
            href="mailto:team@heavenmade.org"
            className="font-medium text-secondary hover:underline"
          >
            team@heavenmade.org
          </a>
          .
        </p>
      </LegalSection>
    </article>
  )
}
