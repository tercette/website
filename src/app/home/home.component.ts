import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Component,
  Injectable,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { NgForm } from '@angular/forms';

@Injectable()
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent implements OnInit {
  Sendmessage: boolean = true;
  visible: boolean = false;

  onclick() {
    this.Sendmessage = !this.Sendmessage;
    this.visible = !this.visible;
  }

  onSubmit(contactForm: NgForm) {
    if (contactForm.valid) {
      const email = contactForm.value;
      const headers = new HttpHeaders({ 'Content-type': 'application/json' });
      this.http
        .post(
          'https://formspree.io/f/meqvpjwz',
          {
            replyto: email.email,
            subject: email.subject,
            messages: email.messages,
          },

          { headers: headers }
        )
        .subscribe((response) => {
          console.log(response);
        });

      this.alert = true;
      if (contactForm.valid) {
        console.log('Formulario enviado.');
        contactForm.reset();
      }
    }
  }

  constructor(private http: HttpClient) {}

  alert: boolean = false;

  ngOnInit(): void {}
}
function subscribe(
  arg0: (dados: any) => void
): import('rxjs').OperatorFunction<Object, unknown> {
  throw new Error('Function not implemented.');
}
