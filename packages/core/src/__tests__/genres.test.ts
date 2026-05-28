import { describe, expect, it } from "vitest";
import { listAvailableGenres, readGenreProfile } from "../agents/rules-reader.js";

describe("built-in genre profiles", () => {
  it("includes a Chinese science-fiction profile for Studio genre management", async () => {
    const rootWithoutProjectGenres = "/tmp/inkos-no-project-genres";

    const genres = await listAvailableGenres(rootWithoutProjectGenres);
    expect(genres).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scifi",
          name: "科幻",
          source: "builtin",
        }),
      ]),
    );

    const { profile, body } = await readGenreProfile(rootWithoutProjectGenres, "scifi");
    expect(profile).toMatchObject({
      id: "scifi",
      name: "科幻",
      language: "zh",
      eraResearch: true,
      numericalSystem: false,
      powerScaling: false,
    });
    expect(profile.chapterTypes).toContain("探索章");
    expect(profile.satisfactionTypes).toContain("技术突破");
    expect(body).toContain("## 科技规则");
  });
});
