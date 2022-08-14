export class WindowWrapper {
  static reload(): void {
    window.location.reload();
  }

  static confirm(message?: string): boolean {
    return window.confirm(message);
  }
}
