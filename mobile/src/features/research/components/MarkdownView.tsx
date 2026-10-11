import * as WebBrowser from 'expo-web-browser';
import { Lexer, type Token, type Tokens } from 'marked';
import { useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

import { resolveLink } from '../core/links';

export interface MarkdownViewProps {
  markdown: string;
  /** The page the markdown came from, used to resolve relative links. */
  baseUrl: string;
}

/**
 * Renders extracted page markdown as native text: headings, paragraphs, lists, quotes, code and
 * tappable links. Images and raw HTML are skipped; the reader is for reading.
 */
export function MarkdownView({ markdown, baseUrl }: MarkdownViewProps) {
  const tokens = useMemo(() => Lexer.lex(markdown), [markdown]);
  return <View style={styles.root}>{renderBlocks(tokens, baseUrl)}</View>;
}

function renderBlocks(tokens: Token[], baseUrl: string): ReactNode[] {
  return tokens.map((token, i) => renderBlock(token, baseUrl, i));
}

function renderBlock(token: Token, baseUrl: string, key: number): ReactNode {
  switch (token.type) {
    case 'heading': {
      const { depth, tokens } = token as Tokens.Heading;
      return (
        <Text key={key} style={depth <= 2 ? styles.heading : styles.subheading}>
          {renderInline(tokens, baseUrl)}
        </Text>
      );
    }
    case 'paragraph':
    case 'text': {
      const inline = (token as Tokens.Paragraph | Tokens.Text).tokens;
      if (!inline || !hasVisibleText(inline)) return null;
      return (
        <Text key={key} style={styles.body}>
          {renderInline(inline, baseUrl)}
        </Text>
      );
    }
    case 'list': {
      const list = token as Tokens.List;
      const start = typeof list.start === 'number' ? list.start : 1;
      return (
        <View key={key} style={styles.list}>
          {list.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.bullet}>{list.ordered ? `${start + i}.` : '•'}</Text>
              <View style={styles.listBody}>{renderBlocks(item.tokens, baseUrl)}</View>
            </View>
          ))}
        </View>
      );
    }
    case 'blockquote':
      return (
        <View key={key} style={styles.quote}>
          {renderBlocks((token as Tokens.Blockquote).tokens, baseUrl)}
        </View>
      );
    case 'code':
      return (
        <Text key={key} style={styles.codeBlock} selectable>
          {(token as Tokens.Code).text}
        </Text>
      );
    case 'table': {
      const table = token as Tokens.Table;
      const rows = [table.header, ...table.rows];
      return (
        <View key={key} style={styles.table}>
          {rows.map((cells, i) => (
            <Text key={i} style={i === 0 ? styles.tableHeader : styles.body}>
              {cells.map((cell, j) => [
                j > 0 ? '  ·  ' : null,
                <Text key={j}>{renderInline(cell.tokens, baseUrl)}</Text>,
              ])}
            </Text>
          ))}
        </View>
      );
    }
    case 'hr':
      return <View key={key} style={styles.rule} />;
    default:
      // space, html, def, image-only blocks: nothing to read.
      return null;
  }
}

function renderInline(tokens: Token[] | undefined, baseUrl: string): ReactNode[] {
  return (tokens ?? []).map((token, i) => {
    switch (token.type) {
      case 'strong':
        return (
          <Text key={i} style={styles.strong}>
            {renderInline((token as Tokens.Strong).tokens, baseUrl)}
          </Text>
        );
      case 'em':
        return (
          <Text key={i} style={styles.em}>
            {renderInline((token as Tokens.Em).tokens, baseUrl)}
          </Text>
        );
      case 'codespan':
        return (
          <Text key={i} style={styles.code}>
            {(token as Tokens.Codespan).text}
          </Text>
        );
      case 'link': {
        const link = token as Tokens.Link;
        const href = resolveLink(link.href, baseUrl);
        const children = renderInline(link.tokens, baseUrl);
        if (!href) return <Text key={i}>{children}</Text>;
        return (
          <Text
            key={i}
            style={styles.link}
            accessibilityRole="link"
            onPress={() => void WebBrowser.openBrowserAsync(href)}
          >
            {children}
          </Text>
        );
      }
      case 'br':
        return '\n';
      case 'image':
      case 'html':
        return null;
      case 'text': {
        const text = token as Tokens.Text;
        return text.tokens ? (
          <Text key={i}>{renderInline(text.tokens, baseUrl)}</Text>
        ) : (
          decode(text.text)
        );
      }
      case 'escape':
        return (token as Tokens.Escape).text;
      default:
        return 'text' in token && typeof token.text === 'string' ? decode(token.text) : null;
    }
  });
}

/** Skips paragraphs that are only images or whitespace. */
function hasVisibleText(tokens: Token[]): boolean {
  return tokens.some((token) => {
    if (token.type === 'image' || token.type === 'html' || token.type === 'br') return false;
    if ('tokens' in token && token.tokens) return hasVisibleText(token.tokens);
    return 'text' in token && typeof token.text === 'string' && token.text.trim().length > 0;
  });
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** marked HTML-escapes text tokens; native Text shows them literally, so undo that. */
function decode(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  heading: { ...typography.sheetTitle, color: colors.text, marginTop: spacing.md },
  subheading: { ...typography.bodyStrong, color: colors.text, marginTop: spacing.sm },
  body: { ...typography.reading, color: colors.text },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  link: {
    color: colors.text,
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  code: { fontFamily: MONO, backgroundColor: colors.accentSoft },
  codeBlock: {
    ...typography.label,
    fontWeight: '400',
    fontFamily: MONO,
    color: colors.text,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { gap: spacing.sm },
  listItem: { flexDirection: 'row', gap: spacing.sm },
  bullet: { ...typography.reading, color: colors.textMuted, minWidth: 18 },
  listBody: { flex: 1, gap: spacing.xs },
  quote: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.lg,
    gap: spacing.sm,
  },
  table: { gap: spacing.xs },
  tableHeader: { ...typography.bodyStrong, color: colors.text },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
