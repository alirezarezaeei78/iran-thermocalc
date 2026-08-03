# Iran ThermoCalc

Iran ThermoCalc is a local-first materials screening application with:

- interactive binary educational phase models;
- a deterministic 2–6 component local screening engine;
- estimated phase-weight, mixing-energy, solid-solution, intermetallic, TCP and SFE indices;
- 118 local element records and 24 alloy presets;
- local CSV and JSON exports with scientific-scope warnings;
- no API key, account, usage token or remote calculation service.

The bundled multicomponent engine is an engineering-screening model. It is not a replacement for an assessed CALPHAD database and must not be used as certified equilibrium data.

## Requirements

- Node.js 22.13 or newer

## Run locally

```bash
cd "/Users/alireza/Desktop/thermo calc"
npm install
npm run dev
```

Open `http://localhost:3000`.

The terminal also prints the current same-Wi-Fi address. That address can change when the Mac changes networks.

If port 3000 is already occupied:

```bash
PORT=3001 npm run dev
```

Then open `http://localhost:3001`.

## Development and verification

```bash
npm run dev:hot
npm run lint
npm test
```

- `npm run dev` serves the last validated production build.
- `npm run dev:hot` enables source hot reload.
- `npm test` builds the app and runs rendered-shell plus local-engine invariant tests.

## Scientific scope

The local multicomponent engine uses composition normalization, atomic-mass conversion, local melting-point records, ideal configurational entropy, a small transparent pair-interaction table, crystal-structure tendencies and refractory/ordered-former screening rules. It performs zero remote requests.

For production-grade equilibrium, diffusion, precipitation or certified phase-boundary work, connect or implement validated thermodynamic and kinetic datasets under the appropriate licenses and validate against reference cases.
