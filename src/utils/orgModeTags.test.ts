import { describe, expect, it } from 'vitest';
import { appendOrgModeSideTag, getOrgModeSideTag, stripOrgModeSideTag } from './orgModeTags';

describe('getOrgModeSideTag', () => {
  it('末尾に :LEFT: タグがある場合、LEFT を返す', () => {
    expect(getOrgModeSideTag('アイデア :LEFT:')).toBe('LEFT');
  });

  it('末尾に :RIGHT: タグがある場合、RIGHT を返す', () => {
    expect(getOrgModeSideTag('メモ :RIGHT:')).toBe('RIGHT');
  });

  it('タグがない場合は undefined を返す', () => {
    expect(getOrgModeSideTag('普通のラベル')).toBeUndefined();
  });

  it('空文字列の場合 undefined を返す', () => {
    expect(getOrgModeSideTag('')).toBeUndefined();
  });

  it(':LEFT: のみの文字列の場合、LEFT を返す', () => {
    expect(getOrgModeSideTag(':LEFT:')).toBe('LEFT');
  });

  it('文中に :LEFT: があっても末尾でなければ undefined を返す', () => {
    expect(getOrgModeSideTag(':LEFT: はじめに')).toBeUndefined();
  });

  it('タグの前に空白がある場合も正しく抽出する', () => {
    expect(getOrgModeSideTag('テスト  :RIGHT:')).toBe('RIGHT');
  });
});

describe('stripOrgModeSideTag', () => {
  it(':LEFT: タグを除去する', () => {
    expect(stripOrgModeSideTag('アイデア :LEFT:')).toBe('アイデア');
  });

  it(':RIGHT: タグを除去する', () => {
    expect(stripOrgModeSideTag('メモ :RIGHT:')).toBe('メモ');
  });

  it('タグがない場合はそのまま返す', () => {
    expect(stripOrgModeSideTag('普通のラベル')).toBe('普通のラベル');
  });

  it('前後の空白をトリムする', () => {
    expect(stripOrgModeSideTag('  スペースあり  ')).toBe('スペースあり');
  });

  it(':LEFT: のみの文字列は空文字列になる', () => {
    expect(stripOrgModeSideTag(':LEFT:')).toBe('');
  });

  it('文中にタグ風の文字列があっても除去しない', () => {
    expect(stripOrgModeSideTag(':LEFT: はじめに')).toBe(':LEFT: はじめに');
  });
});

describe('appendOrgModeSideTag', () => {
  it('LEFT タグを付与する', () => {
    expect(appendOrgModeSideTag('アイデア', 'LEFT')).toBe('アイデア :LEFT:');
  });

  it('RIGHT タグを付与する', () => {
    expect(appendOrgModeSideTag('メモ', 'RIGHT')).toBe('メモ :RIGHT:');
  });

  it('空ラベルに付与する', () => {
    expect(appendOrgModeSideTag('', 'LEFT')).toBe(' :LEFT:');
  });

  it('既にタグがあるラベルにもそのまま付与する（二重タグは呼び出し側の責任）', () => {
    expect(appendOrgModeSideTag('アイデア :RIGHT:', 'LEFT')).toBe('アイデア :RIGHT: :LEFT:');
  });
});
