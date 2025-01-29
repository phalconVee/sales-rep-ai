export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  
  export function sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }
  
  export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
  
  export function formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  
  export function parseJwt(token: string): Record<string, unknown> {
    try {
      return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  export function chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size)
    );
  }