/**
 * Unit tests for BaseController
 * Tests subscriber error handling and state management
 */

import { describe, it, expect, vi } from "vitest";
import { BaseController } from "../BaseController";
import type { AccountState } from "@burnt-labs/account-management";

/**
 * Test implementation of BaseController
 */
class TestController extends BaseController {
  async initialize(): Promise<void> {
    // No-op for testing
  }

  async connect(): Promise<void> {
    // No-op for testing
  }

  async disconnect(): Promise<void> {
    // No-op for testing
  }

  // Expose dispatch for testing
  public testDispatch(action: Parameters<typeof this.dispatch>[0]): void {
    this.dispatch(action);
  }
}

describe("BaseController", () => {
  describe("subscriber error handling", () => {
    it("should not break other subscribers when one throws an error", () => {
      const controller = new TestController();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn(() => {
        throw new Error("Subscriber 2 error");
      });
      const subscriber3 = vi.fn();

      // Subscribe all three
      controller.subscribe(subscriber1);
      controller.subscribe(subscriber2);
      controller.subscribe(subscriber3);

      // Clear the initial calls
      subscriber1.mockClear();
      subscriber2.mockClear();
      subscriber3.mockClear();
      consoleErrorSpy.mockClear();

      // Dispatch an action that will notify all subscribers
      controller.testDispatch({ type: "INITIALIZE" });

      // All subscribers should have been called despite subscriber2 throwing
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
      expect(subscriber3).toHaveBeenCalledTimes(1);

      // Error should have been logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[BaseController] Error in state subscriber:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle errors in initial subscribe call", () => {
      const controller = new TestController({ status: "idle" });
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const throwingSubscriber = vi.fn(() => {
        throw new Error("Initial call error");
      });

      // Subscribe should not throw even if subscriber throws
      expect(() => {
        controller.subscribe(throwingSubscriber);
      }).not.toThrow();

      // Error should have been logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[BaseController] Error in state subscriber:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should call all subscribers with correct state even when some throw", () => {
      const controller = new TestController({ status: "idle" });
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const goodSubscriber1 = vi.fn();
      const throwingSubscriber = vi.fn(() => {
        throw new Error("Bad subscriber");
      });
      const goodSubscriber2 = vi.fn();

      controller.subscribe(goodSubscriber1);
      controller.subscribe(throwingSubscriber);
      controller.subscribe(goodSubscriber2);

      // Clear initial calls
      goodSubscriber1.mockClear();
      throwingSubscriber.mockClear();
      goodSubscriber2.mockClear();
      consoleErrorSpy.mockClear();

      // Dispatch state change
      const expectedState: AccountState = { status: "connecting" };
      controller.testDispatch({ type: "START_CONNECT" });

      // All subscribers should receive the correct state
      expect(goodSubscriber1).toHaveBeenCalledWith(expectedState);
      expect(throwingSubscriber).toHaveBeenCalledWith(expectedState);
      expect(goodSubscriber2).toHaveBeenCalledWith(expectedState);

      consoleErrorSpy.mockRestore();
    });

    it("should handle multiple subscribers throwing errors", () => {
      const controller = new TestController();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const throwingSubscriber1 = vi.fn(() => {
        throw new Error("Error 1");
      });
      const throwingSubscriber2 = vi.fn(() => {
        throw new Error("Error 2");
      });
      const goodSubscriber = vi.fn();

      controller.subscribe(throwingSubscriber1);
      controller.subscribe(throwingSubscriber2);
      controller.subscribe(goodSubscriber);

      // Clear initial calls
      throwingSubscriber1.mockClear();
      throwingSubscriber2.mockClear();
      goodSubscriber.mockClear();
      consoleErrorSpy.mockClear();

      // Dispatch state change
      controller.testDispatch({ type: "INITIALIZE" });

      // All should be called
      expect(throwingSubscriber1).toHaveBeenCalledTimes(1);
      expect(throwingSubscriber2).toHaveBeenCalledTimes(1);
      expect(goodSubscriber).toHaveBeenCalledTimes(1);

      // Both errors should be logged
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("basic functionality", () => {
    it("should initialize with correct state", () => {
      const controller = new TestController({ status: "idle" });
      expect(controller.getState()).toEqual({ status: "idle" });
    });

    it("should notify subscribers on state change", () => {
      const controller = new TestController({ status: "idle" });
      const subscriber = vi.fn();

      controller.subscribe(subscriber);
      subscriber.mockClear();

      controller.testDispatch({ type: "INITIALIZE" });

      expect(subscriber).toHaveBeenCalledWith({ status: "initializing" });
    });

    it("should allow unsubscribing", () => {
      const controller = new TestController();
      const subscriber = vi.fn();

      const unsubscribe = controller.subscribe(subscriber);
      subscriber.mockClear();

      unsubscribe();

      controller.testDispatch({ type: "INITIALIZE" });

      expect(subscriber).not.toHaveBeenCalled();
    });
  });
});
