import { displayName, tgDisplayName } from './display-name';

describe('displayName', () => {
  it('uses first + last name', () => {
    expect(displayName({ firstName: 'Иван', lastName: 'Петров' })).toBe(
      'Иван Петров',
    );
  });

  it('uses first name only when no last name', () => {
    expect(displayName({ firstName: 'Иван' })).toBe('Иван');
  });

  it('falls back to @username, then fallback', () => {
    expect(displayName({ username: 'ivan' })).toBe('@ivan');
    expect(displayName({}, 'id 5')).toBe('id 5');
  });
});

describe('tgDisplayName', () => {
  it('composes name from Telegram user fields', () => {
    expect(
      tgDisplayName({ first_name: 'Иван', last_name: 'Петров', id: 5 }),
    ).toBe('Иван Петров');
    expect(tgDisplayName({ id: 7 })).toBe('id 7');
  });
});
