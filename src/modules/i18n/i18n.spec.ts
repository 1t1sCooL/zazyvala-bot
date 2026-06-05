import { asLang, isLang, t } from './i18n';

describe('i18n', () => {
  it('returns the string in the requested language', () => {
    expect(t('en', 'call_no_group')).toMatch(/No such group/);
    expect(t('ru', 'call_no_group')).toMatch(/Такой группы нет/);
  });

  it('interpolates variables', () => {
    expect(t('en', 'call_cooldown', { sec: 5 })).toBe(
      'Too soon. Try again in 5 sec.',
    );
    expect(t('ru', 'call_cooldown', { sec: 5 })).toBe(
      'Слишком часто. Попробуйте через 5 сек.',
    );
  });

  it('falls back to ru for unknown language', () => {
    expect(t('de', 'call_no_group')).toBe(t('ru', 'call_no_group'));
  });

  it('falls back to the key for unknown key', () => {
    expect(t('en', 'nonexistent_key')).toBe('nonexistent_key');
  });

  it('isLang / asLang validate languages', () => {
    expect(isLang('ru')).toBe(true);
    expect(isLang('xx')).toBe(false);
    expect(asLang('en')).toBe('en');
    expect(asLang(null)).toBe('ru');
    expect(asLang('xx')).toBe('ru');
  });
});
