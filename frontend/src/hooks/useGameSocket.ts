import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClientMessage,
  GameSettings,
  PersonalizedGameState,
  ServerMessage,
} from 'shared';
import {
  clearStoredSession,
  getStoredPlayerName,
  getStoredSession,
  saveStoredPlayerName,
  saveStoredSession,
} from '../utils/session';

export interface ToastMessage {
  id: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export function useGameSocket(roomCode: string | null) {
  const [gameState, setGameState] = useState<PersonalizedGameState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const seqRef = useRef<number>(1);
  const mountedRef = useRef<boolean>(true);

  const addToast = useCallback(
    (message: string, variant: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, timestamp: Date.now() }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const getWebSocketUrl = useCallback((code: string) => {
    const rawEnv = import.meta.env.VITE_WS_URL as string | undefined;
    if (rawEnv && rawEnv.trim()) {
      let base = rawEnv.trim();
      if (base.startsWith('http://')) {
        base = 'ws://' + base.slice(7);
      } else if (base.startsWith('https://')) {
        base = 'wss://' + base.slice(8);
      }
      base = base.replace(/\/+$/, '');
      return `${base}/ws/${code.toUpperCase()}`;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If local dev on port 5173 without proxy, default worker is at 8787
    if (window.location.port === '5173') {
      return `${protocol}//${window.location.hostname}:8787/ws/${code.toUpperCase()}`;
    }
    return `${protocol}//${window.location.host}/ws/${code.toUpperCase()}`;
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!roomCode) return;
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    const wsUrl = getWebSocketUrl(roomCode);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      setIsConnecting(false);

      // Start ping heartbeat
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);

      // Check if we have an existing session token to automatically rejoin seat
      const session = getStoredSession(roomCode);
      const storedName = getStoredPlayerName() || 'Player';
      if (session && session.sessionToken) {
        ws.send(
          JSON.stringify({
            type: 'join',
            roomCode: roomCode.toUpperCase(),
            playerName: storedName,
            sessionToken: session.sessionToken,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === 'sync') {
          setGameState(msg.state);
        } else if (msg.type === 'joined') {
          setMyPlayerId(msg.playerId);
          saveStoredSession({
            playerId: msg.playerId,
            sessionToken: msg.sessionToken,
            roomCode: msg.roomCode,
          });
        } else if (msg.type === 'error') {
          setErrorMessage(msg.message);
          addToast(msg.message, 'error');
        } else if (msg.type === 'toast') {
          addToast(msg.message, msg.variant || 'info');
        }
      } catch {}
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      setIsConnecting(false);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

      // Attempt reconnection after 2.5s
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current && roomCode) {
          connect();
        }
      }, 2500);
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [roomCode, getWebSocketUrl, addToast]);

  useEffect(() => {
    mountedRef.current = true;
    if (roomCode) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [roomCode, connect]);

  // Client intent actions
  const join = useCallback(
    (playerName: string, asSpectator = false) => {
      saveStoredPlayerName(playerName);
      const session = roomCode ? getStoredSession(roomCode) : null;
      send({
        type: 'join',
        roomCode: (roomCode || '').toUpperCase(),
        playerName,
        sessionToken: session?.sessionToken,
        asSpectator,
      });
    },
    [roomCode, send]
  );

  const updateSettings = useCallback(
    (settings: Partial<GameSettings>) => {
      send({ type: 'update_settings', settings });
    },
    [send]
  );

  const startGame = useCallback(() => {
    send({ type: 'start_game' });
  }, [send]);

  const nextRound = useCallback(() => {
    send({ type: 'next_round' });
  }, [send]);

  const restartGame = useCallback(() => {
    send({ type: 'restart_game' });
  }, [send]);

  const kickPlayer = useCallback(
    (playerId: string) => {
      send({ type: 'kick_player', playerId });
    },
    [send]
  );

  const discardCards = useCallback(
    (cardIds: string[]) => {
      const seq = seqRef.current++;
      send({ type: 'discard', cardIds, seq });
    },
    [send]
  );

  const drawCard = useCallback(
    (source: 'stock' | 'discard', discardCardId?: string) => {
      const seq = seqRef.current++;
      send({ type: 'draw', source, discardCardId, seq });
    },
    [send]
  );

  const callShow = useCallback(() => {
    const seq = seqRef.current++;
    send({ type: 'show', seq });
  }, [send]);

  const quickMatchDiscard = useCallback(
    (cardIds: string[]) => {
      const seq = seqRef.current++;
      send({ type: 'quick_match_discard', cardIds, seq });
    },
    [send]
  );

  const claimHost = useCallback(() => {
    send({ type: 'claim_host' });
  }, [send]);

  return {
    gameState,
    isConnected,
    isConnecting,
    errorMessage,
    toasts,
    myPlayerId,
    join,
    updateSettings,
    claimHost,
    startGame,
    nextRound,
    restartGame,
    kickPlayer,
    discardCards,
    drawCard,
    callShow,
    quickMatchDiscard,
    reconnect: connect,
  };
}

