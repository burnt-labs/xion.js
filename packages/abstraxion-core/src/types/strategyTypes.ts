export interface StorageStrategy {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface RedirectStrategy {
  getCurrentUrl(): Promise<string>;
  redirect(url: string): Promise<void>;
  getUrlParameter(param: string): Promise<string | null>;
  cleanUrlParameters?(paramsToRemove: string[]): Promise<void>;
  onRedirectComplete?(
    callback: (params: { granter?: string | null }) => void,
  ): Promise<void>;
  removeRedirectHandler?(): Promise<void>;
}
