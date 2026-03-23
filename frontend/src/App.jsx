import { useEffect, useState } from "react";
import api from "./api/client";

export default function App() {
  const [health, setHealth] = useState("Checking services...");

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setHealth(res.data?.message || "Gateway reachable"))
      .catch(() => setHealth("Gateway not reachable"));
  }, []);

  return (
    <main className="container">
      <h1>MediFlow</h1>
      <p>AI-Enabled Smart Healthcare Appointment & Telemedicine Platform</p>
      <p className="status">{health}</p>
    </main>
  );
}
