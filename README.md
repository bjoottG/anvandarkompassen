# Användarkompassen

Interaktiv dashboard för ärendeanalys utifrån tre perspektiv – **Användare (personal)**, **Beslutande org (aktör)** och **Stöd** – med korsfiltrering och nedbrytning mellan perspektiven.

Byggd med Vite + React + TypeScript + Tailwind CSS. Excel läses i webbläsaren med SheetJS.

## Data

Lägg Excel-filen i `data/` (helst `data/Bok1_ifylld_1000_rader.xlsx`). Vid `npm run dev`/`npm run build` kopieras den till `public/default-data.xlsx` och läses in automatiskt när appen startar. Saknas fil visas en uppladdningsyta. Man kan alltid ladda upp en annan `.xlsx` via knappen **Ladda upp Excel** (data stannar i webbläsaren).

Förväntat format: rubriker på rad 2 med kolumnerna
`nr, ärendeid, beslutande org, ansvarig handläggare, ekonom, hanteras av, beslutsfattare, nettobelviljat belopp, stöd`.

## Nyckeltal

- **Antal ärenden** – antal rader i urvalet.
- **Unika användare** – `|handläggare ∪ ekonomer ∪ beslutsfattare|` på urvalets rader (tomma beslutsfattare ignoreras). Väljs roller i filtret räknas bara de rollerna.
- **Nettobeviljat belopp** – summa, formaterad med `Intl.NumberFormat('sv-SE')`.

I perspektivet *Användare* visar kolumnen "Unika användare i ärendena" antalet unika personer i personens ärenden (inkl. personen själv); tooltip visar fördelning per roll och antal kollegor.

## Interaktion

- Global filterrad: beslutande org (sök + snabbval), stöd, användare, roll och "endast ärenden utan beslutsfattare". Aktiva filter visas som brickor med "Rensa alla filter". Filtren ligger kvar vid flikbyte.
- Klicka på en rad → korsanalyspanel med de två andra perspektiven för raden. **Använd som filter** gör raden till globalt filter.
- Perspektiv 2 kan gruppera alla regioner till "Regioner (totalt)" som kan fällas ut.
- Ärendelistan längst ner visar rådata för urvalet och kan exporteras till `.xlsx`.

## Utveckling

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bygger till dist/
```

Logiken för filtrering och aggregering finns i `src/lib/aggregate.ts` (`filterCases`, `calculateKPIs`, `groupByUser`, `groupByOrg`, `groupBySupport`).
