import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Generator from "./pages/Generator";
import History from "./pages/History";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout/>}>
        <Route path="/" element={<Generator/>}/>
        <Route path="/history" element={<History/>}/>
        <Route path="/settings" element={<Settings/>}/>
      </Route>
    </Routes>
  );
}
