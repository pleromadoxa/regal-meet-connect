import { Link } from 'react-router-dom';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { COMPANY_NAME, PRODUCT_NAME, SITE_URL } from '@/constants/site';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const Privacy = () => {
  useDocumentTitle('Privacy Policy');

  return (
    <LegalPageLayout title="Privacy Policy">
      <p>
        {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;) operates {PRODUCT_NAME} at{' '}
        <a href={SITE_URL}>{SITE_URL}</a>. This policy explains what we collect, why we collect it,
        and how we protect your information when you use our video meeting service.
      </p>

      <section>
        <h2>Information we collect</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account data:</strong> email address, display name, and profile details you
            provide when signing up or via Regal Mail single sign-on.
          </li>
          <li>
            <strong>Meeting data:</strong> meeting codes, participant display names, lobby status,
            and optional meeting metadata (titles, schedules).
          </li>
          <li>
            <strong>Media:</strong> camera and microphone streams are transmitted peer-to-peer or
            through secure relays for the duration of a call. We do not record meetings unless you
            explicitly use a recording feature where offered.
          </li>
          <li>
            <strong>Technical logs:</strong> connection quality, error reports, and security events to
            keep the service reliable and safe.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use your data to authenticate you, host meetings, sync preferences across devices, send
        meeting invitations you request, and improve reliability. We do not sell your personal
        information or use your meeting content for advertising.</p>
      </section>

      <section>
        <h2>Sharing</h2>
        <p>
          We share data only with infrastructure providers required to run {PRODUCT_NAME} (e.g.
          authentication, database, and media edge services) under contractual safeguards, or when
          required by law.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Connections to {PRODUCT_NAME} use TLS encryption. Meeting media uses WebRTC with encrypted
          transport where supported. Access to your account is protected by your credentials and
          Regal ecosystem security controls.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You may update your profile and device defaults in Settings, delete meetings you host, and
          request account deletion by contacting {COMPANY_NAME}. You can deny camera/microphone
          permission in your browser at any time.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this policy? Visit{' '}
          <a href="https://regalmesh.com" target="_blank" rel="noopener noreferrer">
            regalmesh.com
          </a>{' '}
          or email your {COMPANY_NAME} administrator.
        </p>
      </section>

      <p className="text-sm text-white/50">
        See also our <Link to="/terms">Terms of Service</Link>.
      </p>
    </LegalPageLayout>
  );
};

export default Privacy;
