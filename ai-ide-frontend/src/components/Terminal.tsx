import React, { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { getTerminalWebSocketUrl } from "../api";

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: "#14151A",
        foreground: "#E7E8EC",
        cursor: "#D9A441",
      },
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
      cursorBlink: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    const ws = new WebSocket(getTerminalWebSocketUrl());
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      term.write("\x1b[32mConnected to terminal\x1b[0m\r\n");
    };
    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(e.data);
        term.write(text);
      } else {
        term.write(e.data);
      }
    };
    ws.onerror = () => term.write("\x1b[31mWebSocket error\x1b[0m\r\n");
    ws.onclose = () => term.write("\x1b[31mDisconnected\x1b[0m\r\n");

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    xtermRef.current = term;
    wsRef.current = ws;

    return () => {
      ws.close();
      term.dispose();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <div ref={terminalRef} style={{ width: "100%", height: "100%" }} />;
};

export default Terminal;
