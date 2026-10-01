// supabase-js (realtime) cere WebSocket nativ la createClient(); Node 20 nu îl are.
// Testele nu deschid conexiuni reale, deci un stub e suficient.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class WebSocketStub {
    constructor() {
      this.readyState = 3;
    }
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}
