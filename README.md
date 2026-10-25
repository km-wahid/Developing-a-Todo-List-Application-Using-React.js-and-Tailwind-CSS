# ✅ Todo List Application

A modern, responsive **Todo List** application built with **React.js**, **Vite**, and **Tailwind CSS**. Designed to demonstrate core React concepts including component architecture, state management with hooks, and dynamic list rendering.

---

## 📸 Features

- ➕ **Add Tasks** — Create new tasks with a clean input form and instant validation.
- 📋 **Dynamic Task List** — All tasks rendered dynamically using React's `map()` method.
- ✔️ **Mark Complete / Incomplete** — Toggle task status with a single click; completed tasks show a visual strikethrough.
- 🗑️ **Delete Tasks** — Remove any task from the list instantly.
- 🔢 **Remaining Task Counter** — Real-time display of how many tasks are still active.
- 🔍 **Filter Tabs** — Switch between **All**, **Active**, and **Completed** views.
- 🧹 **Clear Completed** — Bulk-remove all finished tasks in one click.
- 📱 **Fully Responsive** — Works seamlessly across desktop, tablet, and mobile screens.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| [React 19](https://react.dev/) | UI library with functional components and hooks |
| [Vite 7](https://vite.dev/) | Fast development server and optimized production builds |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first CSS framework for styling |
| [TypeScript](https://www.typescriptlang.org/) | Static type checking for reliability |
| [Lucide React](https://lucide.dev/) | Beautiful, consistent icon set |
| [Playwright](https://playwright.dev/) | End-to-end browser testing |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 22.12.0
- **npm** (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd blog

# 2. Install dependencies
npm install

# 3. Start the development server
npx vite
```

Open **http://localhost:5173** in your browser.

### Production Build

```bash
# Build optimized static assets
npx vite build

# Preview the production build locally
npx vite preview
```

---

## 📁 Project Structure

```
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration with React & Tailwind plugins
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── src/
│   ├── main.tsx            # Application entry — renders <App /> into the DOM
│   ├── App.tsx             # Main Todo List component (all logic & UI)
│   └── styles.css          # Global styles with Tailwind CSS import
└── tests/
    └── browser/
        ├── fixture.ts      # Playwright test fixture
        └── todo.spec.ts    # End-to-end browser tests for the Todo List
```

---

## 🧪 Testing

The project includes automated end-to-end browser tests using Playwright.

```bash
# Run browser tests against the built application
BROWSER_EXECUTABLE=/usr/bin/google-chrome BROWSER_ARTIFACTS=true \
  npx playwright test tests/browser/todo.spec.ts
```

### What the tests cover:

- ✅ Application loads with correct heading and UI elements
- ✅ Remaining task counter displays the correct count
- ✅ Adding a new task updates the list and counter
- ✅ Toggling a task between complete and incomplete
- ✅ Deleting a task removes it from the list
- ✅ Filter tabs (All / Active / Completed) display the correct tasks

---

## 📝 Core React Concepts Demonstrated

| Concept | Implementation |
| :--- | :--- |
| **`useState` Hook** | Manages `tasks`, `newTaskTitle`, and `filter` state |
| **Event Handling** | Form submission (`onSubmit`), button clicks (`onClick`), input changes (`onChange`) |
| **List Rendering with `map()`** | Dynamically renders filtered tasks with unique `key` props |
| **Conditional Rendering** | Empty states, filter-dependent views, and completed styling |
| **Immutable State Updates** | Uses `filter()`, `map()`, and spread operators to update state without mutation |
| **TypeScript Interfaces** | `Task` interface ensures type safety across the component |

---

## 📄 License

This project is open source and available for educational purposes.
