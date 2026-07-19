import type { TranslationKey } from '../../locales/translations';

export interface TourStep {
  id: string;
  route: string;
  targets?: string[];
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  placement: 'center' | 'adaptive';
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    route: '/',
    titleKey: 'tourWelcomeTitle',
    descriptionKey: 'tourWelcomeDescription',
    placement: 'center',
  },
  {
    id: 'dashboard-action',
    route: '/',
    targets: ['dashboard-primary-action', 'dashboard-workout-action'],
    titleKey: 'tourDashboardTitle',
    descriptionKey: 'tourDashboardActionDescription',
    placement: 'adaptive',
  },
  {
    id: 'program-navigation',
    route: '/',
    targets: ['nav-program'],
    titleKey: 'tourProgramNavigationTitle',
    descriptionKey: 'tourProgramNavigationDescription',
    placement: 'adaptive',
  },
  {
    id: 'program-action',
    route: '/program',
    targets: ['create-program-action', 'active-program-summary', 'nav-program'],
    titleKey: 'tourProgramsTitle',
    descriptionKey: 'tourProgramActionDescription',
    placement: 'adaptive',
  },
  {
    id: 'exercise-search',
    route: '/exercises',
    targets: ['exercise-search-filters'],
    titleKey: 'tourExercisesTitle',
    descriptionKey: 'tourExerciseSearchDescription',
    placement: 'adaptive',
  },
  {
    id: 'workout-entry',
    route: '/',
    targets: ['dashboard-workout-action', 'nav-workout', 'dashboard-primary-action'],
    titleKey: 'tourWorkoutTitle',
    descriptionKey: 'tourWorkoutEntryDescription',
    placement: 'adaptive',
  },
  {
    id: 'progress-summary',
    route: '/progress',
    targets: ['progress-summary', 'nav-progress'],
    titleKey: 'tourProgressTitle',
    descriptionKey: 'tourProgressSummaryDescription',
    placement: 'adaptive',
  },
  {
    id: 'settings-preferences',
    route: '/settings',
    targets: ['settings-preferences', 'nav-settings'],
    titleKey: 'tourSettingsTitle',
    descriptionKey: 'tourSettingsPreferencesDescription',
    placement: 'adaptive',
  },
  {
    id: 'settings-help',
    route: '/settings',
    targets: ['settings-help', 'nav-settings'],
    titleKey: 'tourHelpTitle',
    descriptionKey: 'tourHelpDescription',
    placement: 'adaptive',
  },
  {
    id: 'ready',
    route: '/',
    titleKey: 'tourReadyTitle',
    descriptionKey: 'tourReadyDescription',
    placement: 'center',
  },
];
