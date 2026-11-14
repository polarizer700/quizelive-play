import { useEffect, useState } from "react";

import { legal } from "@shared/config/legal";

const STORAGE_KEY = "quizelive.cookieConsent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== "accepted");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite">
      <p>
        Используем необходимые cookie. Подробности в{" "}
        <a href={legal.cookiesUrl} target="_blank" rel="noreferrer">
          пояснении
        </a>{" "}
        и{" "}
        <a href={legal.privacyUrl} target="_blank" rel="noreferrer">
          политике
        </a>
        .
      </p>
      <button
        className="primary"
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, "accepted");
          } catch {
            // ignore
          }
          setVisible(false);
        }}
      >
        Принять
      </button>
    </div>
  );
}
