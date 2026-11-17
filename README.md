# WildSearch

A full-stack wildlife explorer application that lets users discover, search, and learn about wildlife using modern web technologies and AI.

---

## 🚀 Tech Stack

* **Frontend & UI:** [React](https://github.com/MrRaphOfficial/WildSearch/tree/main) (v19), [Vite](https://github.com/MrRaphOfficial/WildSearch/tree/main), [Tailwind CSS](https://github.com/MrRaphOfficial/WildSearch/tree/main), [Lucide React](https://github.com/MrRaphOfficial/WildSearch/tree/main), [Motion](https://github.com/MrRaphOfficial/WildSearch/tree/main)
* **Backend:** [Express](https://github.com/MrRaphOfficial/WildSearch/tree/main) with TypeScript (`server.ts` powered by [tsx](https://github.com/MrRaphOfficial/WildSearch/tree/main))
* **AI & Services:** [@google/genai](https://github.com/MrRaphOfficial/WildSearch/tree/main)
* **Build & Preview:** [esbuild](https://github.com/MrRaphOfficial/WildSearch/tree/main)

---

## 🛠️ Getting Started

### Prerequisites

Make sure you have a modern runtime environment installed (such as Node.js v18+).

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/MrRaphOfficial/WildSearch.git
cd WildSearch

```


2. **Install dependencies:**
```bash
npm install

```


3. **Environment Setup:**
Create a `.env` file in the root directory based on `.env.example` and add your required configuration (such as your Gemini API key).

---

## 📜 Available Scripts

Inside your project, you can run the following commands configured in `package.json`:

| Command | Action |
| --- | --- |
| `npm run dev` | Starts the development server with hot-reloading using `tsx server.ts` in development mode |
| `npm run start` | Runs the production backend/server directly (`node server.ts`) |
| `npm run build` | Builds the frontend application for production using Vite |
| `npm run preview` | Locally preview the production build using Vite |
| `npm run clean` | Cleans up build artifacts (`dist`, `server.js`) |
| `npm run lint` | Type-checks the codebase without emitting files using TypeScript (`tsc --noEmit`) |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check out the [issues page](https://github.com/MrRaphOfficial/WildSearch/issues) or submit a pull request on [GitHub](https://github.com/MrRaphOfficial/WildSearch).

## 👤 Author

* **Raphael E. Ovonlen** — [MrRaphOfficial](https://github.com/MrRaphOfficial)
