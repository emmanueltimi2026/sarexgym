export const workoutCreatePayload = (plan, routine) => ({
  title: plan.title,
  description: plan.description,
  difficulty: plan.difficulty,
  daysPerWeek: Number(plan.daysPerWeek),
  memberIds: plan.memberIds,
  routine
});
