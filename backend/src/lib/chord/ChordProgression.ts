// Composite Pattern (composite)
// Holds a collection of ChordComponents. Calling transpose() delegates
// to every child — the caller never needs to iterate manually.

import type { ChordComponent } from './ChordComponent';

export class ChordProgression implements ChordComponent {
  private children: ChordComponent[] = [];

  add(component: ChordComponent): void {
    this.children.push(component);
  }

  remove(component: ChordComponent): void {
    const index = this.children.indexOf(component);
    if (index !== -1) this.children.splice(index, 1);
  }

  getChildren(): ChordComponent[] {
    return this.children;
  }

  transpose(semitones: number): void {
    for (const child of this.children) {
      child.transpose(semitones);
    }
  }

  toString(): string {
    return this.children.map((c) => c.toString()).join(' ');
  }
}
