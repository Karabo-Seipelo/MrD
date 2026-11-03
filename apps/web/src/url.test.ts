// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUrlState } from "./url.js";

vi.mock("./categories.js", () => ({
  getKnownCategories: () => new Set(["beauty", "groceries"]),
}));

function setupDom() {
  document.body.innerHTML = `
    <input id="q" type="search" value="cream" />
    <select id="sort"><option value="asc">Low</option><option value="desc">High</option></select>
  `;
  const query = document.querySelector("#q") as HTMLInputElement;
  const sort = document.querySelector("#sort") as HTMLSelectElement;
  let category = "beauty";

  const url = createUrlState(query, sort, {
    selectedCategory: () => category,
    setSelectedCategory: (next) => {
      category = next;
    },
  });

  return {
    query,
    sort,
    url,
    getCategory: () => category,
  };
}

describe("createUrlState", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("buildFetchParams includes q, category, and limit", () => {
    const { url } = setupDom();
    const params = url.buildFetchParams();
    expect(params.get("q")).toBe("cream");
    expect(params.get("category")).toBe("beauty");
    expect(params.get("limit")).toBe("40");
  });

  it("applyFromLocation restores form fields and page", () => {
    window.history.replaceState(
      {},
      "",
      "/?q=lip&category=beauty&sort=desc&page=2",
    );
    const { query, sort, url } = setupDom();

    url.applyFromLocation();

    expect(query.value).toBe("lip");
    expect(sort.value).toBe("desc");
    expect(url.getPage()).toBe(2);
  });

  it("clears invalid category and syncLocationFromState fixes the bar", () => {
    window.history.replaceState({}, "", "/?category=typo&q=cream");
    const { url, getCategory } = setupDom();

    const changed = url.applyFromLocation();
    expect(changed).toBe(true);
    expect(getCategory()).toBe("");

    url.syncLocationFromState();
    expect(location.search).toBe("?q=cream");
  });

  it("writeUrl pushes history with sort and page", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { sort, url } = setupDom();
    sort.value = "desc";
    url.setPage(3);

    url.writeUrl();

    expect(push).toHaveBeenCalled();
    const urlArg = push.mock.calls[0][2] as string;
    expect(urlArg).toContain("sort=desc");
    expect(urlArg).toContain("page=3");
  });
});
