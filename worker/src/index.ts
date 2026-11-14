import { RoomDO } from './RoomDO';

export { RoomDO };

export interface Env {
  ROOM_DO: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
        },
      });
    }

    // Health check
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', time: Date.now() }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // WebSocket upgrade: /ws/:roomCode or /ws?room=ABCDE
    let roomCode = '';
    const match = url.pathname.match(/^\/ws\/([a-zA-Z0-9_-]+)/);
    if (match) {
      roomCode = match[1].toUpperCase();
    } else {
      roomCode = (url.searchParams.get('room') || '').toUpperCase();
    }

    if (roomCode) {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader === 'websocket') {
        const id = env.ROOM_DO.idFromName(roomCode);
        const obj = env.ROOM_DO.get(id);
        return obj.fetch(request);
      }

      // Also forward non-ws room info requests to DO if needed
      const id = env.ROOM_DO.idFromName(roomCode);
      const obj = env.ROOM_DO.get(id);
      return obj.fetch(request);
    }

    return new Response('Least Count Worker: connect to /ws/:roomCode', {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  },
};

