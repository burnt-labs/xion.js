import { describe, it, expect, vi } from "vitest";
import { TypedEventEmitter } from "../TypedEventEmitter";

type TestEvents = {
  message: string;
  count: number;
  data: { id: number; name: string };
};

describe("TypedEventEmitter", () => {
  it("on/emit basics", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.on("message", handler);
    emitter.emit("message", "hello");

    expect(handler).toHaveBeenCalledWith("hello");
    expect(handler).toHaveBeenCalledTimes(1);

    emitter.emit("message", "world");
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("off removes handler", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.on("message", handler);
    emitter.off("message", handler);
    emitter.emit("message", "hello");

    expect(handler).not.toHaveBeenCalled();
  });

  it("once fires once then is removed", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.once("count", handler);
    emitter.emit("count", 1);
    emitter.emit("count", 2);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it("once cleans up handler even when handler throws", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn(() => {
      throw new Error("handler error");
    });

    emitter.once("message", handler);
    // emit swallows errors via try-catch in emit
    emitter.emit("message", "boom");

    expect(handler).toHaveBeenCalledTimes(1);

    // handler should have been cleaned up despite throwing
    handler.mockClear();
    emitter.emit("message", "after");
    expect(handler).not.toHaveBeenCalled();
  });

  it("removeAllListeners removes handlers for a specific event", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const messageHandler = vi.fn();
    const countHandler = vi.fn();

    emitter.on("message", messageHandler);
    emitter.on("count", countHandler);

    emitter.removeAllListeners("message");

    emitter.emit("message", "hello");
    emitter.emit("count", 42);

    expect(messageHandler).not.toHaveBeenCalled();
    expect(countHandler).toHaveBeenCalledWith(42);
  });

  it("removeAllListeners with no args removes all handlers", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const messageHandler = vi.fn();
    const countHandler = vi.fn();

    emitter.on("message", messageHandler);
    emitter.on("count", countHandler);

    emitter.removeAllListeners();

    emitter.emit("message", "hello");
    emitter.emit("count", 42);

    expect(messageHandler).not.toHaveBeenCalled();
    expect(countHandler).not.toHaveBeenCalled();
  });

  it("error in one handler does not break other handlers", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const errorHandler = vi.fn(() => {
      throw new Error("fail");
    });
    const goodHandler = vi.fn();

    vi.spyOn(console, "error").mockImplementation(() => {});

    emitter.on("message", errorHandler);
    emitter.on("message", goodHandler);

    emitter.emit("message", "test");

    expect(errorHandler).toHaveBeenCalledWith("test");
    expect(goodHandler).toHaveBeenCalledWith("test");

    vi.restoreAllMocks();
  });
});
