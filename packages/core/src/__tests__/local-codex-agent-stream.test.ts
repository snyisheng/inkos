import { describe, expect, it } from "vitest";
import {
  buildLocalCodexToolProtocolPrompt,
  parseLocalCodexToolProtocolResponse,
} from "../llm/local-codex-agent-stream.js";
import type { Context } from "@mariozechner/pi-ai";

describe("local Codex MCP tool protocol adapter", () => {
  it("parses final JSON responses", () => {
    expect(parseLocalCodexToolProtocolResponse('{"type":"final","content":"你好"}')).toEqual({
      kind: "final",
      content: "你好",
    });
  });

  it("parses fenced tool call JSON responses", () => {
    expect(parseLocalCodexToolProtocolResponse('```json\n{"type":"tool_calls","calls":[{"id":"c1","name":"read_file","arguments":{"path":"inkos.json"}}]}\n```')).toEqual({
      kind: "tool_calls",
      calls: [{ id: "c1", name: "read_file", arguments: { path: "inkos.json" } }],
    });
  });

  it("builds a strict JSON-only prompt with tools and conversation state", () => {
    const context: Context = {
      systemPrompt: "你是 InkOS agent。",
      tools: [
        {
          name: "write_next_chapter",
          description: "写下一章",
          parameters: {
            type: "object",
            properties: { bookId: { type: "string" } },
            required: ["bookId"],
          } as never,
        },
      ],
      messages: [
        { role: "user", content: "继续写 demo-book", timestamp: 1 },
        {
          role: "toolResult",
          toolCallId: "call_1",
          toolName: "write_next_chapter",
          content: [{ type: "text", text: "已写入第 4 章" }],
          isError: false,
          timestamp: 2,
        },
      ],
    };

    const prompt = buildLocalCodexToolProtocolPrompt(context);

    expect(prompt).toContain("Local Codex MCP Tool Protocol v1");
    expect(prompt).toContain("输出格式必须严格为一个 JSON 对象");
    expect(prompt).toContain('{"type":"tool_calls"');
    expect(prompt).toContain('"name":"write_next_chapter"');
    expect(prompt).toContain("[toolResult id=call_1 name=write_next_chapter isError=false]");
  });
});
