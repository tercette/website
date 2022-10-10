import { MaterialModule } from './material.module';
import { RouterModule } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { HomeModule } from './home/home.module';
import { SimulatorsModule } from './simulators/simulators.module';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { AppsComponent } from './apps/apps.component'; //fixed the reload crashes on the webbrowser online



@NgModule({
  declarations: [
    AppComponent,
    AppsComponent
  ],

  imports: [
    BrowserModule,
    MaterialModule,
    AppRoutingModule,
    RouterModule,
    HomeModule,
    BrowserAnimationsModule,
    HttpClientModule,
    SimulatorsModule



  ],
  providers: [{provide: LocationStrategy, useClass: HashLocationStrategy}],
  bootstrap: [AppComponent]
})
export class AppModule { }
