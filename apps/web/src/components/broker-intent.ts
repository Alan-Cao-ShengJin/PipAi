import type { ConnectionView } from "../server/broker-connections";

export type BrokerCommand = { action: "show" | "connect" | "disconnect" | "cancel" }
  | { action: "select-account"; accountId: string };
type Intent = { kind: "command"; command: BrokerCommand } | { kind: "help"; message: string };

// A small, deterministic shortcut router for this scripted prototype. It makes
// no model calls and never turns arbitrary conversation into broker authority.
export function brokerIntent(value: string, state: ConnectionView | null, engaged: boolean): Intent | null {
  const text = value.trim().toLowerCase().replace(/[.!?]+$/, "").replace(/^(?:can|could|would) you /, "")
    .replace(/^please /, "").replace(/ please$/, "");
  const command = (action: "show" | "connect" | "disconnect" | "cancel"): Intent => ({ kind: "command", command: { action } });
  if (/^(?:connect|link|reconnect)(?: (?:my|the))? tiger(?: ?brokers?)?(?: (?:brokerage )?account)?$/.test(text)) return command("connect");
  if (/^(?:disconnect|unlink)(?: (?:my|the))? tiger(?: ?brokers?)?(?: account)?$/.test(text)) return command("disconnect");
  if (/^(?:disconnect|unlink)(?: my)? broker(?:age)?(?: account| connection)?$/.test(text)) return command("disconnect");
  if (/^(?:(?:connect|link|show|manage|check)(?: (?:my|the))? )?broker(?:age)?(?: accounts?| connection)?s?$/.test(text)
    || /^(?:show|manage|check)(?: my)? tiger(?: account| connection)?$/.test(text)) return command("show");
  if (engaged && /^(?:tiger|tiger brokers)$/.test(text) && state?.phase === "disconnected") return command("connect");
  if (engaged && state?.phase !== "connected" && /^(?:cancel|stop|later|not now|skip|back|continue conversation|cancel (?:the )?(?:tiger )?connection)$/.test(text)) return command("cancel");
  if (state?.phase === "choosing-account") {
    const match = text.match(/^(?:(?:use|choose|select) )?(?:the )?(?:account )?(?:ending )?([a-z0-9]{4})$/);
    if (match) {
      const choices = state.accounts.filter(account => account.label.slice(-4).toLowerCase() === match[1]);
      if (choices.length === 1) return { kind: "command", command: { action: "select-account", accountId: choices[0].id } };
      return { kind: "help", message: choices.length ? "Those accounts share the same ending. Choose the intended account using its button."
        : "That ending isn’t in your authorized accounts. Choose an account below or type its last four characters." };
    }
    return { kind: "help", message: "Choose one of your authorized Tiger accounts below, type its last four characters, or type cancel." };
  }
  if (state?.phase === "starting" || state?.phase === "authorizing") return { kind: "help", message: "Finish signing in on Tiger’s site using Continue to Tiger, or type cancel. Keep passwords and verification codes on Tiger’s site." };
  if (/^(?:connect|link|reconnect)(?: my)? (?:robinhood|ibkr|interactive brokers|moomoo|schwab|fidelity)(?: account)?$/.test(text)) {
    return { kind: "help", message: "This preview supports Tiger Brokers. Other brokers still need an integration; type connect broker to see the available option." };
  }
  return null;
}
