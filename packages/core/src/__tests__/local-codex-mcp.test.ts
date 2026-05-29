import { describe, expect, it } from "vitest";
import {
  buildLocalCodexPrompt,
  extractCodexMcpToolContent,
  isLocalCodexMcpService,
} from "../llm/local-codex-mcp.js";

describe("local Codex MCP adapter", () => {
  it("detects the local Codex MCP service id", () => {
    expect(isLocalCodexMcpService("localCodexMcp")).toBe(true);
    expect(isLocalCodexMcpService("codexForMeCodingPlan")).toBe(false);
    expect(isLocalCodexMcpService(undefined)).toBe(false);
  });

  it("builds a single text prompt from InkOS chat messages", () => {
    const prompt = buildLocalCodexPrompt([
      { role: "system", content: "用中文回答。" },
      { role: "user", content: "列出功能点" },
      { role: "assistant", content: "功能 A" },
    ]);

    expect(prompt).toContain("只根据下面对话输出最终回答正文");
    expect(prompt).toContain("不要修改文件");
    expect(prompt).toContain("### system\n用中文回答。");
    expect(prompt).toContain("### user\n列出功能点");
    expect(prompt).toContain("### assistant\n功能 A");
  });

  it("extracts structured Codex MCP output", () => {
    expect(extractCodexMcpToolContent({
      content: [{ type: "text", text: "fallback" }],
      structuredContent: { threadId: "thread-1", content: "OK" },
    })).toEqual({ threadId: "thread-1", content: "OK" });
  });

  it("falls back to MCP text content parts", () => {
    expect(extractCodexMcpToolContent({
      content: [
        { type: "text", text: "Hello" },
        { type: "text", text: " world" },
      ],
    })).toEqual({ content: "Hello world" });
  });
});
