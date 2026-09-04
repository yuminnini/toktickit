import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RequesterSelection from "./pages/RequesterSelection";
import RequesterRouteGuard from "./components/RequesterRouteGuard";
import AppShell from "./components/AppShell";
import MyTickets from "./pages/MyTickets";
import CreateTicket from "./pages/CreateTicket";
import TicketDetail from "./pages/TicketDetail";
import CheckSystem from "./pages/CheckSystem";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/requester-selection" element={<RequesterSelection />} />
        <Route path="/check-system" element={<CheckSystem />} />

        {/* Guarded routes requiring selected Requester */}
        <Route element={<RequesterRouteGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/my-tickets" replace />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/tickets/new" element={<CreateTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Route>
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}