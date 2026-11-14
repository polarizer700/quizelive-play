import { legal } from "@shared/config/legal";

export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Документы">
      <a href={legal.privacyUrl} target="_blank" rel="noreferrer">
        Политика
      </a>
      <a href={legal.termsUrl} target="_blank" rel="noreferrer">
        Соглашение
      </a>
      <a href={legal.cookiesUrl} target="_blank" rel="noreferrer">
        Cookie
      </a>
      <span className="age-mark">{legal.ageMark}</span>
    </nav>
  );
}
