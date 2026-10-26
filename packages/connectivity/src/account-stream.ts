import { z } from "zod";
import { Address, ConnectivityError } from "./contracts.ts";

// A fresh, bounded snapshot avoids one HTTP read per HIP-3 DEX (hundreds on testnet).
// No cached state is substituted if the socket disconnects or either feed is absent.
export function readAccountStreams(user: `0x${string}`, socketFactory = () => new WebSocket("wss://api.hyperliquid-testnet.xyz/ws")): Promise<{ allDexs: unknown; twaps: unknown }> {
  return new Promise((resolve, reject) => {
    const socket = socketFactory(); let done = false; let allDexs: unknown; let twaps: unknown;
    const finish = (error?: Error) => {
      if (done) return; done = true; clearTimeout(timer);
      socket.close();
      if (error) reject(error); else resolve({ allDexs, twaps });
    };
    const timer = setTimeout(() => finish(new ConnectivityError("ACCOUNT_STREAM_TIMEOUT", "Fresh account streams were not available.")), 8000);
    socket.addEventListener("open", () => {
      for (const type of ["allDexsClearinghouseState", "twapStates"]) socket.send(JSON.stringify({ method: "subscribe", subscription: { type, user } }));
    });
    socket.addEventListener("error", () => finish(new ConnectivityError("ACCOUNT_STREAM_FAILED", "Account stream disconnected.")));
    socket.addEventListener("close", () => { if (!done) finish(new ConnectivityError("ACCOUNT_STREAM_FAILED", "Account stream closed before a complete snapshot.")); });
    socket.addEventListener("message", event => {
      try {
        if (typeof event.data !== "string" || Buffer.byteLength(event.data) > 2_000_000) throw new Error("Invalid stream frame");
        const frame = z.object({ channel: z.string(), data: z.unknown() }).parse(JSON.parse(event.data));
        if (frame.channel === "allDexsClearinghouseState" || frame.channel === "twapStates") {
          if (z.object({ user: Address }).parse(frame.data).user !== user) throw new Error("Wrong stream account");
          if (frame.channel === "allDexsClearinghouseState") allDexs = frame.data;
          else twaps = frame.data;
          if (allDexs !== undefined && twaps !== undefined) finish();
        } else if (frame.channel === "error") throw new Error("Stream rejected subscription");
      } catch { finish(new ConnectivityError("INVALID_ACCOUNT_STREAM", "Account stream was invalid or belonged to another account.")); }
    });
  });
}
