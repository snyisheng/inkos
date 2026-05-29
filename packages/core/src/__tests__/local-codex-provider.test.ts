import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatCompletion, chatWithTools, type LLMClient } from "../llm/provider.js";

const { runLocalCodexMcpCompletionMock } = vi.hoisted(() => ({
  runLocalCodexMcpCompletionMock: vi.fn(),
}));

vi.mock("../llm/local-codex-mcp.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../llm/local-codex-mcp.js")>();
  return {
    ...actual,
    isLocalCodexMcpService: (service: string | undefined) => service === "localCodexMcp",
    runLocalCodexMcpCompletion: runLocalCodexMcpCompletionMock,
  };
});

function makeLocalClient(): LLMClient {
  return {
    provider: "openai",
    service: "localCodexMcp",
    apiFormat: "chat",
    stream: false,
    _piModel: {
      id: "local-codex",
      name: "local-codex",
      api: "openai-completions",
      provider: "openai",
      baseUrl: "http://localhost/codex-mcp",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 400000,
      maxTokens: 128000,
    },
    _apiKey: "",
    defaults: {
      temperature: 0.7,
      maxTokens: 4096,
      thinkingBudget: 0,
      extra: {},
    },
  };
}

describe("local Codex MCP provider routing", () => {
  beforeEach(() => {
    runLocalCodexMcpCompletionMock.mockReset();
  });

  it("routes plain chat to local Codex MCP without requiring an API key", async () => {
    runLocalCodexMcpCompletionMock.mockResolvedValueOnce({ content: "本地回复" });
    const deltas: string[] = [];

    const result = await chatCompletion(makeLocalClient(), "local-codex", [
      { role: "user", content: "ping" },
    ], { onTextDelta: (text) => deltas.push(text) });

    expect(result.content).toBe("本地回复");
    expect(deltas).toEqual(["本地回复"]);
    expect(runLocalCodexMcpCompletionMock).toHaveBeenCalledWith({
      messages: [{ role: "user", content: "ping" }],
      model: "local-codex",
    });
  });

  it("adapts local Codex MCP JSON protocol responses to InkOS tool calls", async () => {
    runLocalCodexMcpCompletionMock.mockResolvedValueOnce({
      content: '{"type":"tool_calls","calls":[{"id":"call_1","name":"read_project","arguments":{"path":"inkos.json"}}]}',
    });

    const result = await chatWithTools(
      makeLocalClient(),
      "local-codex",
      [{ role: "user", content: "读取配置" }],
      [{
        name: "read_project",
        description: "读取项目文件",
        parameters: { type: "object", properties: { path: { type: "string" } } },
      }],
    );

    expect(result).toEqual({
      content: "",
      toolCalls: [{ id: "call_1", name: "read_project", arguments: '{"path":"inkos.json"}' }],
    });
    expect(runLocalCodexMcpCompletionMock.mock.calls[0]?.[0]?.messages).toEqual([]);
    const prompt = runLocalCodexMcpCompletionMock.mock.calls[0]?.[0]?.promptOverride as string;
    expect(prompt).toContain("Local Codex MCP Tool Protocol v1");
    expect(prompt).toContain('"name":"read_project"');
  });
});
