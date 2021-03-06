import { browser, by, element } from 'protractor';

describe('NgDatepicker', () => {

  it('should start with closed calendar', () => {
    return browser.get('/')
      .then(() => element(by.css('.main-calendar-container')))
      .then(el => expect(el.isPresent()).toBeFalsy());
  });

  it('should close calendar on click outside of calendar', () => {
    return Promise.resolve()
      .then((): any => element(by.css('.container')).click())
      .then(() => element(by.css('.main-calendar-container')))
      .then(el => expect(el.isPresent()).toBeFalsy());
  });

});
