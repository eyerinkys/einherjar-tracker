export interface User {
  id: string;
  name: string;
  cycleName: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface UserTrainingProfile {
  userId: string;
  trainingExperience: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal: string;
  preferredProgressionMethod: string;
  availableWeightIncrements: number[];
  generalTrainingNotes?: string;
  updatedAt?: string;
}
