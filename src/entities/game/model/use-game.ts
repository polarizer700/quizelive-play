import { useEffect, useRef, useState } from "react";

import { emptyView, socketURL, type ServerMessage, type View } from "./types";

type Command = Record<string, unknown>;

export function useGame(hello: Command | null) {
  const [view, setView] = useState<View>(emptyView);
  const socketRef = useRef<WebSocket | null>(null);
  const helloRef = useRef(hello);

  useEffect(() => {
    helloRef.current = hello;
    if (!hello) return undefined;

    let stopped = false;
    let socket: WebSocket | null = null;
    let timer = 0;

    const apply = (message: ServerMessage) => {
      setView((current) => reduce(current, message));
    };

    const open = () => {
      socket = new WebSocket(socketURL());
      socketRef.current = socket;
      socket.onopen = () => {
        setView((current) => ({ ...current, connected: true, error: "" }));
        if (helloRef.current) socket?.send(JSON.stringify(helloRef.current));
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        remember(helloRef, message);
        apply(message);
      };
      socket.onclose = () => {
        setView((current) => ({ ...current, connected: false }));
        if (!stopped) timer = window.setTimeout(open, 1000);
      };
    };

    open();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      socket?.close();
    };
  }, [hello]);

  function send(command: Command) {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(command));
    }
  }

  return { view, send };
}

function remember(helloRef: { current: Command | null }, message: ServerMessage) {
  if (message.host_resume?.token) {
    sessionStorage.setItem("quizelive.hostResume", message.host_resume.token);
    helloRef.current = { create_room: { host_token: message.host_resume.token } };
    const url = new URL(window.location.href);
    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  const token = message.player_session?.player_token;
  const join = helloRef.current?.join_room as { code?: string; nickname?: string } | undefined;
  if (token && join?.code) {
    const next = { join_room: { ...join, player_token: token } };
    helloRef.current = next;
    sessionStorage.setItem("quizelive.player", JSON.stringify(next.join_room));
  }
}

function reduce(current: View, message: ServerMessage): View {
  if (message.error) return { ...current, error: message.error.message };
  if (message.player_session) {
    return {
      ...current,
      selfId: message.player_session.player.id,
      error: "",
    };
  }

  if (message.room_state) {
    return {
      ...current,
      code: message.room_state.code,
      phase: message.room_state.phase,
      players: message.room_state.players ?? [],
      error: "",
    };
  }

  if (message.question_started) {
    const same = current.question?.question_id === message.question_started.question_id;
    return {
      ...current,
      question: message.question_started,
      reveal: null,
      accepted: same ? current.accepted : false,
      error: "",
    };
  }

  if (message.answer_accepted) return { ...current, accepted: true, error: "" };
  if (message.question_revealed) return { ...current, reveal: message.question_revealed, error: "" };

  if (message.leaderboard) {
    return { ...current, board: message.leaderboard.entries ?? [], phase: current.phase || "leaderboard" };
  }

  if (message.game_finished) {
    return { ...current, board: message.game_finished.entries ?? [], phase: "finished" };
  }

  return current;
}
