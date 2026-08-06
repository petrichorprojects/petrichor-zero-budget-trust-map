# Zero-Budget Trust Map

A free, browser-based Petrichor Projects tool for founders who need trust before they have an audience or ad budget.

The founder enters what they sell, who buys it, the sales motion, and the typical commitment. The map returns the five places that buyer is most likely to check before saying yes. Marking each surface as empty, thin, or strong reorders the list around the highest-leverage trust gap.

## Run locally

```bash
npm run serve
```

Open `http://localhost:4173`. Run the deterministic ranking tests with:

```bash
npm test
```

## Privacy and deployment

All ranking happens in the browser. Product, buyer, and status inputs are not submitted or stored.

The project has no runtime dependencies or build step. It can be deployed directly as a static site on Vercel, GitHub Pages, Netlify, or any static host.

Built by [Petrichor Projects](https://www.petrichorgrowth.com/).