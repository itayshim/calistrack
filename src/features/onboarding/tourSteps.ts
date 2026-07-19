import type { TranslationKey } from '../../locales/translations';

export interface TourStep {
  id: string;
  type: 'intro' | 'targeted' | 'completion';
  route: string;
  targets?: string[];
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  placement: 'center' | 'adaptive';
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    type: 'intro',
    route: '/',
    titleKey: 'tourWelcomeTitle',
    descriptionKey: 'tourWelcomeDescription',
    placement: 'center',
  },
  {
    id: 'dashboard-action',
    type: 'targeted',
    route: '/',
    targets: ['dashboard-primary-action', 'dashboard-workout-action'],
    titleKey: 'tourDashboardTitle',
    descriptionKey: 'tourDashboardActionDescription',
    placement: 'adaptive',
  },
  {
    id: 'program-navigation',
    type: 'targeted',
    route: '/',
    targets: ['nav-program'],
    titleKey: 'tourProgramNavigationTitle',
    descriptionKey: 'tourProgramNavigationDescription',
    placement: 'adaptive',
  },
  {
    id: 'program-action',
    type: 'targeted',
    route: '/program',
    targets: ['create-program-action', 'active-program-summary', 'nav-program'],
    titleKey: 'tourProgramsTitle',
    descriptionKey: 'tourProgramActionDescription',
    placement: 'adaptive',
  },
  {
    id: 'exercise-search',
    type: 'targeted',
    route: '/exercises',
    targets: ['exercise-search-control', 'exercise-search-filters'],
    titleKey: 'tourExercisesTitle',
    descriptionKey: 'tourExerciseSearchDescription',
    placement: 'adaptive',
  },
  {
    id: 'exercise-filters',
    type: 'targeted',
    route: '/exercises',
    targets: ['exercise-filter-controls', 'exercise-search-control'],
    titleKey: 'tourExerciseFiltersTitle',
    descriptionKey: 'tourExerciseFiltersDescription',
    placement: 'adaptive',
  },
  {
    id: 'workout-entry',
    type: 'targeted',
    route: '/',
    targets: ['dashboard-workout-action', 'nav-workout', 'dashboard-primary-action'],
    titleKey: 'tourWorkoutTitle',
    descriptionKey: 'tourWorkoutEntryDescription',
    placement: 'adaptive',
  },
  {
    id: 'progress-summary',
    type: 'targeted',
    route: '/progress',
    targets: ['progress-summary', 'nav-progress'],
    titleKey: 'tourProgressTitle',
    descriptionKey: 'tourProgressSummaryDescription',
    placement: 'adaptive',
  },
  {
    id: 'settings-preferences',
    type: 'targeted',
    route: '/settings',
    targets: ['settings-theme-preference', 'settings-preferences', 'nav-settings'],
    titleKey: 'tourSettingsPreferencesTitle',
    descriptionKey: 'tourSettingsFocusedDescription',
    placement: 'adaptive',
  },
  {
    id: 'settings-help',
    type: 'targeted',
    route: '/settings',
    targets: ['settings-help', 'nav-settings'],
    titleKey: 'tourHelpTitle',
    descriptionKey: 'tourHelpDescription',
    placement: 'adaptive',
  },
  {
    id: 'ready',
    type: 'completion',
    route: '/',
    titleKey: 'tourReadyTitle',
    descriptionKey: 'tourReadyDescription',
    placement: 'center',
  },
];
