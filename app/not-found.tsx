import Link from "next/link";

export default function NotFound() {
  return (
    <div className="cc-page" style={{ maxWidth: "52ch" }}>
      <h1>Not found</h1>
      <p className="cc-prose cc-prose--lg">
        There is nothing at this address. It may have been a coaster that has since
        been removed from the catalogue.
      </p>
      <Link href="/" className="btn btn-primary">
        Back to the leaderboard
      </Link>
    </div>
  );
}
