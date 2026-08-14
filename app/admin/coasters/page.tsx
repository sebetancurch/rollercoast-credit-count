import type { Metadata } from "next";

import { CatalogueView } from "@/components/catalogue-view";
import { requireAdmin } from "@/lib/auth/session";
import { getCatalogueSummary, listCoasters } from "@/lib/data/coasters";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Coaster catalogue · Credit Count" };

export default async function CataloguePage() {
  await requireAdmin();
  const [coasters, summary] = await Promise.all([listCoasters(), getCatalogueSummary()]);

  return (
    <div className="cc-page">
      <h1 style={{ fontSize: 40, marginBottom: "var(--space-2)" }}>Coaster catalogue</h1>
      <p className="text-muted" style={{ fontSize: 14 }}>
        {plural(summary.coasters, "coaster")} ·{" "}
        {plural(summary.countries.length, "country", "countries")} ·{" "}
        {plural(summary.manufacturers, "manufacturer")}
      </p>
      <p style={{ fontSize: 15, maxWidth: "58ch", textWrap: "pretty", marginTop: "var(--space-3)" }}>
        Shared by every user, so credit counts stay comparable. Seeded from RCDB data and
        maintained here.
      </p>

      <CatalogueView coasters={coasters} countries={summary.countries} />

      <p className="text-muted cc-note">
        Only admins can change the catalogue, enforced at the database layer. Admins
        cannot see any user&apos;s ride history.
      </p>
    </div>
  );
}
