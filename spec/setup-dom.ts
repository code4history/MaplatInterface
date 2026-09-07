// jsdom 30 は ResizeObserver を持たない（ol 10 の Map constructor が要求する）。最小 stub を置く（m1-t3 設計 §2.6 / §5.6）。
// stub は kit に置かない（kit は runtime 依存 0・環境非依存であり、環境の欠落を埋めるのは harness の責務）。
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
}