import { Component, ElementRef, ViewChild } from '@angular/core';
import { DatepickerOptions } from '../../ng-datepicker/index';

@Component({
  selector: 'app-home',
  templateUrl: 'app-home.component.html'
})
export class AppHomeComponent {
  @ViewChild('toggleButton') toggleElement: ElementRef;
  date: Date;
  options: DatepickerOptions;
  isOpen: boolean;
  minDate: Date;
  maxDate: Date;

  constructor() {
    this.date = new Date();
    this.options = { };
    this.minDate = new Date();
    this.maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  openChanged(isOpen: boolean) {
    this.isOpen = isOpen;
  }
}
