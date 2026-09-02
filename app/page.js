"use client";

import { useRef, useState } from "react";

const customers = ["IKH", "Flextra", "Jukolan Juusto"];

export default function Home() {
  const [content, setContent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending.current) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    pending.current = true;
    setLoading(true);
    setError("");
    setContent(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
        signal: AbortSignal.timeout(35000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "Sisällön luominen epäonnistui. Yritä uudelleen.");
      } else if (!result?.content
        || ["marketingAngle", "videoHook", "socialPost"]
          .some((key) => typeof result.content[key] !== "string" || !result.content[key].trim())) {
        setError("AI ei palauttanut kaikkia sisältöosioita. Yritä uudelleen.");
      } else {
        setContent(result.content);
      }
    } catch (error) {
      setError(error.name === "TimeoutError"
        ? "Sisällön luominen kesti liian kauan. Yritä uudelleen."
        : "Yhteys palvelimeen epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div>
          <p className="eyebrow">Sisällöntuotannon työtila</p>
          <h1 id="page-title">Markkinointiagentti</h1>
          <p className="subtitle">AI-avusteinen markkinointityökalu yrityksille</p>
          <p className="intro">
            Määrittele sisältötarve ja valmistele lähtötiedot markkinointisisältöä varten.
          </p>
        </div>
      </section>

      <section className="card" aria-label="Sisältöpyyntö">
        <form onSubmit={handleSubmit}>
          <div className="field full-width">
            <label htmlFor="customer">Asiakas</label>
            <div className="select-wrap">
              <select id="customer" name="customer" defaultValue="" required>
                <option value="" disabled>Valitse asiakas</option>
                {customers.map((customer) => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field full-width">
            <label htmlFor="product">Tuote</label>
            <input id="product" name="product" type="text" maxLength={200} placeholder="Esim. akkukäyttöinen ruohonleikkuri" required />
          </div>

          <div className="field full-width">
            <label htmlFor="productInfo">Tuotetiedot</label>
            <textarea id="productInfo" name="productInfo" rows="4" maxLength={4000} placeholder="Kuvaile tuotteen tärkeimmät ominaisuudet, hyödyt ja erottautumistekijät" required />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="audience">Kohderyhmä</label>
              <textarea id="audience" name="audience" rows="3" maxLength={1000} placeholder="Kenelle sisältö on suunnattu?" required />
            </div>
            <div className="field">
              <label htmlFor="goal">Tavoite</label>
              <textarea id="goal" name="goal" rows="3" maxLength={1000} placeholder="Mitä sisällöllä halutaan saavuttaa?" required />
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Luodaan sisältöä…" : "Luo sisältö"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <div className={`result ${content ? "result-visible" : ""} ${error ? "result-error" : ""}`} aria-live="polite" aria-atomic="true" aria-busy={loading}>
          {loading ? (
            <p>Kirjoitetaan markkinointitekstiä. Odota hetki…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : content ? (
            <>
              <div className="result-icon" aria-hidden="true">✓</div>
              <div>
                <h2>Markkinointisisältö on valmis</h2>
                <div className="generated-sections">
                  <section className="generated-section">
                    <h3>Markkinointikulma</h3>
                    <p>{content.marketingAngle}</p>
                  </section>
                  <section className="generated-section">
                    <h3>Videokoukku</h3>
                    <p>{content.videoHook}</p>
                  </section>
                  <section className="generated-section">
                    <h3>Somejulkaisu</h3>
                    <p>{content.socialPost}</p>
                  </section>
                </div>
              </div>
            </>
          ) : (
            <p>Luotu sisältö ilmestyy tähän.</p>
          )}
        </div>
      </section>
    </main>
  );
}
