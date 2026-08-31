# Markkinointiagentti

Next.js-lomake, joka tuottaa suomenkielisen markkinointitekstin OpenAI Responses API:lla
(malli `gpt-4.1-mini`). Uusia ajonaikaisia riippuvuuksia ei tarvita.

## Käyttöönotto

1. Asenna riippuvuudet: `pnpm install` (Node.js 22 tai uudempi).
2. Kopioi `.env.example` tiedostoksi `.env.local` ja aseta oma `OPENAI_API_KEY`.
   Älä lähetä avainta keskusteluun tai tallenna sitä versionhallintaan.
3. Käynnistä `pnpm dev`. Käynnistä palvelin uudelleen avaimen muuttamisen jälkeen.
4. Avaa http://localhost:3000, täytä lomake ja paina **Luo sisältö**.

Vercelissä lisää `OPENAI_API_KEY` projektin palvelinpuolen ympäristömuuttujiin
tarvittavissa ympäristöissä ja tee uusi deployment. Älä nimeä avainta
`NEXT_PUBLIC_OPENAI_API_KEY`:ksi. Paikallinen `.env.local` ei siirry GitHubiin
eikä Verceliin. OpenAI-API:n käytöstä veloitetaan API-tililtä.

## Turvallisuus ja toiminta

- Selain lähettää lomakkeen `/api/generate`-reitille. Vain reitti lukee avaimen.
- Lomaketiedot välitetään OpenAI:lle. Älä syötä salaisuuksia tai tarpeettomia henkilötietoja.
- Pyyntö käyttää `store: false` -asetusta; tämä ei tarkoita, ettei palveluntarjoajalla
  olisi muita lokitus- tai säilytyskäytäntöjä.
- Syötteet validoidaan palvelimella, vastauksen pituus on rajattu ja API-pyyntö
  aikakatkaistaan 25 sekunnissa. Selain ei saa upstream-virheiden sisältöjä.
- AI-teksti näytetään tavallisena tekstinä, ei HTML:nä. Tarkista väitteet ennen julkaisua.
- Sovellus ei sisällä kirjautumista eikä hajautettua nopeusrajoitusta.
  Same-origin-tarkistus ja poistettu kaksoispainallus eivät estä suoria API-kutsuja.
  Ennen julkista laajaa käyttöä suojaa sovellus pääsynhallinnalla ja lisää
  palvelinpuolen käyttörajoitukset; muuten ulkopuoliset voivat aiheuttaa API-kuluja.

## Tarkistukset

- `pnpm test`: palvelinreitin testit simuloidulla OpenAI-vastauksella, ei API-kuluja.
- `pnpm build`: tuotantokäännös.
- Oikea päästä päähän -testi vaatii voimassa olevan API-avaimen ja käyttökiintiön.

API-toteutus perustuu [OpenAI:n tekstintuotanto-ohjeeseen](https://developers.openai.com/api/docs/guides/text).
