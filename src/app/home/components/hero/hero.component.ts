import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css']
})
export class HeroComponent {
  @Output() scrollToSection = new EventEmitter<string>();

  onScrollTo(sectionId: string): void {
    this.scrollToSection.emit(sectionId);
  }
}
