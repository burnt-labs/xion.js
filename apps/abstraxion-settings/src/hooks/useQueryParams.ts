import { useEffect, useState } from "react";

type QueryParams<T extends string> = {
  [K in T]?: string | null;
};

export const useQueryParams = <T extends string>(
  paramsList: T[],
): QueryParams<T> => {
  const [queryParams, setQueryParams] = useState<QueryParams<T>>({});

  useEffect(() => {
    const getQueryParams = (): QueryParams<T> => {
      const searchParams = new URLSearchParams(window.location.search);
      const params: Partial<QueryParams<T>> = {};

      paramsList.forEach((param) => {
        const value = searchParams.get(param);
        params[param] = value;
      });

      return params as QueryParams<T>;
    };

    const handleLocationChange = () => {
      setQueryParams(getQueryParams());
    };

    handleLocationChange();
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, [paramsList.join(",")]); // Dependency on a string representation of paramsList

  return queryParams;
};
