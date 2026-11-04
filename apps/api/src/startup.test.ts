import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { databaseEnvError, USE_DATABASE_REQUIRED_MESSAGE } from "./startup.js";

describe("databaseEnvError", () => {
  let previousUseDatabase: string | undefined;

  beforeEach(() => {
    previousUseDatabase = process.env.USE_DATABASE;
  });

  afterEach(() => {
    if (previousUseDatabase === undefined) {
      delete process.env.USE_DATABASE;
    } else {
      process.env.USE_DATABASE = previousUseDatabase;
    }
  });

  it("returns null when USE_DATABASE is 1", () => {
    process.env.USE_DATABASE = "1";
    expect(databaseEnvError()).toBeNull();
  });

  it("returns a message when USE_DATABASE is missing or not 1", () => {
    delete process.env.USE_DATABASE;
    expect(databaseEnvError()).toBe(USE_DATABASE_REQUIRED_MESSAGE);

    process.env.USE_DATABASE = "true";
    expect(databaseEnvError()).toBe(USE_DATABASE_REQUIRED_MESSAGE);
  });
});

describe("startServer", () => {
  let previousUseDatabase: string | undefined;

  beforeEach(() => {
    previousUseDatabase = process.env.USE_DATABASE;
  });

  afterEach(() => {
    if (previousUseDatabase === undefined) {
      delete process.env.USE_DATABASE;
    } else {
      process.env.USE_DATABASE = previousUseDatabase;
    }
  });

  it("rejects when USE_DATABASE is not set", async () => {
    delete process.env.USE_DATABASE;

    const { startServer } = await import("./startup.js");

    await expect(startServer()).rejects.toThrow(USE_DATABASE_REQUIRED_MESSAGE);
  });
});
