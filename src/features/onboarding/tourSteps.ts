import type { TranslationKey } from '../../locales/translations';

export interface TourStep {
  route: string;
  target?: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  placement: 'center' | 'bottom';
}

export const tourSteps: TourStep[] = [
  {
    route: '/',
    titleKey: 'tourWelcomeTitle',
    descriptionKey: 'tourWelcomeDescription',
    placement: 'center',
  },
  {
    route: '/',
    target: 'dashboard',
    titleKey: 'tourDashboardTitle',
    descriptionKey: 'tourDashboardDescription',
    placement: 'bottom',
  },
  {
    route: '/exercises',
    target: 'exercise-library',
    titleKey: 'tourExercisesTitle',
    descriptionKey: 'tourExercisesDescription',
    placement: 'bottom',
  },
  {
    route: '/program',
    target: 'programs',
    titleKey: 'tourProgramsTitle',
    descriptionKey: 'tourProgramsDescription',
    placement: 'bottom',
  },
  {
    route: '/',
    target: 'nav-workout',
    titleKey: 'tourWorkoutTitle',
    descriptionKey: 'tourWorkoutDescription',
    placement: 'bottom',
  },
  {
    route: '/progress',
    target: 'progress',
    titleKey: 'tourProgressTitle',
    descriptionKey: 'tourProgressDescription',
    placement: 'bottom',
  },
  {
    route: '/settings',
    target: 'settings',
    titleKey: 'tourSettingsTitle',
    descriptionKey: 'tourSettingsDescription',
    placement: 'bottom',
  },
  {
    route: '/',
    titleKey: 'tourReadyTitle',
    descriptionKey: 'tourReadyDescription',
    placement: 'center',
  },
];
