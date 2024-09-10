import * as conversions from '@/duration/conversions';

describe('toMilliseconds', () => {
  it('Can convert from milliseconds', () => {
    expect(conversions.toMilliseconds({ milliseconds: 1 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(conversions.toMilliseconds({ seconds: 1 })).toStrictEqual(1000);
  });

  it('Can convert from minutes', () => {
    expect(conversions.toMilliseconds({ minutes: 1 })).toStrictEqual(60000);
  });

  it('Can convert from hours', () => {
    expect(conversions.toMilliseconds({ hours: 1 })).toStrictEqual(3.6e6);
  });

  it('Can convert from days', () => {
    expect(conversions.toMilliseconds({ days: 1 })).toStrictEqual(8.64e7);
  });
});

describe('toSeconds', () => {
  it('Can convert from milliseconds', () => {
    expect(conversions.toSeconds({ milliseconds: 1000 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(conversions.toSeconds({ seconds: 1 })).toStrictEqual(1);
  });

  it('Can convert from minutes', () => {
    expect(conversions.toSeconds({ minutes: 1 })).toStrictEqual(60);
  });

  it('Can convert from hours', () => {
    expect(conversions.toSeconds({ hours: 1 })).toStrictEqual(3600);
  });

  it('Can convert from days', () => {
    expect(conversions.toSeconds({ days: 1 })).toStrictEqual(86400);
  });
});

describe('toMinutes', () => {
  it('Can convert from milliseconds', () => {
    expect(conversions.toMinutes({ milliseconds: 60000 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(conversions.toMinutes({ seconds: 60 })).toStrictEqual(1);
  });

  it('Can convert from minutes', () => {
    expect(conversions.toMinutes({ minutes: 1 })).toStrictEqual(1);
  });

  it('Can convert from hours', () => {
    expect(conversions.toMinutes({ hours: 1 })).toStrictEqual(60);
  });

  it('Can convert from days', () => {
    expect(conversions.toMinutes({ days: 1 })).toStrictEqual(1440);
  });
});

describe('toHours', () => {
  it('Can convert from milliseconds', () => {
    expect(conversions.toHours({ milliseconds: 3.6e6 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(conversions.toHours({ seconds: 3600 })).toStrictEqual(1);
  });

  it('Can convert from minutes', () => {
    expect(conversions.toHours({ minutes: 60 })).toStrictEqual(1);
  });

  it('Can convert from hours', () => {
    expect(conversions.toHours({ hours: 1 })).toStrictEqual(1);
  });

  it('Can convert from days', () => {
    expect(conversions.toHours({ days: 1 })).toStrictEqual(24);
  });
});

describe('toDays', () => {
  it('Can convert from milliseconds', () => {
    expect(conversions.toDays({ milliseconds: 86400000 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(conversions.toDays({ seconds: 86400 })).toStrictEqual(1);
  });

  it('Can convert from minutes', () => {
    expect(conversions.toDays({ minutes: 1440 })).toStrictEqual(1);
  });

  it('Can convert from hours', () => {
    expect(conversions.toDays({ hours: 24 })).toStrictEqual(1);
  });

  it('Can convert from days', () => {
    expect(conversions.toDays({ days: 1 })).toStrictEqual(1);
  });
});
