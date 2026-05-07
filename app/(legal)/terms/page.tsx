import type { Metadata } from 'next'
import {
  LegalTitle,
  LastUpdated,
  LegalLead,
  LegalSection,
  LegalList,
} from '../(components)/LegalHeading'

export const metadata: Metadata = {
  title: 'Terms of Service — Databerry',
  description:
    'The terms governing use of Databerry. Plain-English description of what you can do with the service and what we promise (and don’t).',
}

const LAST_UPDATED = 'May 7, 2026'

export default function TermsPage() {
  return (
    <article>
      <LegalTitle>Terms of Service</LegalTitle>
      <LastUpdated date={LAST_UPDATED} />

      <LegalLead>
        These Terms of Service (&ldquo;<strong>Terms</strong>&rdquo;) govern
        your use of <strong>Databerry</strong> (&ldquo;the Service&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;), a dashboard for connecting and
        viewing data from third&#8209;party tools you already use (Stripe,
        Google&nbsp;Analytics, PostHog, Calendly, and others). By creating an
        account or using the Service you agree to these Terms.
      </LegalLead>

      <LegalSection id="eligibility" title="1. Eligibility">
        <p>
          You must be at least 16 years old and legally able to enter into a
          contract in your jurisdiction to use the Service. If you&apos;re
          using the Service on behalf of a company, you confirm you have
          authority to bind that company to these Terms.
        </p>
      </LegalSection>

      <LegalSection id="account" title="2. Account and registration">
        <p>
          You&apos;re responsible for keeping your account credentials
          confidential and for any activity under your account. Notify us at{' '}
          <a
            href="mailto:team@heavenmade.org"
            className="font-medium text-brand hover:underline"
          >
            team@heavenmade.org
          </a>{' '}
          if you suspect unauthorised access.
        </p>
      </LegalSection>

      <LegalSection id="service" title="3. What the Service does">
        <p>
          Databerry connects to third&#8209;party tools you authorise (e.g.
          Stripe, Google&nbsp;Analytics, PostHog, Calendly), pulls a limited
          subset of your data, and presents it in a unified dashboard.
        </p>
        <p>
          The Service is read&#8209;only with respect to your third&#8209;party
          accounts: we don&apos;t modify, delete, or write to any data on the
          tools you connect. We only fetch what&apos;s needed to render
          the metrics you&apos;ve chosen to display.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="4. Acceptable use">
        <p>You agree not to:</p>
        <LegalList>
          <li>Use the Service to violate any law or third&#8209;party rights</li>
          <li>
            Reverse&#8209;engineer, decompile, or attempt to extract source
            code beyond what&apos;s permitted by applicable law
          </li>
          <li>
            Probe, scan, or test the vulnerability of the Service or its
            infrastructure without our written permission
          </li>
          <li>
            Connect a third&#8209;party account you don&apos;t have permission
            to access, or supply credentials that don&apos;t belong to you
          </li>
          <li>
            Use the Service to transmit malware, spam, or harmful content
          </li>
          <li>
            Resell, rent, or redistribute the Service or substantial portions
            of its data to third parties without our prior written consent
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection
        id="third-parties"
        title="5. Third-party integrations and credentials"
      >
        <p>
          When you connect a third&#8209;party tool, you authorise us to access
          your data on that tool through the credentials you provide
          (OAuth&nbsp;tokens or API keys). Your continued use of those tools is
          governed by their own terms and privacy policies; we are not
          responsible for the third party&apos;s availability, behaviour, or
          changes they make to their APIs.
        </p>
        <p>
          Credentials are encrypted (AES&#8209;256&#8209;GCM with a per&#8209;user
          derived key) before being written to our database. See the{' '}
          <a href="/privacy" className="font-medium text-brand hover:underline">
            Privacy Policy
          </a>
          {' '}§5 for the full security architecture.
        </p>
        <p>
          You can disconnect any integration at any time from the Connections
          page in Databerry. The encrypted credential row is deleted from our
          primary database immediately, and the third&#8209;party token is
          revoked where the provider&apos;s API supports it.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="6. Intellectual property">
        <p>
          The Databerry name, logo, source code, and design are owned by us
          and our licensors. These Terms don&apos;t grant you any rights to
          our trademarks or branding.
        </p>
        <p>
          You retain all rights to the data your connected tools surface
          through the Service. We claim no ownership of it and won&apos;t use
          it for purposes outside operating the Service for you (see the{' '}
          <a href="/privacy" className="font-medium text-brand hover:underline">
            Privacy Policy
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection id="warranty" title="7. Disclaimers">
        <p>
          The Service is provided <strong>&ldquo;as is&rdquo;</strong> and{' '}
          <strong>&ldquo;as available&rdquo;</strong>. To the fullest extent
          permitted by law, we disclaim all warranties, express or implied,
          including merchantability, fitness for a particular purpose, and
          non&#8209;infringement.
        </p>
        <p>
          We do not warrant that the Service will be uninterrupted, that the
          data shown will be accurate or complete (third&#8209;party APIs
          can lag, fail, or change shape), or that errors will be corrected.
          Don&apos;t make irreversible business decisions based solely on
          numbers shown in Databerry without verifying them at the source.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="8. Limitation of liability">
        <p>
          To the fullest extent permitted by law, in no event shall Databerry,
          its operators, or its contributors be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out
          of or relating to your use of the Service, including loss of profits,
          revenue, data, or business opportunities, even if advised of the
          possibility.
        </p>
        <p>
          Our aggregate liability for any claim arising out of these Terms
          will not exceed the greater of (a) the amount you paid us for the
          Service in the twelve months preceding the claim, or (b) USD&nbsp;50.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="9. Termination">
        <p>
          You can stop using the Service and request account deletion at any
          time by emailing{' '}
          <a
            href="mailto:team@heavenmade.org"
            className="font-medium text-brand hover:underline"
          >
            team@heavenmade.org
          </a>
          . We process deletion requests within 48&nbsp;hours of receipt. We
          may also suspend or terminate your access if you breach these Terms
          or use the Service in a way that risks harm to us, our other users,
          or the third parties you&apos;ve connected.
        </p>
        <p>
          When your account is deleted we wipe your account record, every
          stored credential (encrypted or otherwise), every project / folder /
          view you created, and the cached integration data we hold.
          Database backups and runtime logs continue to age out per our
          providers&apos; default retention windows; even within those
          backups, credentials remain in their encrypted form (see Privacy
          Policy §2.5 + §5).
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If a change is
          material, we&apos;ll notify you by email or through the Service
          before it takes effect. Continued use of the Service after a change
          becomes effective means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="11. Governing law">
        <p>
          Databerry&apos;s legal entity is registered in the State of Wyoming,
          United States. These Terms are governed by the laws of the State of
          Wyoming, without regard to conflict&#8209;of&#8209;laws principles.
          Disputes will be resolved in the courts of Wyoming unless mandatory
          consumer protection laws in your country provide otherwise.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <p>
          Questions about these Terms? Reach out to{' '}
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
