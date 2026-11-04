import {
  maxPageForTotal,
  parseSearchParams,
  serializeSearchParams,
} from "./searchParams.js";

describe("parseSearchParams", () => {
  const known = new Set(["beauty", "groceries"]);

  it("normalizes sort and page", () => {
    const { params } = parseSearchParams("?sort=DESC&page=0&page=abc", {
      knownCategories: known,
    });
    expect(params.sort).toBe("asc");
    expect(params.page).toBe(1);
  });

  it("drops unknown category when allowlist is set", () => {
    const { params, changed } = parseSearchParams("?category=typo&q=cream", {
      knownCategories: known,
    });
    expect(params.category).toBe("");
    expect(params.q).toBe("cream");
    expect(changed).toBe(true);
  });

  it("keeps valid category lowercase", () => {
    const { params, changed } = parseSearchParams("?category=Beauty", {
      knownCategories: known,
    });
    expect(params.category).toBe("beauty");
    expect(changed).toBe(true);
  });

  it("flags changed when q has extra whitespace", () => {
    const { params, changed } = parseSearchParams("?q=%20cream%20");
    expect(params.q).toBe("cream");
    expect(changed).toBe(true);
  });

  it("flags changed when category has extra whitespace", () => {
    const { params, changed } = parseSearchParams("?category=%20beauty%20", {
      knownCategories: known,
    });
    expect(params.category).toBe("beauty");
    expect(changed).toBe(true);
  });

  it("ignores extra params in changed detection", () => {
    const { changed } = parseSearchParams("?q=a&limit=40&foo=bar");
    expect(changed).toBe(true);
  });

  it("clamps page when maxPage provided", () => {
    const { params } = parseSearchParams("?page=99", { maxPage: 3 });
    expect(params.page).toBe(3);
  });

  it("does not flag changed when page=1 is explicit", () => {
    const { params, changed } = parseSearchParams("?q=cream&page=1");
    expect(params.page).toBe(1);
    expect(changed).toBe(false);
  });
});

describe("serializeSearchParams", () => {
  it("omits defaults", () => {
    expect(
      serializeSearchParams({ q: "", category: "", sort: "asc", page: 1 }),
    ).toBe("");
  });

  it("round-trips meaningful fields", () => {
    const params = {
      q: "lip",
      category: "beauty",
      sort: "desc" as const,
      page: 2,
    };
    expect(serializeSearchParams(params)).toBe(
      "q=lip&category=beauty&sort=desc&page=2",
    );
  });
});

describe("maxPageForTotal", () => {
  it("returns 1 for empty results", () => {
    expect(maxPageForTotal(0, 5)).toBe(1);
  });

  it("ceil divides by page size", () => {
    expect(maxPageForTotal(11, 5)).toBe(3);
  });
});
