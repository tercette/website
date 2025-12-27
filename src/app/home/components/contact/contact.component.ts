import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  @Input() alert: boolean = false;
  @Output() formSubmit = new EventEmitter<NgForm>();

  Sendmessage: boolean = true;
  visible: boolean = false;

  onclick() {
    this.Sendmessage = !this.Sendmessage;
    this.visible = !this.visible;
  }

  onSubmit(contactForm: NgForm) {
    this.formSubmit.emit(contactForm);
  }
}
