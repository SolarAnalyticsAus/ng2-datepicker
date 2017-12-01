import { Component, OnInit, Input, Output, SimpleChanges, ElementRef, EventEmitter, HostListener, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  addYears,
  subMonths,
  setMonth,
  setYear,
  eachDay,
  getDate,
  getMonth,
  getYear,
  isToday,
  isBefore,
  isAfter,
  isSameDay,
  isSameMonth,
  isSameYear,
  format,
  getDay,
  subDays,
  subYears,
  setDay,
  startOfDay,
  addDays,
} from 'date-fns';

export interface DatepickerOptions {
  barTitleFormat?: string; // default: 'MMMM YYYY'
  firstCalendarDay?: number; // 0 = Sunday (default), 1 = Monday, ..
}

@Component({
  selector: 'ng-datepicker',
  templateUrl: 'ng-datepicker.component.html',
  styleUrls: ['ng-datepicker.component.sass'],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NgDatepickerComponent), multi: true }
  ]
})
export class NgDatepickerComponent implements ControlValueAccessor, OnInit {
  @Input() options: DatepickerOptions;
  @Input() minDate: Date;
  @Input() maxDate: Date;

  // Use to toggle date picker from parent
  @Input() isOpened: boolean;

  // Set toggle element from parent, need to set it so date picker can handle close events
  @Input() toggleElement: ElementRef;

  // Set to true if updating date on click, otherwise selection is set to selectedDate first,
  // then need to call update() from parent to set selection to innerValue
  @Input() isUpdateOnClick = true;

  // Use openChanged to update the value of isOpened whenever the date picker closes internally
  @Output() openChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

  // Used to temporarily store selected date if isUpdateOnClick is set to false
  selectedDate: Date;

  innerValue: Date;
  date: Date;
  barTitle: string;
  barTitleFormat: string;
  minYear: number;
  maxYear: number;
  firstCalendarDay: number;
  view: string;
  months: {
    month: number;
    name: string;
    isToday: boolean;
    isSelected: boolean;
    isValid: boolean;
  }[];
  years: {
    year: number;
    isToday: boolean;
    isSelected: boolean;
    isValid: boolean;
  }[];
  dayNames: string[];
  days: {
    date: Date;
    day: number;
    month: number;
    year: number;
    inThisMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isValid: boolean;
  }[];

  private yearRange = 20;
  private monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  private onTouchedCallback: () => void = () => { };
  private onChangeCallback: (_: any) => void = () => { };

  get value(): Date {
    return this.innerValue;
  }

  set value(val: Date) {
    this.innerValue = val;
    this.onChangeCallback(this.innerValue);
  }

  constructor(private elementRef: ElementRef) { }

  ngOnInit() {
    this.view = 'days';
    this.date = new Date();
    this.setOptions();
    this.initDayNames();
    this.initMonths();
    this.initYears(getYear(this.date));
    // Remove timestamps from minDate and maxDate
    if (this.minDate != null) {
      this.minDate = startOfDay(this.minDate);
    }
    if (this.maxDate != null) {
      this.maxDate = startOfDay(this.maxDate);
    }
  }

  setOptions(): void {
    this.barTitleFormat = this.options != null && this.options.barTitleFormat != null ?
      this.options.barTitleFormat : 'MMMM YYYY';
    this.firstCalendarDay = this.options != null && this.options.firstCalendarDay != null ?
      this.options.firstCalendarDay : 0;
  }

  next(): void {
    switch (this.view) {
      case 'days':
        this.nextMonth();
        break;
      case 'months':
        this.nextYear();
        break;
      case 'years':
        this.nextYears();
        break;
    }
  }

  prev(): void {
    switch (this.view) {
      case 'days':
        this.prevMonth();
        break;
      case 'months':
        this.prevYear();
        break;
      case 'years':
        this.prevYears();
        break;
    }
  }

  nextMonth(): void {
    this.date = addMonths(this.date, 1);
    this.init();
  }

  prevMonth(): void {
    this.date = subMonths(this.date, 1);
    this.init();
  }

  nextYear(): void {
    this.date = addYears(this.date, 1);
    this.initMonths();
    this.setBarTitle();
  }

  prevYear(): void {
    this.date = subYears(this.date, 1);
    this.initMonths();
    this.setBarTitle();
  }

  nextYears(): void {
    this.initYears(this.minYear + this.yearRange);
    this.setBarTitle();
  }

  prevYears(): void {
    this.initYears(this.minYear - this.yearRange);
    this.setBarTitle();
  }

  setDate(i: number): void {
    if (this.isUpdateOnClick) {
      // Set date selection immediately
      this.date = this.days[i].date;
      this.value = this.date;
      this.init();
      this.close();
    } else {
      // Otherwise, delay selection until update() is called from parent
      this.selectedDate = this.days[i].date;
      this.init();
    }
  }

  update() {
    this.date = this.selectedDate;
    this.value = this.date;
    this.init();
    this.close();
  }

  setMonth(i: number): void {
    this.date = setMonth(this.date, this.months[i].month);
    this.init();
    this.initMonths();
    this.view = 'days';
    this.setBarTitle();
  }

  setYear(i: number): void {
    this.date = setYear(this.date, this.years[i].year);
    this.init();
    this.initYears(this.years[i].year);
    this.view = 'days';
    this.setBarTitle();
  }

  init(): void {
    const start = startOfMonth(this.date);
    const end = endOfMonth(this.date);

    this.days = eachDay(start, end).map(date => {
      return {
        date: date,
        day: getDate(date),
        month: getMonth(date),
        year: getYear(date),
        inThisMonth: true,
        isToday: isToday(date),
        isSelected: this.isSelectedDate(date),
        isValid: this.isValidDate(date),
      };
    });

    // Add days before current month to start of this month's calendar
    for (let i = 1; i <= getDay(start) - this.firstCalendarDay; i++) {
      const date = subDays(start, i);
      this.days.unshift({
        date: date,
        day: getDate(date),
        month: getMonth(date),
        year: getYear(date),
        inThisMonth: false,
        isToday: isToday(date),
        isSelected: this.isSelectedDate(date),
        isValid: this.isValidDate(date),
      });
    }

    // Add days after current month to end of this month's calendar
    for (let i = 1; i < 7 - getDay(end) - this.firstCalendarDay; i++) {
      const date = addDays(end, i);
      this.days.push({
        date: date,
        day: getDate(date),
        month: getMonth(date),
        year: getYear(date),
        inThisMonth: false,
        isToday: isToday(date),
        isSelected: this.isSelectedDate(date),
        isValid: this.isValidDate(date),
      });
    }

    this.setBarTitle();
  }

  initYears(year: number): void {
    // Get range including year
    this.minYear = year - year % this.yearRange + 1;
    this.maxYear = year + (this.yearRange - year % this.yearRange);
    this.years = Array.from(new Array(this.yearRange), (x, i) => i + this.minYear).map(year => {
      return {
        year: year,
        isToday: year === getYear(startOfDay(new Date())),
        isSelected: year === getYear(this.date),
        isValid: this.isValidYear(year),
      };
    });
  }

  initMonths(): void {
    this.months = [];
    for (let i = 0; i < 12; i++) {
      this.months.push({
        month: i,
        name: this.monthNames[i],
        isToday: i === getMonth(startOfDay(new Date())),
        isSelected: i === getMonth(this.date),
        isValid: this.isValidMonth(i),
      });
    }
  }

  initDayNames(): void {
    this.dayNames = [];
    const start = this.firstCalendarDay;
    for (let i = start; i <= 6 + start; i++) {
      const date = setDay(new Date(), i);
      this.dayNames.push(format(date, 'ddd'));
    }
  }

  setBarTitle(): void {
    let title: string;
    switch (this.view) {
      case 'days':
        title = format(this.date, this.barTitleFormat);
        break;
      case 'months':
        title = format(this.date, 'YYYY');
        break;
      case 'years':
        title = `${this.minYear} - ${this.maxYear}`;
        break;
    }
    this.barTitle = title;
  }

  toggleView(): void {
    switch (this.view) {
      case 'days':
        this.view = 'months';
        break;
      case 'months':
        this.view = 'years';
        break;
      case 'years':
        this.view = 'days';
        break;
    }
    this.setBarTitle();
  }

  toggle(): void {
    this.isOpened = !this.isOpened;
  }

  close(): void {
    this.isOpened = false;
    this.openChanged.emit(this.isOpened);
    this.view = 'days'; // Always default to day view
    this.setBarTitle();
    // If selectedDate is not updated set back to innerValue to cancel selection
    if (!this.isUpdateOnClick &&
      !(isSameDay(this.selectedDate , this.innerValue) &&
      isSameMonth(this.selectedDate, this.innerValue) &&
      isSameYear(this.selectedDate, this.innerValue))) {
      this.selectedDate = this.innerValue;
      this.writeValue(this.innerValue); // Force to reset value
      this.init();
    }
  }

  writeValue(val: Date) {
    if (val) {
      this.date = val;
      this.innerValue = val;
      this.init();
      this.setBarTitle();
    }
  }

  registerOnChange(fn: any) {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
  }

  isSelectedDate(date: Date): boolean {
    // If update on click, current date is innerValue, otherwise use selectedDate
    const currentDate = this.isUpdateOnClick || this.selectedDate == null ?
      this.innerValue : this.selectedDate;
    return isSameDay(date, currentDate) && isSameMonth(date, currentDate) &&
      isSameYear(date, currentDate) ;
  }

  isValidDate(date: Date) {
    // Check if within min and max dates
    const isValidMin = this.minDate == null ||
      isAfter(date, this.minDate) || isSameDay(date, this.minDate);
    const isValidMax = this.maxDate == null ||
      isBefore(date, this.maxDate) || isSameDay(date, this.maxDate);
    return isValidMin && isValidMax;
  }

  isValidMonth(month: number) {
    // Check if month is within min and max dates
    const date = startOfDay(setMonth(this.date, month));
    const isValidMin = this.minDate == null ||
      isAfter(date, this.minDate) || isSameMonth(date, this.minDate);
    const isValidMax = this.maxDate == null ||
      isBefore(date, this.maxDate) || isSameMonth(date, this.maxDate);
    return isValidMin && isValidMax;
  }

  isValidYear(year: number) {
    // Check if year is within min and max dates
    let date = startOfDay(setYear(this.date, year));
    const isValidMin = this.minDate == null ||
      isAfter(date, this.minDate) || isSameYear(date, this.minDate);
    const isValidMax = this.maxDate == null ||
      isBefore(date, this.maxDate) || isSameYear(date, this.maxDate);
    return isValidMin && isValidMax;
  }

  @HostListener('document:click', ['$event']) onBlur(e: MouseEvent) {
    if (!this.isOpened) {
      return;
    }

    if (this.toggleElement != null) {
      const toggleRef = this.toggleElement.nativeElement;
      if (e.target === toggleRef || toggleRef.contains(<any>e.target)) {
        return;
      }
    }

    const container = this.elementRef.nativeElement.querySelector('.ngx-datepicker-calendar-container');
    if (container && container !== e.target && !container.contains(<any>e.target) &&
      !(<any>e.target).classList.contains('day-unit') &&
      !(<any>e.target).classList.contains('month-unit') &&
      !(<any>e.target).classList.contains('year-unit')) {
      this.close();
    }
  }
}
