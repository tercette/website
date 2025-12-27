import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
    Component,
    Injectable,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';

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
    alert: boolean = false;

    constructor(private http: HttpClient, private router: Router) { }

    ngOnInit(): void { }

    scrollTo(sectionId: string): void {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    onclick() {
        this.Sendmessage = !this.Sendmessage;
        this.visible = !this.visible;
    }

    app() {
        this.router.navigate(['/apps'])
    }
    goToSimulators() {
        this.router.navigate(['/simulators'])
    }


    onSubmit(contactForm: NgForm) {
        if (contactForm.valid) {
            const formData = contactForm.value;
            const headers = new HttpHeaders({ 'Content-type': 'application/json' });
            this.http
                .post(
                    'https://formspree.io/f/meqvpjwz',
                    {
                        name: formData.name,
                        _replyto: formData.email,
                        _subject: formData.subject,
                        message: formData.messages,
                    },
                    { headers: headers }
                )
                .subscribe(
                    (response) => {
                        this.alert = true;
                        contactForm.reset();
                    },
                    (error) => {
                    }
                );
        }
    }






}

