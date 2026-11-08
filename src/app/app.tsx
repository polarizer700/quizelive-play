import { JoinPage } from "@pages/join";
import { HomePage } from "@pages/home";
import { TvPage } from "@pages/tv";

export function App() {
  const path = window.location.pathname;
  if (path.startsWith("/join")) return <JoinPage />;
  if (path.startsWith("/tv")) return <TvPage />;
  return <HomePage />;
}
