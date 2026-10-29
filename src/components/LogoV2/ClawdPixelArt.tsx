import * as React from 'react';
// BaseText, not the themed Text: the themed Text only accepts theme keys for
// backgroundColor, and this art needs raw per-pixel hex values.
import { Box, BaseText as Text } from '../../ink.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { Clawd } from './Clawd.js';

/**
 * Pixel-art Clawd, one terminal cell per two vertical pixels (▀ / ▄).
 *
 * ART holds pixel rows, not terminal rows: every pair of successive strings
 * becomes one terminal line. '.' is transparent, so the art composes on top of
 * whatever background the theme / terminal already uses. 'k' is the source
 * image's backdrop color kept opaque for the eyes — interior holes must read
 * as black on light terminals too, so they are painted rather than punched out.
 */
const COLORS: Record<string, string | undefined> = {
  '#': '#b7410e', // rust body
  b: '#8b4513', // brown hat rim and outlines
  t: '#d2b48c', // tan hat weave
  o: '#4169e1', // blue bubble
  k: '#1a1a1a', // eyes (opaque version of the artwork's backdrop)
};

// 37x37 pixels — cropped to the artwork's bounding box.
const ART = [
  '................bb.bb................',
  '................bb.bb................',
  '................bbbbb................',
  '.............btttbbttbtt.............',
  '...........ttbtttbbttbtttb...........',
  '.........bbbbbbbbbbbbbbbbbbb.........',
  '........tbtttbtttbbttbtttbttb........',
  '........tbtttbtttbbttbtttbttbt.......',
  '.......bbbbbbbbbbbbbbbbbbbbbbb.......',
  '.......ttbtttbtttbbttbtttbttbt.......',
  '.......ttbtttbtttbbttbtttbttbt.......',
  '.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.',
  '.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.',
  '.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.',
  '....#############################....',
  '....#############################....',
  '....#############################....',
  '....#############################....',
  '....#####kk###############kk#####....',
  '....#####kk###############kk#####....',
  '....#####kk###############kk#####....',
  '....#####kk###############kk#####....',
  '....#####kk###############kk#####....',
  '#################################....',
  '#####################################',
  '###################################tt',
  '###########################ttt####tt#',
  '##########################ttttt##ttt#',
  '....#####################ttooottttt..',
  '....####################ttoooooott...',
  '....####################ttooooooott..',
  '....####################ttooooooott..',
  '....####################ttooooooott..',
  '.......##..##..........#ttooooooott..',
  '.......##..##..........##ttoooooott..',
  '.......##..##..........##.tttooott...',
  '.......##..##..........##..tttttt....',
];

export const CLAWD_ART_WIDTH = ART[0]!.length;
export const CLAWD_ART_HEIGHT = Math.ceil(ART.length / 2);

function pixel(row: number, col: number): string | undefined {
  const line = ART[row];
  return line ? COLORS[line[col]!] : undefined;
}

function ArtRow({ row }: { row: number }): React.ReactElement {
  const top = row * 2;
  const bottom = top + 1;
  const spans: React.ReactElement[] = [];
  let col = 0;
  while (col < CLAWD_ART_WIDTH) {
    const topColor = pixel(top, col);
    const bottomColor = pixel(bottom, col);
    // Merge consecutive cells that share both colors into one styled span.
    let end = col + 1;
    while (
      end < CLAWD_ART_WIDTH &&
      pixel(top, end) === topColor &&
      pixel(bottom, end) === bottomColor
    ) {
      end++;
    }
    const len = end - col;
    if (topColor === undefined && bottomColor === undefined) {
      spans.push(<Text key={col}>{' '.repeat(len)}</Text>);
    } else if (topColor === undefined) {
      spans.push(
        <Text key={col} color={bottomColor!}>
          {'▄'.repeat(len)}
        </Text>,
      );
    } else if (bottomColor === undefined) {
      spans.push(
        <Text key={col} color={topColor}>
          {'▀'.repeat(len)}
        </Text>,
      );
    } else if (bottomColor === topColor) {
      // Both halves the same color: a full block needs no background SGR at
      // all, which keeps the art readable on terminals that drop bg colors.
      spans.push(
        <Text key={col} color={topColor}>
          {'█'.repeat(len)}
        </Text>,
      );
    } else {
      spans.push(
        <Text key={col} color={topColor} backgroundColor={bottomColor}>
          {'▀'.repeat(len)}
        </Text>,
      );
    }
    col = end;
  }
  return <Text>{spans}</Text>;
}

export function ClawdPixelArt(): React.ReactElement {
  const rows: React.ReactElement[] = [];
  for (let row = 0; row < CLAWD_ART_HEIGHT; row++) {
    rows.push(<ArtRow key={row} row={row} />);
  }
  return (
    <Box flexDirection="column" flexShrink={0}>
      {rows}
    </Box>
  );
}

/**
 * Startup mascot: the pixel-art Clawd when the surrounding layout has room,
 * the classic 9x3 Clawd otherwise.
 *
 * `reserved` is an upper bound on the columns the surroundings consume
 * (borders, padding, sibling text). Erring high is safe — a narrow terminal
 * falls back to the small Clawd instead of wrapping the art into unreadable
 * shards.
 */
export function StartupClawd({ reserved = 16 }: { reserved?: number }): React.ReactElement {
  const { columns } = useTerminalSize();
  if (columns - reserved < CLAWD_ART_WIDTH) {
    return <Clawd />;
  }
  return <ClawdPixelArt />;
}
