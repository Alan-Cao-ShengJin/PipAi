import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const windows = process.platform === "win32";
const python = join(root, ".venv-tiger", windows ? "Scripts/python.exe" : "bin/python");
const [command = "status", ...args] = process.argv.slice(2);
function run(program, parameters, extra = {}) {
  const result = spawnSync(program, parameters, { cwd: root, stdio: "inherit", ...extra });
  if (result.error) {
    console.error("Could not start the local Tiger tool. Check Python and run npm run tiger:setup.");
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (command === "setup") {
  if (args.length) throw new Error("Tiger setup accepts no additional arguments.");
  if (!existsSync(python)) run(windows ? "python" : "python3", ["-m", "venv", ".venv-tiger"]);
  run(python, ["-m", "pip", "install", "--disable-pip-version-check", "-r", "integrations/tiger/requirements.txt"]);
  console.log("Tiger environment ready. No broker login or account request was made.");
} else {
  if (!["status", "login", "probe", "demo", "test"].includes(command)) throw new Error("Unknown Tiger command.");
  if (!existsSync(python)) {
    console.error("Run npm run tiger:setup first. It installs the SDK in an isolated local environment.");
    process.exit(1);
  }
  const env = { ...process.env, PYTHONPATH: join(root, "integrations/tiger"), PYTHONDONTWRITEBYTECODE: "1" };
  if (command === "test") {
    if (args.length) throw new Error("Tiger tests accept no additional arguments.");
    run(python, ["-m", "unittest", "discover", "-s", "integrations/tiger/tests", "-v"], { env });
  } else {
    run(python, ["-m", "pip_tiger", command, ...args], { env });
  }
}
