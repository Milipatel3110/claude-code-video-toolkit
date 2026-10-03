import { loadFont as loadArchivoBlack } from '@remotion/google-fonts/ArchivoBlack';
import { loadFont as loadArchivo } from '@remotion/google-fonts/Archivo';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

const display = loadArchivoBlack('normal', { subsets: ['latin'] });
const body = loadArchivo('normal', { subsets: ['latin'], weights: ['700', '800'] });
const mono = loadMono('normal', { subsets: ['latin'], weights: ['500', '700'] });

export const fonts = {
  /** Rank numbers, labels, title. */
  display: display.fontFamily,
  /** Reaction captions. */
  body: body.fontFamily,
  /** Meter readout, chips. */
  mono: mono.fontFamily,
};
