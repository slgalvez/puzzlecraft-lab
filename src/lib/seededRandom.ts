export class SeededRandom {
  private s: number;

  constructor(seed: number) {
    this.s = (seed | 0) || 1;
  }

  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextBool(prob = 0.5): boolean {
    return this.next() < prob;
  }

  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

export function seedFromString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1;
}
