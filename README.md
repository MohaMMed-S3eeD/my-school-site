# My School Site - Interactive PDF Viewer & Annotator

A modern web application built with Next.js and TypeScript, allowing users to view PDF files and interact with them by adding text notes and drawings directly onto the document.

**[Live Demo](https://mr-ahmed1.vercel.app/)**

## ✨ Key Features

*   **PDF Rendering:** Smooth PDF viewing powered by `react-pdf`.
*   **Navigation:** Easy page navigation (previous/next).
*   **Zoom Control:** Precise zoom level adjustments.
*   **Text Notes:**
    *   Add text-based notes per page.
    *   Notes are automatically saved to Local Storage.
    *   Text alignment options (left, center, right).
*   **Drawing & Annotation:**
    *   Drawing mode for freehand annotations using a pen tool.
    *   Eraser tool to remove drawings.
    *   Pen color selection.
    *   Pen thickness adjustment.
    *   **Load/Save Drawings:** Drawings are saved per page to Local Storage and reloaded automatically (Feature 1 - Implemented partially/in progress).
*   **Modern UI:**
    *   Sleek interface using Tailwind CSS and Framer Motion for animations.
    *   Dark Mode support (syncs with system preference or user choice via `ThemeContext`).
    *   Clear iconography using `lucide-react`.

## 🚀 Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **PDF Rendering:** [react-pdf](https://github.com/wojtekmaj/react-pdf)
*   **State Management (Theme):** React Context API
*   **Animation:** [Framer Motion](https://www.framer.com/motion/)
*   **Icons:** [Lucide React](https://lucide.dev/)

## 🛠️ Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```
2.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The main page component is `app/page.tsx`. You can start editing it, and the page will auto-update.

## 💡 Future Enhancements & Ideas (Roadmap)

*   **Feature 1: Complete Drawing Persistence:** Finalize saving/loading all drawing states (color, width changes during a session).
*   **Feature 2: Additional Annotation Tools:**
    *   Highlighter tool.
    *   Basic shapes (lines, rectangles, circles).
    *   Text boxes directly on the canvas.
*   **Export with Annotations:** Option to export the PDF with drawings and notes merged.
*   **Text Search:** Implement in-document text search (if PDF text layer is available).
*   **Drawing Performance:** Optimize canvas drawing for complex annotations.
*   **User Authentication:** Allow users to sign in and save their work to a database.
*   **Accessibility (a11y):** Further improvements for keyboard navigation and screen readers.
*   **Testing:** Add comprehensive unit and integration tests.

## 🤝 Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## 📄 License

This project is open source, licensed under the MIT License (or specify your preferred license).

---

*This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to optimize and load the [Geist](https://vercel.com/font) font.*
*Bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).*
