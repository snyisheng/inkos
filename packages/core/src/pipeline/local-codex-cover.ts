import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LOCAL_CODEX_MCP_MODEL_ID, runLocalCodexMcpCompletion } from "../llm/local-codex-mcp.js";
import { safeChildPath } from "../utils/path-safety.js";

export async function generateLocalCodexCover(input: {
  readonly root: string;
  readonly outputDir: string;
  readonly imagePrompt: string;
  readonly model: string;
  readonly size: string;
}): Promise<{ readonly coverImagePath: string }> {
  const pngPath = projectPath(join(input.outputDir, "cover.png"));
  const prompt = buildLocalCodexCoverPrompt({
    imagePrompt: input.imagePrompt,
    outputPath: pngPath,
    size: input.size,
  });

  const result = await runLocalCodexMcpCompletion({
    messages: [],
    promptOverride: prompt,
    cwd: input.root,
    model: input.model === LOCAL_CODEX_MCP_MODEL_ID ? undefined : input.model,
    sandbox: "workspace-write",
  });

  const generatedPath = await resolveGeneratedLocalCoverPath({
    root: input.root,
    outputDir: input.outputDir,
    expectedPath: pngPath,
    codexContent: result.content,
  });
  if (!generatedPath) {
    throw new Error([
      "local Codex image generation did not create a valid PNG/JPEG/WebP cover file.",
      `Expected ${pngPath}.`,
      "Current codex mcp-server may not expose image generation capability; configure another cover provider if this persists.",
    ].join(" "));
  }

  return { coverImagePath: generatedPath };
}

function buildLocalCodexCoverPrompt(input: {
  readonly imagePrompt: string;
  readonly outputPath: string;
  readonly size: string;
}): string {
  return [
    "你是 InkOS 的本地封面图片生成适配器。",
    "任务：在当前工作目录内生成一张真实可打开的小说封面图片文件。",
    "",
    `目标文件：${input.outputPath}`,
    `建议尺寸：${input.size}，竖版 3:4。`,
    "",
    "封面需求：",
    input.imagePrompt,
    "",
    "硬性要求：",
    "- 必须写出真实 PNG/JPEG/WebP 图片文件；不要只写 Markdown、SVG 文本或占位说明。",
    "- 优先写入目标文件 cover.png；如果只能生成 jpg/webp，可写入同目录 cover.jpg 或 cover.webp。",
    "- 不要改写正文，不要重跑短篇流程，不要创建无关文件。",
    "- 完成后只输出一个 JSON 对象，例如 {\"path\":\"covers/demo/cover.png\"}。",
    "- 如果当前 Codex 环境没有任何图片生成或图片写入能力，输出 {\"error\":\"image_generation_unavailable\"}。",
  ].join("\n");
}

async function resolveGeneratedLocalCoverPath(input: {
  readonly root: string;
  readonly outputDir: string;
  readonly expectedPath: string;
  readonly codexContent: string;
}): Promise<string | undefined> {
  const parsedPath = parseGeneratedCoverPath(input.codexContent);
  const candidates = [
    input.expectedPath,
    projectPath(join(input.outputDir, "cover.jpg")),
    projectPath(join(input.outputDir, "cover.jpeg")),
    projectPath(join(input.outputDir, "cover.webp")),
    ...(parsedPath ? [parsedPath] : []),
  ];

  for (const candidate of uniqueStrings(candidates)) {
    if (!isCoverImagePath(candidate)) continue;
    if (!isWithinOutputDir(candidate, input.outputDir)) continue;
    if (await isValidGeneratedCoverFile(input.root, candidate)) {
      return projectPath(candidate);
    }
  }
  return undefined;
}

function parseGeneratedCoverPath(content: string): string | undefined {
  const parsed = parseFirstJsonObject(content);
  const record = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : undefined;
  const value = record?.path ?? record?.coverImagePath ?? record?.file;
  return typeof value === "string" && value.trim() ? projectPath(value.trim()) : undefined;
}

function parseFirstJsonObject(content: string): unknown | undefined {
  const match = content.match(/\{[\s\S]*\}/u);
  if (!match) return undefined;
  try {
    return JSON.parse(match[0]);
  } catch {
    return undefined;
  }
}

function isCoverImagePath(path: string): boolean {
  return /\.(png|jpe?g|webp)$/iu.test(path);
}

function isWithinOutputDir(path: string, outputDir: string): boolean {
  const normalizedPath = projectPath(path).replace(/^\/+/u, "");
  const normalizedDir = `${projectPath(outputDir).replace(/^\/+/u, "").replace(/\/+$/u, "")}/`;
  return normalizedPath.startsWith(normalizedDir);
}

async function isValidGeneratedCoverFile(root: string, path: string): Promise<boolean> {
  try {
    const buffer = await readFile(safeChildPath(root, path));
    return isPng(buffer) || isJpeg(buffer) || isWebp(buffer);
  } catch {
    return false;
  }
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a;
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff;
}

function isWebp(buffer: Buffer): boolean {
  return buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

function projectPath(value: string): string {
  return value.replace(/\\/gu, "/");
}

function uniqueStrings(values: ReadonlyArray<string>): string[] {
  return [...new Set(values.filter(Boolean))];
}
