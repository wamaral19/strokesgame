import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us | Strokes Game",
  description: "Get in touch with the Strokes Game team.",
};

const CONTACT_EMAIL = "wyatt@tourpro.shop";

export default function ContactPage() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="wordmark" href="/">
            Strokes Game
          </Link>
        </div>
      </header>

      <section className="contact-panel">
        <span className="eyebrow">Contact Us</span>
        <h1>We&rsquo;d love to hear from you.</h1>
        <p>
          Questions, comments, or feedback? Send us an email and we&rsquo;ll get
          back to you.
        </p>
        <a className="contact-panel__email" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        <Link className="ghost-button contact-panel__back" href="/">
          Back to the Game
        </Link>
      </section>
    </main>
  );
}
