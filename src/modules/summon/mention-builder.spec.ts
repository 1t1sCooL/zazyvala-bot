import { buildMentionMessage, chunk, MentionTarget } from './mention-builder';

describe('buildMentionMessage', () => {
  it('returns empty entities for no targets', () => {
    const { text, entities } = buildMentionMessage([]);
    expect(text).toBe('');
    expect(entities).toHaveLength(0);
  });

  it('builds correct offsets/lengths for multiple targets', () => {
    const targets: MentionTarget[] = [
      { userId: 1n, name: 'Иван' },
      { userId: 2n, name: 'Пётр' },
    ];
    const { text, entities } = buildMentionMessage(targets);

    expect(text).toBe('Иван Пётр');
    expect(entities).toHaveLength(2);

    // Первое упоминание с начала.
    expect(entities[0]).toMatchObject({
      type: 'text_mention',
      offset: 0,
      length: 'Иван'.length,
    });
    // Второе — после "Иван " (5 code units).
    expect(entities[1]).toMatchObject({
      type: 'text_mention',
      offset: 'Иван '.length,
      length: 'Пётр'.length,
    });
    expect((entities[1] as { user: { id: number } }).user.id).toBe(2);
  });

  it('prepends a header and offsets account for it', () => {
    const { text, entities } = buildMentionMessage(
      [{ userId: 1n, name: 'Иван' }],
      'Зову всех!',
    );
    expect(text).toBe('Зову всех!\nИван');
    expect(entities[0].offset).toBe('Зову всех!\n'.length);
  });

  it('counts UTF-16 length for emoji names', () => {
    const { entities } = buildMentionMessage([{ userId: 1n, name: '😀' }]);
    expect(entities[0].length).toBe('😀'.length); // 2 UTF-16 code units
  });
});

describe('chunk', () => {
  it('splits into batches of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns a single batch when size covers all', () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it('returns empty array for empty input', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
