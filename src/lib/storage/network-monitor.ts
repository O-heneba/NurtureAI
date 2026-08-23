export type NetworkStatus = "online" | "offline";
export type NetworkListener = (status: NetworkStatus) => void;

class NetworkMonitor {
  private listeners = new Set<NetworkListener>();
  private started = false;
  private status: NetworkStatus = "online";

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.status = navigator.onLine ? "online" : "offline";
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  stop(): void {
    if (!this.started || typeof window === "undefined") return;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.started = false;
  }

  isOnline(): boolean {
    return typeof navigator === "undefined" ? true : navigator.onLine;
  }

  getStatus(): NetworkStatus {
    return this.status;
  }

  subscribe(listener: NetworkListener): () => void {
    this.start();
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private handleOnline = () => this.setStatus("online");
  private handleOffline = () => this.setStatus("offline");

  private setStatus(status: NetworkStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener(status);
  }
}

export const networkMonitor = new NetworkMonitor();
