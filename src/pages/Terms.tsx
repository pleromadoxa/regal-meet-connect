import { Link } from 'react-router-dom';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { COMPANY_NAME, PRODUCT_NAME, SITE_URL } from '@/constants/site';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const Terms = () => {
  useDocumentTitle('Terms of Service');

  return (
    <LegalPageLayout title="Terms of Service">
      <p>
        By accessing or using {PRODUCT_NAME} at <a href={SITE_URL}>{SITE_URL}</a>, you agree to
        these Terms of Service with {COMPANY_NAME}.
      </p>

      <section>
        <h2>Service</h2>
        <p>
          {PRODUCT_NAME} provides browser-based video conferencing, audio meetings, screen sharing,
          and related collaboration features. Features may change as we improve the product.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          You are responsible for safeguarding your login credentials and for activity under your
          account. You must provide accurate information and comply with applicable laws when
          hosting or joining meetings.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You agree not to use {PRODUCT_NAME} to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Harass, threaten, or impersonate others</li>
          <li>Distribute malware, spam, or unlawful content</li>
          <li>Attempt to bypass security, scrape data, or disrupt the service</li>
          <li>Record or redistribute meeting content without consent where required by law</li>
        </ul>
      </section>

      <section>
        <h2>Intellectual property</h2>
        <p>
          {PRODUCT_NAME}, its branding, and underlying software are owned by {COMPANY_NAME}. You
          retain ownership of content you share in meetings; you grant us a limited license to host
          and transmit that content solely to operate the service.
        </p>
      </section>

      <section>
        <h2>Disclaimer</h2>
        <p>
          The service is provided &quot;as is&quot; without warranties of uninterrupted availability.
          We are not liable for indirect damages arising from use of the service, to the fullest
          extent permitted by law.
        </p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>
          We may suspend or terminate access for violations of these terms. You may stop using the
          service at any time.
        </p>
      </section>

      <p className="text-sm text-white/50">
        See also our <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPageLayout>
  );
};

export default Terms;
