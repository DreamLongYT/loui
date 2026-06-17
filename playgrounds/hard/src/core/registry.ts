export class Registry {
  private items = new Map<string, any>();
  constructor() {
    this.items.set("core", "system");
  }
  get(key: string) { return this.items.get(key); }
  
  // Unused method
  remove(key: string) { this.items.delete(key); }
}

export const UNUSED_EXPORT = "I am never imported";
