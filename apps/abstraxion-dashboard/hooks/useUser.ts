"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

export const useUser = () => {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") as string;

  const fetchUser = async (id: string) => {
    return {
      name: "John Doe",
      email: "john.doe@gmail.com",
    };
  };

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery(["user", userId], () => fetchUser(userId), {
    enabled: !!userId, // Only run query if userId is available
  });

  return { user, isLoading, isError };
};
