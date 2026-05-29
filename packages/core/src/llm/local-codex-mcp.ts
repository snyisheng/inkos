import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolve } from "node:path";
import type { LLMMessage } from "./provider.js";

export const LOCAL_CODEX_MCP_SERVICE_ID = "localCodexMcp";
export const LOCAL_CODEX_MCP_MODEL_ID = "local-codex";

const MCP_PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_COMPLETION_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_AVAILABILITY_TIMEOUT_MS = 10 * 1000;

interface JsonRpcMessage {
  readonly jsonrpc?: string;
  readonly id?: number | string | null;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: unknown;
}

interface LocalCodexMcpDeps {
  readonly spawnImpl?: typeof spawn;
  readonly cwd?: string;
  readonly completionTimeoutMs?: number;
  readonly availabilityTimeoutMs?: number;
}

interface LocalCodexCompletionArgs {
  readonly messages: ReadonlyArray<LLMMessage>;
  readonly promptOverride?: string;
  readonly model?: string;
  readonly cwd?: string;
  readonly timeoutMs?: number;
  readonly deps?: LocalCodexMcpDeps;
}

export interface LocalCodexAvailability {
  readonly ok: boolean;
  readonly error?: string;
}

export function isLocalCodexMcpService(service: string | undefined): boolean {
  return service === LOCAL_CODEX_MCP_SERVICE_ID;
}

export function isLocalCodexMcpModel(model: { readonly id?: unknown; readonly baseUrl?: unknown } | undefined): boolean {
  return Boolean(
    model
      && model.id === LOCAL_CODEX_MCP_MODEL_ID
      && typeof model.baseUrl === "string"
      && model.baseUrl.includes("/codex-mcp"),
  );
}

export function buildLocalCodexPrompt(messages: ReadonlyArray<LLMMessage>): string {
  const renderedMessages = messages
    .map((message) => `### ${message.role}\n${message.content.trim()}`.trim())
    .join("\n\n");

  return [
    "你是 InkOS 通过本地 Codex MCP 调用的文本生成后端。",
    "只根据下面对话输出最终回答正文；不要修改文件，不要启动长期服务，不要要求用户再配置 API Token。",
    "如果需要给出方案，请直接给可执行、可保存到 InkOS 的内容。",
    "",
    "<conversation>",
    renderedMessages,
    "</conversation>",
  ].join("\n");
}

export function extractCodexMcpToolContent(result: unknown): { readonly threadId?: string; readonly content: string } {
  const record = asRecord(result);
  const structured = asRecord(record?.structuredContent) ?? asRecord(record?.structured_content);
  const contentFromStructured = typeof structured?.content === "string" ? structured.content : undefined;
  const threadId = typeof structured?.threadId === "string" ? structured.threadId : undefined;
  if (contentFromStructured !== undefined) {
    return { ...(threadId ? { threadId } : {}), content: contentFromStructured };
  }

  const rawContent = record?.content;
  if (typeof rawContent === "string") return { content: rawContent };
  if (Array.isArray(rawContent)) {
    const content = rawContent
      .map((part) => {
        const partRecord = asRecord(part);
        return typeof partRecord?.text === "string" ? partRecord.text : "";
      })
      .join("");
    if (content) return { ...(threadId ? { threadId } : {}), content };
  }

  return { ...(threadId ? { threadId } : {}), content: "" };
}

export async function checkLocalCodexMcpAvailability(deps?: LocalCodexMcpDeps): Promise<LocalCodexAvailability> {
  let session: McpLineSession | undefined;
  try {
    session = new McpLineSession(deps);
    await session.initialize();
    const tools = await session.listTools();
    const hasCodexTool = tools.some((tool) => tool.name === "codex");
    if (!hasCodexTool) {
      return { ok: false, error: "本地 codex mcp-server 未暴露 codex 工具。" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: formatLocalCodexMcpError(error) };
  } finally {
    session?.close();
  }
}

export async function runLocalCodexMcpCompletion(args: LocalCodexCompletionArgs): Promise<{ readonly content: string; readonly threadId?: string }> {
  const timeoutMs = args.timeoutMs ?? args.deps?.completionTimeoutMs ?? readTimeoutEnv() ?? DEFAULT_COMPLETION_TIMEOUT_MS;
  const session = new McpLineSession({ ...args.deps, completionTimeoutMs: timeoutMs, cwd: args.cwd ?? args.deps?.cwd });
  try {
    await session.initialize();
    const result = await session.callTool(
      "codex",
      {
        prompt: args.promptOverride ?? buildLocalCodexPrompt(args.messages),
        cwd: resolveCodexCwd(args.cwd ?? args.deps?.cwd),
        "approval-policy": "never",
        sandbox: "read-only",
        ...(args.model && args.model !== LOCAL_CODEX_MCP_MODEL_ID ? { model: args.model } : {}),
      },
      timeoutMs,
    );
    const extracted = extractCodexMcpToolContent(result);
    const content = extracted.content.trim();
    if (!content) throw new Error("本地 Codex MCP 返回了空内容。");
    return { content, ...(extracted.threadId ? { threadId: extracted.threadId } : {}) };
  } finally {
    session.close();
  }
}

function resolveCodexCwd(cwd?: string): string {
  const configured = cwd?.trim() || process.env.INKOS_PROJECT_ROOT?.trim() || process.cwd();
  return resolve(process.cwd(), configured);
}

function readTimeoutEnv(): number | undefined {
  const raw = process.env.INKOS_LOCAL_CODEX_MCP_TIMEOUT_MS?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function formatLocalCodexMcpError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ENOENT")) {
    return "未找到 codex 命令。请先安装并登录 Codex CLI，然后确认终端里可以执行 `codex mcp-server`。";
  }
  return `本地 Codex MCP 不可用：${message}`;
}

interface ToolInfo {
  readonly name: string;
}

class McpLineSession {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, {
    readonly resolve: (value: unknown) => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
  }>();
  private nextId = 1;
  private stdoutBuffer = "";
  private stderrText = "";

  constructor(private readonly deps?: LocalCodexMcpDeps) {
    const spawnImpl = deps?.spawnImpl ?? spawn;
    this.child = spawnImpl("codex", ["mcp-server"], {
      cwd: resolveCodexCwd(deps?.cwd),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => this.handleStdout(chunk));
    this.child.stderr.on("data", (chunk: string) => {
      this.stderrText = `${this.stderrText}${chunk}`.slice(-4000);
    });
    this.child.on("error", (error) => this.rejectAll(error instanceof Error ? error : new Error(String(error))));
    this.child.on("exit", (code, signal) => {
      if (this.pending.size > 0) {
        this.rejectAll(new Error(`codex mcp-server 已退出（code=${code ?? "null"}, signal=${signal ?? "null"}）。${this.stderrText}`.trim()));
      }
    });
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "inkos", version: "1.0.0" },
    }, this.deps?.availabilityTimeoutMs ?? DEFAULT_AVAILABILITY_TIMEOUT_MS);
    this.notify("notifications/initialized", {});
  }

  async listTools(): Promise<ToolInfo[]> {
    const result = asRecord(await this.request("tools/list", {}, this.deps?.availabilityTimeoutMs ?? DEFAULT_AVAILABILITY_TIMEOUT_MS));
    const tools = Array.isArray(result?.tools) ? result.tools : [];
    return tools
      .map((tool) => asRecord(tool))
      .filter((tool): tool is Record<string, unknown> => Boolean(tool))
      .map((tool) => ({ name: typeof tool.name === "string" ? tool.name : "" }))
      .filter((tool) => tool.name.length > 0);
  }

  async callTool(name: string, arguments_: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    return await this.request("tools/call", { name, arguments: arguments_ }, timeoutMs);
  }

  close(): void {
    for (const entry of this.pending.values()) clearTimeout(entry.timer);
    this.pending.clear();
    if (!this.child.killed) this.child.kill("SIGTERM");
  }

  private request(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    const id = this.nextId++;
    const payload: JsonRpcMessage = { jsonrpc: "2.0", id, method, params };
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} 超时（${timeoutMs}ms）。${this.stderrText}`.trim()));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (error) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
  }

  private notify(method: string, params: unknown): void {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  private handleStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    while (true) {
      const newline = this.stdoutBuffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.stdoutBuffer.slice(0, newline).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      let message: JsonRpcMessage;
      try {
        message = JSON.parse(line) as JsonRpcMessage;
      } catch {
        this.stderrText = `${this.stderrText}\n${line}`.slice(-4000);
        continue;
      }
      this.handleMessage(message);
    }
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (typeof message.id !== "number") return;
    const entry = this.pending.get(message.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(formatJsonRpcError(message.error)));
      return;
    }
    entry.resolve(message.result);
  }

  private rejectAll(error: Error): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      this.pending.delete(id);
      entry.reject(error);
    }
  }
}

function formatJsonRpcError(error: unknown): string {
  const record = asRecord(error);
  if (typeof record?.message === "string") return record.message;
  return JSON.stringify(error);
}
