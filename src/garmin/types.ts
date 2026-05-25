export type GarminSportType = { sportTypeId: number; sportTypeKey: string };
export type GarminStepType = { stepTypeId: number; stepTypeKey: string };
export type GarminEndCondition = { conditionTypeId: number; conditionTypeKey: string };
export type GarminTargetType = { workoutTargetTypeId: number; workoutTargetTypeKey: string };

export type GarminExecutableStep = {
  type: "ExecutableStepDTO";
  stepOrder: number;
  stepType: GarminStepType;
  endCondition: GarminEndCondition;
  endConditionValue?: number;
  targetType: GarminTargetType;
  targetValueOne?: number;
  targetValueTwo?: number;
  description?: string;
};

export type GarminRepeatStep = {
  type: "RepeatGroupDTO";
  stepOrder: number;
  stepType: GarminStepType;
  numberOfIterations: number;
  endCondition: GarminEndCondition;
  // When true, the watch skips the final rest interval inside the repeat
  // group on the last iteration. Default behavior in this extension: true.
  skipLastRestStep: boolean;
  workoutSteps: GarminWorkoutStep[];
};

export type GarminWorkoutStep = GarminExecutableStep | GarminRepeatStep;

export type GarminWorkoutSegment = {
  segmentOrder: number;
  sportType: GarminSportType;
  workoutSteps: GarminWorkoutStep[];
};

export type GarminWorkoutJson = {
  workoutName: string;
  sportType: GarminSportType;
  workoutSegments: [GarminWorkoutSegment];
};
