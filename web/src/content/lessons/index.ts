import type { Lesson } from '../../engine/types';
import { linuxLessons } from './linux';
import { netLessons } from './net';
import { gitLessons } from './git';
import { dockerLessons } from './docker';
import { cicdLessons } from './cicd';
import { iacLessons } from './iac';
import { k8sLessons } from './k8s';
import { obsLessons } from './obs';
import { secLessons } from './sec';
import { sreLessons } from './sre';

/** Все уроки по id. Порядок прохождения задаёт карта в content/units.ts. */
export const LESSONS: Record<string, Lesson> = {
  ...linuxLessons,
  ...netLessons,
  ...gitLessons,
  ...dockerLessons,
  ...cicdLessons,
  ...iacLessons,
  ...k8sLessons,
  ...obsLessons,
  ...secLessons,
  ...sreLessons,
};
