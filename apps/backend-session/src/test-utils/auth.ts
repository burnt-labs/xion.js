import { NextRequest } from "next/server";

// Mock NextAuth's getServerSession for testing
export const mockGetServerSession = jest.fn();

// Mock the auth middleware for testing
export const mockRequireAuth = jest.fn();

// Mock user data for testing
export const mockUser = {
  id: "test-user-id",
  username: "testuser",
  email: "test@example.com",
};

// Setup mocks before each test
export const setupAuthMocks = () => {
  // Mock getServerSession to return a valid session
  mockGetServerSession.mockResolvedValue({
    user: mockUser,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  });

  // Mock requireAuth to return the user context
  mockRequireAuth.mockResolvedValue({
    user: mockUser,
  });
};

// Clean up mocks after each test
export const cleanupAuthMocks = () => {
  mockGetServerSession.mockReset();
  mockRequireAuth.mockReset();
};

// Create a mock request with proper headers
export const createMockRequest = (
  url: string,
  method: string = "POST",
  body?: any,
): NextRequest => {
  const request = new NextRequest(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return request;
};
