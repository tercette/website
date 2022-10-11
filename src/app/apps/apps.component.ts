import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-apps',
  templateUrl: './apps.component.html',
  styleUrls: ['./apps.component.css']
})
export class AppsComponent implements OnInit {
  Sendmessage: boolean = true;
  visible: boolean = false;
  alert: boolean = false;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
  }

  onclick() {
    this.Sendmessage = !this.Sendmessage;
    this.visible = !this.visible;
  }

  backToHome() {
    this.router.navigate([''])
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

}
