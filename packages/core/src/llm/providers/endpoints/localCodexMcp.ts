/**
 * 本地 Codex MCP
 *
 * 通过本机 `codex mcp-server` 复用用户已经登录的 Codex CLI 会话，
 * 不需要在 InkOS 里再次配置 API Key / Token。该 endpoint 的 baseUrl
 * 只作为配置层的占位 URL（满足现有 URL schema 与免 key 判断），实际请求
 * 走 stdio MCP，不会访问 HTTP 地址。
 */
import type { InkosEndpoint } from "../types.js";

export const LOCAL_CODEX_MCP: InkosEndpoint = {
  id: "localCodexMcp",
  label: "本地 Codex MCP",
  group: "codingPlan",
  api: "openai-completions",
  baseUrl: "http://localhost/codex-mcp",
  checkModel: "local-codex",
  transportDefaults: { apiFormat: "chat", stream: false },
  temperatureRange: [0, 2],
  defaultTemperature: 1,
  writingTemperature: 1,
  models: [
    {
      id: "local-codex",
      maxOutput: 128000,
      contextWindowTokens: 400000,
      enabled: true,
    },
  ],
};
