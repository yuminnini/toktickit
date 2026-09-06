import { Navigate, Outlet } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";

export default function RequesterRouteGuard() {
    const { requester } = useRequester();

    if (!requester) {
        return <Navigate to="/requester-selection" replace />;
    }

    return <Outlet />;
}
