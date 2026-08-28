export function createSerialTaskQueue() {
  let tail: Promise<void> = Promise.resolve();
  let epoch = 0;

  return {
    enqueue(task: () => Promise<void>) {
      const taskEpoch = epoch;
      const run = tail
        .catch(() => undefined)
        .then(async () => {
          if (taskEpoch !== epoch) return;
          await task();
        });
      tail = run;
      return run;
    },
    async invalidateAndDrain() {
      epoch += 1;
      await tail.catch(() => undefined);
    },
  };
}
