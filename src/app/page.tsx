import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProviderRow = Database["public"]["Views"]["public_providers"]["Row"];

export default async function LandingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_providers")
    .select("id,name")
    .order("name");

  const providers = (data ?? []) as Pick<ProviderRow, "id" | "name">[];

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-in">
          <div>
            <div className="eyebrow">Industry Intelligence Platform</div>
            <h1>
              The data that holds
              <br />
              <span>providers accountable.</span>
            </h1>
            <p className="hero-lead">
              TowGrade is a verified, anonymous reporting platform where towing
              company owners grade roadside assistance providers across 12
              operational categories — generating the intelligence OEMs and
              insurers need to manage their networks.
            </p>
            <div className="hero-actions">
              <Link
                href="/register"
                className="btn p"
                style={{ fontSize: 14, padding: "9px 20px" }}
              >
                Register your company →
              </Link>
              <a
                href="#"
                className="btn"
                style={{ fontSize: 14, padding: "9px 20px" }}
              >
                OEM &amp; Insurer access
              </a>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hs-val">1,240+</div>
                <div className="hs-lbl">Verified operators</div>
              </div>
              <div>
                <div className="hs-val">18,400+</div>
                <div className="hs-lbl">Provider reviews</div>
              </div>
              <div>
                <div className="hs-val">{providers.length || 14}</div>
                <div className="hs-lbl">Providers indexed</div>
              </div>
              <div>
                <div className="hs-val">100%</div>
                <div className="hs-lbl">Operator anonymity</div>
              </div>
            </div>
          </div>

          <div className="live-panel">
            <div className="lp-head">
              <span className="lp-label">Current scores</span>
              <span className="live-dot">Live</span>
            </div>
            <div className="lp-row">
              <div>
                <div className="lp-pname">NSD</div>
                <div className="lp-pmeta">Motor Club · 987 reviews</div>
              </div>
              <span className="lp-score chi">7.8</span>
            </div>
            <div className="lp-row">
              <div>
                <div className="lp-pname">AAA</div>
                <div className="lp-pmeta">Motor Club · 5,102 reviews</div>
              </div>
              <span className="lp-score chi">7.1</span>
            </div>
            <div className="lp-row">
              <div>
                <div className="lp-pname">Allstate RSA</div>
                <div className="lp-pmeta">Insurer-Direct · 623 reviews</div>
              </div>
              <span className="lp-score cmd">6.8</span>
            </div>
            <div className="lp-row">
              <div>
                <div className="lp-pname">Agero</div>
                <div className="lp-pmeta">Motor Club · 2,847 reviews</div>
              </div>
              <span className="lp-score cmd">6.4</span>
            </div>
            <div className="lp-row">
              <div>
                <div className="lp-pname">Urgently</div>
                <div className="lp-pmeta">
                  Digital Platform · 1,209 reviews
                </div>
              </div>
              <span className="lp-score clo">5.2</span>
            </div>
            <div className="lp-row">
              <div>
                <div className="lp-pname">HONK</div>
                <div className="lp-pmeta">Digital Platform · 743 reviews</div>
              </div>
              <span className="lp-score clo">4.9</span>
            </div>
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <Link
                href="/scoreboard"
                className="btn p"
                style={{ width: "100%", fontSize: 13, display: "block", textAlign: "center" }}
              >
                View full scoreboard →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="feat-sec">
        <div className="feat-in">
          <div style={{ maxWidth: 560 }}>
            <div className="sec-ey">Platform overview</div>
            <div className="sh2">
              Designed for operators. Built for accountability.
            </div>
          </div>
          <div className="fg">
            <div className="fc">
              <div className="fc-num">01</div>
              <div className="fc-ico">🔒</div>
              <div className="fc-title">Complete anonymity</div>
              <div className="fc-desc">
                Your identity is never shared with any provider. Public data is
                aggregated by region and fleet size only.
              </div>
            </div>
            <div className="fc">
              <div className="fc-num">02</div>
              <div className="fc-ico">★</div>
              <div className="fc-title">12-category scoring</div>
              <div className="fc-desc">
                Rate pay rates, payment speed, damage claims, dispatch accuracy,
                tech reliability, account management, and more.
              </div>
            </div>
            <div className="fc">
              <div className="fc-num">03</div>
              <div className="fc-ico">◎</div>
              <div className="fc-title">Visibility control</div>
              <div className="fc-desc">
                Toggle each review between private and public. Narrative
                comments are always private — only scores are aggregated.
              </div>
            </div>
            <div className="fc">
              <div className="fc-num">04</div>
              <div className="fc-ico">📊</div>
              <div className="fc-title">OEM intelligence</div>
              <div className="fc-desc">
                Aggregated reports delivered to OEMs and insurers, driving
                contractual accountability at scale.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROVIDERS — live from public_providers */}
      <section className="prov-sec">
        <div className="prov-in">
          <div className="sec-ey">Covered providers</div>
          <div className="sh2">All major motor clubs &amp; digital platforms</div>
          <div className="ssub">
            Don&apos;t see your provider? Submit an addition request from your
            operator dashboard.
          </div>
          <div className="pchips">
            {providers.map((p) => (
              <div key={p.id ?? p.name} className="pchip">
                {p.name}
                <span className="pcs pcs-na">—</span>
              </div>
            ))}
            <a
              href="#"
              className="pchip"
              style={{ borderStyle: "dashed", color: "var(--signal)" }}
            >
              + Submit provider
            </a>
          </div>
        </div>
      </section>

      {/* OEM STRIP */}
      <section className="oem-strip">
        <div className="oem-in">
          <div>
            <div className="oem-ey">For OEMs &amp; Insurers</div>
            <div className="oem-h2">
              The field data your provider contracts are missing.
            </div>
            <p className="oem-lead">
              TowGrade aggregates verified operator experience into structured
              intelligence — giving procurement teams and claims directors an
              independent view of roadside network performance that provider
              self-reporting cannot match.
            </p>
            <div className="oem-pts">
              <div className="oem-pt">
                <div className="oem-chk">✓</div>
                <div className="oem-pt-txt">
                  Payment speed, damage claim handling, and operator retention
                  risk — by provider, region, and period
                </div>
              </div>
              <div className="oem-pt">
                <div className="oem-chk">✓</div>
                <div className="oem-pt-txt">
                  Quarterly trend reports and real-time alerts on significant
                  score movements
                </div>
              </div>
              <div className="oem-pt">
                <div className="oem-chk">✓</div>
                <div className="oem-pt-txt">
                  Structured for direct integration into RFP scoring and vendor
                  SLA frameworks
                </div>
              </div>
            </div>
            <a
              href="#"
              className="btn"
              style={{
                marginTop: "1.5rem",
                color: "var(--white)",
                borderColor: "rgba(255,255,255,.2)",
                background: "rgba(255,255,255,.07)",
                fontSize: 14,
                padding: "9px 20px",
                display: "inline-block",
              }}
            >
              Request data access →
            </a>
          </div>
          <div className="oem-card">
            <div className="oem-ch">Sample — Q4 2024 Provider Report</div>
            <div className="oem-m">
              <span className="oem-ml">Network avg. payment window</span>
              <span className="oem-mv clo">38.4 days</span>
            </div>
            <div className="oem-m">
              <span className="oem-ml">SLA breach rate (&gt;21 days)</span>
              <span className="oem-mv clo">64%</span>
            </div>
            <div className="oem-m">
              <span className="oem-ml">Damage claim dispute rate</span>
              <span className="oem-mv cmd">62%</span>
            </div>
            <div className="oem-m">
              <span className="oem-ml">Operator attrition risk (6mo)</span>
              <span className="oem-mv cmd">28%</span>
            </div>
            <div className="oem-m">
              <span className="oem-ml">Top performer — overall</span>
              <span className="oem-mv chi">NSD · 7.8</span>
            </div>
            <div className="oem-m">
              <span className="oem-ml">Lowest performer — overall</span>
              <span className="oem-mv clo">HONK · 4.9</span>
            </div>
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <a
                href="#"
                className="btn p"
                style={{ width: "100%", fontSize: 13, display: "block", textAlign: "center" }}
              >
                Access full reports →
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
