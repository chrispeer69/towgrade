export default function Home() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 2rem" }}>
      <p
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "var(--signal)",
          background: "var(--signal-lt)",
          padding: "4px 10px",
          borderRadius: 2,
          marginBottom: "1.25rem",
        }}
      >
        TowGrade · Scaffold
      </p>

      <h1
        style={{
          fontFamily: "var(--font-d)",
          fontSize: "clamp(32px, 3.5vw, 50px)",
          fontWeight: 700,
          letterSpacing: "-0.5px",
          lineHeight: 1.08,
          marginBottom: "1.2rem",
        }}
      >
        The data that holds{" "}
        <span style={{ color: "var(--signal)" }}>providers accountable</span>.
      </h1>

      <p
        style={{
          fontSize: 16,
          lineHeight: 1.75,
          color: "var(--ink-50)",
          maxWidth: 600,
          marginBottom: "2.5rem",
        }}
      >
        Design system loaded. Playfair Display (display) · IBM Plex Sans (body)
        · IBM Plex Mono (numbers).
      </p>

      <div
        style={{
          display: "flex",
          gap: "2.5rem",
          paddingTop: "2.5rem",
          borderTop: "var(--border)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-m)",
              fontSize: 26,
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1,
            }}
          >
            v0.0.1
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-50)", marginTop: 4 }}>
            Scaffold version
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-m)",
              fontSize: 26,
              fontWeight: 500,
              color: "var(--up)",
              lineHeight: 1,
            }}
          >
            7.4
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-50)", marginTop: 4 }}>
            Mono numerals
          </div>
        </div>
      </div>
    </main>
  );
}
