import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Output() scrollToSection = new EventEmitter<string>();

  onScrollTo(sectionId: string): void {
    this.scrollToSection.emit(sectionId);
  }
}
