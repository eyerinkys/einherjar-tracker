import { User, UserTrainingProfile } from '@/types';

export const MOCK_USER: User = {
  id: 'usr-1',
  name: 'Athol',
  cycleName: 'Cycle 04',
  email: 'athol@einherjar.internal',
  createdAt: '2026-07-01',
};

export const MOCK_USER_PROFILE: UserTrainingProfile = {
  userId: 'usr-1',
  trainingExperience: 'intermediate',
  primaryGoal: 'Muscle Gain & Progressive Overload',
  preferredProgressionMethod: 'Double Progression (Reps then Load)',
  availableWeightIncrements: [1.25, 2.5, 5, 10],
  generalTrainingNotes: 'Prioritizing controlled eccentric phase and joint longevity.',
  updatedAt: '2026-08-01',
};
