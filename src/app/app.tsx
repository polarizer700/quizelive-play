import { JoinPage } from "@pages/join";
import { HomePage } from "@pages/home";
import { TvPage } from "@pages/tv";
import { CookieBanner } from "@widgets/cookie-banner";
import { LegalLinks } from "@widgets/legal-links";

export function App() {
  const path = window.location.pathname;
  const page = path.startsWith("/join") ? <JoinPage /> : path.startsWith("/tv") ? <TvPage /> : <HomePage />;
  return (
    <>
      {page}
      {path.startsWith("/tv") ? null : <LegalLinks />}
      <CookieBanner />
    </>
  );
}
