import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "./AppShell.tsx";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={null} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
