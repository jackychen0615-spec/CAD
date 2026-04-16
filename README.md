# CAD — 3D Packaging & Box Design Tool

> A browser-based 3D packaging design tool for creating, visualising, and analysing custom cardboard boxes — powered by React and Google Gemini AI.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)

---

## Features

- **2D / 3D Box Viewer** — real-time three-dimensional rendering with fold animation
- **Multiple Box Types** — Mailer, RSC, and more via a `BoxType` selector
- **Material Selection** — White, Kraft, and Corrugated options
- **Geometry Engine** — calculates blank dimensions, panel layout, and fold lines automatically
- **BCT Estimation** — Box Compression Test strength approximation based on material and dimensions
- **AI Consultant** — chat interface powered by Google Gemini AI for design guidance
- **Parameter Controls** — adjust length, width, height, and wall thickness in real time

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| 3D Rendering | Three.js / WebGL via `ThreeDViewer` |
| AI | Google Gemini AI SDK |
| Styling | CSS Modules / Tailwind |

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── App.tsx               # Root component — wires all panels together
├── components/
│   ├── ThreeDViewer      # WebGL 3D box renderer
│   ├── BoxParams         # Parameter input panel
│   ├── AIConsultant      # Gemini AI chat sidebar
│   └── ...
├── engine/
│   └── GeometryEngine    # Core geometry & BCT calculation logic
└── types/
    └── BoxType           # Box type definitions & constants
```

## Environment Variables

Create a `.env` file at the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## License

MIT
