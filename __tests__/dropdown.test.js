import {
  closeDropdownsOutside,
  registerOpenDropdown,
  _openDropdownCount,
} from '../src/components/form/dropdownDismiss';

// a fake view that sits at x 10..110, y 20..70 on screen
const fakeRef = () => ({
  current: { measureInWindow: cb => cb(10, 20, 100, 50) },
});

test('a tap outside closes the dropdown, a tap inside does not', () => {
  const close = jest.fn();
  const unregister = registerOpenDropdown('a', fakeRef(), close);
  expect(_openDropdownCount()).toBe(1);

  closeDropdownsOutside(50, 40); // inside
  expect(close).not.toHaveBeenCalled();

  closeDropdownsOutside(200, 40); // right of it
  closeDropdownsOutside(50, 5); // above it
  expect(close).toHaveBeenCalledTimes(2);

  unregister();
  expect(_openDropdownCount()).toBe(0);
  closeDropdownsOutside(200, 40);
  expect(close).toHaveBeenCalledTimes(2); // closed dropdowns are ignored
});

test('a dropdown whose view is gone is skipped safely', () => {
  const close = jest.fn();
  const unregister = registerOpenDropdown('b', { current: null }, close);
  expect(() => closeDropdownsOutside(0, 0)).not.toThrow();
  expect(close).not.toHaveBeenCalled();
  unregister();
});
