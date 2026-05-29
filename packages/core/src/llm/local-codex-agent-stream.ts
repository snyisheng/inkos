import {
  createAssistantMessageEventStream,
  type AssistantMessage,
  type Context,
  type StreamFunction,
  type Tool,
  type ToolCall,
} from "@mariozechner/pi-ai";
import { runLocalCodexMcpCompletion } from "./local-codex-mcp.js";

const LOCAL_CODEX_TOOL_PROTOCOL_VERSION = 1;
const MAX_TOOL_RESULT_CHARS = 6_000;
const MAX_MESSAGE_TEXT_CHARS = 8_000;

interface ParsedToolProtocolFinal {
  readonly kind: "final";
  readonly content: string;
}

interface ParsedToolProtocolCalls {
  readonly kind: "tool_calls";
  readonly calls: ToolProtocolCall[];
  readonly content?: string;
}

export interface ToolProtocolCall {
  readonly id?: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export type ParsedLocalCodexToolProtocol = ParsedToolProtocolFinal | ParsedToolProtocolCalls;

export const streamLocalCodexMcpWithTools: StreamFunction = (model, context, options) => {
  const stream = createAssistantMessageEventStream();

  void (async () => {
    const startedAt = Date.now();
    const assistant: AssistantMessage = {
      role: "assistant",
      content: [],
      api: model.api,
      provider: model.provider,
      model: model.id,
      usage: emptyUsage(),
      stopReason: "stop",
      timestamp: startedAt,
    };

    try {
      if (options?.signal?.aborted) throw new Error("Request was aborted");
      stream.push({ type: "start", partial: assistant });

      const prompt = buildLocalCodexToolProtocolPrompt(context);
      const result = await runLocalCodexMcpCompletion({
        messages: [],
        promptOverride: prompt,
        model: model.id,
        timeoutMs: readAgentTimeoutMs(),
      });
      if (options?.signal?.aborted) throw new Error("Request was aborted");

      const parsed = parseLocalCodexToolProtocolResponse(result.content);
      if (parsed.kind === "tool_calls" && parsed.calls.length > 0) {
        if (parsed.content?.trim()) {
          pushTextBlock(stream, assistant, parsed.content.trim());
        }
        parsed.calls.forEach((call, index) => {
          const toolCall: ToolCall = {
            type: "toolCall",
            id: call.id?.trim() || `local_codex_tool_${Date.now().toString(36)}_${index}`,
            name: call.name,
            arguments: call.arguments,
          };
          assistant.content.push(toolCall);
          const contentIndex = assistant.content.length - 1;
          stream.push({ type: "toolcall_start", contentIndex, partial: { ...assistant, content: [...assistant.content] } });
          stream.push({
            type: "toolcall_delta",
            contentIndex,
            delta: JSON.stringify(toolCall.arguments),
            partial: { ...assistant, content: [...assistant.content] },
          });
          stream.push({
            type: "toolcall_end",
            contentIndex,
            toolCall,
            partial: { ...assistant, content: [...assistant.content] },
          });
        });
        assistant.stopReason = "toolUse";
        stream.push({ type: "done", reason: "toolUse", message: assistant });
        stream.end(assistant);
        return;
      }

      const content = (("content" in parsed && parsed.content) ? parsed.content : result.content).trim();
      pushTextBlock(stream, assistant, content);
      assistant.stopReason = "stop";
      stream.push({ type: "done", reason: "stop", message: assistant });
      stream.end(assistant);
    } catch (error) {
      const reason = options?.signal?.aborted ? "aborted" as const : "error" as const;
      assistant.stopReason = reason;
      assistant.errorMessage = error instanceof Error ? error.message : String(error);
      stream.push({ type: "error", reason, error: assistant });
      stream.end(assistant);
    }
  })();

  return stream;
};

export function buildLocalCodexToolProtocolPrompt(context: Context): string {
  const toolSection = (context.tools ?? []).map(renderToolForPrompt).join("\n");
  const messages = context.messages.map(renderMessageForPrompt).join("\n\n");
  return [
    `Local Codex MCP Tool Protocol v${LOCAL_CODEX_TOOL_PROTOCOL_VERSION}`,
    "你正在作为 InkOS 的工具调度模型运行。你不能直接修改 InkOS 文件；如需操作项目，必须通过下列 InkOS 工具发起 tool call。",
    "",
    "输出格式必须严格为一个 JSON 对象，不要加 Markdown 代码块，不要输出额外解释。",
    "如果需要调用工具，输出：",
    '{"type":"tool_calls","calls":[{"id":"call_1","name":"tool_name","arguments":{}}]}',
    "如果可以直接回答，输出：",
    '{"type":"final","content":"最终回答正文"}',
    "",
    "规则：",
    "- 只使用 Available tools 中列出的工具名。",
    "- arguments 必须符合对应 JSON schema；不知道的字段不要编造。",
    "- 工具结果会在下一轮以 toolResult 消息返回给你；拿到结果后再继续或最终回答。",
    "- 用户要求建书、写下一章、生成短篇、生成封面、读取/修改项目内容时，优先调用合适工具，不要只声称完成。",
    "- 如果没有合适工具或信息不足，直接 final 说明需要的信息。",
    "",
    "System prompt:",
    context.systemPrompt?.trim() || "(none)",
    "",
    "Available tools:",
    toolSection || "(none)",
    "",
    "Conversation:",
    messages || "(empty)",
  ].join("\n");
}

export function parseLocalCodexToolProtocolResponse(raw: string): ParsedLocalCodexToolProtocol {
  const parsed = parseFirstJsonObject(raw);
  if (!parsed) return { kind: "final", content: raw };

  const record = asRecord(parsed);
  const type = typeof record?.type === "string" ? record.type : undefined;
  const rawCalls = Array.isArray(record?.calls)
    ? record.calls
    : Array.isArray(record?.tool_calls)
      ? record.tool_calls
      : [];
  const calls = rawCalls.map(normalizeToolProtocolCall).filter((call): call is ToolProtocolCall => Boolean(call));
  if ((type === "tool_calls" || calls.length > 0) && calls.length > 0) {
    const content = typeof record?.content === "string" ? record.content : undefined;
    return { kind: "tool_calls", calls, ...(content ? { content } : {}) };
  }

  if (typeof record?.content === "string") return { kind: "final", content: record.content };
  if (typeof record?.final === "string") return { kind: "final", content: record.final };
  if (typeof record?.answer === "string") return { kind: "final", content: record.answer };
  return { kind: "final", content: raw };
}

function pushTextBlock(stream: ReturnType<typeof createAssistantMessageEventStream>, assistant: AssistantMessage, text: string): void {
  const contentIndex = assistant.content.length;
  assistant.content.push({ type: "text", text: "" });
  stream.push({ type: "text_start", contentIndex, partial: { ...assistant, content: [...assistant.content] } });
  if (text) {
    assistant.content[contentIndex] = { type: "text", text };
    stream.push({ type: "text_delta", contentIndex, delta: text, partial: { ...assistant, content: [...assistant.content] } });
  }
  stream.push({ type: "text_end", contentIndex, content: text, partial: { ...assistant, content: [...assistant.content] } });
}

function renderToolForPrompt(tool: Tool): string {
  return JSON.stringify({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  });
}

function renderMessageForPrompt(message: Context["messages"][number]): string {
  if (message.role === "user") {
    return `[user]\n${truncate(renderContent(message.content), MAX_MESSAGE_TEXT_CHARS)}`;
  }
  if (message.role === "assistant") {
    const parts = message.content.map((block) => {
      if (block.type === "text") return block.text;
      if (block.type === "thinking") return `<thinking>${block.thinking}</thinking>`;
      return `[toolCall id=${block.id} name=${block.name} arguments=${JSON.stringify(block.arguments)}]`;
    });
    return `[assistant]\n${truncate(parts.join("\n"), MAX_MESSAGE_TEXT_CHARS)}`;
  }
  const content = message.content.map((block) => block.type === "text" ? block.text : "[image]").join("\n");
  return `[toolResult id=${message.toolCallId} name=${message.toolName} isError=${message.isError ? "true" : "false"}]\n${truncate(content, MAX_TOOL_RESULT_CHARS)}`;
}

function renderContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((block) => block.type === "text" ? block.text : "[image]").join("\n");
  }
  return "";
}

function normalizeToolProtocolCall(value: unknown): ToolProtocolCall | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const name = typeof record.name === "string"
    ? record.name
    : typeof record.tool === "string"
      ? record.tool
      : undefined;
  if (!name) return undefined;
  const argsCandidate = record.arguments ?? record.args ?? {};
  const args = asRecord(argsCandidate) ?? {};
  return {
    ...(typeof record.id === "string" ? { id: record.id } : {}),
    name,
    arguments: args,
  };
}

function parseFirstJsonObject(raw: string): unknown | undefined {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1]?.trim() || raw.trim();
  const start = source.indexOf("{");
  if (start < 0) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(source.slice(start, i + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function emptyUsage(): AssistantMessage["usage"] {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function readAgentTimeoutMs(): number | undefined {
  const raw = process.env.INKOS_LOCAL_CODEX_AGENT_TIMEOUT_MS?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function truncate(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars)}\n...[truncated ${value.length - maxChars} chars]`;
}
