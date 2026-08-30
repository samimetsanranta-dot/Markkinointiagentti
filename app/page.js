"use client";

import { useState } from "react";

const customers = ["IKH", "Flextra", "Jukolan Juusto"];

export default function Home() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div>
          <p className="eyebrow">Sisällöntuotannon työtila</p>
          <h1 id="page-title">Markkinointiagentti</h1>
          <p className="subtitle">AI-avusteinen markkinointityökalu</p>
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
            <input id="product" name="product" type="text" placeholder="Esim. akkukäyttöinen ruohonleikkuri" required />
          </div>

          <div className="field full-width">
            <label htmlFor="productInfo">Tuotetiedot</label>
            <textarea id="productInfo" name="productInfo" rows="4" placeholder="Kuvaile tuotteen tärkeimmät ominaisuudet, hyödyt ja erottautumistekijät" required />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="audience">Kohderyhmä</label>
              <textarea id="audience" name="audience" rows="3" placeholder="Kenelle sisältö on suunnattu?" required />
            </div>
            <div className="field">
              <label htmlFor="goal">Tavoite</label>
              <textarea id="goal" name="goal" rows="3" placeholder="Mitä sisällöllä halutaan saavuttaa?" required />
            </div>
          </div>

          <button type="submit">Luo sisältö <span aria-hidden="true">→</span></button>
        </form>

        <div className={`result ${submitted ? "result-visible" : ""}`} aria-live="polite">
          {submitted ? (
            <>
              <div className="result-icon" aria-hidden="true">✓</div>
              <div>
                <h2>Sisältöpyyntö on valmis</h2>
                <p>AI:n tuottama sisältö näytetään tässä, kun integraatio otetaan käyttöön.</p>
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
