import { describe, expect, it } from "vitest";

import { createSerialTaskQueue } from "../lib/serial-task-queue";

describe("serial task queue", () => {
  it("keeps rapid writes in their original order", async () => {
    const queue = createSerialTaskQueue();
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    let markFirstStarted: (() => void) | undefined;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });

    const first = queue.enqueue(
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = () => {
            events.push("first");
            resolve();
          };
          markFirstStarted?.();
        }),
    );
    const second = queue.enqueue(async () => {
      events.push("second");
    });

    await firstStarted;
    expect(events).toEqual([]);
    releaseFirst?.();
    await Promise.all([first, second]);

    expect(events).toEqual(["first", "second"]);
  });

  it("drains a running task and skips queued stale work", async () => {
    const queue = createSerialTaskQueue();
    const events: string[] = [];
    let releaseRunning: (() => void) | undefined;
    let markRunningStarted: (() => void) | undefined;
    const runningStarted = new Promise<void>((resolve) => {
      markRunningStarted = resolve;
    });

    void queue.enqueue(
      () =>
        new Promise<void>((resolve) => {
          releaseRunning = () => {
            events.push("running");
            resolve();
          };
          markRunningStarted?.();
        }),
    );
    void queue.enqueue(async () => {
      events.push("stale");
    });

    await runningStarted;
    const invalidation = queue.invalidateAndDrain();
    releaseRunning?.();
    await invalidation;

    expect(events).toEqual(["running"]);
  });
});
