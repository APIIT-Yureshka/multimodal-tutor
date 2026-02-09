import { useRef, useState } from "react";
import { io } from "socket.io-client";

export default function App() {
  const [code, setCode] = useState(null);
  const [telemetry, setTelemetry] = useState(null);

  const socketRef = useRef(null);

  const createSession = async () => {
    // Your backend route is POST /api/session/create (see main.py)
    const res = await fetch("/session/create", { method: "POST" });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Create session failed:", res.status, txt);
      return;
    }

    const data = await res.json();
    setCode(data.code);

    // IMPORTANT: Force socket.io path to go through nginx /api/socket.io
    socketRef.current = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"], // allow fallback
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join_session", {
        code: data.code,
        role: "tutor",
      });
    });

    socketRef.current.on("telemetry", (payload) => {
      setTelemetry(payload);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
    });
  };

  const colorStyle = (c) => ({
    padding: "10px",
    margin: "5px 0",
    color: "white",
    backgroundColor:
      c === "GREEN"
        ? "green"
        : c === "YELLOW"
        ? "orange"
        : c === "GRAY"
        ? "gray"
        : "red",
  });

  return (
    <div style={{ padding: 20 }}>
      <h2>Tutor Page</h2>

      {!code && <button onClick={createSession}>Create Session</button>}

      {code && <h3>Session Code: {code}</h3>}

      {telemetry && (
        <>
          <div style={colorStyle(telemetry?.fer?.color)}>
            FER: {telemetry?.fer?.color} ({telemetry?.fer?.label || "NO FACE"})
          </div>

          <div style={colorStyle(telemetry?.pose?.color)}>
            Upper Body: {telemetry?.pose?.color}
          </div>

          <div>
            Mouse:{" "}
            {telemetry?.mouse?.active
              ? "ACTIVE"
              : `IDLE (${telemetry?.mouse?.idleMs} ms)`}
          </div>
        </>
      )}
    </div>
  );
}
